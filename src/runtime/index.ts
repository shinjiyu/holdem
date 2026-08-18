import type { HeadlessPlugin } from "../contracts";
import { DEFAULT_HAND_ORDER } from "./hand-order";

export { DEFAULT_HAND_ORDER } from "./hand-order";

export function createRuntime(plugins: HeadlessPlugin[]) {
  const byId = new Map(plugins.map((p) => [p.id, p]));
  return {
    stepOnce() {
      for (const id of DEFAULT_HAND_ORDER) {
        byId.get(id)?.step?.();
      }
    },
  };
}
