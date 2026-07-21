import "./instrument";
import "./styles.css";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { App } from "./app";

const root = createRoot(document.getElementById("root")!, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn("Uncaught error", error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
});
root.render(<App />);
