import type { AgentIdentity, AgentPlayApi } from "../agent/agent-api";
import type { ActionIntent, ControlMode } from "../../contracts/shared/dto";

export const hostId = "cli" as const;

export type CliRequest =
  | { op: "hand_state"; id: AgentIdentity }
  | { op: "legal_actions"; id: AgentIdentity }
  | { op: "act"; id: AgentIdentity; intent: ActionIntent }
  | { op: "set_control"; id: AgentIdentity; control: ControlMode }
  | { op: "advance_street"; id: AgentIdentity }
  | { op: "result"; id: AgentIdentity };

/** Generic harness: one JSON request → JSON response. No DOM. */
export function handleCli(api: AgentPlayApi, req: CliRequest): unknown {
  switch (req.op) {
    case "hand_state":
      return api.handState(req.id);
    case "legal_actions":
      return api.legalActions(req.id);
    case "act":
      return api.act(req.id, req.intent);
    case "set_control":
      return api.setControl(req.id, req.control);
    case "advance_street":
      return api.advanceStreet(req.id);
    case "result":
      return api.result(req.id);
  }
}
