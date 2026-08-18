import { describe, expect, it } from "vitest";
import { Auth } from "../../../src/auth";
import { TableSession } from "../../../src/app/table-session";
import { AgentPlayApi } from "../../../src/hosts/agent";
import { handleCli } from "../../../src/hosts/cli";
import type { AgentIdentity } from "../../../src/hosts/agent";

function setup() {
  const auth = new Auth({ tokenSecret: "agent-secret" });
  const session = new TableSession();
  session.sit({ seat: 0, githubLogin: "alice" });
  session.sit({ seat: 1, githubLogin: "bob" });
  session.startHand({ button: 0, seed: 3, tableId: "agent-1" });
  const api = new AgentPlayApi(session, auth);
  const alice: AgentIdentity = {
    ...api.issueToken({ githubLogin: "alice", tableId: "agent-1", seat: 0 }),
  };
  const bob: AgentIdentity = {
    ...api.issueToken({ githubLogin: "bob", tableId: "agent-1", seat: 1 }),
  };
  return { api, alice, bob, session };
}

describe("REQ-AGENT-PLAY", () => {
  it("rejects act while control is manual", () => {
    const { api, alice } = setup();
    expect(api.handState(alice).you.control).toBe("manual");
    expect(api.legalActions(alice)).toEqual([]);
    expect(() => api.act(alice, { kind: "call" })).toThrow(/manual/i);
  });

  it("hosted table tokens can act through a full hand (no DOM)", () => {
    const { api, alice, bob } = setup();
    api.setControl(alice, "hosted");
    api.setControl(bob, "hosted");

    expect(api.legalActions(alice).some((a) => a.kind === "call")).toBe(true);
    api.act(alice, { kind: "call" });
    api.act(bob, { kind: "check" });
    expect(api.handState(alice).street).toBe("flop");

    for (const street of ["turn", "river", "showdown"] as const) {
      const first = api.handState(alice).actorsSeat!;
      const second = first === 0 ? bob : alice;
      const firstId = first === 0 ? alice : bob;
      api.act(firstId, { kind: "check" });
      api.act(second, { kind: "check" });
      expect(api.handState(alice).street).toBe(street);
    }

    const result = api.result(alice);
    expect(result).not.toBeNull();
    expect(result!.shown).toHaveLength(2);
  });

  it("take-back to manual blocks further agent act", () => {
    const { api, alice } = setup();
    api.setControl(alice, "hosted");
    api.act(alice, { kind: "call" });
    api.setControl(alice, "manual");
    expect(() => api.act(alice, { kind: "check" })).toThrow(/manual/i);
    expect(api.legalActions(alice)).toEqual([]);
  });

  it("cli JSON surface mirrors agent ops without DOM", () => {
    const { api, alice } = setup();
    api.setControl(alice, "hosted");
    const legal = handleCli(api, { op: "legal_actions", id: alice });
    expect(Array.isArray(legal)).toBe(true);
    const view = handleCli(api, {
      op: "act",
      id: alice,
      intent: { kind: "call" },
    });
    expect((view as { you: { control: string } }).you.control).toBe("hosted");
  });
});
