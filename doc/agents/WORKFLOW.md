# 多 Agent 工作流

```text
Lead: ADL + 拆 Issue（强说明 + 路径互斥）
        ↓
module/integrator 认领 → 分支 → 实现 → MR
        ↓
Reviewer → Lead merge
```

Git / Issue / `needs-adl` 全文见 [`GIT-COLLAB.md`](./GIT-COLLAB.md)。

## Module 步骤

1. 只认领 `status: ready` 的 spec/Issue
2. `hutao fetch && hutao checkout -b agent/module/<n>-<slug> origin/main`
3. 若缺 ADL → `blocked: needs-adl`（不要自己改 `doc/structurizr/model/*`）
4. 只改 `owns_paths`；**不得** `import` `src/hosts/**` 或宿主 SDK
5. `py scripts/adl_check.py`
6. MR → `main`；不自合并

## Integrator 步骤

只接线 `app` / `runtime` / `hosts`。不写牌局规则。四个宿主适配互不 import。

## Lead 步骤

1. 维护 graph / requirements / dsl
2. 拆 Issue：`owns_paths` 互斥；契约变更串行
3. 处理 `needs-adl`
4. 合 MR；维护 \(R_{\mathrm{manual}}\)

## 越权

- MR 改了 `owns_paths` 外路径 → 拆或关
- MR 改了 ADL model → **拒合**
- MR 增加 plugin→plugin 边 → **拒合**
- 非 lead 推了 `main` → revert
