# 宿主嵌入（Cursor / DSH / Codex / harness）

引擎是 **无 UI 的 NLHE 运行时**。四个宿主都只做一件事：给某个 `seat` 提供 `SeatView`，收回 `ActionIntent`。

```text
Cursor MCP ─┐
DSH plugin ─┼─► hosts/<id> ─► runtime ─► plugins via contracts
Codex skill─┤
CLI/JSON   ─┘
```

## 硬规则

1. `src/{deck,evaluate,betting,dealer,bank,seat,runtime,app,config,contracts}` **禁止** import 宿主 SDK。
2. 宿主包只许出现在 `src/hosts/<id>/`。
3. 不要为每个宿主新建 graph plugin。宿主是 compose，出度不受 K 约束。
4. 四个宿主必须说同一套契约：`SeatView` / `LegalAction[]` / `ActionIntent`。差异只在运输（MCP tool、dsh tool、stdin JSON）。

## 建议工具面（所有宿主同名）

| 工具 | In | Out |
|------|----|-----|
| `table_new` | blinds, seats, stacks, seed? | `tableId` |
| `hand_state` | `tableId`, `seat` | `SeatView`（含 board、pot、toCall、自己底牌） |
| `legal_actions` | `tableId`, `seat` | `LegalAction[]` |
| `act` | `tableId`, `seat`, `ActionIntent` | 新 `SeatView` 或 `HandResult` |

## 各宿主落点（尚未实现，integrator spec）

| 宿主 | 路径 | 形态 |
|------|------|------|
| Cursor | `src/hosts/cursor/` | MCP server（也可再挂 Canvas 只读桌面） |
| DeepSeek Harness | `src/hosts/dsh/` | `dsh-plugin`（`package.json#dsh.bundle`） |
| Codex | `src/hosts/codex/` | skill 调 CLI，或同一 MCP |
| 通用 harness | `src/hosts/cli/` | stdin/stdout JSON 一行一条 |

验收（\(R_{\mathrm{manual}}\)）：同一手牌用 CLI 打完，再在 Cursor 与 DSH 各坐一个 seat，结果一致。
