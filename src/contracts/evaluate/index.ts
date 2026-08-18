import type { Card } from "../shared/dto";

export type HandCategory =
  | "high-card"
  | "pair"
  | "two-pair"
  | "trips"
  | "straight"
  | "flush"
  | "full-house"
  | "quads"
  | "straight-flush";

export interface EvaluateRequest {
  hole: [Card, Card];
  /** Must be length 5 (flop + turn + river). */
  board: Card[];
}

export interface HandRank {
  category: HandCategory;
  /** High-to-low rank values (2–14) used after category to break ties. */
  tiebreak: number[];
}

export interface CompareResult {
  winner: "a" | "b" | "tie";
}

export interface EvaluatePort {
  rank(req: EvaluateRequest): HandRank;
  compare(a: HandRank, b: HandRank): CompareResult;
}
