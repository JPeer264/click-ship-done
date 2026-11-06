import * as Sentry from "@sentry/cloudflare";

// Read by sentryCloudflareVitePlugin(). Without a SENTRY_DSN value, Sentry sends nothing.
export default Sentry.defineCloudflareOptions((env: Env) => ({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 1.0,
}));
