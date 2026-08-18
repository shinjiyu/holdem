# holdem — Agent 角色与权限

内核与 mcp_guard / h5fish 相同。本仓默认 **无独立 UI**：界面是 Cursor / DSH / Codex / CLI 宿主。

## 原则

1. **ADL 先于代码**（见 `doc/structurizr/ADL-RULES.md`）。
2. **最高权限者 = Lead**：可直接在 `main` 上提交/推送。
3. **其它角色**：只能 **认领 Issue → 建分支 → 提 MR**；**禁止**直推 `main`。

## 角色

| 角色 ID | 名称 | 权限 | 职责 |
|---------|------|------|------|
| `lead` | Lead | **直推 `main`**；改 ADL；合 MR；拆 Issue | 维护三件套；处理 `needs-adl`；保证 O(1) 与 \(R_{\mathrm{manual}}\) |
| `designer` | UX/UI | 只改 `doc/ux/**` `doc/ui/**` `ui/preview/**` | ⏸ 默认关闭；仅 `ui:true` 时启用 |
| `module` | Module | 认领 plugin spec；分支；MR | 只改 `owns_paths`；禁止改依赖边；禁止 import 宿主 SDK |
| `integrator` | Integrator | 认领 compose | 只改 `src/app` `src/runtime` `src/hosts/**` 接线 |
| `reviewer` | Reviewer | 评论 MR；跑检查 | 不合入、不推 main |

同一自然人可兼任；**机器 Agent 必须声明当前角色**。

## 权限矩阵

| 动作 | lead | designer | module | integrator | reviewer |
|------|:----:|:--------:|:------:|:----------:|:--------:|
| 推送 `main` | ✅ | ❌ | ❌ | ❌ | ❌ |
| 修改 `doc/structurizr/model/*`、`workspace.dsl` | ✅ | ❌ | ❌* | ❌* | ❌ |
| 修改 `src/<plugin>/**` | ✅ | ❌ | ✅（认领范围） | ❌ | ❌ |
| 修改 `src/app` / `src/runtime` / `src/hosts` | ✅ | ❌ | ❌ | ✅（认领范围） | ❌ |
| 合 MR | ✅ | ❌ | ❌ | ❌ | ❌ |

\* 必须改 ADL 时：Issue 标 `blocked: needs-adl`，由 lead 改模型。

## 分支命名

```text
agent/<role>/<issue-number>-<short-slug>
lead/hotfix/<slug>
lead/adl/<issue-number>-<slug>
```

本机版本控制命令使用 **`hutao`**。
