import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { createTableApp } from "../../src/app";
import { TableSession } from "../../src/app/table-session";
import { DEFAULT_TABLE_CONFIG } from "../../src/config";

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
    expect(session.view(0).actorsSeat).toBe(0); // HU: SB/button acts first

    session.act(0, { kind: "call" });
    expect(session.view(0).actorsSeat).toBe(1);
    session.act(1, { kind: "check" });
    // betting complete → auto flop
    expect(session.view(0).street).toBe("flop");
    expect(session.view(0).board).toHaveLength(3);
    expect(session.view(0).actorsSeat).toBe(1); // postflop: left of button

    for (const street of ["turn", "river", "showdown"] as const) {
      const first = session.view(0).actorsSeat!;
      const second = first === 0 ? 1 : 0;
      session.act(first, { kind: "check" });
      session.act(second, { kind: "check" });
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
    expect(session.isHandActive()).toBe(false);
  });

  it("rejects act out of turn; check/bet progress the actor", () => {
    const { session } = createTableApp();
    session.sit({ seat: 0, githubLogin: "alice" });
    session.sit({ seat: 1, githubLogin: "bob" });
    session.startHand({ button: 0, seed: 3 });

    expect(() => session.act(1, { kind: "check" })).toThrow(/not your turn/i);
    expect(session.legal(1)).toEqual([]);
    expect(session.legal(0).map((a) => a.kind)).toEqual(
      expect.arrayContaining(["call", "fold"]),
    );

    session.act(0, { kind: "call" });
    const before = session.view(1).pot;
    session.act(1, { kind: "check" });
    expect(session.view(1).street).toBe("flop");

    expect(session.view(1).actorsSeat).toBe(1);
    session.act(1, { kind: "bet", amount: 100 });
    expect(session.view(1).pot).toBe(before + 100);
    expect(session.view(0).toCall).toBe(100);
    expect(session.view(0).actorsSeat).toBe(0);
  });

  it("timeout auto-checks when legal, else folds", () => {
    let now = 1_000;
    const session = new TableSession(
      { ...DEFAULT_TABLE_CONFIG, actionTimeoutMs: 1_000 },
      () => now,
    );
    session.sit({ seat: 0, githubLogin: "alice" });
    session.sit({ seat: 1, githubLogin: "bob" });
    session.startHand({ button: 0, seed: 9 });

    expect(session.view(0).actorsSeat).toBe(0);
    expect(session.view(0).actionDeadlineMs).toBe(2_000);

    // SB facing BB: cannot check → timeout folds → bob wins
    now = 2_001;
    session.expireTimedOutActions();
    expect(session.isHandActive()).toBe(false);
    expect(session.result()?.winners[0]?.seat).toBe(1);
  });

  it("all-in runout skips empty-legal seats and settles at showdown", () => {
    const session = new TableSession();
    session.sit({ seat: 0, githubLogin: "alice", stack: 150 });
    session.sit({ seat: 1, githubLogin: "bob", stack: 10_000 });
    session.startHand({ button: 0, seed: 21 });

    // HU: SB (0) all-in for remaining; BB calls
    session.act(0, { kind: "allin" });
    session.act(1, { kind: "call" });
    // Both matched / alice all-in → auto-deal to showdown
    expect(session.isHandActive()).toBe(false);
    expect(session.view(0).street).toBe("showdown");
    expect(session.view(0).board).toHaveLength(5);
    expect(session.result()).not.toBeNull();
    expect(session.result()!.shown.length).toBe(2);
  });

  it("timeout on all-in actor does not hang; advances to showdown", () => {
    let now = 5_000;
    const session = new TableSession(
      { ...DEFAULT_TABLE_CONFIG, actionTimeoutMs: 1_000 },
      () => now,
    );
    session.sit({ seat: 0, githubLogin: "alice", stack: 150 });
    session.sit({ seat: 1, githubLogin: "bob", stack: 10_000 });
    session.startHand({ button: 0, seed: 22 });
    session.act(0, { kind: "allin" });
    // If somehow an all-in seat is still actor with empty legal, expire must not throw
    now = 100_000;
    expect(() => session.expireTimedOutActions()).not.toThrow();
    expect(session.result()).not.toBeNull();
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
