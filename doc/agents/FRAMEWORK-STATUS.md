# Development framework status

## Health check

| 检查 | 结果 |
|------|------|
| `py scripts/adl_check.py` | 以本地跑通为准 |
| `npm test` | headless vitest |

## Shipped

| 项 | 状态 |
|----|------|
| ADL 内核（O(1) + R_manual + 角色/三车道） | ✅ |
| 德州 L2 图：H5 + Agent 协议 + GitHub auth | ✅ |
| 插件目录占位（无宿主 SDK） | ✅ |
| 共享 DTO 契约测 | ✅ |

## Open / next

| 项 | 说明 |
|----|------|
| REQ-DECK-SHUFFLE | ✅ 可复现洗牌 + 发底牌/公共牌 |
| REQ-WEB-TABLE | 人控：点完一手；托管中点击无效 |
| REQ-AGENT-PLAY | 同一帐号托管给自己的 AI；可收回 |
| REQ-AUTH-GITHUB | 人 OAuth；Agent 桌令牌 |
| REQ-STAR-GRANT | 加星领一次代币；bank 不碰 GitHub |
| CI | `npm test` + `adl_check` |

## 角色启用

| 角色 | 状态 |
|------|------|
| lead | ✅ |
| module | ✅ |
| integrator | ⏸ 等首批 plugin 合入 |
| designer | ⏸ 界面刻意简陋；H5 在 hosts/web |
| reviewer | ⏸ 等 ≥2 自然人 |
