# Development framework status

## Health check

| 检查 | 结果 |
|------|------|
| `py scripts/adl_check.py` | 以本地跑通为准 |
| `npm test` | headless vitest |

## Shipped

| 项 | 状态 |
|----|------|
| ADL + 产品设计（托管 / 加星 / kuroneko.chat） | ✅ |
| REQ-DECK-SHUFFLE | ✅ |
| Issue 拆分（spec 看板） | ✅ `doc/specs/README.md` |

## 可认领（wave 1，路径互斥）

| spec | role |
|------|------|
| REQ-EVALUATE-RANK | module |
| REQ-BETTING-LEGAL | module |
| REQ-BANK-STACK | module |
| REQ-SEAT-PORT | module |
| REQ-AUTH-GITHUB | integrator |

## 角色启用

| 角色 | 状态 |
|------|------|
| lead | ✅ |
| module | ✅ 可认领 wave 1 |
| integrator | ✅ AUTH 可认领；app/hosts 仍 blocked |
| designer | ⏸ |
| reviewer | ⏸ |
