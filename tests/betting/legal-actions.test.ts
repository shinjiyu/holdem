import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { BettingPlugin } from "../../src/betting";
import { DEFAULT_TABLE_CONFIG } from "../../src/config";
import type { ActionKind, LegalAction } from "../../src/contracts/shared/dto";

const { bigBlind } = DEFAULT_TABLE_CONFIG;

function kinds(actions: LegalAction[]): ActionKind[] {
  return actions.map((a) => a.kind);
}

function action(actions: LegalAction[], kind: ActionKind): LegalAction | undefined {
  return actions.find((a) => a.kind === kind);
}

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkTs(p));
    else if (name.endsWith(".ts")) out.push(p);
  }
  return out;
}

describe("REQ-BETTING-LEGAL", () => {
  it("when nobody has bet: check and bet are legal, call is not", () => {
    const betting = new BettingPlugin();
    betting.startStreet({ stacks: { 0: 10_000, 1: 10_000 } });

    const legal = betting.legal(0);
    expect(kinds(legal)).toContain("check");
    expect(kinds(legal)).toContain("bet");
    expect(kinds(legal)).not.toContain("call");
    expect(action(legal, "bet")?.min).toBe(bigBlind);
  });

  it("when facing a bet: fold/call/raise/allin are legal, check is not", () => {
    const betting = new BettingPlugin();
    betting.startStreet({ stacks: { 0: 10_000, 1: 10_000 } });
    betting.apply(0, { kind: "bet", amount: bigBlind });

    const legal = betting.legal(1);
    expect(kinds(legal)).toEqual(
      expect.arrayContaining(["fold", "call", "raise", "allin"]),
    );
    expect(kinds(legal)).not.toContain("check");
  });

  it("min-raise is at least the previous raise size", () => {
    const betting = new BettingPlugin();
    betting.startStreet({ stacks: { 0: 10_000, 1: 10_000, 2: 10_000 } });

    betting.apply(0, { kind: "bet", amount: 200 });
    const firstRaise = action(betting.legal(1), "raise");
    expect(firstRaise?.min).toBeGreaterThanOrEqual(400);

    betting.apply(1, { kind: "raise", amount: 600 });
    const secondRaise = action(betting.legal(2), "raise");
    expect(secondRaise?.min).toBeGreaterThanOrEqual(1000);
  });

  it("short stack facing a bet may only fold or all-in", () => {
    const betting = new BettingPlugin();
    betting.startStreet({ stacks: { 0: 10_000, 1: 50 } });
    betting.apply(0, { kind: "bet", amount: bigBlind });

    expect(kinds(betting.legal(1)).sort()).toEqual(["allin", "fold"]);
  });

  it("apply updates pot and toCall; illegal actions are rejected", () => {
    const betting = new BettingPlugin();
    betting.startStreet({ stacks: { 0: 10_000, 1: 10_000 } });

    expect(betting.pot).toBe(0);
    expect(betting.toCall(1)).toBe(0);
    expect(() => betting.apply(0, { kind: "call" })).toThrow();

    betting.apply(0, { kind: "bet", amount: bigBlind });
    expect(betting.pot).toBe(bigBlind);
    expect(betting.toCall(1)).toBe(bigBlind);
    expect(() => betting.apply(1, { kind: "check" })).toThrow();

    betting.apply(1, { kind: "call" });
    expect(betting.pot).toBe(bigBlind * 2);
    expect(betting.toCall(1)).toBe(0);
  });

  it("does not import other plugins or hosts", () => {
    const root = join(import.meta.dirname, "..", "..");
    const banned = [
      /from\s+["'].*\/(deck|evaluate|dealer|bank|seat|hosts|app|runtime)(?:\/|"|')/,
      /from\s+["']@cursor\//,
      /from\s+["']cursor-sdk/,
      /deepseek-harness/,
      /from\s+["']@openai\//,
      /from\s+["']@octokit\//,
    ];
    const offenders: string[] = [];
    for (const rel of ["src/betting", "src/contracts/betting"]) {
      const abs = join(root, rel);
      try {
        statSync(abs);
      } catch {
        continue;
      }
      for (const file of walkTs(abs)) {
        const text = readFileSync(file, "utf8");
        for (const re of banned) {
          if (re.test(text)) {
            offenders.push(`${relative(root, file)} matches ${re}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
