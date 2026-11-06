import { CheckCircleIcon, PlugsConnectedIcon, XCircleIcon } from "@phosphor-icons/react";

interface ConnectionPillProps {
  name: string;
  connected: boolean;
  connecting: boolean;
  /** Without handlers, the pill only shows the connection state. */
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ConnectionPill({ name, connected, connecting, onConnect, onDisconnect }: ConnectionPillProps) {
  if (connected) {
    if (!onDisconnect) {
      return (
        <span className="pill connected static">
          <CheckCircleIcon size={14} weight="fill" className="icon-check" />
          {name}
        </span>
      );
    }
    return (
      <button
        type="button"
        className="pill connected"
        onClick={onDisconnect}
        title={`Disconnect ${name}`}
        aria-label={`Disconnect ${name}`}
      >
        <CheckCircleIcon size={14} weight="fill" className="icon-check" />
        <XCircleIcon size={14} weight="fill" className="icon-x" />
        {name}
      </button>
    );
  }

  return (
    <button type="button" className="pill" onClick={onConnect} disabled={connecting || !onConnect}>
      <PlugsConnectedIcon size={14} weight="duotone" />
      {connecting ? `Connecting ${name}...` : `Connect ${name}`}
    </button>
  );
}
