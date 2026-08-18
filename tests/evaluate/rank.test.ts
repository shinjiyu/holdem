import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "../../src/contracts/shared/dto";
import type { EvaluateRequest, HandCategory } from "../../src/contracts/evaluate";
import { EvaluatePlugin } from "../../src/evaluate";

function c(s: string): Card {
  return { rank: s[0] as Rank, suit: s[1] as Suit };
}

function req(hole: [string, string], board: [string, string, string, string, string]): EvaluateRequest {
  return {
    hole: [c(hole[0]), c(hole[1])],
    board: board.map(c) as [Card, Card, Card, Card, Card],
  };
}

function plugin(): EvaluatePlugin {
  return new EvaluatePlugin();
}

describe("REQ-EVALUATE-RANK 7-card categories", () => {
  it("ranks high card", () => {
    const r = plugin().rank(req(["Ah", "Kd"], ["9c", "7s", "5h", "3d", "2c"]));
    expect(r.category).toBe("high-card" satisfies HandCategory);
  });

  it("ranks a pair", () => {
    const r = plugin().rank(req(["Ah", "Ad"], ["9c", "7s", "5h", "3d", "2c"]));
    expect(r.category).toBe("pair");
  });

  it("ranks two pair", () => {
    const r = plugin().rank(req(["Ah", "Ad"], ["Kh", "Kd", "5h", "3d", "2c"]));
    expect(r.category).toBe("two-pair");
  });

  it("ranks trips", () => {
    const r = plugin().rank(req(["Ah", "Ad"], ["Ac", "7s", "5h", "3d", "2c"]));
    expect(r.category).toBe("trips");
  });

  it("ranks a straight", () => {
    const r = plugin().rank(req(["Ah", "Kd"], ["Qc", "Js", "Th", "3d", "2c"]));
    expect(r.category).toBe("straight");
  });

  it("ranks a flush", () => {
    const r = plugin().rank(req(["Ah", "Kh"], ["9h", "7h", "5h", "3d", "2c"]));
    expect(r.category).toBe("flush");
  });

  it("ranks a full house", () => {
    const r = plugin().rank(req(["Ah", "Ad"], ["Ac", "Kh", "Kd", "3d", "2c"]));
    expect(r.category).toBe("full-house");
  });

  it("ranks quads", () => {
    const r = plugin().rank(req(["Ah", "Ad"], ["Ac", "As", "5h", "3d", "2c"]));
    expect(r.category).toBe("quads");
  });

  it("ranks a straight flush", () => {
    const r = plugin().rank(req(["Ah", "Kh"], ["Qh", "Jh", "Th", "3d", "2c"]));
    expect(r.category).toBe("straight-flush");
  });

  it("ranks the A-5 wheel as a straight, not ace-high", () => {
    const r = plugin().rank(req(["Ah", "2d"], ["3c", "4s", "5h", "Kd", "Qc"]));
    expect(r.category).toBe("straight");
  });

  it("ranks an A-5 steel wheel as a straight flush", () => {
    const r = plugin().rank(req(["Ah", "2h"], ["3h", "4h", "5h", "Kd", "Qc"]));
    expect(r.category).toBe("straight-flush");
  });
});

