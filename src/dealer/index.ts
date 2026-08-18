import type { HeadlessPlugin } from "../contracts";
import type { DealerDeps, DealerPort, StartHandRequest } from "../contracts/dealer";
import type { Card, Street } from "../contracts/shared/dto";

const NEXT: Record<Exclude<Street, "showdown">, Street> = {
  preflop: "flop",
  flop: "turn",
  turn: "river",
  river: "showdown",
};

export class DealerPlugin implements HeadlessPlugin, DealerPort {
  readonly id = "dealer";
  private deps?: DealerDeps;
  private _street: Street = "preflop";
  private _board: Card[] = [];
  private holes = new Map<number, [Card, Card]>();
  private bettingClosed = false;
  private seats: number[] = [];

  constructor(deps?: DealerDeps) {
    this.deps = deps;
  }

  get street(): Street {
    return this._street;
  }

  get board(): Card[] {
    return this._board.slice();
  }

  hole(seat: number): [Card, Card] | undefined {
    const cards = this.holes.get(seat);
    return cards ? [cards[0], cards[1]] : undefined;
  }

  startHand(req: StartHandRequest): void {
    const deps = this.requireDeps();
    this.seats = [...req.seats];
    this._street = "preflop";
    this._board = [];
    this.holes.clear();
    this.bettingClosed = false;
    deps.deal.shuffle({ seed: req.seed });
    for (const dealt of deps.deal.dealHole({ seats: this.seats })) {
      this.holes.set(dealt.seat, dealt.cards);
    }
    this.openBetting();
  }

  closeBetting(): void {
    this.bettingClosed = true;
  }

  advance(): void {
    if (!this.bettingClosed) {
      throw new Error("betting not closed");
    }
    if (this._street === "showdown") {
      throw new Error("hand already at showdown");
    }
    const deps = this.requireDeps();
    const next = NEXT[this._street];
    if (next === "flop") {
      this._board = deps.deal.dealBoard({ count: 3 });
    } else if (next === "turn" || next === "river") {
      this._board = [...this._board, ...deps.deal.dealBoard({ count: 1 })];
    }
    this._street = next;
    this.bettingClosed = false;
    if (next === "showdown") {
      this.runShowdown();
      return;
    }
    this.openBetting();
  }

  step(): void {}

  private openBetting(): void {
    this.deps?.betting?.startStreet({
      stacks: Object.fromEntries(this.seats.map((s) => [s, 0])),
    });
  }

  private runShowdown(): void {
    const deps = this.requireDeps();
    for (const seat of this.seats) {
      const hole = this.holes.get(seat);
      if (!hole) continue;
      deps.evaluate.rank({ hole, board: this._board });
    }
  }

  private requireDeps(): DealerDeps {
    if (!this.deps?.deal || !this.deps.evaluate) {
      throw new Error("DealerPlugin needs DealPort and EvaluatePort");
    }
    return this.deps;
  }
}
