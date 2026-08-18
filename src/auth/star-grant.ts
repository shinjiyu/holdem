/** Star check + one-time claim ledger. No BankPort here — compose grants. */

export interface StarStatusFetcher {
  /** GET /user/starred/{owner}/{repo} → 204 starred, 404 not. */
  isStarred(input: { githubLogin: string; accessToken: string }): Promise<boolean>;
}

export type StarGrantDenyReason = "not-starred" | "already-claimed";

export type StarGrantCheckResult =
  | { ok: true }
  | { ok: false; reason: StarGrantDenyReason };

export class StarGrantLedger {
  private readonly claimed = new Set<string>();

  hasClaimed(githubLogin: string): boolean {
    return this.claimed.has(githubLogin);
  }

  markClaimed(githubLogin: string): void {
    this.claimed.add(githubLogin);
  }
}

/**
 * Auth-side gate: starred + never claimed.
 * Caller (compose / H5 host) must call BankPort.grant on ok.
 */
export async function checkStarGrant(input: {
  githubLogin: string;
  accessToken: string;
  fetcher: StarStatusFetcher;
  ledger: StarGrantLedger;
}): Promise<StarGrantCheckResult> {
  if (input.ledger.hasClaimed(input.githubLogin)) {
    return { ok: false, reason: "already-claimed" };
  }
  const starred = await input.fetcher.isStarred({
    githubLogin: input.githubLogin,
    accessToken: input.accessToken,
  });
  if (!starred) {
    return { ok: false, reason: "not-starred" };
  }
  return { ok: true };
}

/** Production fetcher for api.github.com. Inject a mock in tests. */
export function createGithubStarFetcher(repo: string): StarStatusFetcher {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`starGrantRepo must be owner/name, got ${repo}`);
  }
  return {
    async isStarred(input) {
      const res = await fetch(
        `https://api.github.com/user/starred/${owner}/${name}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${input.accessToken}`,
          },
        },
      );
      if (res.status === 204) return true;
      if (res.status === 404) return false;
      throw new Error(`star check failed: ${res.status}`);
    },
  };
}
