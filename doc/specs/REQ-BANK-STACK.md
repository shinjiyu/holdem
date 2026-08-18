---
id: REQ-BANK-STACK
module: bank
role: module
status: ready
agent: unassigned
owns_paths:
  - src/contracts/bank/**
  - src/bank/**
  - tests/bank/**
  - tests/contracts/bank/**
  - doc/specs/REQ-BANK-STACK.md
blocked_by: []
blocked_reason: ""
adl_ready: yes
serialize: false
last_updated: 2026-08-18
---

# Spec: REQ-BANK-STACK

## Meta
- req-id: REQ-BANK-STACK
- component: bank
- role: module
- test_kind: unit
- status: ready

## 目标
座位筹码：发盲注、按摊牌结果加减、以及 **一次性格 grant**（给加星发币用，compose 才调用）。

## In
- `postBlinds({ sbSeat, bbSeat })` — 金额读已有 config，不改 `src/config`
- `settle({ winners: { seat, amount }[] })`
- `grant({ githubLogin, amount })` — 幂等键由调用方保证；bank 只给该座位加筹码

## Out
- 各 seat stack；余额不足下盲则 all-in 下盲（最小实现：stack 减到 0）

## Deps
- contracts + config（出度 = 2）

## 允许修改路径 owns_paths
- `src/contracts/bank/**`
- `src/bank/**`
- `tests/bank/**`
- `tests/contracts/bank/**`
- `doc/specs/REQ-BANK-STACK.md`

## Out of Scope
- 查 GitHub 加星 → REQ-STAR-GRANT
- 边池算法（settle 的 amount 由调用方算好）
- 改 config 里的 `starGrantChips`（已有）

## 验收
- [ ] 下 SB/BB 后两座位 stack 减少、pot 增加（pot 可只在 betting，或 bank 记 committed；测 stack 即可）
- [ ] settle 把金额加到赢家
- [ ] grant 增加该帐号座位的 stack
- [ ] 不 import auth / hosts / 其它 plugin
- [ ] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [x] 与其它 ready Issue 的 owns_paths 无交集
- [x] 不改 `src/config/**`
