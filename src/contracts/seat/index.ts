import type { Card, ControlMode, SeatOccupant, SeatView } from "../shared/dto";

export interface SitRequest {
  seat: number;
  githubLogin: string;
}

export interface SetControlRequest {
  seat: number;
  control: ControlMode;
}

export interface ViewRequest {
  seat: number;
}

/** Compose / tests inject private hole cards. View never returns another seat's cards. */
export interface SetHoleRequest {
  seat: number;
  cards: Card[];
}

export interface SeatPort {
  sit(req: SitRequest): SeatOccupant;
  setControl(req: SetControlRequest): SeatOccupant;
  view(req: ViewRequest): SeatView;
  setHole(req: SetHoleRequest): void;
}
