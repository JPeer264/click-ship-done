// Bindings of wrangler.jsonc.
import type { ChatAgent } from "./agent";

declare global {
  interface Env {
    AI: Ai;
    ASSETS: Fetcher;
    ChatAgent: DurableObjectNamespace<ChatAgent>;
    /** DSN of the Sentry project, or "off" to run without Sentry. */
    SENTRY_DSN: string;
  }
}

export {};
