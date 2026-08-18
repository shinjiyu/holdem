---
id: REQ-SEAT-PORT
module: seat
role: module
status: impl-green
agent: seat-bot
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
- status: impl-green

## 目标
一个座位 = 一个 `githubLogin`。`control` 人控/托管互斥。`SeatView` 不含别人底牌。

## In
- `sit({ seat, githubLogin })`
- `setControl({ seat, control: "manual" | "hosted" })`
- `view({ seat })` → SeatView（测试里用假 githubLogin，不接 OAuth）
- `setHole({ seat, cards })` — compose/测试按座位写入底牌；`view` 只返回该座

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
- [x] 座位 A 的 view.hole 看不到座位 B 的底牌（compose 测可先只测 seat 存储隔离）
- [x] 默认 manual；hosted 后再 setControl(manual) 收回
- [x] 不 import hosts / auth
- [x] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [x] 与其它 ready Issue 的 owns_paths 无交集
- [x] 不改 `contracts/shared`（SeatOccupant 已有）
