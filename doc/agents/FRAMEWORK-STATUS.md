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
| 德州 L2 图 + 宿主嵌入说明 | ✅ |
| 插件目录占位（无宿主 SDK） | ✅ |
| 共享 DTO 契约测 | ✅ |

## Open / next

| 项 | 说明 |
|----|------|
| REQ-DECK-SHUFFLE | 第一刀 module spec，可标 ready |
| 宿主 MCP / DSH plugin | integrator；引擎单测绿后再接 |
| CI | `npm test` + `adl_check` |

## 角色启用

| 角色 | 状态 |
|------|------|
| lead | ✅ |
| module | ✅ |
| integrator | ⏸ 等首批 plugin 合入 |
| designer | ⏸ 无独立 UI；界面=宿主 |
| reviewer | ⏸ 等 ≥2 自然人 |
