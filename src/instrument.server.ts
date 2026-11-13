import * as Sentry from "@sentry/cloudflare";
import { sentryDsn } from "./sentry-dsn";

// Read by sentryCloudflareVitePlugin(). Without a DSN in SENTRY_DSN, Sentry sends nothing.
export default Sentry.defineCloudflareOptions((env: Env) => ({
  dsn: sentryDsn(env),
  tracesSampleRate: 1.0,
}));
