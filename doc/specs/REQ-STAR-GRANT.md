---
id: REQ-STAR-GRANT
module: auth
role: integrator
status: impl-green
agent: lead
owns_paths:
  - src/auth/star-grant.ts
  - tests/auth/star-grant.test.ts
  - src/hosts/web/star-claim.ts
  - tests/hosts/web/star-claim.test.ts
  - doc/specs/REQ-STAR-GRANT.md
  - doc/design/STAR-GRANT.md
blocked_by: []
blocked_reason: ""
adl_ready: yes
serialize: true
last_updated: 2026-08-18
---

# Spec: REQ-STAR-GRANT

## Meta
- req-id: REQ-STAR-GRANT
- component: auth
- role: integrator
- test_kind: unit
- status: impl-green
- serialize: true

## 目标
该 GitHub 帐号 star 了 `shinjiyu/holdem` 则 **发一次** 代币。auth 查星，compose 调 `BankPort.grant`。bank 不 import GitHub。

路径刻意写成单文件，避免和进行中的 AUTH（整个 `src/auth/**`）并行。

## 验收
- [x] mock 未星：不发
- [x] mock 已星首次：+config.starGrantChips
- [x] 再领失败
- [x] 取消星不扣回（不实现 webhook）
- [x] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [x] 未标 ready；AUTH/WEB 完成后再开，避免抢 auth 目录与 web 按钮
