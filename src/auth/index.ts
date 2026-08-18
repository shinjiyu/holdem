/** GitHub OAuth + table tokens. Infra, not a plugin. */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface TableToken {
  tableId: string;
  seat: number;
  githubLogin: string;
}

export interface IssuedTableToken extends TableToken {
  token: string;
}

export interface IssueTableTokenInput {
  githubLogin: string;
  tableId: string;
  seat: number;
}

/** Star-grant is checked here; credit goes through BankPort (compose wires). */
export interface StarGrantCheck {
  githubLogin: string;
  starred: boolean;
  alreadyClaimed: boolean;
}

export function authId(): "auth" {
  return "auth";
}

export interface GitHubProfile {
  login: string;
  /** Present when fetched via real OAuth code exchange. */
  accessToken?: string;
  avatarUrl?: string;
}

/** Injected in tests so OAuth never needs network or a real client secret. */
export interface GitHubProfileFetcher {
  fetchByCode(code: string): Promise<GitHubProfile>;
}

export interface AuthOptions {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  tokenSecret?: string;
  profileFetcher?: GitHubProfileFetcher;
}

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

export function createGithubProfileFetcher(oauth: {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}): GitHubProfileFetcher {
  return {
    async fetchByCode(code: string): Promise<GitHubProfile> {
      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: oauth.clientId,
          client_secret: oauth.clientSecret,
          code,
          ...(oauth.redirectUri ? { redirect_uri: oauth.redirectUri } : {}),
        }),
      });
      if (!tokenRes.ok) {
        throw new Error(`oauth token exchange failed: ${tokenRes.status}`);
      }
      const tokenJson = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
      };
      if (!tokenJson.access_token) {
        throw new Error(tokenJson.error ?? "oauth exchange failed");
      }
      const userRes = await fetch(USER_URL, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${tokenJson.access_token}`,
        },
      });
      if (!userRes.ok) {
        throw new Error(`github profile fetch failed: ${userRes.status}`);
      }
      const user = (await userRes.json()) as {
        login?: string;
        avatar_url?: string;
      };
      if (!user.login) {
        throw new Error("github profile missing login");
      }
      return {
        login: user.login,
        accessToken: tokenJson.access_token,
        avatarUrl: user.avatar_url,
      };
    },
  };
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function normalizeClaims(input: IssueTableTokenInput): TableToken {
  const githubLogin = input.githubLogin.trim();
  const tableId = input.tableId.trim();
  const seat = input.seat;
  if (!githubLogin) throw new Error("githubLogin is required");
  if (!tableId) throw new Error("tableId is required");
  if (!Number.isInteger(seat) || seat < 0) {
    throw new Error("seat must be a non-negative integer");
  }
  return { githubLogin, tableId, seat };
}

function isTableToken(v: unknown): v is TableToken {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.githubLogin === "string" &&
    typeof o.tableId === "string" &&
    typeof o.seat === "number"
  );
}

function parseAndVerify(token: string, secret: string): TableToken {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) throw new Error("malformed table token");
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(secret, payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("invalid table token signature");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("malformed table token payload");
  }
  if (!isTableToken(parsed)) {
    throw new Error("malformed table token claims");
  }
  return parsed;
}

export class Auth {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly tokenSecret: string;
  private readonly profileFetcher?: GitHubProfileFetcher;

  constructor(options: AuthOptions = {}) {
    this.clientId = options.clientId ?? process.env.GITHUB_CLIENT_ID ?? "";
    this.clientSecret =
      options.clientSecret ?? process.env.GITHUB_CLIENT_SECRET ?? "";
    this.redirectUri = options.redirectUri ?? "";
    this.tokenSecret =
      options.tokenSecret ?? process.env.TABLE_TOKEN_SECRET ?? "";
    this.profileFetcher = options.profileFetcher;
  }

  /** Top-level GitHub OAuth URL (do not embed in an iframe). */
  authorizationUrl(state?: string): string {
    if (!this.clientId) {
      throw new Error("GITHUB_CLIENT_ID is required for authorizationUrl");
    }
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", this.clientId);
    if (this.redirectUri) {
      url.searchParams.set("redirect_uri", this.redirectUri);
    }
    url.searchParams.set("scope", "read:user");
    if (state) url.searchParams.set("state", state);
    return url.toString();
  }

  async completeOAuth(code: string): Promise<{
    githubLogin: string;
    accessToken?: string;
    avatarUrl?: string;
  }> {
    const fetcher = this.profileFetcher ?? this.defaultFetcher();
    const profile = await fetcher.fetchByCode(code);
    return {
      githubLogin: profile.login,
      accessToken: profile.accessToken,
      avatarUrl: profile.avatarUrl,
    };
  }

  issueTableToken(input: IssueTableTokenInput): IssuedTableToken {
    const claims = normalizeClaims(input);
    if (!this.tokenSecret) {
      throw new Error("TABLE_TOKEN_SECRET is required to issue table tokens");
    }
    const payload = Buffer.from(JSON.stringify(claims), "utf8").toString(
      "base64url",
    );
    const token = `${payload}.${sign(this.tokenSecret, payload)}`;
    return { ...claims, token };
  }

  verifyTableToken(token: string, expected: IssueTableTokenInput): TableToken {
    if (!this.tokenSecret) {
      throw new Error("TABLE_TOKEN_SECRET is required to verify table tokens");
    }
    const claims = parseAndVerify(token, this.tokenSecret);
    const want = normalizeClaims(expected);
    if (claims.githubLogin !== want.githubLogin) {
      throw new Error("table token githubLogin mismatch");
    }
    if (claims.tableId !== want.tableId) {
      throw new Error("table token tableId mismatch");
    }
    if (claims.seat !== want.seat) {
      throw new Error("table token seat mismatch");
    }
    return claims;
  }

  private defaultFetcher(): GitHubProfileFetcher {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required unless a GitHubProfileFetcher is injected",
      );
    }
    return createGithubProfileFetcher({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      redirectUri: this.redirectUri || undefined,
    });
  }
}
