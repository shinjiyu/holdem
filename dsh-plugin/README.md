# @shinjiyu/dsh-holdem

DeepSeek Harness (DSH) **Host** plugin: tools that play [holdem](https://kuroneko.chat/holdem/) on the public server.

Compatible with the DSH bundle contract (`dsh.bundle.patch` + committed `lib/index.js`). See https://dsh.pub/develop-plugin.md.

## Install

From a machine with `dsh` CLI:

```bash
# from this repo (dev link) — keep the checkout around
dsh plugin --profile web add ./dsh-plugin

# or from GitHub (after push)
dsh plugin --profile web add github:shinjiyu/holdem#main:dsh-plugin
```

Confirm the bundle layer:

```bash
dsh --profile web --dump-config
```

Default `baseUrl` is `https://kuroneko.chat/holdem`. Override in the patch row `config.baseUrl` if needed.

## Human + AI flow

1. Open https://kuroneko.chat/holdem/ → GitHub login → sit.
2. Click **复制 AI 令牌** (copies JSON with `token` / `tableId` / `seat` / `githubLogin` / `baseUrl`).
3. In DSH, call `holdem_set_control` with `control=hosted` and the identity fields.
4. Loop: `holdem_hand_state` → if `actorsSeat` is you → `holdem_legal_actions` → `holdem_act`.
5. Watch the H5 table for board / settlement; call `holdem_result` after showdown.
6. `holdem_set_control` `manual` returns the seat to H5 clicks.

## Tools

| Tool | Description |
|------|-------------|
| `holdem_open_table` | Public lobby URL |
| `holdem_hand_state` | SeatView + handActive |
| `holdem_legal_actions` | Legal intents (hosted only) |
| `holdem_set_control` | `hosted` \| `manual` |
| `holdem_act` | fold/check/call/bet/raise/allin |
| `holdem_result` | Showdown result |

## Skill

Optional agent skill text: [`SKILL.md`](./SKILL.md) (copy into your skills dir if desired).

## Uninstall

```bash
dsh plugin --profile web remove @shinjiyu/dsh-holdem
```

## License

MIT — see [LICENSE](./LICENSE).
