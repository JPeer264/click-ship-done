// Bindings of wrangler.jsonc.
import type { ChatAgent } from "./agent";

declare global {
  interface Env {
    AI: Ai;
    ASSETS: Fetcher;
    ChatAgent: DurableObjectNamespace<ChatAgent>;
    SENTRY_DSN: string;
  }
}

export {};
