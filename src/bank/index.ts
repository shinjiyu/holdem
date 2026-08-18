import { DEFAULT_TABLE_CONFIG } from "../config";
import type { HeadlessPlugin } from "../contracts";
import type {
  BankPort,
  GrantRequest,
  PostBlindsRequest,
  SettleRequest,
  SitRequest,
} from "../contracts/bank";

export class BankPlugin implements HeadlessPlugin, BankPort {
  readonly id = "bank";
  private readonly stacks = new Map<number, number>();
  private readonly seatByLogin = new Map<string, number>();
  private committed = 0;

  sit(req: SitRequest): void {
    const prev = this.seatByLogin.get(req.githubLogin);
    if (prev !== undefined && prev !== req.seat) {
      this.stacks.delete(prev);
    }
    this.seatByLogin.set(req.githubLogin, req.seat);
    this.stacks.set(req.seat, req.stack ?? DEFAULT_TABLE_CONFIG.startingStack);
  }

  postBlinds(req: PostBlindsRequest): void {
    this.commit(req.sbSeat, DEFAULT_TABLE_CONFIG.smallBlind);
    this.commit(req.bbSeat, DEFAULT_TABLE_CONFIG.bigBlind);
  }

  settle(req: SettleRequest): void {
    for (const winner of req.winners) {
      const stack = this.stacks.get(winner.seat) ?? 0;
      this.stacks.set(winner.seat, stack + winner.amount);
      this.committed = Math.max(0, this.committed - winner.amount);
    }
  }

  grant(req: GrantRequest): void {
    const seat = this.seatByLogin.get(req.githubLogin);
    if (seat === undefined) {
      throw new Error(`grant: unknown githubLogin ${req.githubLogin}`);
    }
    const stack = this.stacks.get(seat) ?? 0;
    this.stacks.set(seat, stack + req.amount);
  }

  stack(seat: number): number {
    return this.stacks.get(seat) ?? 0;
  }

  pot(): number {
    return this.committed;
  }

  step(): void {}

  private commit(seat: number, amount: number): void {
    const stack = this.stacks.get(seat) ?? 0;
    const posted = Math.min(stack, amount);
    this.stacks.set(seat, stack - posted);
    this.committed += posted;
  }
}
