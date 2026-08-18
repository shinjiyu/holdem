import { DEFAULT_TABLE_CONFIG, type TableConfig } from "../config";
import type { ActionIntent, HandResult, SeatView } from "../contracts/shared/dto";
import { BankPlugin } from "../bank";
import { BettingPlugin } from "../betting";
import { DealerPlugin } from "../dealer";
import { DeckPlugin } from "../deck";
import { EvaluatePlugin } from "../evaluate";
import { SeatPlugin } from "../seat";

export interface SitAtTableRequest {
  seat: number;
  githubLogin: string;
  stack?: number;
}

export interface StartTableHandRequest {
  button: number;
  seed?: number;
  tableId?: string;
}

/** Headless table: plugins wired by compose. No hosts. */
export class TableSession {
  readonly config: TableConfig;
  readonly deck = new DeckPlugin();
  readonly evaluate = new EvaluatePlugin();
  readonly betting = new BettingPlugin();
  readonly bank = new BankPlugin();
  readonly seat = new SeatPlugin();
  readonly dealer: DealerPlugin;

  private tableId = "table-1";
  private remaining = new Map<number, number>();
  private seated: number[] = [];
  private button = 0;
  private resultCache: HandResult | null = null;

  constructor(config: TableConfig = DEFAULT_TABLE_CONFIG) {
    this.config = config;
    this.dealer = new DealerPlugin({
      deal: this.deck,
      evaluate: this.evaluate,
    });
  }

  plugins() {
    return [this.dealer, this.deck, this.betting, this.evaluate, this.bank, this.seat];
  }

  sit(req: SitAtTableRequest): void {
    this.bank.sit({
      seat: req.seat,
      githubLogin: req.githubLogin,
      stack: req.stack,
    });
    this.seat.sit({ seat: req.seat, githubLogin: req.githubLogin });
    this.remaining.set(req.seat, this.bank.stack(req.seat));
    if (!this.seated.includes(req.seat)) this.seated.push(req.seat);
  }

  startHand(req: StartTableHandRequest): void {
    if (this.seated.length < 2) throw new Error("need at least two seated players");
    this.tableId = req.tableId ?? this.tableId;
    this.button = req.button;
    this.resultCache = null;
    const ordered = [...this.seated].sort((a, b) => a - b);
    const bi = Math.max(0, ordered.indexOf(req.button));
    const sbSeat = ordered[bi] ?? ordered[0]!;
    const bbSeat = ordered[(bi + 1) % ordered.length]!;
    this.bank.postBlinds({ sbSeat, bbSeat });
    for (const seat of this.seated) {
      this.remaining.set(seat, this.bank.stack(seat));
    }
    this.dealer.startHand({
      seats: this.seated,
      button: req.button,
      seed: req.seed,
    });
    for (const seat of this.seated) {
      const hole = this.dealer.hole(seat);
      if (hole) this.seat.setHole({ seat, cards: hole });
    }
    this.betting.startStreet({
      stacks: this.stackSnapshot(),
      committed: {
        [sbSeat]: this.config.smallBlind,
        [bbSeat]: this.config.bigBlind,
      },
      pot: this.config.smallBlind + this.config.bigBlind,
    });
  }

  legal(seat: number) {
    return this.betting.legal(seat);
  }

  act(seat: number, intent: ActionIntent): void {
    const cost = this.costOf(seat, intent);
    this.betting.apply(seat, intent);
    this.remaining.set(seat, (this.remaining.get(seat) ?? 0) - cost);
  }

  /** Close the current betting street and deal the next board (or showdown). */
  advanceStreet(): void {
    this.dealer.closeBetting();
    this.dealer.advance();
    if (this.dealer.street === "showdown") {
      this.resultCache = this.settleShowdown();
      return;
    }
    this.betting.startStreet({
      stacks: this.stackSnapshot(),
      pot: this.betting.pot,
    });
  }

  result(): HandResult | null {
    return this.resultCache;
  }

  view(seat: number): SeatView {
    const base = this.seat.view({ seat });
    const hole = this.dealer.hole(seat) ?? [];
    return {
      ...base,
      tableId: this.tableId,
      street: this.dealer.street,
      board: this.dealer.board,
      hole: [...hole],
      pot: this.betting.pot,
      toCall: this.betting.toCall(seat),
      stack: this.remaining.get(seat) ?? this.bank.stack(seat),
      legal: this.betting.legal(seat),
    };
  }

  private stackSnapshot(): Record<number, number> {
    return Object.fromEntries(this.seated.map((s) => [s, this.remaining.get(s) ?? 0]));
  }

  private costOf(seat: number, intent: ActionIntent): number {
    switch (intent.kind) {
      case "fold":
      case "check":
        return 0;
      case "call":
        return this.betting.toCall(seat);
      case "bet":
      case "raise":
        return intent.amount ?? 0;
      case "allin":
        return this.remaining.get(seat) ?? 0;
    }
  }

  private settleShowdown(): HandResult {
    const live = this.seated.filter((s) => this.dealer.hole(s));
    const ranked = live.map((seat) => ({
      seat,
      rank: this.evaluate.rank({
        hole: this.dealer.hole(seat)!,
        board: this.dealer.board,
      }),
    }));
    let best = ranked[0]!;
    const winners = new Set<number>([best.seat]);
    for (const row of ranked.slice(1)) {
      const cmp = this.evaluate.compare(best.rank, row.rank);
      if (cmp.winner === "b") {
        best = row;
        winners.clear();
        winners.add(row.seat);
      } else if (cmp.winner === "tie") {
        winners.add(row.seat);
      }
    }
    const pot = this.betting.pot;
    const share = Math.floor(pot / winners.size);
    const extra = pot - share * winners.size;
    const winnerList = [...winners].sort((a, b) => a - b);
    const settled = winnerList.map((seat, i) => ({
      seat,
      amount: share + (i === 0 ? extra : 0),
    }));
    this.bank.settle({ winners: settled });
    return {
      tableId: this.tableId,
      winners: settled,
      board: this.dealer.board,
      shown: live.map((seat) => ({
        seat,
        hole: [...(this.dealer.hole(seat) ?? [])],
      })),
    };
  }
}
