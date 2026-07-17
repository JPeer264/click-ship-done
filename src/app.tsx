import { useState } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { MCPServersState } from "agents";
import type { ChatAgent } from "./agent";
import { ChatInput, ChatMessage, Header, LoginScreen } from "./components";
import { useMcpServer, useScrollToBottom, useTheme } from "./hooks";

type ConnectResult =
  | { state: "ready" }
  | { state: "authenticating"; authUrl: string };

function openOAuthPopup(authUrl: string, name: string): Window | null {
  return window.open(authUrl, name, "width=620,height=760,popup=yes");
}

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

  const agent = useAgent<ChatAgent>({
    agent: "ChatAgent",
    name: sessionId,
    onMcpUpdate: (s) => setMcpServers(s.servers),
  });

  const { messages, sendMessage, status, stop, clearHistory } = useAgentChat({ agent });

  const github = useMcpServer(mcpServers, "github-inspector");
  const sentry = useMcpServer(mcpServers, "sentry");
  const scrollRef = useScrollToBottom(messages);
  const busy = status === "submitted" || status === "streaming";

  const connectMcp = async (method: "connectGithub" | "connectSentry", popupName: string) => {
    try {
      const res = (await agent.call(method)) as ConnectResult;
      if (res?.state === "authenticating" && res.authUrl) {
        openOAuthPopup(res.authUrl, popupName);
      }
    } catch (err) {
      console.error(`${method} failed:`, err);
    }
  };

  const disconnectMcp = async (method: "disconnectGithub" | "disconnectSentry") => {
    try {
      await agent.call(method);
    } catch (err) {
      console.error(`${method} failed:`, err);
    }
  };

  if (!github.ready) {
    return (
      <LoginScreen
        connecting={github.connecting}
        onConnect={() => connectMcp("connectGithub", "mcp-oauth-github")}
      />
    );
  }

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        hasMessages={messages.length > 0}
        onClearChat={clearHistory}
        sentryConnected={sentry.ready}
        sentryConnecting={sentry.connecting}
        onConnectSentry={() => connectMcp("connectSentry", "mcp-oauth-sentry")}
        onDisconnectSentry={() => disconnectMcp("disconnectSentry")}
        onDisconnectGithub={() => disconnectMcp("disconnectGithub")}
      />
      <main ref={scrollRef}>
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>What would you like to know?</h2>
              <p>Ask about any GitHub repository, PRs, or issues</p>
              <div className="suggestions">
                <button onClick={() => sendMessage({ text: "Summarize cloudflare/agents" })}>
                  Summarize cloudflare/agents
                </button>
                <button onClick={() => sendMessage({ text: "Show recent PRs in vercel/next.js" })}>
                  Recent PRs in vercel/next.js
                </button>
              </div>
            </div>
          ) : (
            messages.map((m) => <ChatMessage key={m.id} msg={m} />)
          )}
        </div>
      </main>
      <ChatInput
        busy={busy}
        onSend={(text) => sendMessage({ text })}
        onStop={stop}
      />
    </div>
  );
}
