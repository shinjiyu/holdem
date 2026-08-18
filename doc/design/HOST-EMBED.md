# 同一帐号：人控 或 AI 托管

一个座位 = 一个 GitHub 帐号。**不是** AI 另坐对面陪打。

玩家对自己的座位有两种控制权，同时只有一种生效：

| 模式 | `control` | 谁出 `ActionIntent` |
|------|-----------|---------------------|
| **人控**（默认） | `manual` | 本人在 H5 点按钮 |
| **托管** | `hosted` | 本人的 AI（Cursor / Codex / …）调 `act` |

```text
githubLogin  octocat  ──座位 2──┐
                               ├─ control=manual → H5 点击
                               └─ control=hosted → 该帐号的桌令牌 + MCP
```

切模式：H5 上「托管给我的 AI」/「收回」。托管时 H5 点击无效（可留收回按钮）；人控时 Agent 的 `act` 被拒。

Cursor 只是托管客户端之一，不是对手。

---

## 需求怎么落

| 需求 | 过关 |
|------|------|
| 人控 | 不接 AI，GitHub 登录，点完一手 |
| 托管 | 同一 `githubLogin` 切到 `hosted`，关掉点击，用 MCP 打完一手 |
| 收回 | 托管中点「收回」，变回 `manual`，下一街人可以点 |
| GitHub | 人 OAuth；托管令牌绑 **同一个** `githubLogin` + `seat` |

禁止：两个 GitHub 帐号抢一个座位；AI 用别人的令牌打你的座。

## GitHub

- 人：顶层 OAuth（不要放进 iframe）。
- 托管：登录后发桌令牌，仅对该帐号该座位有效。模型不去点 GitHub。
- 插件只看见 `SeatOccupant`，看不见 OAuth。

## 验收

**人控：** `control=manual`，H5 打完一手，无 MCP。

**托管：** 同一帐号切 `hosted`，H5 可以开着看但不能行动；Cursor（或任意 MCP 客户端）用该帐号令牌 `act` 打完一手。

**收回：** 托管中收回 → 下一次行动必须来自 H5。

Agent 循环（仅 `control=hosted` 时）：

```text
hand_state → 若 actorsSeat 不是我：等
           → legal_actions → 决定 → act
           → 直到 HandResult 或被收回
```

## 工具面

| 工具 | In | Out |
|------|----|-----|
| `table_new` / `table_join` | … | `tableId` / `seat` |
| `set_control` | `manual` \| `hosted` | 新 `SeatOccupant` |
| `hand_state` | `tableId` | `SeatView` |
| `legal_actions` | `tableId` | 人控时 Agent 调这个应得到空或错误 |
| `act` | `ActionIntent` | 仅当前 `control` 对应通道可成功 |

H5 背后调同一套；点按钮 = `act`，点托管 = `set_control`。

## 硬规则

1. 玩法插件禁止 import 宿主 SDK / GitHub SDK。
2. 不要为每个 IDE 新建 graph plugin。
3. 一个座位同一时刻只接受一条控制通道。
4. iframe 只嵌已登录后的桌子。

## 路径

| 路径 | 角色 |
|------|------|
| `src/hosts/web/` | 人控 + 托管开关 |
| `src/hosts/agent/` | 托管时的 MCP/HTTP（Cursor 只是客户端之一） |
| `src/auth/` | GitHub OAuth + 绑同一帐号的桌令牌 |
