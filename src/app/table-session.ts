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
  private handActive = false;
  private actorsSeat: number | null = null;
  private actionDeadlineMs: number | null = null;
  private folded = new Set<number>();
  /** Seats that have acted since the last bet/raise (or since street open). */
  private acted = new Set<number>();
  private readonly clock: () => number;

  constructor(
    config: TableConfig = DEFAULT_TABLE_CONFIG,
    clock: () => number = () => Date.now(),
  ) {
    this.config = config;
    this.clock = clock;
    this.dealer = new DealerPlugin({
      deal: this.deck,
      evaluate: this.evaluate,
    });
  }

  plugins() {
    return [this.dealer, this.deck, this.betting, this.evaluate, this.bank, this.seat];
  }

  isHandActive(): boolean {
    return this.handActive;
  }

  getActorsSeat(): number | null {
    return this.actorsSeat;
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
    if (this.handActive) throw new Error("hand already in progress");
    this.tableId = req.tableId ?? this.tableId;
    this.button = req.button;
    this.resultCache = null;
    this.folded.clear();
    this.acted.clear();
    const ordered = this.seatOrder();
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
    this.handActive = true;
    this.acted.clear();
    this.setActor(this.firstActorPreflop(sbSeat, bbSeat));
  }

  legal(seat: number) {
    this.expireTimedOutActions();
    if (!this.handActive || this.actorsSeat !== seat) return [];
    return this.betting.legal(seat);
  }

  act(seat: number, intent: ActionIntent): void {
    if (!this.handActive) throw new Error("no hand in progress");
    if (this.actorsSeat !== seat) {
      throw new Error(`not your turn (waiting seat ${this.actorsSeat})`);
    }
    this.applyAct(seat, intent);
  }

  /** Apply check-or-fold for any seat whose deadline has passed. Safe to call often. */
  expireTimedOutActions(): void {
    for (let i = 0; i < 12; i++) {
      if (!this.handActive || this.actorsSeat == null || this.actionDeadlineMs == null) return;
      if (this.clock() < this.actionDeadlineMs) return;
      const seat = this.actorsSeat;
      const legal = this.betting.legal(seat);
      if (legal.length === 0) {
        // All-in / no legal ops: do not attempt fold (throws). Close or pass.
        this.acted.add(seat);
        if (this.streetBettingComplete()) {
          this.setActor(null);
          this.advanceStreet();
        } else {
          const next = this.nextActor(seat);
          if (next === seat) {
            this.setActor(null);
            this.advanceStreet();
          } else {
            this.setActor(next);
          }
        }
        continue;
      }
      const canCheck = legal.some((a) => a.kind === "check");
      this.applyAct(seat, { kind: canCheck ? "check" : "fold" });
    }
  }

  private applyAct(seat: number, intent: ActionIntent): void {
    const cost = this.costOf(seat, intent);
    this.betting.apply(seat, intent);
    this.remaining.set(seat, (this.remaining.get(seat) ?? 0) - cost);
    this.syncBankSeat(seat);

    if (intent.kind === "fold") {
      this.folded.add(seat);
    }

    const aggressive = intent.kind === "bet" || intent.kind === "raise";
    if (aggressive) {
      this.acted.clear();
      this.acted.add(seat);
    } else {
      this.acted.add(seat);
    }

    if (this.liveSeats().length <= 1) {
      this.endByFold();
      return;
    }

    if (this.streetBettingComplete()) {
      this.setActor(null);
      this.advanceStreet();
      return;
    }

    this.setActor(this.nextActor(seat));
  }

  /** Close the current betting street and deal the next board (or showdown). */
  advanceStreet(): void {
    if (!this.handActive) throw new Error("no hand in progress");
    if (this.actorsSeat != null && !this.streetBettingComplete()) {
      throw new Error("betting round not finished");
    }
    this.dealer.closeBetting();
    this.dealer.advance();
    if (this.dealer.street === "showdown") {
      this.resultCache = this.settleShowdown();
      this.handActive = false;
      this.setActor(null);
      return;
    }
    this.betting.startStreet({
      stacks: this.stackSnapshot(),
      pot: this.betting.pot,
    });
    this.acted.clear();
    // Everyone all-in → keep dealing to showdown without asking for checks
    if (this.streetBettingComplete()) {
      this.setActor(null);
      this.advanceStreet();
      return;
    }
    this.setActor(this.firstActorPostflop());
  }

  result(): HandResult | null {
    return this.resultCache;
  }

  view(seat: number): SeatView {
    this.expireTimedOutActions();
    const base = this.seat.view({ seat });
    const hole = this.dealer.hole(seat) ?? [];
    const legal = this.legal(seat);
    return {
      ...base,
      tableId: this.tableId,
      street: this.dealer.street,
      board: this.dealer.board,
      hole: [...hole],
      pot: this.betting.pot,
      toCall: this.betting.toCall(seat),
      stack: this.remaining.get(seat) ?? this.bank.stack(seat),
      actorsSeat: this.actorsSeat,
      actionDeadlineMs: this.actionDeadlineMs,
      legal,
    };
  }

  private setActor(seat: number | null): void {
    this.actorsSeat = seat;
    this.actionDeadlineMs =
      seat == null ? null : this.clock() + this.config.actionTimeoutMs;
  }

  private seatOrder(): number[] {
    return [...this.seated].sort((a, b) => a - b);
  }

  private liveSeats(): number[] {
    return this.seatOrder().filter((s) => !this.folded.has(s));
  }

  private canStillAct(seat: number): boolean {
    return !this.folded.has(seat) && (this.remaining.get(seat) ?? 0) > 0;
  }

  private firstActorPreflop(sbSeat: number, bbSeat: number): number {
    const live = this.liveSeats().filter((s) => this.canStillAct(s));
    if (live.length === 0) return sbSeat;
    if (live.length === 2 || live.includes(sbSeat)) {
      // HU or SB still active: SB/button first among those who can act
      if (this.canStillAct(sbSeat)) return sbSeat;
      if (this.canStillAct(bbSeat)) return bbSeat;
    }
    const order = this.seatOrder();
    const bi = order.indexOf(bbSeat);
    for (let step = 1; step <= order.length; step++) {
      const seat = order[(bi + step) % order.length]!;
      if (this.canStillAct(seat)) return seat;
    }
    return live[0]!;
  }

  private firstActorPostflop(): number {
    const order = this.seatOrder();
    const bi = order.indexOf(this.button);
    for (let step = 1; step <= order.length; step++) {
      const seat = order[(bi + step) % order.length]!;
      if (this.canStillAct(seat)) return seat;
    }
    // Fallback — caller should have short-circuited via streetBettingComplete
    return this.liveSeats()[0]!;
  }

  private nextActor(after: number): number {
    const order = this.seatOrder();
    const start = order.indexOf(after);
    for (let step = 1; step <= order.length; step++) {
      const seat = order[(start + step) % order.length]!;
      if (!this.canStillAct(seat)) continue;
      if (this.betting.toCall(seat) > 0) return seat;
      if (!this.acted.has(seat)) return seat;
    }
    return after;
  }

  private streetBettingComplete(): boolean {
    const live = this.liveSeats();
    if (live.length <= 1) return true;
    const active = live.filter((s) => this.canStillAct(s));
    for (const s of active) {
      if (this.betting.toCall(s) > 0) return false;
    }
    // Only one (or zero) player still has chips → no more betting; run the board out
    if (active.length <= 1) return true;
    for (const s of active) {
      if (!this.acted.has(s)) return false;
    }
    return true;
  }

  private endByFold(): void {
    const live = this.liveSeats();
    const winner = live[0];
    if (winner == null) {
      this.handActive = false;
      this.setActor(null);
      return;
    }
    const pot = this.betting.pot;
    this.remaining.set(winner, (this.remaining.get(winner) ?? 0) + pot);
    this.syncBankFromRemaining();
    this.resultCache = {
      tableId: this.tableId,
      winners: [{ seat: winner, amount: pot }],
      board: this.dealer.board,
      shown: [],
    };
    this.handActive = false;
    this.setActor(null);
  }

  private stackSnapshot(): Record<number, number> {
    return Object.fromEntries(this.seated.map((s) => [s, this.remaining.get(s) ?? 0]));
  }

  private syncBankSeat(seat: number): void {
    const login = this.seat.view({ seat }).you.githubLogin;
    this.bank.sit({
      seat,
      githubLogin: login,
      stack: this.remaining.get(seat) ?? 0,
    });
  }

  private syncBankFromRemaining(): void {
    for (const seat of this.seated) {
      this.syncBankSeat(seat);
    }
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
    const live = this.liveSeats().filter((s) => this.dealer.hole(s));
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
    for (const w of settled) {
      this.remaining.set(w.seat, (this.remaining.get(w.seat) ?? 0) + w.amount);
    }
    this.syncBankFromRemaining();
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
