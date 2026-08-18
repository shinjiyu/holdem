---
id: REQ-CONTRACTS-TABLE
module: contracts
role: lead
status: done
agent: lead
owns_paths:
  - src/contracts/shared/**
  - tests/contracts/shared-dto.test.ts
  - doc/specs/REQ-CONTRACTS-TABLE.md
blocked_by: []
blocked_reason: ""
last_updated: 2026-08-18
---

# Spec: REQ-CONTRACTS-TABLE

共享 DTO 已在 `src/contracts/shared/dto.ts`。各 plugin 端口归各自 spec 的 `contracts/<id>/**`，不要再改 shared（Lane B，lead 串行）。
