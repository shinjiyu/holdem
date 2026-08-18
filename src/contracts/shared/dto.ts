/** Shared table DTOs. Slow-growing. Lane B. No host SDK imports. */

export type Suit = "c" | "d" | "h" | "s";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "T"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export type ActionKind =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "allin";

export interface ActionIntent {
  kind: ActionKind;
  /** chips to put in for bet/raise; ignored for fold/check/call/allin when all-in size is forced */
  amount?: number;
}

export interface LegalAction {
  kind: ActionKind;
  min?: number;
  max?: number;
}

export type ControlMode = "manual" | "hosted";

export interface SeatOccupant {
  githubLogin: string;
  /** Same account: player clicks, or their AI is delegated. Exclusive. */
  control: ControlMode;
  /** When hosted: cursor | codex | dsh | cli — display only */
  host?: string;
}

/** What one seated player is allowed to see. */
export interface SeatView {
  tableId: string;
  seat: number;
  you: SeatOccupant;
  street: Street;
  board: Card[];
  hole: Card[];
  pot: number;
  toCall: number;
  stack: number;
  actorsSeat: number | null;
  legal: LegalAction[];
}

export interface HandResult {
  tableId: string;
  winners: Array<{ seat: number; amount: number }>;
  board: Card[];
  shown: Array<{ seat: number; hole: Card[] }>;
}
