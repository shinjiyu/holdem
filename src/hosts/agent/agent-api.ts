import type { ActionIntent, ControlMode, HandResult, SeatView } from "../../contracts/shared/dto";
import type { TableSession } from "../../app/table-session";
import type { Auth, IssuedTableToken } from "../../auth";

export interface AgentIdentity {
  githubLogin: string;
  tableId: string;
  seat: number;
  token: string;
}

/**
 * Hosting API for Cursor / Codex / DSH / CLI.
 * Accepts ActionIntent only when the seat control is hosted and the table token matches.
 */
export class AgentPlayApi {
  constructor(
    readonly session: TableSession,
    readonly auth: Auth,
  ) {}

  issueToken(input: {
    githubLogin: string;
    tableId: string;
    seat: number;
  }): IssuedTableToken {
    return this.auth.issueTableToken(input);
  }

  setControl(id: AgentIdentity, control: ControlMode): SeatView {
    this.verify(id);
    this.session.seat.setControl({ seat: id.seat, control });
    return this.handState(id);
  }

  handState(id: AgentIdentity): SeatView {
    this.verify(id);
    return this.session.view(id.seat);
  }

  /**
   * Legal actions for the agent. Empty when control is manual
   * (agent must not act; H5 owns the seat).
   */
  legalActions(id: AgentIdentity): SeatView["legal"] {
    this.verify(id);
    const view = this.session.view(id.seat);
    if (view.you.control !== "hosted") return [];
    return this.session.legal(id.seat);
  }

  act(id: AgentIdentity, intent: ActionIntent): SeatView {
    this.verify(id);
    const view = this.session.view(id.seat);
    if (view.you.control !== "hosted") {
      throw new Error("act rejected: seat control is manual");
    }
    this.session.act(id.seat, intent);
    return this.session.view(id.seat);
  }

  /** Table-level advance after a betting round; token must match a seated player. */
  advanceStreet(id: AgentIdentity): SeatView {
    this.verify(id);
    this.session.advanceStreet();
    return this.session.view(id.seat);
  }

  result(id: AgentIdentity): HandResult | null {
    this.verify(id);
    return this.session.result();
  }

  private verify(id: AgentIdentity): void {
    this.auth.verifyTableToken(id.token, {
      githubLogin: id.githubLogin,
      tableId: id.tableId,
      seat: id.seat,
    });
    const you = this.session.view(id.seat).you;
    if (you.githubLogin !== id.githubLogin) {
      throw new Error("table token seat occupant mismatch");
    }
  }
}
