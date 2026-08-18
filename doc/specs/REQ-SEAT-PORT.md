---
id: REQ-SEAT-PORT
module: seat
role: module
status: ready
agent: unassigned
owns_paths:
  - src/contracts/seat/**
  - src/seat/**
  - tests/seat/**
  - tests/contracts/seat/**
  - doc/specs/REQ-SEAT-PORT.md
blocked_by: []
blocked_reason: ""
adl_ready: yes
serialize: false
last_updated: 2026-08-18
---

# Spec: REQ-SEAT-PORT

## Meta
- req-id: REQ-SEAT-PORT
- component: seat
- role: module
- test_kind: unit
- status: ready

## 目标
一个座位 = 一个 `githubLogin`。`control` 人控/托管互斥。`SeatView` 不含别人底牌。

## In
- `sit({ seat, githubLogin })`
- `setControl({ seat, control: "manual" | "hosted" })`
- `view({ seat })` → SeatView（测试里用假 githubLogin，不接 OAuth）

## Out
- 默认 `control=manual`
- `setControl` 切换；同一时刻只有一条通道有效（本 spec 只存状态，拒 act 由 compose/hosts）

## Deps
- contracts only（出度 = 1）

## 允许修改路径 owns_paths
- `src/contracts/seat/**`
- `src/seat/**`
- `tests/seat/**`
- `tests/contracts/seat/**`
- `doc/specs/REQ-SEAT-PORT.md`

## Out of Scope
- GitHub OAuth / 桌令牌 → REQ-AUTH-GITHUB
- H5 / MCP → REQ-WEB-TABLE / REQ-AGENT-PLAY
- 一个座位两个 githubLogin

## 验收
- [ ] 座位 A 的 view.hole 看不到座位 B 的底牌（compose 测可先只测 seat 存储隔离）
- [ ] 默认 manual；hosted 后再 setControl(manual) 收回
- [ ] 不 import hosts / auth
- [ ] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [x] 与其它 ready Issue 的 owns_paths 无交集
- [x] 不改 `contracts/shared`（SeatOccupant 已有）
