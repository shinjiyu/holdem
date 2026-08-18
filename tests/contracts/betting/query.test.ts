import { describe, expect, it } from "vitest";
import { BettingPlugin } from "../../../src/betting";
import type { BettingQuery } from "../../../src/contracts/betting";

describe("BettingQuery contract", () => {
  it("BettingPlugin implements legal / apply / pot / toCall", () => {
    const q: BettingQuery = new BettingPlugin();
    q.startStreet({ stacks: { 0: 1000, 1: 1000 } });
    expect(q.legal(0).length).toBeGreaterThan(0);
    expect(typeof q.pot).toBe("number");
    expect(typeof q.toCall(0)).toBe("number");
    q.apply(0, { kind: "check" });
    expect(q.pot).toBe(0);
  });
});
