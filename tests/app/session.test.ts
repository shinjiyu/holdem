import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { createTableApp } from "../../src/app";

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkTs(p));
    else if (name.endsWith(".ts")) out.push(p);
  }
  return out;
}

describe("REQ-TABLE-SESSION", () => {
  it("two fake github logins sit and finish a hand with HandResult", () => {
    const { session, runtime } = createTableApp();
    session.sit({ seat: 0, githubLogin: "alice" });
    session.sit({ seat: 1, githubLogin: "bob" });
    session.startHand({ button: 0, seed: 7, tableId: "t-headless" });

    expect(session.view(0).you.githubLogin).toBe("alice");
    expect(session.view(0).hole).toHaveLength(2);
    expect(session.view(1).hole).toHaveLength(2);
    expect(session.view(0).hole).not.toEqual(session.view(1).hole);
    expect(session.view(0).street).toBe("preflop");

    session.act(0, { kind: "call" });
    session.act(1, { kind: "check" });
    session.advanceStreet();
    expect(session.view(0).street).toBe("flop");
    expect(session.view(0).board).toHaveLength(3);

    for (const street of ["turn", "river", "showdown"] as const) {
      session.act(0, { kind: "check" });
      session.act(1, { kind: "check" });
      session.advanceStreet();
      expect(session.view(0).street).toBe(street);
    }

    runtime.stepOnce();
    const result = session.result();
    expect(result).not.toBeNull();
    expect(result!.tableId).toBe("t-headless");
    expect(result!.board).toHaveLength(5);
    expect(result!.shown).toHaveLength(2);
    const awarded = result!.winners.reduce((n, w) => n + w.amount, 0);
    expect(awarded).toBe(200);
    expect(awarded).toBeGreaterThan(0);
  });
});

describe("app import ban", () => {
  it("does not import hosts", () => {
    const dir = join(import.meta.dirname, "../../src/app");
    const offenders: string[] = [];
    for (const file of walkTs(dir)) {
      const text = readFileSync(file, "utf8");
      if (/from\s+["'].*hosts/.test(text)) {
        offenders.push(relative(join(import.meta.dirname, "../.."), file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
