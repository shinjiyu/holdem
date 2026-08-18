import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DealerPlugin } from "../../src/dealer";
import type { DealPort } from "../../src/contracts/deck";
import type { EvaluatePort, HandRank } from "../../src/contracts/evaluate";
import type { Card } from "../../src/contracts/shared/dto";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
const SUITS = ["c", "d", "h", "s"] as const;

function fresh(): Card[] {
  const out: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) out.push({ rank, suit });
  }
  return out;
}

class FakeDeal implements DealPort {
  private pile = fresh();
  shuffle(): void {
    this.pile = fresh();
  }
  dealHole(req: { seats: number[] }) {
    return req.seats.map((seat) => ({
      seat,
      cards: [this.take(), this.take()] as [Card, Card],
    }));
  }
  dealBoard(req: { count: 3 | 1 }): Card[] {
    return Array.from({ length: req.count }, () => this.take());
  }
  remaining(): number {
    return this.pile.length;
  }
  private take(): Card {
    const c = this.pile.shift();
    if (!c) throw new Error("empty");
    return c;
  }
}

function fakeEval(): EvaluatePort & { ranks: number } {
  const port: EvaluatePort & { ranks: number } = {
    ranks: 0,
    rank(): HandRank {
      port.ranks += 1;
      return { category: "high-card", tiebreak: [14] };
    },
    compare() {
      return { winner: "tie" as const };
    },
  };
  return port;
}

describe("REQ-DEALER-STREET", () => {
  it("starts preflop with hole cards and refuses advance until betting closes", () => {
    const deal = new FakeDeal();
    const evaluate = fakeEval();
    const d = new DealerPlugin({ deal, evaluate });
    d.startHand({ seats: [0, 1], button: 0 });
    expect(d.street).toBe("preflop");
    expect(d.board).toEqual([]);
    expect(d.hole(0)).toHaveLength(2);
    expect(() => d.advance()).toThrow(/betting/i);
  });

  it("advances flop/turn/river/showdown only after closeBetting", () => {
    const deal = new FakeDeal();
    const evaluate = fakeEval();
    let streets = 0;
    const d = new DealerPlugin({
      deal,
      evaluate,
      betting: {
        startStreet() {
          streets += 1;
        },
      },
    });
    d.startHand({ seats: [0, 1], button: 1, seed: 1 });
    expect(streets).toBe(1);

    d.closeBetting();
    d.advance();
    expect(d.street).toBe("flop");
    expect(d.board).toHaveLength(3);
    expect(streets).toBe(2);

    d.closeBetting();
    d.advance();
    expect(d.street).toBe("turn");
    expect(d.board).toHaveLength(4);

    d.closeBetting();
    d.advance();
    expect(d.street).toBe("river");
    expect(d.board).toHaveLength(5);

    d.closeBetting();
    d.advance();
    expect(d.street).toBe("showdown");
    expect(evaluate.ranks).toBe(2);
  });
});

describe("dealer import ban", () => {
  it("does not import plugin impls or hosts", () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "../../src/dealer");
    const text = readFileSync(join(dir, "index.ts"), "utf8");
    expect(text).not.toMatch(/from ["']\.\.\/(deck|betting|evaluate|bank|hosts)\b/);
  });
});
