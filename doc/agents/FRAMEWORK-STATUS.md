# Development framework status

## Health check

| 检查 | 结果 |
|------|------|
| `py scripts/adl_check.py` | OK（K=2；R_manual 仅 REQ-ADL-GATE） |
| `npm test` | 以本地为准 |

## Shipped（Engine-MVP + embed）

| 项 | 状态 |
|----|------|
| ADL + 产品设计（托管 / 加星 / kuroneko.chat） | ✅ |
| Plugins + table-session | ✅ |
| AUTH + WEB + AGENT/CLI | ✅ |
| STAR-GRANT（mock 查星 → `BankPort.grant` 一次） | ✅ |
| Issue 拆分 | ✅ `doc/specs/README.md` |

## 后续（非 spec 看板内）

- 真机：nginx `/holdem/` on kuroneko.chat、OAuth secrets、静态 H5 bridge
- MCP stdio 包装 AgentPlayApi（Cursor 客户端）
- 多桌 / side pots 等玩法扩展 → 新 REQ + ADL

## 角色启用

| 角色 | 状态 |
|------|------|
| lead | ✅ |
| module / integrator | ✅ 看板内 REQ 已合 |
| designer / reviewer | ⏸ |
