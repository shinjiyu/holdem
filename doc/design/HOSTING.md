# 服务器放哪

玩具，不管备案。

**就用现成那台：`kuroneko.chat`（新加坡，`43.156.244.45`）。**  
已经在跑 HTTPS + nginx 子路径（webchat 等）。holdem 同样挂一个 location，例如 `/holdem/`。

这台能出网访问 `api.github.com`，OAuth 换 token、查加星都可以。不要另买大陆云。

| 环境 | 地址 |
|------|------|
| 生产 | `https://kuroneko.chat/holdem/`（H5）+ 同机 API/MCP |
| 本机 | `localhost`，单人调试 |

SSH 与 nginx 改法走 kuroneko 现有 deploy 习惯，**密钥不进本仓库**。

大陆用户打不开 github.com 跟这台在哪无关，换机房也救不了。
