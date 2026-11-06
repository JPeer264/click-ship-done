import * as Sentry from "@sentry/react";

// The DSN comes from the SENTRY_DSN variable of the Worker. Without it, the app runs without Sentry.
export async function initSentry() {
  try {
    const res = await fetch("/config.json");
    const { sentryDsn } = (await res.json()) as { sentryDsn: string | null };
    if (!sentryDsn) return;
    Sentry.init({
      dsn: sentryDsn,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 1.0,
    });
  } catch (err) {
    console.warn("Sentry is off, /config.json failed", err);
  }
}
