import type { HeadlessPlugin } from "../contracts";

export class EvaluatePlugin implements HeadlessPlugin {
  readonly id = "evaluate";
  step(): void {}
}
