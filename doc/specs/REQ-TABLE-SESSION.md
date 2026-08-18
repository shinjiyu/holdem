---
id: REQ-TABLE-SESSION
module: runtime
role: integrator
status: blocked
agent: unassigned
owns_paths:
  - src/app/**
  - src/runtime/**
  - tests/app/**
  - tests/runtime/**
  - doc/specs/REQ-TABLE-SESSION.md
blocked_by:
  - REQ-DEALER-STREET
  - REQ-SEAT-PORT
blocked_reason: "needs-impl: dealer + seat on main"
adl_ready: yes
serialize: true
last_updated: 2026-08-18
---

# Spec: REQ-TABLE-SESSION

## Meta
- req-id: REQ-TABLE-SESSION
- component: runtime
- role: integrator
- test_kind: unit
- status: blocked
- serialize: true（Lane B：app/runtime）

## 目标
无宿主：runtime 把 deck/evaluate/betting/dealer/bank/seat 接成一手可测的牌。假 `githubLogin`，不接 GitHub。

## 允许修改路径 owns_paths
- `src/app/**`
- `src/runtime/**`
- `tests/app/**`
- `tests/runtime/**`
- `doc/specs/REQ-TABLE-SESSION.md`

不要改 `tests/headless-import-ban.test.ts`。

## 验收
- [ ] 两个假帐号坐下，打完一手，有 HandResult
- [ ] 不 import `src/hosts`
- [ ] `py scripts/adl_check.py` exit 0

## 依赖
- blocked_by: REQ-DEALER-STREET, REQ-SEAT-PORT（evaluate/betting/bank/deck 已被 dealer 挡住）

## 冲突预检 conflict_check
- [x] 未与 ready Issue 抢 app/runtime（其它 ready 不碰这两目录）
