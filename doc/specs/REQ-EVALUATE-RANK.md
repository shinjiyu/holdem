---
id: REQ-EVALUATE-RANK
module: evaluate
role: module
status: claimed
agent: eval-bot
owns_paths:
  - src/contracts/evaluate/**
  - src/evaluate/**
  - tests/evaluate/**
  - tests/contracts/evaluate/**
  - doc/specs/REQ-EVALUATE-RANK.md
blocked_by: []
blocked_reason: ""
adl_ready: yes
serialize: false
last_updated: 2026-08-18
---

# Spec: REQ-EVALUATE-RANK

## Meta
- req-id: REQ-EVALUATE-RANK
- component: evaluate
- role: module
- test_kind: unit
- status: ready

## 目标
7 张牌选 5 张比大小（NLHE 摊牌）。只出 `EvaluatePort`，不算边池。

## Intention
给定 2 底牌 + 5 公共牌，得到可比较的牌力；平局由调用方按合约拆池（本 spec 只标 tie）。

## In
- `EvaluateRequest { hole: [Card, Card]; board: Card[] }`（board 长度 5）

## Out
- `HandRank { category, tiebreak: number[] }`
- `CompareResult { winner: "a" | "b" | "tie" }`

## Deps
- `contracts` only（出度 = 1）

## 允许修改路径 owns_paths
- `src/contracts/evaluate/**`
- `src/evaluate/**`
- `tests/evaluate/**`
- `tests/contracts/evaluate/**`
- `doc/specs/REQ-EVALUATE-RANK.md`

## Out of Scope
- 边池 / 结算金额 → REQ-BANK-STACK
- 街道 FSM → REQ-DEALER-STREET
- 改 `contracts/shared` 或其它 plugin

## 验收
- [ ] 至少覆盖：高牌、一对、两对、三条、顺子、同花、葫芦、四条、同花顺（含 A-5 轮子）
- [ ] 两手平局返回 tie
- [ ] 不 import betting/dealer/hosts
- [ ] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [x] 与其它 ready Issue 的 owns_paths 无交集
- [x] 不占用 `contracts/shared`
