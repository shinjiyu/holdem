import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "../..");

const pluginRoots = [
  "src/deck",
  "src/evaluate",
  "src/betting",
  "src/dealer",
  "src/bank",
  "src/seat",
  "src/hosts",
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

describe("REQ-AUTH-GITHUB isolation", () => {
  it("src/auth does not import plugins, hosts, or octokit", () => {
    const banned = [
      /from\s+["'].*\/(deck|evaluate|betting|dealer|bank|seat|hosts)\b/,
      /from\s+["']@octokit\//,
      /octokit/,
    ];
    const offenders: string[] = [];
    for (const file of walkTs(join(root, "src/auth"))) {
      const text = readFileSync(file, "utf8");
      for (const re of banned) {
        if (re.test(text)) {
          offenders.push(`${relative(root, file)} matches ${re}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("plugins and hosts do not import octokit", () => {
    const offenders: string[] = [];
    for (const rel of pluginRoots) {
      const abs = join(root, rel);
      for (const file of walkTs(abs)) {
        const text = readFileSync(file, "utf8");
        if (/@octokit\//.test(text) || /from\s+["']octokit/.test(text)) {
          offenders.push(relative(root, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
