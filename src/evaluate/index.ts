import type { HeadlessPlugin } from "../contracts";
import type {
  CompareResult,
  EvaluatePort,
  EvaluateRequest,
  HandCategory,
  HandRank,
} from "../contracts/evaluate";
import type { Card, Rank } from "../contracts/shared/dto";

const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const CATEGORY_ORDER: Record<HandCategory, number> = {
  "high-card": 0,
  pair: 1,
  "two-pair": 2,
  trips: 3,
  straight: 4,
  flush: 5,
  "full-house": 6,
  quads: 7,
  "straight-flush": 8,
};

function valueOf(card: Card): number {
  return RANK_VALUE[card.rank];
}

/** High card of a 5-card straight, or null. Wheel A-5 ranks as 5. */
function straightHigh(uniqueDesc: number[]): number | null {
  if (uniqueDesc.length !== 5) return null;
  if (
    uniqueDesc[0] === 14 &&
    uniqueDesc[1] === 5 &&
    uniqueDesc[2] === 4 &&
    uniqueDesc[3] === 3 &&
    uniqueDesc[4] === 2
  ) {
    return 5;
  }
  if (uniqueDesc[0]! - uniqueDesc[4]! === 4) return uniqueDesc[0]!;
  return null;
}

function rank5(cards: Card[]): HandRank {
  const values = cards.map(valueOf).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0]!.suit);
  const unique = [...new Set(values)];
  const high = straightHigh(unique);

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const kickersAfter = (n: number): number[] => groups.slice(n).map(([rank]) => rank);

  if (isFlush && high !== null) return { category: "straight-flush", tiebreak: [high] };
  if (groups[0]?.[1] === 4) {
    return { category: "quads", tiebreak: [groups[0][0], groups[1]![0]] };
  }
  if (groups[0]?.[1] === 3 && groups[1]?.[1] === 2) {
    return { category: "full-house", tiebreak: [groups[0][0], groups[1][0]] };
  }
  if (isFlush) return { category: "flush", tiebreak: values };
  if (high !== null) return { category: "straight", tiebreak: [high] };
  if (groups[0]?.[1] === 3) {
    return { category: "trips", tiebreak: [groups[0][0], ...kickersAfter(1)] };
  }
  if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2) {
    return { category: "two-pair", tiebreak: [groups[0][0], groups[1][0], groups[2]![0]] };
  }
  if (groups[0]?.[1] === 2) {
    return { category: "pair", tiebreak: [groups[0][0], ...kickersAfter(1)] };
  }
  return { category: "high-card", tiebreak: values };
}

function combinations5(cards: Card[]): Card[][] {
  const out: Card[][] = [];
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            out.push([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
          }
        }
      }
    }
  }
  return out;
}

function cmpRank(a: HandRank, b: HandRank): number {
  const cat = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  if (cat !== 0) return cat;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const d = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export class EvaluatePlugin implements HeadlessPlugin, EvaluatePort {
  readonly id = "evaluate";

  rank(req: EvaluateRequest): HandRank {
    const seven = [...req.hole, ...req.board];
    let best: HandRank | null = null;
    for (const five of combinations5(seven)) {
      const next = rank5(five);
      if (!best || cmpRank(next, best) > 0) best = next;
    }
    return best!;
  }

  compare(a: HandRank, b: HandRank): CompareResult {
    const d = cmpRank(a, b);
    if (d > 0) return { winner: "a" };
    if (d < 0) return { winner: "b" };
    return { winner: "tie" };
  }

  step(): void {}
}
