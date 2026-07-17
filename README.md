# Click. Ship. Done. — AI Agents on Cloudflare

Demo project from the talk **"Click. Ship. Done. AI Agents on Cloudflare"**.

A chat agent that inspects any GitHub repo by calling MCP tools that hit the
GitHub REST API. The MCP server is OAuth-protected — visitors sign in with
their own GitHub account, so each user uses their own rate limit and can
inspect their own private repos. Two Workers, one repo, one `pnpm deploy`.

## One-time setup

### 1. Install

```bash
$ pnpm install
```

### 2. Create a GitHub OAuth App

Go to https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**.

| Field                       | Local dev                            | Production                                                |
|-----------------------------|--------------------------------------|-----------------------------------------------------------|
| Application name            | `click-ship-done (local)`            | `click-ship-done`                                         |
| Homepage URL                | `http://localhost:8788`              | `https://click-ship-done-mcp.<your-sub>.workers.dev`      |
| Authorization callback URL  | `http://localhost:8788/callback`     | `https://click-ship-done-mcp.<your-sub>.workers.dev/callback` |

Generate a client secret and keep both `Client ID` and `Client Secret` handy.
You'll likely want one OAuth App per environment.

### 3. Create the KV namespace (for OAuth state)

```bash
$ pnpm wrangler kv namespace create OAUTH_KV
```

Paste the printed `id` into the `kv_namespaces` array in
`wrangler.mcp.jsonc` (replace `REPLACE_WITH_KV_NAMESPACE_ID`).

### 4. Set the GitHub OAuth secrets

For deploy:
```bash
$ pnpm wrangler secret put GITHUB_CLIENT_ID -c wrangler.mcp.jsonc
$ pnpm wrangler secret put GITHUB_CLIENT_SECRET -c wrangler.mcp.jsonc
```

For local dev, create `.dev.vars` (gitignored) in the repo root:

```ini
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MCP_SERVER_URL=http://localhost:8788/mcp
```

## Local dev

In two terminals:

```bash
$ pnpm dev:mcp     # http://localhost:8788   (MCP at /mcp, OAuth at /authorize)
$ pnpm dev:agent   # http://localhost:5173   (React chat + agent worker)
```

Open `http://localhost:5173` → a popup opens to GitHub for OAuth → after
approval, ask:

> summarize cloudflare/agents and tell me if it's healthy

## Deploy

```bash
$ pnpm deploy:mcp
# → prints e.g. https://click-ship-done-mcp.<your-sub>.workers.dev

# Set MCP_SERVER_URL for the agent (once per account):
$ echo "https://click-ship-done-mcp.<your-sub>.workers.dev/mcp" | pnpm wrangler secret put MCP_SERVER_URL -c wrangler.agent.jsonc

$ pnpm deploy:agent
```

After initial setup, `pnpm deploy` runs both.

## Files

| Path                       | What                                                              |
|----------------------------|-------------------------------------------------------------------|
| `wrangler.mcp.jsonc`       | MCP-server Worker config (KV for OAuth state, no DO).             |
| `wrangler.agent.jsonc`     | Agent Worker config (Workers AI, ChatAgent DO, assets).           |
| `src/mcp.ts`               | MCP server: 3 tools (`whoami`, `getRepoInfo`, `getRecentPRs`).    |
| `src/auth-handler.ts`      | Hono routes for `/authorize` and `/callback` (GitHub OAuth).      |
| `src/agent.ts`             | `ChatAgent` extends `AIChatAgent`; auto-adds MCP, popup handler.  |
| `src/app.tsx`              | React chat UI (Streamdown, Phosphor icons, collapsible tools).    |
| `index.html`               | Vite entry.                                                       |

## License

MIT.
