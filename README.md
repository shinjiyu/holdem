# holdem

无限制德州引擎：**同一 GitHub 帐号的座位，人控或 AI 托管（互斥）。** H5 给人点；MCP/DSH 给自己的 AI。

- 公开桌面：https://kuroneko.chat/holdem/
- 玩法插件无 UI、无宿主 SDK。
- `hosts/web` = 人控 H5。
- `hosts/agent` = 托管通道（桌令牌 + `/api/agent/*`）。
- **DSH 插件**：[`dsh-plugin/`](dsh-plugin/) → `@shinjiyu/dsh-holdem`

细节：[`doc/design/HOST-EMBED.md`](doc/design/HOST-EMBED.md) · DSH 安装：[`dsh-plugin/README.md`](dsh-plugin/README.md)

## DSH 插件（Host）

```bash
# 推荐：GitHub 子目录（pnpm path 语法；已含预编译 lib/）
dsh plugin --profile web add "github:shinjiyu/holdem#main&path:/dsh-plugin"

# 或钉死 commit（dsh.pub 安装器同格式）
dsh plugin --profile web add "https://github.com/shinjiyu/holdem.git#099dd37&path:/dsh-plugin"

# 预构建包（免源码 prepare）
dsh plugin --profile web add https://github.com/shinjiyu/holdem/releases/download/v0.1.1/shinjiyu-dsh-holdem-0.1.0.tgz
```

源码包：https://github.com/shinjiyu/holdem/tree/main/dsh-plugin

桌上点 **复制 AI 令牌** → DSH 调 `holdem_set_control(hosted)` → `holdem_act` 循环。

大厅会列出**进行中 / 等人 / 空桌**（含街道、底池、座位头像），有空位即可入座。

## 快速检查

```bash
py scripts/adl_check.py
npm install
npm test
```

本机 git 用 **`hutao`**。默认角色 **lead**，见 [`AGENTS.md`](AGENTS.md)。
