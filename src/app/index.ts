import { DEFAULT_TABLE_CONFIG } from "../config";
import { createRuntime } from "../runtime";
import { DeckPlugin } from "../deck";
import { EvaluatePlugin } from "../evaluate";
import { BettingPlugin } from "../betting";
import { DealerPlugin } from "../dealer";
import { BankPlugin } from "../bank";
import { SeatPlugin } from "../seat";

/** Session shell. Hosts are wired by integrator; not imported here yet. */
export function createTableApp() {
  const plugins = [
    new DealerPlugin(),
    new DeckPlugin(),
    new BettingPlugin(),
    new EvaluatePlugin(),
    new BankPlugin(),
    new SeatPlugin(),
  ];
  const runtime = createRuntime(plugins);
  return {
    config: DEFAULT_TABLE_CONFIG,
    runtime,
  };
}
