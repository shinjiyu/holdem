import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const bannedRoots = [
  "src/deck",
  "src/evaluate",
  "src/betting",
  "src/dealer",
  "src/bank",
  "src/seat",
  "src/runtime",
  "src/app",
  "src/config",
  "src/auth",
  "src/contracts",
];

const hostPatterns = [
  /from\s+["'].*hosts\//,
  /from\s+["']@cursor\//,
  /from\s+["']cursor-sdk/,
  /deepseek-harness/,
  /from\s+["']@openai\//,
  /from\s+["']@octokit\//,
];

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkTs(p));
    else if (name.endsWith(".ts")) out.push(p);
  }
  return out;
}

describe("headless import ban", () => {
  it("engine packages do not import hosts or host SDKs", () => {
    const offenders: string[] = [];
    for (const rel of bannedRoots) {
      const abs = join(root, rel);
      for (const file of walkTs(abs)) {
        const text = readFileSync(file, "utf8");
        for (const re of hostPatterns) {
          if (re.test(text)) {
            offenders.push(`${relative(root, file)} matches ${re}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
