# holdem

无限制德州引擎：**同一 GitHub 帐号的座位，人控或 AI 托管（互斥）。** H5 给人点；MCP/DSH 给自己的 AI。

- 玩法插件无 UI、无宿主 SDK。
- `hosts/web` = 人控 H5（https://kuroneko.chat/holdem/）。
- `hosts/agent` = 托管通道（桌令牌 + `/api/agent/*`）。
- **DSH 插件**：[`dsh-plugin/`](dsh-plugin/) → `@shinjiyu/dsh-holdem`

细节：[`doc/design/HOST-EMBED.md`](doc/design/HOST-EMBED.md) · DSH 安装：[`dsh-plugin/README.md`](dsh-plugin/README.md)

## DSH 插件

```bash
dsh plugin --profile web add github:shinjiyu/holdem#main:dsh-plugin
```

桌上点 **复制 AI 令牌** → DSH 调 `holdem_set_control(hosted)` → `holdem_act` 循环。

## 快速检查

```bash
py scripts/adl_check.py
npm install
npm test
```

本机 git 用 **`hutao`**。默认角色 **lead**，见 [`AGENTS.md`](AGENTS.md)。
