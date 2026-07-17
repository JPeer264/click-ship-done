import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { createMcpHandler, getMcpAuthContext } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AuthHandler } from "./auth-handler";

interface UserProps {
  githubToken: string;
  login: string;
  name: string;
  avatarUrl: string;
}

function ghHeaders(): Record<string, string> {
  const auth = getMcpAuthContext();
  const token = (auth?.props as UserProps | undefined)?.githubToken;
  const h: Record<string, string> = {
    "user-agent": "click-ship-done-mcp",
    accept: "application/vnd.github+json",
  };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

function buildServer() {
  const server = new McpServer({
    name: "github-inspector",
    version: "0.1.0",
  });

  server.registerTool(
    "whoami",
    {
      description:
        "Returns the GitHub login of the user currently signed in to the MCP server.",
      inputSchema: {},
    },
    async () => {
      const auth = getMcpAuthContext();
      const props = auth?.props as UserProps | undefined;
      return {
        content: [
          {
            type: "text",
            text: props
              ? `Signed in as @${props.login} (${props.name})`
              : "Not signed in.",
          },
        ],
      };
    },
  );

  server.registerTool(
    "getRepoInfo",
    {
      description:
        "Get high-level info (stars, language, description, open issues, last push) for a GitHub repo.",
      inputSchema: { owner: z.string(), name: z.string() },
    },
    async ({ owner, name }) => {
      const r = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers: ghHeaders(),
      });
      if (!r.ok) {
        return {
          content: [
            {
              type: "text",
              text: `GitHub returned ${r.status} for ${owner}/${name}`,
            },
          ],
          isError: true,
        };
      }
      const d = (await r.json()) as Record<string, unknown>;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              fullName: d.full_name,
              stars: d.stargazers_count,
              forks: d.forks_count,
              language: d.language,
              description: d.description,
              openIssues: d.open_issues_count,
              pushedAt: d.pushed_at,
              homepage: d.homepage,
              license:
                (d.license as Record<string, unknown> | null)?.spdx_id ?? null,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "getMyRepos",
    {
      description:
        "List the GitHub repos owned by the currently signed-in user, ordered by star count (highest first). Use this when the user asks 'my repos', 'how many repos do I have', 'which of my repos has the most stars', etc.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max repos to return (default 30, max 100)"),
      },
    },
    async ({ limit }) => {
      const auth = getMcpAuthContext();
      const props = auth?.props as UserProps | undefined;
      if (!props) {
        return {
          content: [{ type: "text", text: "Not signed in." }],
          isError: true,
        };
      }
      const perPage = Math.min(100, limit ?? 30);
      const r = await fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&affiliation=owner&sort=updated&direction=desc`,
        { headers: ghHeaders() },
      );
      if (!r.ok) {
        return {
          content: [
            { type: "text", text: `GitHub returned ${r.status} listing your repos` },
          ],
          isError: true,
        };
      }
      const repos = (await r.json()) as Array<Record<string, unknown>>;
      const summary = repos
        .map((d) => ({
          fullName: d.full_name,
          stars: d.stargazers_count as number,
          forks: d.forks_count as number,
          language: d.language,
          description: d.description,
          private: d.private,
          archived: d.archived,
          pushedAt: d.pushed_at,
        }))
        .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              login: props.login,
              count: summary.length,
              note:
                summary.length === perPage
                  ? `Showing the ${perPage} most-recently-updated repos. Increase 'limit' for more.`
                  : "Full list.",
              repos: summary,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "getRecentPRs",
    {
      description:
        "List the most recent pull requests for a GitHub repo.",
      inputSchema: { owner: z.string(), name: z.string() },
    },
    async ({ owner, name }) => {
      const r = await fetch(
        `https://api.github.com/repos/${owner}/${name}/pulls?state=all&per_page=5&sort=updated&direction=desc`,
        { headers: ghHeaders() },
      );
      if (!r.ok) {
        return {
          content: [
            {
              type: "text",
              text: `GitHub returned ${r.status} for ${owner}/${name}`,
            },
          ],
          isError: true,
        };
      }
      const prs = (await r.json()) as Array<Record<string, unknown>>;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              prs.map((p) => ({
                number: p.number,
                title: p.title,
                author: (p.user as Record<string, unknown>)?.login,
                state: p.state,
                draft: p.draft,
                updatedAt: p.updated_at,
              })),
            ),
          },
        ],
      };
    },
  );

  return server;
}

const apiHandler = {
  async fetch(req: Request, env: unknown, ctx: ExecutionContext) {
    return createMcpHandler(buildServer())(req, env, ctx);
  },
};

export default new OAuthProvider({
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  apiRoute: "/mcp",
  apiHandler,
  defaultHandler: {
    async fetch(req: Request, env: unknown, ctx: ExecutionContext) {
      return AuthHandler.fetch(req, env as Record<string, unknown>, ctx);
    },
  },
});
