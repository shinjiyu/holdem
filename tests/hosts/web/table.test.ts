import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Auth } from "../../../src/auth";
import { TableSession } from "../../../src/app/table-session";
import { TABLE_HTML, WebTableHost } from "../../../src/hosts/web";

function setup() {
  const auth = new Auth({
    clientId: "web-test",
    tokenSecret: "web-secret",
    profileFetcher: {
      async fetchByCode(code: string) {
        return { login: code === "bob" ? "bob" : "alice" };
      },
    },
  });
  const session = new TableSession();
  const host = new WebTableHost(session, auth);
  return { auth, session, host };
}

async function sitTwo(host: WebTableHost) {
  const alice = await host.completeLogin("alice");
  const bob = await host.completeLogin("bob");
  host.sit(0, alice.githubLogin);
  host.sit(1, bob.githubLogin);
  host.startHand({ button: 0, seed: 11, tableId: "web-1" });
}

describe("REQ-WEB-TABLE", () => {
  it("manual clicks finish a hand without hosting", async () => {
    const { host } = setup();
    await sitTwo(host);

    expect(host.loginUrl()).toContain("github.com/login/oauth/authorize");
    expect(host.view(0).you.control).toBe("manual");

    host.clickAct({ seat: 0, intent: { kind: "call" } });
    host.clickAct({ seat: 1, intent: { kind: "check" } });
    expect(host.view(0).street).toBe("flop");

    for (const street of ["turn", "river", "showdown"] as const) {
      const first = host.view(0).actorsSeat!;
      const second = first === 0 ? 1 : 0;
      host.clickAct({ seat: first, intent: { kind: "check" } });
      host.clickAct({ seat: second, intent: { kind: "check" } });
      expect(host.view(0).street).toBe(street);
    }

    const result = host.result();
    expect(result).not.toBeNull();
    expect(result!.board).toHaveLength(5);
    expect(result!.winners.length).toBeGreaterThan(0);
  });

  it("hosted blocks click act; take-back restores manual clicks", async () => {
    const { host } = setup();
    await sitTwo(host);

    host.setControl({ seat: 0, control: "hosted", host: "cursor" });
    expect(host.legal(0)).toEqual([]);
    expect(() => host.clickAct({ seat: 0, intent: { kind: "call" } })).toThrow(
      /hosted/i,
    );

    host.takeBack(0);
    expect(host.view(0).you.control).toBe("manual");
    host.clickAct({ seat: 0, intent: { kind: "call" } });
    expect(host.view(0).toCall).toBe(0);
  });

  it("table HTML reminds top-level login and has no dealer/betting imports", () => {
    expect(TABLE_HTML).toMatch(/top-level/i);
    expect(TABLE_HTML).not.toMatch(/dealer|betting|evaluate/i);
    const page = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../../src/hosts/web/table-page.ts"),
      "utf8",
    );
    expect(page).not.toMatch(/from ["'].*\/(dealer|betting|evaluate)/);
  });
});
