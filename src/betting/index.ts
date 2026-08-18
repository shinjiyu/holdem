import { DEFAULT_TABLE_CONFIG, type TableConfig } from "../config";
import type { HeadlessPlugin } from "../contracts";
import type { BettingQuery, StreetOpenInput } from "../contracts/betting";
import type { ActionIntent, LegalAction } from "../contracts/shared/dto";

interface SeatBetting {
  stack: number;
  committed: number;
  folded: boolean;
}

export class BettingPlugin implements HeadlessPlugin, BettingQuery {
  readonly id = "betting";
  private readonly bb: number;
  private seats = new Map<number, SeatBetting>();
  private _pot = 0;
  private currentBet = 0;
  private lastRaiseSize: number;

  constructor(config: TableConfig = DEFAULT_TABLE_CONFIG) {
    this.bb = config.bigBlind;
    this.lastRaiseSize = config.bigBlind;
  }

  startStreet(input: StreetOpenInput): void {
    this.seats.clear();
    this._pot = input.pot ?? 0;
    this.currentBet = 0;
    this.lastRaiseSize = this.bb;
    for (const [key, stack] of Object.entries(input.stacks)) {
      const seat = Number(key);
      const committed = input.committed?.[seat] ?? 0;
      this.seats.set(seat, { stack, committed, folded: false });
      if (committed > this.currentBet) this.currentBet = committed;
    }
    if (this.currentBet > 0) {
      this.lastRaiseSize = this.currentBet;
    }
  }

  get pot(): number {
    return this._pot;
  }

  toCall(seat: number): number {
    const s = this.seats.get(seat);
    if (!s) return 0;
    return Math.max(0, this.currentBet - s.committed);
  }

  legal(seat: number): LegalAction[] {
    const s = this.seats.get(seat);
    if (!s || s.folded || s.stack <= 0) return [];

    const need = this.toCall(seat);
    if (need <= 0) {
      const minBet = Math.min(this.bb, s.stack);
      return [
        { kind: "check" },
        { kind: "bet", min: minBet, max: s.stack },
      ];
    }

    const actions: LegalAction[] = [{ kind: "fold" }];
    if (s.stack <= need) {
      actions.push({ kind: "allin" });
      return actions;
    }

    actions.push({ kind: "call" });
    const minPutIn = this.currentBet + this.lastRaiseSize - s.committed;
    if (s.stack >= minPutIn) {
      actions.push({ kind: "raise", min: minPutIn, max: s.stack });
    }
    actions.push({ kind: "allin" });
    return actions;
  }

  apply(seat: number, intent: ActionIntent): void {
    const allowed = this.legal(seat).find((a) => a.kind === intent.kind);
    if (!allowed) {
      throw new Error(`illegal action: ${intent.kind}`);
    }
    const s = this.seats.get(seat);
    if (!s) {
      throw new Error(`illegal action: ${intent.kind}`);
    }

    switch (intent.kind) {
      case "fold":
        s.folded = true;
        return;
      case "check":
        return;
      case "call":
        this.putIn(s, this.toCall(seat));
        return;
      case "bet": {
        const amount = this.requireAmount(intent.amount, allowed);
        this.putIn(s, amount);
        this.lastRaiseSize = amount - this.currentBet;
        this.currentBet = s.committed;
        return;
      }
      case "raise": {
        const amount = this.requireAmount(intent.amount, allowed);
        const prevBet = this.currentBet;
        this.putIn(s, amount);
        this.lastRaiseSize = s.committed - prevBet;
        this.currentBet = s.committed;
        return;
      }
      case "allin": {
        const prevBet = this.currentBet;
        this.putIn(s, s.stack);
        if (s.committed > this.currentBet) {
          const raiseSize = s.committed - prevBet;
          if (raiseSize >= this.lastRaiseSize) {
            this.lastRaiseSize = raiseSize;
          }
          this.currentBet = s.committed;
        }
        return;
      }
    }
  }

  step(): void {}

  private putIn(s: SeatBetting, amount: number): void {
    if (amount < 0 || amount > s.stack) {
      throw new Error("illegal action: amount");
    }
    s.stack -= amount;
    s.committed += amount;
    this._pot += amount;
  }

  private requireAmount(amount: number | undefined, allowed: LegalAction): number {
    if (
      amount == null ||
      (allowed.min != null && amount < allowed.min) ||
      (allowed.max != null && amount > allowed.max)
    ) {
      throw new Error("illegal action: amount");
    }
    return amount;
  }
}
