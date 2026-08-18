import type { ActionIntent, ControlMode, HandResult, SeatView } from "../../contracts/shared/dto";
import type { TableSession } from "../../app/table-session";
import type { Auth } from "../../auth";

export interface WebClickActRequest {
  seat: number;
  intent: ActionIntent;
}

export interface WebSetControlRequest {
  seat: number;
  control: ControlMode;
  /** Display-only when hosting (cursor | codex | dsh | cli). */
  host?: string;
}

/**
 * H5 controller: buttons call this, not betting/dealer directly.
 * Top-level OAuth URL comes from Auth; iframe only hosts the table UI after login.
 */
export class WebTableHost {
  constructor(
    readonly session: TableSession,
    readonly auth: Auth,
  ) {}

  /** Top-level window only — never put this URL in an iframe. */
  loginUrl(state?: string): string {
    return this.auth.authorizationUrl(state);
  }

  async completeLogin(code: string): Promise<{ githubLogin: string }> {
    return this.auth.completeOAuth(code);
  }

  sit(seat: number, githubLogin: string, stack?: number): void {
    this.session.sit({ seat, githubLogin, stack });
  }

  startHand(opts: { button: number; seed?: number; tableId?: string }): void {
    this.session.startHand(opts);
  }

  view(seat: number): SeatView {
    return this.session.view(seat);
  }

  result(): HandResult | null {
    return this.session.result();
  }

  /**
   * Player clicks an action button. Rejected when this seat is hosted
   * (only take-back remains valid in the UI).
   */
  clickAct(req: WebClickActRequest): SeatView {
    const you = this.session.view(req.seat).you;
    if (you.control !== "manual") {
      throw new Error("click act rejected: seat is hosted (take-back first)");
    }
    this.session.act(req.seat, req.intent);
    return this.session.view(req.seat);
  }

  /** Hosting toggle / take-back. Always allowed for the seated player. */
  setControl(req: WebSetControlRequest): SeatView {
    this.session.seat.setControl({ seat: req.seat, control: req.control });
    return this.session.view(req.seat);
  }

  takeBack(seat: number): SeatView {
    return this.setControl({ seat, control: "manual" });
  }

  /** UI calls this after the betting round is complete (no engine logic in HTML). */
  advanceStreet(): SeatView {
    this.session.advanceStreet();
    // Return seat 0 view as a convenience; UI should re-fetch per seat.
    return this.session.view(0);
  }

  legal(seat: number) {
    const you = this.session.view(seat).you;
    if (you.control !== "manual") return [];
    return this.session.legal(seat);
  }
}
