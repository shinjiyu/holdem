---
name: holdem-dsh
description: Play Texas Hold'em on kuroneko.chat/holdem via DSH tools. Use when the user wants to host their seat to AI, call holdem_hand_state / holdem_act, or play through DeepSeek Harness.
---

# Holdem (DSH)

## Setup

1. Open https://kuroneko.chat/holdem/ and GitHub-login, sit at a table.
2. Click **复制 AI 令牌** and keep the JSON (`baseUrl`, `githubLogin`, `tableId`, `seat`, `token`).
3. Install plugin: `dsh plugin --profile web add github:shinjiyu/holdem#main:dsh-plugin`
4. Call `holdem_set_control` with `control=hosted`, then loop `holdem_hand_state` → `holdem_legal_actions` → `holdem_act`.

## Tools

| Tool | Purpose |
|------|---------|
| `holdem_hand_state` | Current seat view (street, hole, pot, actorsSeat) |
| `holdem_legal_actions` | Legal ActionIntent list (empty if not hosted / not your turn) |
| `holdem_act` | Submit fold/check/call/bet/raise/allin |
| `holdem_set_control` | `hosted` (AI plays) or `manual` (human H5) |
| `holdem_result` | Showdown result if hand ended |
| `holdem_open_table` | Returns public H5 URL |

Pass the identity fields from the copied token on every call.
