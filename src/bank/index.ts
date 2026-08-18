import type { HeadlessPlugin } from "../contracts";

export class BankPlugin implements HeadlessPlugin {
  readonly id = "bank";
  step(): void {}
}
