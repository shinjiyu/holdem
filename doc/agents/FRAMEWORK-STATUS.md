# Development framework status

## Health check

| 检查 | 结果 |
|------|------|
| `py scripts/adl_check.py` | OK（K=2，\|R_U\|=10，\|R_manual\|=4） |
| `npm test` | 72 passed |

## Shipped

| 项 | 状态 |
|----|------|
| ADL + 产品设计（托管 / 加星 / kuroneko.chat） | ✅ |
| REQ-DECK-SHUFFLE | ✅ |
| Wave 1：evaluate / betting / bank / seat / auth | ✅ |
| REQ-DEALER-STREET | ✅ |
| REQ-TABLE-SESSION | ✅ 无 UI 一手可测 |
| Issue 拆分（spec 看板） | ✅ `doc/specs/README.md` |

## 可认领（wave 4，路径互斥）

| spec | role | Issue |
|------|------|-------|
| REQ-WEB-TABLE | integrator | #8 `src/hosts/web/**` |
| REQ-AGENT-PLAY | integrator | #9 `src/hosts/agent/**` + cli |

STAR-GRANT 仍 blocked：等 H5 claim 按钮。

## 角色启用

| 角色 | 状态 |
|------|------|
| lead | ✅ |
| module | ✅ engine plugins 已合 |
| integrator | ✅ 可认领 WEB / AGENT |
| designer | ⏸ |
| reviewer | ⏸ |
