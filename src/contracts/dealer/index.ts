import type { Card, Street } from "../shared/dto";
import type { DealPort } from "../deck";
import type { EvaluatePort } from "../evaluate";
import type { BettingQuery } from "../betting";

export interface StartHandRequest {
  seats: number[];
  button: number;
  seed?: number;
}

export interface DealerDeps {
  deal: DealPort;
  evaluate: EvaluatePort;
  betting?: Pick<BettingQuery, "startStreet">;
}

export interface DealerPort {
  startHand(req: StartHandRequest): void;
  /** Caller must close betting first; otherwise throw. */
  closeBetting(): void;
  advance(): void;
  readonly street: Street;
  readonly board: Card[];
  hole(seat: number): [Card, Card] | undefined;
}

export type { DealPort, EvaluatePort, BettingQuery };
