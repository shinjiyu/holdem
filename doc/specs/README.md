# Spec 看板（Issue 拆分）

事实源：本目录 `REQ-*.md`。GitHub Issue 是镜像。认领改 frontmatter `agent` 再 push。

## conflict_check（lead 已勾）

Wave 1 五条 `ready` 的 `owns_paths` 无交集。`src/config/**` 与 `contracts/shared/**` 不进任何 ready Issue（已有字段够用；要加字段走 needs-adl）。

## 波次

| Wave | specs | 状态 |
|------|--------|------|
| 0 | ADL-GATE, CONTRACTS-TABLE, LOGIC-HEADLESS, DECK-SHUFFLE | done |
| 1 | EVALUATE-RANK, BETTING-LEGAL, BANK-STACK, SEAT-PORT, AUTH-GITHUB | **ready，可并行** |
| 2 | DEALER-STREET | blocked_by wave 1 的 evaluate/betting/bank |
| 3 | TABLE-SESSION | blocked_by dealer + seat |
| 4 | WEB-TABLE, AGENT-PLAY | blocked_by table-session + auth；二者路径 `hosts/web` vs `hosts/agent` 互斥 |
| 5 | STAR-GRANT | blocked_by auth + bank + table-session + web |

Lane A：wave 1 四条 plugin。AUTH 虽是 infra，路径 `src/auth/**` 与 plugin 不交。  
Lane B：TABLE-SESSION（app/runtime）、WEB/AGENT 已拆子目录故可并行。  
Lane C：禁止业务 MR 改 `doc/structurizr/model/**`。
