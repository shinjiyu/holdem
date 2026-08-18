/** Seat stacks, blinds, settle, and compose-only chip grant. No GitHub. */

export interface SitRequest {
  seat: number;
  githubLogin: string;
  /** Defaults to config startingStack. */
  stack?: number;
}

export interface PostBlindsRequest {
  sbSeat: number;
  bbSeat: number;
}

export interface SettleWinner {
  seat: number;
  amount: number;
}

export interface SettleRequest {
  winners: SettleWinner[];
}

export interface GrantRequest {
  githubLogin: string;
  amount: number;
}

export interface BankPort {
  sit(req: SitRequest): void;
  postBlinds(req: PostBlindsRequest): void;
  settle(req: SettleRequest): void;
  /** Chips only. Idempotency is the caller's job. */
  grant(req: GrantRequest): void;
  stack(seat: number): number;
  pot(): number;
}
