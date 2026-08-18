# holdem

无限制德州引擎：**同一 GitHub 帐号的座位，人控或 AI 托管（互斥）。** H5 给人点；MCP 给自己的 AI。Cursor 只是托管客户端之一。

- 玩法插件无 UI、无宿主 SDK。
- `hosts/web` = 人控 +「托管给我的 AI / 收回」。
- `hosts/agent` = 托管通道（同一帐号的桌令牌）。Cursor / Codex / DSH 同级。
- `auth` = GitHub OAuth + 绑**同一帐号同一座位**的令牌。

细节：[`doc/design/HOST-EMBED.md`](doc/design/HOST-EMBED.md) · 理论：[`doc/structurizr/CORE-THEORY.md`](doc/structurizr/CORE-THEORY.md)

## 快速检查

```bash
py scripts/adl_check.py
npm install
npm test
```

本机 git 用 **`hutao`**。默认角色 **lead**，见 [`AGENTS.md`](AGENTS.md)。
