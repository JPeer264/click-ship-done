import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { callable, routeAgentRequest, type Connection, type ConnectionContext } from "agents";
import { createAI } from "agents/models/ai-sdk";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  getToolName,
  isToolUIPart,
  stepCountIs,
  streamText,
} from "ai";
import { mcpHandler } from "./mcp";

// Free on the Workers AI free plan, and it can call tools.
const MODEL = "@cf/moonshotai/kimi-k2.6";

export class ChatAgent extends AIChatAgent<Env> {
  maxPersistedMessages = 50;

  onStart() {
    // Closes the OAuth popup of the Sentry MCP server when the sign-in is done.
    this.mcp.configureOAuthCallback({
      customHandler: (result) => {
        if (result.authSuccess) {
          return new Response(
            `<script>
              if (window.opener) {
                window.opener.postMessage({ type: "mcp-oauth-success" }, "*");
              }
              window.close();
            </script>`,
            { headers: { "content-type": "text/html" }, status: 200 },
          );
        }
        return new Response(`Authentication failed: ${result.authError ?? "Unknown error"}`, {
          headers: { "content-type": "text/plain" },
          status: 400,
        });
      },
    });
  }

  async onConnect(_connection: Connection, ctx: ConnectionContext) {
    // The weather MCP server is part of this Worker. The URL comes from the request, so it works on
    // localhost, on workers.dev and on a custom domain. Calls with the same name and URL do nothing.
    // The fixed id gives readable tool names, such as tool_weather_getWeather.
    const { origin } = new URL(ctx.request.url);
    try {
      await this.addMcpServer("weather", `${origin}/mcp`, { id: "weather" });
    } catch (err) {
      console.error("Could not connect the weather MCP server", err);
    }
  }

  @callable()
  async connectSentry() {
    return await this.addMcpServer("sentry", "https://mcp.sentry.dev/mcp", { id: "sentry" });
  }

  @callable()
  async disconnectSentry() {
    const { servers } = this.getMcpServers();
    for (const [id, server] of Object.entries(servers)) {
      if (server.name === "sentry") await this.removeMcpServer(id);
    }
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const tools = this.mcp.getAITools();
    const toolNames = new Set(Object.keys(tools));
    const ai = createAI({ binding: this.env.AI });

    // Drop tool calls of MCP servers that are no longer connected, otherwise the model calls them again.
    const messages = this.messages
      .map((m) => ({
        ...m,
        parts: m.parts.filter((p) => !isToolUIPart(p) || toolNames.has(getToolName(p))),
      }))
      .filter((m) => m.parts.length > 0);

    const result = streamText({
      model: ai(MODEL, { sessionAffinity: this.sessionAffinity }),
      system: this.buildSystemPrompt(),
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(5),
      abortSignal: options?.abortSignal,
    });

    return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
  }

  private buildSystemPrompt() {
    const ready = new Set(
      Object.values(this.getMcpServers().servers)
        .filter((s) => s.state === "ready")
        .map((s) => s.name),
    );

    return [
      "You are a friendly weather assistant.",
      ready.has("weather")
        ? "Use getWeather for the current weather and getForecast for the next days. Give the tools only the city name. Use only the values that the tools return, do not add other weather details."
        : "The weather tools are not connected right now. Tell the user that you cannot get live weather data.",
      ready.has("sentry")
        ? "Sentry is connected: use the Sentry tools when the user asks about issues, projects or traces."
        : "",
      "Only call tools from your tool list. If you do not know something, say so. Keep answers short.",
    ]
      .filter(Boolean)
      .join(" ");
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/mcp") return mcpHandler(request, env, ctx);
    // The browser SDK reads its DSN from here, so one SENTRY_DSN variable turns on Sentry for both sides.
    if (pathname === "/config.json") return Response.json({ sentryDsn: env.SENTRY_DSN || null });
    return (await routeAgentRequest(request, env)) ?? new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
