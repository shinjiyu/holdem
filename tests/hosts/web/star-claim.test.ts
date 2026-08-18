import { describe, expect, it } from "vitest";
import { BankPlugin } from "../../../src/bank";
import { DEFAULT_TABLE_CONFIG } from "../../../src/config";
import { StarGrantLedger, type StarStatusFetcher } from "../../../src/auth/star-grant";
import { StarClaimHost } from "../../../src/hosts/web/star-claim";

const { startingStack, starGrantChips } = DEFAULT_TABLE_CONFIG;

function mockFetcher(starred: boolean): StarStatusFetcher {
  return {
    async isStarred() {
      return starred;
    },
  };
}

describe("REQ-STAR-GRANT H5 claim", () => {
  it("does not grant when not starred", async () => {
    const bank = new BankPlugin();
    bank.sit({ seat: 0, githubLogin: "alice" });
    const host = new StarClaimHost(bank, mockFetcher(false));
    await expect(host.claim("alice", "tok")).rejects.toThrow(/not-starred/);
    expect(bank.stack(0)).toBe(startingStack);
  });

  it("grants config.starGrantChips once; second claim fails", async () => {
    const bank = new BankPlugin();
    bank.sit({ seat: 0, githubLogin: "alice" });
    const host = new StarClaimHost(bank, mockFetcher(true));
    const first = await host.claim("alice", "tok");
    expect(first.granted).toBe(starGrantChips);
    expect(bank.stack(0)).toBe(startingStack + starGrantChips);

    await expect(host.claim("alice", "tok")).rejects.toThrow(/already-claimed/);
    expect(bank.stack(0)).toBe(startingStack + starGrantChips);
  });

  it("accounts are independent; bank never sees GitHub", async () => {
    const bank = new BankPlugin();
    bank.sit({ seat: 0, githubLogin: "alice" });
    bank.sit({ seat: 1, githubLogin: "bob" });
    const ledger = new StarGrantLedger();
    const host = new StarClaimHost(bank, mockFetcher(true), { ledger });
    await host.claim("alice", "a");
    await host.claim("bob", "b");
    expect(bank.stack(0)).toBe(startingStack + starGrantChips);
    expect(bank.stack(1)).toBe(startingStack + starGrantChips);
  });
});
