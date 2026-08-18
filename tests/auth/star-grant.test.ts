import { describe, expect, it } from "vitest";
import {
  checkStarGrant,
  StarGrantLedger,
  type StarStatusFetcher,
} from "../../src/auth/star-grant";

function fetcher(starred: Set<string>): StarStatusFetcher {
  return {
    async isStarred({ githubLogin }) {
      return starred.has(githubLogin);
    },
  };
}

describe("REQ-STAR-GRANT auth gate", () => {
  it("denies when not starred", async () => {
    const ledger = new StarGrantLedger();
    const result = await checkStarGrant({
      githubLogin: "alice",
      accessToken: "t",
      fetcher: fetcher(new Set()),
      ledger,
    });
    expect(result).toEqual({ ok: false, reason: "not-starred" });
    expect(ledger.hasClaimed("alice")).toBe(false);
  });

  it("allows first claim when starred; second is already-claimed", async () => {
    const ledger = new StarGrantLedger();
    const stars = fetcher(new Set(["alice"]));
    const first = await checkStarGrant({
      githubLogin: "alice",
      accessToken: "t",
      fetcher: stars,
      ledger,
    });
    expect(first).toEqual({ ok: true });
    ledger.markClaimed("alice");

    const second = await checkStarGrant({
      githubLogin: "alice",
      accessToken: "t",
      fetcher: stars,
      ledger,
    });
    expect(second).toEqual({ ok: false, reason: "already-claimed" });
  });

  it("unstar after claim does not clear the ledger (no clawback)", async () => {
    const ledger = new StarGrantLedger();
    ledger.markClaimed("alice");
    const result = await checkStarGrant({
      githubLogin: "alice",
      accessToken: "t",
      fetcher: fetcher(new Set()),
      ledger,
    });
    expect(result).toEqual({ ok: false, reason: "already-claimed" });
  });
});
