import "./styles.css";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { initSentry } from "./instrument";
import { App } from "./app";

await initSentry();

const root = createRoot(document.getElementById("root")!, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn("Uncaught error", error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
});
root.render(<App />);
