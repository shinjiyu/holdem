import { describe, expect, it } from "vitest";
import { Auth, type GitHubProfileFetcher } from "../../src/auth";

function mockFetcher(map: Record<string, string>): GitHubProfileFetcher {
  return {
    async fetchByCode(code: string) {
      const login = map[code];
      if (!login) throw new Error(`unknown oauth code: ${code}`);
      return { login };
    },
  };
}

describe("REQ-AUTH-GITHUB oauth", () => {
  it("completeOAuth with injected GitHubProfileFetcher returns githubLogin", async () => {
    const auth = new Auth({
      clientId: "test-id",
      profileFetcher: mockFetcher({ "fake-code": "octocat" }),
    });
    const result = await auth.completeOAuth("fake-code");
    expect(result.githubLogin).toBe("octocat");
  });

  it("rejects unknown fake codes without hitting the network", async () => {
    const auth = new Auth({
      clientId: "test-id",
      profileFetcher: mockFetcher({ "fake-code": "octocat" }),
    });
    await expect(auth.completeOAuth("other")).rejects.toThrow(/unknown oauth code/);
  });

  it("authorizationUrl is top-level GitHub OAuth", () => {
    const auth = new Auth({
      clientId: "abc123",
      redirectUri: "https://kuroneko.chat/holdem/oauth/callback",
    });
    const url = auth.authorizationUrl("state-1");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://github.com/login/oauth/authorize",
    );
    expect(parsed.searchParams.get("client_id")).toBe("abc123");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://kuroneko.chat/holdem/oauth/callback",
    );
    expect(parsed.searchParams.get("state")).toBe("state-1");
  });

  it("does not require GITHUB_CLIENT_SECRET when a fetcher is injected", async () => {
    const auth = new Auth({
      clientId: "test-id",
      profileFetcher: mockFetcher({ x: "alice" }),
    });
    await expect(auth.completeOAuth("x")).resolves.toEqual({ githubLogin: "alice" });
  });
});
