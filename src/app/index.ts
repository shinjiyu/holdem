import { createRuntime } from "../runtime";
import { TableSession } from "./table-session";

export { TableSession } from "./table-session";

/** Session shell. Hosts are wired by integrator; not imported here. */
export function createTableApp() {
  const session = new TableSession();
  const runtime = createRuntime(session.plugins());
  return {
    config: session.config,
    runtime,
    session,
  };
}
