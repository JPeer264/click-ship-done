import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://01a7121b31987d889dc412a9a91ed23d@o447951.ingest.us.sentry.io/4511387458142208",
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^\//, /^https:\/\/click-ship-done/],
});
