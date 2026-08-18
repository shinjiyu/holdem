import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const bankRoot = join(import.meta.dirname, "../../src/bank");
const banned = [
  /from\s+["'].*\/auth/,
  /from\s+["'].*\/hosts/,
  /from\s+["'].*\/deck/,
  /from\s+["'].*\/evaluate/,
  /from\s+["'].*\/betting/,
  /from\s+["'].*\/dealer/,
  /from\s+["'].*\/seat/,
  /from\s+["']@octokit\//,
  /from\s+["']octokit/,
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

describe("REQ-BANK-STACK import ban", () => {
  it("bank does not import auth, hosts, other plugins, or octokit", () => {
    const offenders: string[] = [];
    for (const file of walkTs(bankRoot)) {
      const text = readFileSync(file, "utf8");
      for (const re of banned) {
        if (re.test(text)) {
          offenders.push(`${relative(bankRoot, file)} matches ${re}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
