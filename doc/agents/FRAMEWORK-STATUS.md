# Development framework status

## Health check

| 检查 | 结果 |
|------|------|
| `py scripts/adl_check.py` | OK（K=2；R_manual 仅剩 STAR-GRANT + ADL-GATE） |
| `npm test` | 79 passed |

## Shipped

| 项 | 状态 |
|----|------|
| ADL + 产品设计（托管 / 加星 / kuroneko.chat） | ✅ |
| Engine：deck → evaluate/betting/bank/seat → dealer → table-session | ✅ |
| REQ-AUTH-GITHUB | ✅ |
| REQ-WEB-TABLE | ✅ 人控点完一手；hosted 只留收回 |
| REQ-AGENT-PLAY | ✅ 桌令牌 act；CLI JSON；禁 DOM 验收 |
| Issue 拆分（spec 看板） | ✅ `doc/specs/README.md` |

## 可认领

| spec | role | Issue |
|------|------|-------|
| REQ-STAR-GRANT | integrator | #10（auth 查星 + `BankPort.grant` + H5 claim） |

## 角色启用

| 角色 | 状态 |
|------|------|
| lead | ✅ |
| module | ✅ engine 已合 |
| integrator | ✅ STAR 可认领 |
| designer | ⏸ |
| reviewer | ⏸ |
