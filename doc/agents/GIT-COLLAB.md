# Git 协作与 Issue 拆分（冲突预管理）

主 Agent（**lead**）负责拆分 Issue；其它 Agent **认领 → 拉分支 → 实现 → 提 MR → 由 lead 合回 `main`**。  
本机版本控制命令统一用 **`hutao`**。

```text
Lead: 拆 Issue（强说明 + 路径互斥）+ 维护 ADL
        ↓
Agent: claim → branch → 实现（仅允许路径）
        ↓
        若发现要改 ADL → 走「needs-adl」，禁止私自改模型
        ↓
MR → Reviewer 检查 → Lead merge
```

---

## 1. 端到端 Git 流程

| 步骤 | 谁 | 动作 |
|------|----|------|
| 1. 拆分 | lead | 按 REQ / 组件切开；填齐模板；路径不重叠 |
| 2. 认领 | module / integrator | spec frontmatter `agent` + push（乐观锁） |
| 3. 分支 | 认领者 | `hutao fetch && hutao checkout -b agent/<role>/<n>-<slug> origin/main` |
| 4. 实现 | 认领者 | **只改** `owns_paths`；跑 `py scripts/adl_check.py` |
| 5. MR | 认领者 | 开 MR → `main`；**不自合并** |
| 6. 合入 | **仅 lead** | merge |

### 三车道

- **Lane A**：路径互斥的 plugin 源码 + 该 plugin 测试 + 该 spec → CI 绿可自动合（CI 落地后）
- **Lane B**：`src/contracts/shared/**`、`src/app/**`、`src/runtime/**`、`src/hosts/**`、`scripts/**` → lead 串行
- **Lane C**：`doc/structurizr/model/**`、`workspace.dsl` → 业务 MR 不得改，lead 直推 main

`contracts/<plugin>/` 各自独占；跨模块事件走 `contracts/shared/`（Lane B）。

---

## 2. Issue / spec 强说明模板

缺任一项不得标 `ready`。

```markdown
## Meta
- req-id: REQ-xxx
- component: deck | evaluate | betting | dealer | bank | seat | …
- role: module | integrator
- test_kind: unit | contract | manual
- status: draft | ready | claimed | blocked | done

## 允许修改路径 owns_paths（白名单）
- src/deck/**
- tests/deck/**

## 依赖
- blocked_by: none
- adl_ready: yes | needs-adl

## 验收标准 acceptance
- [ ] …
- [ ] `py scripts/adl_check.py` exit 0

## 冲突预检 conflict_check
- [ ] 与其它 open/ready/claimed Issue 的 owns_paths **无交集**
- [ ] 不与并行 Issue 争用同一 contracts 符号
```

契约变更必须 `serialize: true`，并 `blocks` 下游实现 Issue。

---

## 3. `needs-adl`

Module / Integrator **禁止**在业务分支上改：

- `doc/structurizr/model/graph.json`
- `doc/structurizr/model/requirements.json`
- `doc/structurizr/workspace.dsl`

流程：停手 → 评论 `blocked: needs-adl` → lead 在 main 落地 → rebase 继续。

业务 MR 若出现 ADL 文件 diff → **拒合**。
