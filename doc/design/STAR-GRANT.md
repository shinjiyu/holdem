# 加星发代币（同一 GitHub 帐号）

公开仓加星后，给**这个** `githubLogin` 发一次代币。好做：OAuth 已经有了，多一次 GitHub API。

```text
人点「我已加星，领代币」
    → auth 用用户 token：GET /user/starred/{owner}/{repo}
    → 204 = 已星；404 = 没星
    → 已星且从未领过：app 调 BankPort.grant（compose 接线）
    → 记 claimed，再点不再发
```

`bank` **不** import GitHub。出度仍是 contracts + config。金额在 `config`（例如一次 10_000）。

## 为什么不难

| 件 | 现状 |
|----|------|
| 身份 | 已有 GitHub OAuth |
| 查星 | 公开仓、用户已登录：`GET /user/starred/shinjiyu/holdem` → 204/404 |
| 防重发 | 帐号上一个 `starGrantClaimedAt` 即可 |
| 实时 | MVP 不需要 webhook；登录后点领取 |

## MVP 不做

- 取消星就扣回（要 webhook `star.deleted`，还容易吵）
- 每个 IDE 各写一遍；只在 H5 放按钮，Agent 托管时也能看到余额
- 把查星放进 `bank` / 任何 plugin

## 验收

- 未加星：领取失败，余额不变
- 已加星首次：余额 +N，再领失败
- 换 GitHub 帐号：另一份余额，互不影响
- `py scripts/adl_check.py` 绿；plugin 无 GitHub SDK
