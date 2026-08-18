import { describe, expect, it } from "vitest";
import type { Card } from "../../../src/contracts/shared/dto";
import type {
  CompareResult,
  EvaluateRequest,
  HandRank,
} from "../../../src/contracts/evaluate";

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

describe("REQ-EVALUATE-RANK contracts", () => {
  it("EvaluateRequest is 2 hole cards plus a 5-card board", () => {
    const req: EvaluateRequest = {
      hole: [card("A", "s"), card("K", "s")],
      board: [card("Q", "s"), card("J", "s"), card("T", "s"), card("2", "c"), card("3", "d")],
    };
    expect(req.hole).toHaveLength(2);
    expect(req.board).toHaveLength(5);
  });

  it("HandRank carries a category and numeric tiebreak", () => {
    const rank: HandRank = { category: "straight-flush", tiebreak: [14] };
    expect(rank.category).toBe("straight-flush");
    expect(rank.tiebreak.length).toBeGreaterThan(0);
  });

  it("CompareResult winner is a, b, or tie", () => {
    const tie: CompareResult = { winner: "tie" };
    const a: CompareResult = { winner: "a" };
    const b: CompareResult = { winner: "b" };
    expect(tie.winner).toBe("tie");
    expect(a.winner).toBe("a");
    expect(b.winner).toBe("b");
  });
});
