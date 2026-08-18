import type { HeadlessPlugin } from "../contracts";

/** Player port. Hosts consume SeatView / ActionIntent via compose. */
export class SeatPlugin implements HeadlessPlugin {
  readonly id = "seat";
  step(): void {}
}
