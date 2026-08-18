import { describe, expect, it } from "vitest";
import { BankPlugin } from "../../src/bank";
import { DEFAULT_TABLE_CONFIG } from "../../src/config";

const { smallBlind, bigBlind, startingStack, starGrantChips } = DEFAULT_TABLE_CONFIG;

function seatedBank(): BankPlugin {
  const bank = new BankPlugin();
  bank.sit({ seat: 0, githubLogin: "alice" });
  bank.sit({ seat: 1, githubLogin: "bob" });
  return bank;
}

describe("REQ-BANK-STACK", () => {
  it("starts seated players at config startingStack", () => {
    const bank = seatedBank();
    expect(bank.stack(0)).toBe(startingStack);
    expect(bank.stack(1)).toBe(startingStack);
    expect(bank.pot()).toBe(0);
  });

  it("posts SB/BB from config: stacks drop and pot rises", () => {
    const bank = seatedBank();
    bank.postBlinds({ sbSeat: 0, bbSeat: 1 });
    expect(bank.stack(0)).toBe(startingStack - smallBlind);
    expect(bank.stack(1)).toBe(startingStack - bigBlind);
    expect(bank.pot()).toBe(smallBlind + bigBlind);
  });

  it("all-in blinds when stack is short of the blind", () => {
    const bank = new BankPlugin();
    bank.sit({ seat: 0, githubLogin: "short", stack: 30 });
    bank.sit({ seat: 1, githubLogin: "bob" });
    bank.postBlinds({ sbSeat: 0, bbSeat: 1 });
    expect(bank.stack(0)).toBe(0);
    expect(bank.stack(1)).toBe(startingStack - bigBlind);
    expect(bank.pot()).toBe(30 + bigBlind);
  });

  it("settle credits winner stacks from caller-computed amounts", () => {
    const bank = seatedBank();
    bank.postBlinds({ sbSeat: 0, bbSeat: 1 });
    const pot = bank.pot();
    bank.settle({ winners: [{ seat: 0, amount: pot }] });
    expect(bank.stack(0)).toBe(startingStack - smallBlind + pot);
    expect(bank.stack(1)).toBe(startingStack - bigBlind);
    expect(bank.pot()).toBe(0);
  });

  it("grant adds chips to the seat owned by githubLogin", () => {
    const bank = seatedBank();
    bank.grant({ githubLogin: "alice", amount: starGrantChips });
    expect(bank.stack(0)).toBe(startingStack + starGrantChips);
    expect(bank.stack(1)).toBe(startingStack);
  });

  it("grant does not call GitHub; unknown login is rejected", () => {
    const bank = seatedBank();
    expect(() => bank.grant({ githubLogin: "nobody", amount: 1 })).toThrow(/githubLogin/);
  });
});
