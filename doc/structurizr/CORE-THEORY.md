# 两条核心理论：O(1) 与 \(R_{\mathrm{manual}}\)

> 本文件是 **ADL 内核**（与业务图无关）。来源：Amadeus（视界 + C4）+ mcp_guard（可运算门禁）。  
> 本仓业务图见 [`model/graph.json`](./model/graph.json)。门禁：`scripts/adl_check.py`。

---

## 理论一：模块依赖保持 O(1)

### 问题

AI 辅助下代码体积与变更频率暴涨，人无法逐行 review。若业务模块互相引用，关系图会随功能数近似变密。

### 主张

对业务插件集合 \(P\)（`graph.json` 中 `role: plugin`）：

\[
\forall p\in P:\ \mathrm{out}(p)\le K
\qquad (K\ \text{由 graph.json 配置，默认 } 2)
\]

\[
\forall p_1,p_2\in P:\ (p_1,p_2)\notin E
\]

| 约束 | 含义 |
|------|------|
| 出度上限 \(K\) | 插件通常只依赖 `contracts` + 至多一个 `infra` |
| NoCross | **禁止** plugin → plugin |
| Compose 入度可 \(O(n)\) | `app` / `runtime` / `hosts` 允许接线多个插件 |

### 视界（Amadeus）

理解模块只盯外壳四元组，不必读内部实现：

| 维度 | 含义 |
|------|------|
| Intention | 对外不变量 / 意图 |
| In | 合法控制流入口 |
| Out | 事件、副作用、可观测输出 |
| Deps | 允许依赖谁、出度上限 |

视界内：AI 可填实现。视界外 + 外壳：人、CI、Lead **唯一**需要盯住的地方。

### 门禁

`adl_check.py` 读取 `model/graph.json`，失败条件包括：

- `out(plugin) > K`
- 存在 plugin → plugin 边
- 插件出边指向非 `contracts`/`infra` 节点

Structurizr DSL（`workspace.dsl`）负责 **人读 C4 图**；**不算**出度公式。

---

## 理论二：单测不可完全覆盖 → 差集必须显式

### 主张

先定义功能全集 \(R\)（`requirements.json`），再划分：

\[
R_U=\{r\in R\mid r.\mathrm{test\_kind}\in\{\mathrm{unit},\mathrm{contract}\}\ \land\ r.\mathrm{tests}\neq\emptyset\}
\]

\[
R_{\mathrm{manual}}=R\setminus R_U
\]

| 集合 | 含义 | 收工方式 |
|------|------|----------|
| \(R_U\) | 单测 / 契约测可蕴含的功能 | Agent / CI |
| \(R_{\mathrm{manual}}\) | **单测盖不住**（或尚未用单测承载）的功能 | 人测 / 宿主验收清单 |

| `test_kind` | 含义 |
|-------------|------|
| `unit` | 纯逻辑，单测蕴含功能 |
| `contract` | 端口契约测 |
| `manual` | 环境 / 真机 / 宿主联调 → 进入 \(R_{\mathrm{manual}}\) |
| `none` | 尚未分配 → **门禁失败** |

`unit`/`contract` 若 `tests[]` 为空，或指向不存在的文件，门禁失败或 WARN（空心 \(R_U\)）。

---

## 二者如何一起用

```text
改结构 → 先改 graph / requirements / workspace.dsl
       → py scripts/adl_check.py
       → 确认 O(1) 仍成立，且 R_manual 仍诚实
       → 再改实现代码
```

| 理论 | 守什么 | 主要产物 |
|------|--------|----------|
| O(1) | 模块关系不爆炸 | `graph.json` + DSL 视图 |
| \(R_{\mathrm{manual}}\) | 验收不自欺 | `requirements.json` + 人测清单 |
