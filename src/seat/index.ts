import type { HeadlessPlugin } from "../contracts";
import type {
  SeatPort,
  SetControlRequest,
  SetHoleRequest,
  SitRequest,
  ViewRequest,
} from "../contracts/seat";
import type { Card, SeatOccupant, SeatView } from "../contracts/shared/dto";

/** Player port. Hosts consume SeatView / ActionIntent via compose. */
export class SeatPlugin implements HeadlessPlugin, SeatPort {
  readonly id = "seat";
  private readonly occupants = new Map<number, SeatOccupant>();
  private readonly holes = new Map<number, Card[]>();

  sit(req: SitRequest): SeatOccupant {
    const existing = this.occupants.get(req.seat);
    if (existing) {
      if (existing.githubLogin !== req.githubLogin) {
        throw new Error(`seat ${req.seat} occupied by ${existing.githubLogin}`);
      }
      return { ...existing };
    }
    const occupant: SeatOccupant = {
      githubLogin: req.githubLogin,
      control: "manual",
    };
    this.occupants.set(req.seat, occupant);
    this.holes.set(req.seat, []);
    return { ...occupant };
  }

  setControl(req: SetControlRequest): SeatOccupant {
    const occupant = this.require(req.seat);
    const next: SeatOccupant = {
      githubLogin: occupant.githubLogin,
      control: req.control,
    };
    this.occupants.set(req.seat, next);
    return { ...next };
  }

  view(req: ViewRequest): SeatView {
    const you = this.require(req.seat);
    return {
      tableId: "",
      seat: req.seat,
      you: { ...you },
      street: "preflop",
      board: [],
      hole: [...(this.holes.get(req.seat) ?? [])],
      pot: 0,
      toCall: 0,
      stack: 0,
      actorsSeat: null,
      legal: [],
    };
  }

  setHole(req: SetHoleRequest): void {
    this.require(req.seat);
    this.holes.set(req.seat, [...req.cards]);
  }

  step(): void {}

  private require(seat: number): SeatOccupant {
    const occupant = this.occupants.get(seat);
    if (!occupant) {
      throw new Error(`seat ${seat} empty`);
    }
    return occupant;
  }
}
