import type { ActionIntent, LegalAction } from "../shared/dto";

/** Snapshot to open a betting street. Side pots are out of scope. */
export interface StreetOpenInput {
  /** Remaining chips per seat at the start of the street. */
  stacks: Readonly<Record<number, number>>;
  /** Chips already in for this street (e.g. blinds). */
  committed?: Readonly<Record<number, number>>;
  /** Pot carried in (e.g. previous streets). */
  pot?: number;
}

/**
 * Legal actions + pot / toCall / min-raise.
 * `ActionIntent.amount` for bet/raise is chips put in this action.
 */
export interface BettingQuery {
  startStreet(input: StreetOpenInput): void;
  legal(seat: number): LegalAction[];
  apply(seat: number, intent: ActionIntent): void;
  readonly pot: number;
  toCall(seat: number): number;
  /** Chips already put in on the current street (blinds/bets/raises). */
  committed(seat: number): number;
  /** Highest commitment on the current street. */
  readonly streetBet: number;
}
