import type { HeadlessPlugin } from "../contracts";

export class BettingPlugin implements HeadlessPlugin {
  readonly id = "betting";
  step(): void {}
}
