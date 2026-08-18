---
id: REQ-DEALER-STREET
module: dealer
role: module
status: impl-green
agent: lead
owns_paths:
  - src/contracts/dealer/**
  - src/dealer/**
  - tests/dealer/**
  - tests/contracts/dealer/**
  - doc/specs/REQ-DEALER-STREET.md
blocked_by: []
blocked_reason: ""
adl_ready: yes
serialize: false
last_updated: 2026-08-18
---

# Spec: REQ-DEALER-STREET

## Meta
- req-id: REQ-DEALER-STREET
- component: dealer
- role: module
- test_kind: unit
- status: impl-green

## 目标
街道：preflop → flop → turn → river → showdown。只通过 **contracts 端口** 调 Deal / Betting / Evaluate，**禁止 import 那些 plugin**。

## In
- `startHand({ seats, button })`
- 当前街 betting 结束后 `advance()`

## Out
- 街状态；showdown 时调用 EvaluatePort（由 runtime 注入，dealer 只依赖 contracts 类型）

注入方式：dealer 构造函数收端口接口（类型来自 `contracts/evaluate` 等），实现仍不 import `src/evaluate`。Lead 在 TABLE-SESSION 接线。本 Issue 可用 fake 端口单测 FSM。

## 允许修改路径 owns_paths
- `src/contracts/dealer/**`
- `src/dealer/**`
- `tests/dealer/**`
- `tests/contracts/dealer/**`
- `doc/specs/REQ-DEALER-STREET.md`

## 验收
- [x] 街道顺序正确；未结束 betting 不能发 flop
- [x] 不 `import` 自 `src/deck|betting|evaluate|bank|hosts`
- [x] `py scripts/adl_check.py` exit 0

## 依赖
- blocked_by: REQ-EVALUATE-RANK, REQ-BETTING-LEGAL, REQ-BANK-STACK（端口文件在 main 上）
- deck 已 done

## 冲突预检 conflict_check
- [x] owns_paths 与 wave 1 无交集（本 Issue 未标 ready）
