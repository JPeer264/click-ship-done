import { GithubLogo } from "@phosphor-icons/react";

interface LoginScreenProps {
  connecting: boolean;
  onConnect: () => void;
}

export function LoginScreen({ connecting, onConnect }: LoginScreenProps) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">
          <GithubLogo size={48} weight="fill" />
        </div>
        <h1>GitHub Repo Agent</h1>
        <p>Analyze repos, check PRs, and explore code with AI</p>
        <button
          type="button"
          className="login-btn"
          onClick={onConnect}
          disabled={connecting}
        >
          <GithubLogo size={20} weight="fill" />
          {connecting ? "Connecting..." : "Sign in with GitHub"}
        </button>
        <span className="login-footer">Powered by Cloudflare Workers</span>
      </div>
    </div>
  );
}
