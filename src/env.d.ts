// Bindings of wrangler.jsonc.
import type { ChatAgent } from "./agent";

declare global {
  interface Env {
    AI: Ai;
    ASSETS: Fetcher;
    ChatAgent: DurableObjectNamespace<ChatAgent>;
    /** DSN of the Sentry project, set as a secret of the Worker. Without it, Sentry is off. */
    SENTRY_DSN?: string;
  }
}

export {};
