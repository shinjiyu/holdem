# holdem ADL 规则

内核理论 → [`CORE-THEORY.md`](./CORE-THEORY.md)。协作 → [`../agents/GIT-COLLAB.md`](../agents/GIT-COLLAB.md)。

## 1. 出度 O(1)

对业务插件集合 \(P\)（`graph.json` 中 `role: plugin`）：

\[
\forall p\in P:\ \mathrm{out}(p)\le K
\qquad (K=2)
\]

\[
\forall p_1,p_2\in P:\ (p_1,p_2)\notin E
\]

插件出边只允许指向 `contracts` 或 `infra`（本仓 infra = `config`）。

**不**约束：`contracts` / `compose` 的入度（允许 \(O(n)\)）。

插件之间的协作只通过 **contracts 端口**，由 `runtime` / `app` / `hosts` 接线。

玩法插件 **禁止** import 任何宿主 SDK（Cursor / DSH / Codex）。宿主只活在 `src/hosts/**`（compose）。

## 2. 单测集与功能差集

见 CORE-THEORY。`ui:true` 才走 UX → 实现 → UI；本仓默认 `ui:false`（界面 = 宿主聊天/MCP）。

## 3. 变更顺序

1. 改 `requirements.json` / `graph.json` / `workspace.dsl`
2. 跑 `py scripts/adl_check.py`
3. 再改 TypeScript
4. 宿主适配只改 `src/hosts/<id>/`，不得把规则塞进 host

## 4. 视界四元组

| 维度 | 含义 |
|------|------|
| Intention | 对外不变量 / 意图 |
| In | 合法控制流入口 |
| Out | 事件、副作用、可观测输出 |
| Deps | 允许依赖谁、出度上限 |
