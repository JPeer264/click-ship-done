import type {
  AuthRequest,
  OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";

interface AuthEnv {
  OAUTH_PROVIDER: OAuthHelpers;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

const app = new Hono<{ Bindings: AuthEnv }>();

// Encode/decode the AuthRequest through the GitHub `state` parameter.
function encodeState(req: AuthRequest): string {
  return btoa(JSON.stringify(req))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeState(s: string): AuthRequest {
  const padded = s.replaceAll("-", "+").replaceAll("_", "/");
  const pad = (4 - (padded.length % 4)) % 4;
  return JSON.parse(atob(padded + "=".repeat(pad)));
}

// Step 1 — MCP client redirects user here. We forward to GitHub.
app.get("/authorize", async (c) => {
  const oauthReq = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const client = await c.env.OAUTH_PROVIDER.lookupClient(oauthReq.clientId);
  if (!client) return c.text("Invalid client_id", 400);

  const redirectUri = `${new URL(c.req.url).origin}/callback`;
  const ghUrl = new URL("https://github.com/login/oauth/authorize");
  ghUrl.searchParams.set("client_id", c.env.GITHUB_CLIENT_ID);
  ghUrl.searchParams.set("redirect_uri", redirectUri);
  ghUrl.searchParams.set("scope", "public_repo read:user");
  ghUrl.searchParams.set("state", encodeState(oauthReq));

  return c.redirect(ghUrl.toString(), 302);
});

// Step 2 — GitHub bounces the user back here with a code.
app.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state) return c.text("Missing code or state", 400);

  let oauthReq: AuthRequest;
  try {
    oauthReq = decodeState(state);
  } catch {
    return c.text("Invalid state parameter", 400);
  }

  const redirectUri = `${new URL(c.req.url).origin}/callback`;

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "click-ship-done-mcp",
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenJson.access_token) {
    return c.text(
      `GitHub token exchange failed: ${tokenJson.error_description ?? tokenJson.error ?? "no token"}`,
      500,
    );
  }

  let userRes: Response;
  try {
    userRes = await fetch("https://api.github.com/user", {
      headers: {
        authorization: `Bearer ${tokenJson.access_token}`,
        "user-agent": "click-ship-done-mcp",
        accept: "application/vnd.github+json",
      },
    });
  } catch (err) {
    console.error("GitHub user fetch failed:", err);
    return c.text(`GitHub user fetch failed: ${err}`, 500);
  }

  if (!userRes.ok) {
    const body = await userRes.text();
    console.error("GitHub user API error:", userRes.status, body);
    return c.text(`GitHub user API error: ${userRes.status} - ${body}`, 500);
  }

  const user = (await userRes.json()) as {
    login: string;
    id: number;
    name: string | null;
    avatar_url: string;
  };

  let redirectTo: string;
  try {
    const result = await c.env.OAUTH_PROVIDER.completeAuthorization({
      request: oauthReq,
      userId: String(user.id),
      metadata: { label: `GitHub: @${user.login}` },
      scope: oauthReq.scope,
      props: {
        githubToken: tokenJson.access_token,
        login: user.login,
        name: user.name ?? user.login,
        avatarUrl: user.avatar_url,
      },
    });
    redirectTo = result.redirectTo;
  } catch (err) {
    console.error("completeAuthorization failed:", err);
    return c.text(`OAuth completion failed: ${err}`, 500);
  }

  return c.redirect(redirectTo, 302);
});

app.get("/", (c) =>
  c.text(
    "github-inspector MCP server (OAuth-protected via GitHub). MCP endpoint: /mcp",
    200,
  ),
);

// Debug endpoint to test GitHub API fetch
app.get("/debug-fetch", async (c) => {
  try {
    const res = await fetch("https://api.github.com/zen", {
      headers: {
        "user-agent": "click-ship-done-mcp",
        accept: "application/vnd.github+json",
      },
    });
    const text = await res.text();
    return c.json({ status: res.status, body: text });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

export { app as AuthHandler };
