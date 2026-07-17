import type { MCPServersState } from "agents";

type ServerState = MCPServersState["servers"][string];

function findByName(servers: MCPServersState["servers"], name: string): ServerState | undefined {
  const matches = Object.values(servers).filter((s) => s.name === name);
  return matches.find((s) => s.state === "ready") ?? matches[0];
}

export function useMcpServer(servers: MCPServersState["servers"], name: string) {
  const server = findByName(servers, name);

  return {
    server,
    ready: server?.state === "ready",
    connecting:
      server?.state === "authenticating" ||
      server?.state === "connecting" ||
      server?.state === "discovering",
  };
}
