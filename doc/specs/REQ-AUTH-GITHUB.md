---
id: REQ-AUTH-GITHUB
module: auth
role: integrator
status: impl-green
agent: auth-bot
owns_paths:
  - src/auth/**
  - tests/auth/**
  - doc/specs/REQ-AUTH-GITHUB.md
blocked_by: []
blocked_reason: ""
adl_ready: yes
serialize: false
last_updated: 2026-08-18
---

# Spec: REQ-AUTH-GITHUB

## Meta
- req-id: REQ-AUTH-GITHUB
- component: auth
- role: integrator
- test_kind: unit
- status: impl-green

## 目标
GitHub OAuth 得到 `githubLogin`；为「同一帐号同一座位」签发桌令牌。不加星、不发币。

## In
- 顶层 OAuth 回调（测试可用 fake code / mock GitHub）
- `issueTableToken({ githubLogin, tableId, seat })`

## Out
- 令牌只能操作该 `githubLogin+seat`
- 插件看不到 OAuth

## Deps
- infra；不要新增 plugin 边

## 允许修改路径 owns_paths
- `src/auth/**`
- `tests/auth/**`
- `doc/specs/REQ-AUTH-GITHUB.md`

## Out of Scope
- 查 starred → REQ-STAR-GRANT
- H5 登录页皮肤 → REQ-WEB-TABLE（本 Issue 可提供 redirect URL / 函数）
- 真机 GitHub 应用创建（lead 配环境变量，不进仓库密钥）

## 验收
- [x] mock OAuth 后得到 githubLogin
- [x] 令牌与 login+seat 绑定；错座位校验失败
- [x] 不出现 octokit import 在 `src/deck|evaluate|betting|dealer|bank|seat`
- [x] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [x] 与 wave 1 plugin Issue 路径无交集
- [x] STAR-GRANT 未 ready（避免抢 `src/auth/**`）
