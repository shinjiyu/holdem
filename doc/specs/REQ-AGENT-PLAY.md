---
id: REQ-AGENT-PLAY
module: hosts
role: integrator
status: ready
agent: unassigned
owns_paths:
  - src/hosts/agent/**
  - src/hosts/cli/**
  - tests/hosts/agent/**
  - doc/specs/REQ-AGENT-PLAY.md
blocked_by: []
blocked_reason: ""
adl_ready: yes
serialize: false
last_updated: 2026-08-18
---

# Spec: REQ-AGENT-PLAY

## Meta
- req-id: REQ-AGENT-PLAY
- component: hosts
- role: integrator
- test_kind: manual
- status: ready

## 目标
同一 GitHub 帐号把 **自己的座位** 托管给 AI。MCP/HTTP：`hand_state` / `legal_actions` / `act` / `set_control`。Cursor 只是客户端之一。

## 允许修改路径 owns_paths
- `src/hosts/agent/**`
- `src/hosts/cli/**`
- `tests/hosts/agent/**`
- `doc/specs/REQ-AGENT-PLAY.md`

## 验收
- [ ] control=hosted 时桌令牌可以 act 打完一手
- [ ] control=manual 时 act 被拒
- [ ] 收回后必须 H5 点（本 Issue 测 API 即可）
- [ ] 禁止用 DOM 点击作为验收
- [ ] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [x] 不碰 `src/hosts/web/**`
