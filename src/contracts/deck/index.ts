import type { Card } from "../shared/dto";

export interface ShuffleRequest {
  seed?: number;
}

export interface DealHoleRequest {
  seats: number[];
}

export interface DealBoardRequest {
  /** 3 = flop, 1 = turn or river */
  count: 3 | 1;
}

export interface HoleDealt {
  seat: number;
  cards: [Card, Card];
}

export interface DealPort {
  shuffle(req?: ShuffleRequest): void;
  dealHole(req: DealHoleRequest): HoleDealt[];
  dealBoard(req: DealBoardRequest): Card[];
  remaining(): number;
}
