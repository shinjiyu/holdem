---
id: REQ-BETTING-LEGAL
module: betting
role: module
status: ready
agent: unassigned
owns_paths:
  - src/contracts/betting/**
  - src/betting/**
  - tests/betting/**
  - tests/contracts/betting/**
  - doc/specs/REQ-BETTING-LEGAL.md
blocked_by: []
blocked_reason: ""
adl_ready: yes
serialize: false
last_updated: 2026-08-18
---

# Spec: REQ-BETTING-LEGAL

## Meta
- req-id: REQ-BETTING-LEGAL
- component: betting
- role: module
- test_kind: unit
- status: ready

## 目标
当前行动人的合法动作 + pot / toCall / min-raise。边池下一刀。

## In
- 当前街已下筹码、本街是否已有加注、该座位 stack、blinds 来自 **读 config**（已有 `smallBlind`/`bigBlind`，不要改 `src/config`）

## Out
- `BettingQuery.legal(seat): LegalAction[]`（fold/check/call/bet/raise/allin 按规则子集）
- `BettingQuery.apply(seat, ActionIntent)` 更新 pot / toCall
- 非法动作拒绝

## Deps
- contracts + config（出度 = 2）

## 允许修改路径 owns_paths
- `src/contracts/betting/**`
- `src/betting/**`
- `tests/betting/**`
- `tests/contracts/betting/**`
- `doc/specs/REQ-BETTING-LEGAL.md`

## Out of Scope
- 边池 → 后续 spec
- 发牌 / 比牌 / 街道切换
- 改 `src/config/**`

## 验收
- [ ] 未有人下注：check 与 bet 合法，call 不合法
- [ ] 面对下注：fold/call/raise/allin 合法，check 不合法
- [ ] min-raise 至少为上一加注额
- [ ] stack 不够 call 时只剩 fold/allin
- [ ] 不 import 其它 plugin / hosts
- [ ] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [x] 与其它 ready Issue 的 owns_paths 无交集
- [x] 不改 config / shared DTO
