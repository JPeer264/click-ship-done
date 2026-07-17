// Cloudflare bindings for the Agent worker. Regenerate with:
//   pnpm types:agent
// after editing wrangler.agent.jsonc. Hand-written for now so the talk demo
// has zero codegen steps.

import type { ChatAgent } from "./agent";

declare global {
  interface Env {
    AI: Ai;
    ASSETS: Fetcher;
    ChatAgent: DurableObjectNamespace<ChatAgent>;
    MCP_SERVER_URL: string;
  }
}

export {};
