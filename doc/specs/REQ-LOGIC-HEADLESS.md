---
id: REQ-LOGIC-HEADLESS
module: runtime
role: lead
status: done
agent: lead
owns_paths:
  - tests/headless-import-ban.test.ts
  - doc/specs/REQ-LOGIC-HEADLESS.md
blocked_by: []
blocked_reason: ""
last_updated: 2026-08-18
---

# Spec: REQ-LOGIC-HEADLESS

门禁测试已有。后续 Issue 不得从 plugin/runtime/app/auth/contracts import `src/hosts` 或 GitHub/Cursor SDK。不要把本文件列入其它 Issue 的 owns_paths。
