import type { HeadlessPlugin } from "../contracts";
import type {
  DealBoardRequest,
  DealHoleRequest,
  DealPort,
  HoleDealt,
  ShuffleRequest,
} from "../contracts/deck";
import type { Card, Rank, Suit } from "../contracts/shared/dto";

const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
];
const SUITS: Suit[] = ["c", "d", "h", "s"];

function freshDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ rank, suit });
    }
  }
  return cards;
}

/** Deterministic 0..1 PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class DeckPlugin implements HeadlessPlugin, DealPort {
  readonly id = "deck";
  private pile: Card[] = freshDeck();

  shuffle(req?: ShuffleRequest): void {
    this.pile = freshDeck();
    const rng = mulberry32(req?.seed ?? 1);
    for (let i = this.pile.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = this.pile[i]!;
      this.pile[i] = this.pile[j]!;
      this.pile[j] = tmp;
    }
  }

  dealHole(req: DealHoleRequest): HoleDealt[] {
    return req.seats.map((seat) => ({
      seat,
      cards: [this.take(), this.take()],
    }));
  }

  dealBoard(req: DealBoardRequest): Card[] {
    return Array.from({ length: req.count }, () => this.take());
  }

  remaining(): number {
    return this.pile.length;
  }

  step(): void {}

  private take(): Card {
    const card = this.pile.shift();
    if (!card) {
      throw new Error("deck empty");
    }
    return card;
  }
}
