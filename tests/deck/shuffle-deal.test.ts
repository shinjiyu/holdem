import { describe, expect, it } from "vitest";
import { DeckPlugin } from "../../src/deck";
import type { Card } from "../../src/contracts/shared/dto";

function key(c: Card): string {
  return `${c.rank}${c.suit}`;
}

describe("REQ-DECK-SHUFFLE", () => {
  it("same seed yields the same shuffle order", () => {
    const a = new DeckPlugin();
    const b = new DeckPlugin();
    a.shuffle({ seed: 42 });
    b.shuffle({ seed: 42 });
    const ha = a.dealHole({ seats: [0] });
    const hb = b.dealHole({ seats: [0] });
    expect(ha[0]?.cards).toEqual(hb[0]?.cards);
  });

  it("deals unique cards across hole and board in one hand", () => {
    const d = new DeckPlugin();
    d.shuffle({ seed: 7 });
    const holes = d.dealHole({ seats: [0, 1, 2] });
    const flop = d.dealBoard({ count: 3 });
    const turn = d.dealBoard({ count: 1 });
    const river = d.dealBoard({ count: 1 });
    const all = [
      ...holes.flatMap((h) => h.cards),
      ...flop,
      ...turn,
      ...river,
    ];
    expect(all).toHaveLength(11);
    expect(new Set(all.map(key)).size).toBe(11);
    expect(d.remaining()).toBe(52 - 11);
  });

  it("full deck is 52 distinct cards", () => {
    const d = new DeckPlugin();
    d.shuffle({ seed: 1 });
    const seen = new Set<string>();
    while (d.remaining() > 0) {
      const [c] = d.dealBoard({ count: 1 });
      if (!c) break;
      seen.add(key(c));
    }
    expect(seen.size).toBe(52);
  });
});
