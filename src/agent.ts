import * as Sentry from "@sentry/cloudflare";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { callable, routeAgentRequest } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import {
  convertToModelMessages,
  getToolName,
  isToolUIPart,
  stepCountIs,
  streamText,
} from "ai";

// Kimi sometimes emits its native tool-call template (`<|tool_calls_section_begin|>...`)
// when the bound tool is missing. The provider can't parse it back into a structured
// call, so it leaks as raw text. Strip the section so the model doesn't see and replay it.
function stripKimiTemplate(text: string): string {
  return text
    .replace(
      /<\|tool_calls_section_begin\|>[\s\S]*?<\|tool_calls_section_end\|>/g,
      "",
    )
    .trim();
}

class ChatAgentBase extends AIChatAgent<Env> {
  maxPersistedMessages = 50;

  onStart() {
    // Self-close the popup window after GitHub OAuth completes.
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
        return new Response(
          `Authentication failed: ${result.authError ?? "Unknown error"}`,
          { headers: { "content-type": "text/plain" }, status: 400 },
        );
      },
    });
  }

  // The client invokes this on first mount. Returns either
  //   { state: "authenticating", authUrl } → client opens a popup, or
  //   { state: "ready" } → already signed in, nothing to do.
  @callable()
  async connectGithub() {
    return await this.addMcpServer("github-inspector", this.env.MCP_SERVER_URL);
  }

  @callable()
  async disconnectGithub() {
    return await this.disconnectMcpByName("github-inspector");
  }

  @callable()
  async connectSentry() {
    return await this.addMcpServer("sentry", "https://mcp.sentry.dev/mcp");
  }

  @callable()
  async disconnectSentry() {
    return await this.disconnectMcpByName("sentry");
  }

  private async disconnectMcpByName(name: string) {
    const { servers } = this.getMcpServers();
    for (const [id, s] of Object.entries(servers)) {
      if (s.name === name) await this.removeMcpServer(id);
    }
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const tools = this.mcp.getAITools();
    const validToolNames = new Set(Object.keys(tools));
    const ai = createWorkersAI({ binding: this.env.AI });

    // Sanitize history before feeding it back to the model:
    //   1. Drop tool parts whose tool name is no longer in the roster (e.g. an
    //      MCP was disconnected). Otherwise Kimi replays the stale name.
    //   2. Strip Kimi tool-call template tokens that previously leaked as text.
    //      Without this the model sees its own past leak and repeats it.
    const sanitized = this.messages
      .map((m) => ({
        ...m,
        parts: m.parts
          .map((p) => {
            if (p.type === "text" && typeof p.text === "string") {
              const cleaned = stripKimiTemplate(p.text);
              return cleaned ? { ...p, text: cleaned } : null;
            }
            if (isToolUIPart(p) && !validToolNames.has(getToolName(p))) {
              return null;
            }
            return p;
          })
          .filter((p): p is NonNullable<typeof p> => p !== null),
      }))
      .filter((m) => m.parts.length > 0);

    const result = streamText({
      model: ai("@cf/moonshotai/kimi-k2.6", {
        sessionAffinity: this.sessionAffinity,
      }),
      system: this.buildSystemPrompt(),
      messages: await convertToModelMessages(sanitized),
      tools,
      stopWhen: stepCountIs(5),
      abortSignal: options?.abortSignal,
    });

    return result.toUIMessageStreamResponse();
  }

  private buildSystemPrompt() {
    const ready = Object.values(this.getMcpServers().servers).filter(
      (s) => s.state === "ready",
    );
    const githubReady = ready.some((s) => s.name === "github-inspector");
    const sentryReady = ready.some((s) => s.name === "sentry");

    const guidance: string[] = [];
    if (githubReady) {
      guidance.push(
        "GitHub is connected: when the user gives a URL or owner/name, call getRepoInfo or getRecentPRs and cite the real numbers.",
      );
    }
    if (sentryReady) {
      guidance.push(
        "Sentry is connected: use the available Sentry tools when the user asks about issues, projects, or traces.",
      );
    }

    if (guidance.length === 0) {
      return [
        "You are a helpful assistant. No external tools are connected right now.",
        "Answer from your own knowledge. If the question requires live data,",
        "tell the user which tool (GitHub or Sentry) they need to connect.",
        "Never fabricate tool calls or emit tool-call template syntax in your replies.",
      ].join(" ");
    }

    return [
      "You are a helpful agent.",
      ...guidance,
      "Only call tools that are listed in your current tool roster — never invent tool names.",
      "If you don't know, say so. Keep answers tight.",
    ].join(" ");
  }
}

export const ChatAgent = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => ({
    dsn: "https://0299849066e3bcf4626b214897b6c17f@o447951.ingest.us.sentry.io/4510555608449024",
    tracesSampleRate: 1.0,
    enableRpcTracePropagation: true,
    dataCollection: {},
  }),
  ChatAgentBase,
);

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: "https://0299849066e3bcf4626b214897b6c17f@o447951.ingest.us.sentry.io/4510555608449024",
    tracesSampleRate: 1.0,
    enableRpcTracePropagation: true,
    dataCollection: {},
  }),
  {
    async fetch(req: Request, env: Env): Promise<Response> {
      return (
        (await routeAgentRequest(req, env, { cors: true })) ??
        new Response("Not found", { status: 404 })
      );
    },
  } satisfies ExportedHandler<Env>,
);
