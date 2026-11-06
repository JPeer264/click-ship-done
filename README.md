# Click. Ship. Done. AI Agents on Cloudflare

Demo project of the talk **"Click. Ship. Done. AI Agents on Cloudflare"**.

A chat agent that answers questions about the weather. It gets live data from a weather MCP server with two tools, `getWeather` and `getForecast` ([Open-Meteo](https://open-meteo.com), no API key). The agent, the MCP server and the React app are one Worker.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/JPeer264/click-ship-done)

The button copies this repository to your GitHub account, creates the Durable Object and the Workers AI binding, and runs `vite build && wrangler deploy`. You do not need an API key: the model `@cf/zai-org/glm-4.7-flash` runs on the Workers AI free plan.

## Sentry (optional)

Set `SENTRY_DSN` to the DSN of your Sentry project, in the deploy form or later in the dashboard (**Settings** > **Variables and Secrets**). One value turns on Sentry for the Worker and for the browser. Without it, the app runs without Sentry.

## Local development

```bash
$ pnpm install
$ pnpm dev
```

Open http://localhost:5173 and ask:

> Do I need an umbrella in Vienna this week?

Workers AI always runs remotely, so `pnpm dev` asks you to log in to Cloudflare once.

## Deploy from your machine

```bash
$ pnpm run deploy
```

## Files

| Path                       | What                                                                     |
| -------------------------- | ------------------------------------------------------------------------ |
| `wrangler.jsonc`           | Worker config: Workers AI, the `ChatAgent` Durable Object, static assets |
| `src/agent.ts`             | `ChatAgent` (extends `AIChatAgent`) and the Worker `fetch` handler       |
| `src/mcp.ts`               | The weather MCP server at `/mcp`                                         |
| `src/instrument.server.ts` | Sentry options of the Worker                                             |
| `src/app.tsx`              | React chat UI                                                            |

## License

MIT.
