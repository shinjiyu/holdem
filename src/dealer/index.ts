import type { HeadlessPlugin } from "../contracts";

export class DealerPlugin implements HeadlessPlugin {
  readonly id = "dealer";
  step(): void {}
}
