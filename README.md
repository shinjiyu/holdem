# holdem

可嵌入 **Cursor / DeepSeek Harness / Codex / 通用 harness** 的无限制德州（NLHE）引擎。

- **引擎无 UI**：牌局逻辑在 `src/{deck,evaluate,betting,dealer,bank,seat}`，禁止 import 宿主 SDK。
- **宿主是 compose**：`src/hosts/{cursor,dsh,codex,cli}` 只把 `SeatView` / `ActionIntent` 接到各环境。
- **ADL 内核**：O(1) 出度 + \(R_{\mathrm{manual}}\) + 多 Agent 路径互斥。见 [`doc/structurizr/CORE-THEORY.md`](doc/structurizr/CORE-THEORY.md)。

## 快速检查

```bash
py scripts/adl_check.py
npm install
npm test
```

## 目录

```text
src/
  contracts/   # DTO + ports（慢增长）
  config/      # blinds / seats（infra）
  deck|evaluate|betting|dealer|bank|seat/  # plugins
  runtime|app/ # compose
  hosts/       # Cursor / DSH / Codex / CLI
doc/structurizr/   # ADL
doc/agents/        # 角色与协作
doc/specs/         # REQ 事实源
```

## Agent

本仓 Cursor 默认角色是 **lead**。读 [`AGENTS.md`](AGENTS.md)。

本机 git 命令用 **`hutao`**。
