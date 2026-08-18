import { describe, expect, it } from "vitest";
import type {
  ActionIntent,
  Card,
  HandResult,
  SeatView,
  Street,
} from "../../src/contracts/shared/dto";

describe("shared table DTOs", () => {
  it("accepts a minimal SeatView shape", () => {
    const hole: Card[] = [
      { rank: "A", suit: "s" },
      { rank: "K", suit: "s" },
    ];
    const street: Street = "preflop";
    const view: SeatView = {
      tableId: "t1",
      seat: 0,
      street,
      board: [],
      hole,
      pot: 150,
      toCall: 100,
      stack: 9900,
      actorsSeat: 0,
      legal: [{ kind: "fold" }, { kind: "call" }, { kind: "raise", min: 200, max: 9900 }],
    };
    const intent: ActionIntent = { kind: "call" };
    const result: HandResult = {
      tableId: "t1",
      winners: [{ seat: 0, amount: 150 }],
      board: [],
      shown: [{ seat: 0, hole }],
    };
    expect(view.hole).toHaveLength(2);
    expect(intent.kind).toBe("call");
    expect(result.winners[0]?.amount).toBe(150);
  });
});
