import { useState } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { MCPServersState } from "agents";
import type { ChatAgent } from "./agent";
import { ChatInput, ChatMessage, Header } from "./components";
import { useMcpServer, useScrollToBottom, useTheme } from "./hooks";

type ConnectResult = { state: "ready" } | { state: "authenticating"; authUrl: string };

const SUGGESTIONS = ["What is the weather in Krakow?", "Do I need an umbrella in Vienna this week?"];

function getSessionId(): string {
  let id = localStorage.getItem("session-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("session-id", id);
  }
  return id;
}

export function App() {
  const [mcpServers, setMcpServers] = useState<MCPServersState["servers"]>({});
  const [sessionId] = useState(getSessionId);
  const { theme, toggle: toggleTheme } = useTheme();

  // One agent instance (one Durable Object) for each browser.
  const agent = useAgent<InstanceType<typeof ChatAgent>>({
    agent: "ChatAgent",
    name: sessionId,
    onMcpUpdate: (s) => setMcpServers(s.servers),
  });

  const { messages, sendMessage, status, stop, clearHistory } = useAgentChat({ agent });

  const weather = useMcpServer(mcpServers, "weather");
  const sentry = useMcpServer(mcpServers, "sentry");
  const scrollRef = useScrollToBottom(messages);
  const busy = status === "submitted" || status === "streaming";

  const connectSentry = async () => {
    try {
      const res = (await agent.call("connectSentry")) as ConnectResult;
      if (res?.state === "authenticating" && res.authUrl) {
        window.open(res.authUrl, "mcp-oauth-sentry", "width=620,height=760,popup=yes");
      }
    } catch (err) {
      console.error("connectSentry failed:", err);
    }
  };

  const disconnectSentry = async () => {
    try {
      await agent.call("disconnectSentry");
    } catch (err) {
      console.error("disconnectSentry failed:", err);
    }
  };

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        hasMessages={messages.length > 0}
        onClearChat={clearHistory}
        weatherConnected={weather.ready}
        sentryConnected={sentry.ready}
        sentryConnecting={sentry.connecting}
        onConnectSentry={connectSentry}
        onDisconnectSentry={disconnectSentry}
      />
      <main ref={scrollRef}>
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>What would you like to know?</h2>
              <p>Ask about the weather anywhere in the world</p>
              <div className="suggestions">
                {SUGGESTIONS.map((text) => (
                  <button key={text} onClick={() => sendMessage({ text })}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <ChatMessage key={m.id} msg={m} />)
          )}
        </div>
      </main>
      <ChatInput busy={busy} onSend={(text) => sendMessage({ text })} onStop={stop} />
    </div>
  );
}
