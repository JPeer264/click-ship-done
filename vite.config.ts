import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryCloudflareVitePlugin } from "@sentry/cloudflare/vite";
import react from "@vitejs/plugin-react";
import agents from "agents/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // agents() transforms the @callable() decorators, Vite 8 does not do that.
  plugins: [agents(), react(), cloudflare(), sentryCloudflareVitePlugin()],
});