describe("REQ-EVALUATE-RANK compare", () => {
  it("pair beats high card", () => {
    const ev = plugin();
    const a = ev.rank(req(["Ah", "Ad"], ["9c", "7s", "5h", "3d", "2c"]));
    const b = ev.rank(req(["Kh", "Qd"], ["9c", "7s", "5h", "3d", "2c"]));
    expect(ev.compare(a, b).winner).toBe("a");
    expect(ev.compare(b, a).winner).toBe("b");
  });

  it("two pair beats pair", () => {
    const ev = plugin();
    const a = ev.rank(req(["Ah", "Kd"], ["Ac", "Kh", "5s", "3d", "2c"]));
    const b = ev.rank(req(["Ah", "Qd"], ["Ac", "Kh", "5s", "3d", "2c"]));
    expect(ev.compare(a, b).winner).toBe("a");
  });

  it("trips beat two pair", () => {
    const ev = plugin();
    const a = ev.rank(req(["5h", "5d"], ["5c", "Kh", "Ad", "3s", "2c"]));
    const b = ev.rank(req(["Ah", "Kd"], ["5c", "Kh", "Ad", "3s", "2c"]));
    expect(a.category).toBe("trips");
    expect(b.category).toBe("two-pair");
    expect(ev.compare(a, b).winner).toBe("a");
  });

  it("straight beats trips", () => {
    const ev = plugin();
    const a = ev.rank(req(["9h", "8d"], ["7c", "6s", "5h", "5d", "5c"]));
    const b = ev.rank(req(["Ah", "Kd"], ["7c", "6s", "5h", "5d", "5c"]));
    expect(ev.compare(a, b).winner).toBe("a");
  });

  it("flush beats straight", () => {
    const ev = plugin();
    const a = ev.rank(req(["Ah", "2h"], ["Kh", "9h", "7h", "Qc", "Jd"]));
    const b = ev.rank(req(["Ts", "9c"], ["Kh", "9h", "7h", "Qc", "Jd"]));
    expect(ev.compare(a, b).winner).toBe("a");
  });

  it("full house beats flush", () => {
    const ev = plugin();
    const a = ev.rank(req(["Ah", "Ad"], ["Ac", "Kh", "Kd", "7h", "5h"]));
    const b = ev.rank(req(["9h", "2h"], ["Ac", "Kh", "Kd", "7h", "5h"]));
    expect(a.category).toBe("full-house");
    expect(b.category).toBe("flush");
    expect(ev.compare(a, b).winner).toBe("a");
  });

  it("quads beat full house", () => {
    const ev = plugin();
    const a = ev.rank(req(["9h", "9d"], ["9c", "9s", "Ah", "Ad", "Kc"]));
    const b = ev.rank(req(["As", "Kh"], ["9c", "9s", "Ah", "Ad", "Kc"]));
    expect(ev.compare(a, b).winner).toBe("a");
  });

  it("straight flush beats quads", () => {
    const ev = plugin();
    const a = ev.rank(req(["9h", "8h"], ["7h", "6h", "5h", "5d", "5c"]));
    const b = ev.rank(req(["5s", "Ah"], ["7h", "6h", "5h", "5d", "5c"]));
    expect(ev.compare(a, b).winner).toBe("a");
  });

  it("6-high straight beats the A-5 wheel", () => {
    const ev = plugin();
    const sixHigh = ev.rank(req(["6h", "2d"], ["3c", "4s", "5h", "Kd", "Qc"]));
    const wheel = ev.rank(req(["Ah", "2s"], ["3c", "4s", "5h", "Kd", "Qc"]));
    expect(sixHigh.category).toBe("straight");
    expect(wheel.category).toBe("straight");
    expect(ev.compare(sixHigh, wheel).winner).toBe("a");
  });

  it("higher pair wins via tiebreak", () => {
    const ev = plugin();
    const a = ev.rank(req(["Ah", "Ad"], ["9c", "7s", "5h", "3d", "2c"]));
    const b = ev.rank(req(["Kh", "Kd"], ["9c", "7s", "5h", "3d", "2c"]));
    expect(ev.compare(a, b).winner).toBe("a");
  });

  it("kicker decides equal pairs", () => {
    const ev = plugin();
    const a = ev.rank(req(["Ah", "9d"], ["Ac", "7s", "5h", "3d", "2c"]));
    const b = ev.rank(req(["Ah", "8d"], ["Ac", "7s", "5h", "3d", "2c"]));
    expect(ev.compare(a, b).winner).toBe("a");
  });

  it("returns tie when both hands play the same five cards", () => {
    const ev = plugin();
    const board: [string, string, string, string, string] = ["Ah", "Kh", "Qh", "Jh", "Th"];
    const a = ev.rank(req(["2c", "3d"], board));
    const b = ev.rank(req(["4c", "5d"], board));
    expect(a.category).toBe("straight-flush");
    expect(b.category).toBe("straight-flush");
    expect(ev.compare(a, b).winner).toBe("tie");
  });

  it("returns tie for identical pair plus board kickers", () => {
    const ev = plugin();
    const a = ev.rank(req(["Ah", "2c"], ["Ad", "Kc", "Qd", "Js", "9h"]));
    const b = ev.rank(req(["As", "3d"], ["Ad", "Kc", "Qd", "Js", "9h"]));
    expect(ev.compare(a, b).winner).toBe("tie");
  });
});

describe("REQ-EVALUATE-RANK isolation", () => {
  it("evaluate sources do not import betting, dealer, hosts, or host SDKs", () => {
    const root = join(import.meta.dirname, "../..");
    const banned = [
      /from\s+["'].*\/betting/,
      /from\s+["'].*\/dealer/,
      /from\s+["'].*hosts\//,
      /from\s+["']@cursor\//,
      /from\s+["']cursor-sdk/,
      /deepseek-harness/,
      /from\s+["']@openai\//,
      /from\s+["']@octokit\//,
      /from\s+["']cc["']/,
    ];

    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) out.push(...walk(p));
        else if (name.endsWith(".ts")) out.push(p);
      }
      return out;
    }

    const offenders: string[] = [];
    for (const rel of ["src/evaluate", "src/contracts/evaluate"]) {
      const abs = join(root, rel);
      if (!existsSync(abs)) continue;
      for (const file of walk(abs)) {
        const text = readFileSync(file, "utf8");
        for (const re of banned) {
          if (re.test(text)) offenders.push(`${relative(root, file)} matches ${re}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
