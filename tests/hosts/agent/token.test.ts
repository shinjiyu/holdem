import { describe, expect, it } from "vitest";
import { Auth } from "../../../src/auth";
import { TableSession } from "../../../src/app/table-session";
import { AgentPlayApi } from "../../../src/hosts/agent";

describe("agent HTTP identity shape", () => {
  it("issues and verifies table token for agent tools", () => {
    const auth = new Auth({ tokenSecret: "dsh-test-secret" });
    const session = new TableSession();
    session.sit({ seat: 0, githubLogin: "alice" });
    session.sit({ seat: 1, githubLogin: "bob" });
    const api = new AgentPlayApi(session, auth);
    const issued = api.issueToken({ githubLogin: "alice", tableId: "t1", seat: 0 });
    expect(issued.token).toContain(".");
    api.setControl(
      { githubLogin: "alice", tableId: "t1", seat: 0, token: issued.token },
      "hosted",
    );
    expect(api.handState({
      githubLogin: "alice",
      tableId: "t1",
      seat: 0,
      token: issued.token,
    }).you.control).toBe("hosted");
  });
});
