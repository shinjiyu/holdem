export type {
  Suit,
  Rank,
  Card,
  Street,
  ActionKind,
  ActionIntent,
  LegalAction,
  SeatView,
  HandResult,
} from "./shared/dto";

export interface HeadlessPlugin {
  readonly id: string;
  step?(): void;
}
