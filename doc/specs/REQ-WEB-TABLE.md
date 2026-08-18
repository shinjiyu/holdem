---
id: REQ-WEB-TABLE
module: hosts
role: integrator
status: impl-green
agent: lead
owns_paths:
  - src/hosts/web/**
  - tests/hosts/web/**
  - doc/specs/REQ-WEB-TABLE.md
blocked_by: []
blocked_reason: ""
adl_ready: yes
serialize: false
last_updated: 2026-08-18
---

# Spec: REQ-WEB-TABLE

## Meta
- req-id: REQ-WEB-TABLE
- component: hosts
- role: integrator
- test_kind: unit
- status: impl-green

## 目标
简陋 H5：GitHub 登录后 **人控** 点完一手。托管开关可以有，但「托管打完」归 REQ-AGENT-PLAY。加星按钮归 REQ-STAR-GRANT。

## 允许修改路径 owns_paths
- `src/hosts/web/**`
- `tests/hosts/web/**`
- `doc/specs/REQ-WEB-TABLE.md`

## 验收
- [x] control=manual 时点击 fold/call/raise 能结束一手
- [x] hosted 时点击行动无效，只留「收回」
- [x] 登录在顶层窗口（不塞 iframe）
- [x] 不把玩法写进 H5（只调 table session / act）
- [x] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [x] 与 AGENT-PLAY 路径互斥（web vs agent）
