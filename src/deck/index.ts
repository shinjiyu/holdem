import type { HeadlessPlugin } from "../contracts";

/** DealPort lives in a later spec. Stub proves graph path exists. */
export class DeckPlugin implements HeadlessPlugin {
  readonly id = "deck";
  step(): void {}
}
