# Agent operating manual (holdem)

You are working in **holdem** — 可嵌入 Cursor / DeepSeek Harness / Codex / 通用 harness 的无限制德州扑克引擎。

Read and follow:

1. [`doc/agents/ROLES.md`](doc/agents/ROLES.md)
2. [`doc/agents/WORKFLOW.md`](doc/agents/WORKFLOW.md)
3. [`doc/agents/GIT-COLLAB.md`](doc/agents/GIT-COLLAB.md)
4. [`doc/structurizr/CORE-THEORY.md`](doc/structurizr/CORE-THEORY.md)
5. [`doc/structurizr/ADL-RULES.md`](doc/structurizr/ADL-RULES.md)
6. [`doc/design/HOST-EMBED.md`](doc/design/HOST-EMBED.md)
7. [`doc/design/STAR-GRANT.md`](doc/design/STAR-GRANT.md)
8. [`doc/design/HOSTING.md`](doc/design/HOSTING.md)
9. Run `py scripts/adl_check.py` before finishing ADL/structure work

## Default role for this Cursor

**This Cursor workspace agent is `lead`.**

- May edit ADL and push `main` (on this PC use `hutao`, not `git`)
- Splits Issues with strong acceptance + non-overlapping `owns_paths`
- Other agents: `module` | `integrator` | `reviewer` — claim, branch, MR only

Only switch away from `lead` if the user explicitly assigns another role.

Framework checklist: [`doc/agents/FRAMEWORK-STATUS.md`](doc/agents/FRAMEWORK-STATUS.md).

## Scope lock (when acting as module)

Only touch paths listed in the claimed spec `owns_paths`. Do not edit other plugins. Do not edit `doc/structurizr/model/*` — if ADL must change, `blocked: needs-adl`. Do not import `src/hosts/**` or host SDKs from a plugin.
