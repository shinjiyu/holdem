import { describe, expect, it } from "vitest";
import { Auth } from "../../src/auth";

describe("REQ-AUTH-GITHUB table token", () => {
  function makeAuth() {
    return new Auth({ tokenSecret: "test-token-secret" });
  }

  it("issueTableToken binds githubLogin+tableId+seat", () => {
    const auth = makeAuth();
    const issued = auth.issueTableToken({
      githubLogin: "octocat",
      tableId: "t1",
      seat: 2,
    });
    expect(issued.githubLogin).toBe("octocat");
    expect(issued.tableId).toBe("t1");
    expect(issued.seat).toBe(2);
    expect(issued.token).toEqual(expect.any(String));
    expect(issued.token.length).toBeGreaterThan(10);

    const claims = auth.verifyTableToken(issued.token, {
      githubLogin: "octocat",
      tableId: "t1",
      seat: 2,
    });
    expect(claims).toEqual({
      githubLogin: "octocat",
      tableId: "t1",
      seat: 2,
    });
  });

  it("rejects wrong seat", () => {
    const auth = makeAuth();
    const { token } = auth.issueTableToken({
      githubLogin: "octocat",
      tableId: "t1",
      seat: 2,
    });
    expect(() =>
      auth.verifyTableToken(token, {
        githubLogin: "octocat",
        tableId: "t1",
        seat: 3,
      }),
    ).toThrow(/seat/i);
  });

  it("rejects wrong githubLogin", () => {
    const auth = makeAuth();
    const { token } = auth.issueTableToken({
      githubLogin: "octocat",
      tableId: "t1",
      seat: 2,
    });
    expect(() =>
      auth.verifyTableToken(token, {
        githubLogin: "other",
        tableId: "t1",
        seat: 2,
      }),
    ).toThrow(/login/i);
  });

  it("rejects wrong tableId", () => {
    const auth = makeAuth();
    const { token } = auth.issueTableToken({
      githubLogin: "octocat",
      tableId: "t1",
      seat: 2,
    });
    expect(() =>
      auth.verifyTableToken(token, {
        githubLogin: "octocat",
        tableId: "t2",
        seat: 2,
      }),
    ).toThrow(/table/i);
  });

  it("rejects a tampered token", () => {
    const auth = makeAuth();
    const { token } = auth.issueTableToken({
      githubLogin: "octocat",
      tableId: "t1",
      seat: 2,
    });
    expect(() =>
      auth.verifyTableToken(`${token}x`, {
        githubLogin: "octocat",
        tableId: "t1",
        seat: 2,
      }),
    ).toThrow();
  });
});
