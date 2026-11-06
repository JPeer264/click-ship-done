import { MoonIcon, SunIcon, TrashIcon } from "@phosphor-icons/react";
import { IconButton } from "./IconButton";
import { ConnectionPill } from "./ConnectionPill";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  hasMessages: boolean;
  onClearChat: () => void;
  weatherConnected: boolean;
  sentryConnected: boolean;
  sentryConnecting: boolean;
  onConnectSentry: () => void;
  onDisconnectSentry: () => void;
}

export function Header({
  theme,
  onToggleTheme,
  hasMessages,
  onClearChat,
  weatherConnected,
  sentryConnected,
  sentryConnecting,
  onConnectSentry,
  onDisconnectSentry,
}: HeaderProps) {
  return (
    <header>
      <div className="header-brand">
        <h1>Weather Agent</h1>
      </div>
      <div className="header-actions">
        <IconButton
          onClick={onToggleTheme}
          label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </IconButton>
        {hasMessages && (
          <IconButton onClick={onClearChat} label="Clear chat">
            <TrashIcon size={18} />
          </IconButton>
        )}
        <ConnectionPill name="Weather" connected={weatherConnected} connecting={!weatherConnected} />
        <ConnectionPill
          name="Sentry"
          connected={sentryConnected}
          connecting={sentryConnecting}
          onConnect={onConnectSentry}
          onDisconnect={onDisconnectSentry}
        />
      </div>
    </header>
  );
}
