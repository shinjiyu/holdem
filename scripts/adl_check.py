#!/usr/bin/env python3
"""ADL gate (portable kernel): O(1) plugins + R_manual + optional UX→impl→UI.

Usage:
  py scripts/adl_check.py
  py scripts/adl_check.py --root .
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

UX_REQUIRED = ("brief.md", "acceptance.md")
UI_REQUIRED_DOCS = ("brief.md", "acceptance.md", "mapping.md")
UI_PREVIEW_INDEX = "index.html"


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def check_graph(graph: dict) -> tuple[list[str], dict]:
    errors: list[str] = []
    K = int(graph.get("K", 2))
    nodes = {n["id"]: n for n in graph["nodes"]}
    plugins = {i for i, n in nodes.items() if n.get("role") == "plugin"}
    allowed_targets = {
        i for i, n in nodes.items() if n.get("role") in ("contracts", "infra")
    }

    out_edges: dict[str, set[str]] = defaultdict(set)
    for e in graph["edges"]:
        frm, to = e["from"], e["to"]
        if frm not in nodes or to not in nodes:
            errors.append(f"edge {frm}->{to}: unknown node")
            continue
        out_edges[frm].add(to)

    for p in sorted(plugins):
        outs = out_edges.get(p, set())
        for t in outs:
            if t in plugins:
                errors.append(f"NoCross violated: plugin {p} -> plugin {t}")
            if t not in allowed_targets:
                errors.append(
                    f"PortsOnly violated: plugin {p} -> {t} "
                    f"(only contracts|infra allowed)"
                )
        if len(outs) > K:
            errors.append(
                f"O1 violated: out({p})={len(outs)} > K={K} targets={sorted(outs)}"
            )

    summary = {
        "K": K,
        "project": graph.get("project") or graph.get("schema", "adl"),
        "plugins": sorted(plugins),
        "out_degree": {p: len(out_edges.get(p, ())) for p in sorted(plugins)},
        "max_plugin_out": max((len(out_edges.get(p, ())) for p in plugins), default=0),
    }
    return errors, summary


def _check_pack(root: Path, rel: str, names: tuple[str, ...], rid: str, label: str) -> list[str]:
    errs: list[str] = []
    d = root / rel
    for name in names:
        if not (d / name).is_file():
            errs.append(f"{rid}: {label} accepted but missing {rel}/{name}")
    return errs


def check_requirements(reqs: dict, root: Path) -> tuple[list[str], dict]:
    errors: list[str] = []
    R = reqs.get("requirements", [])
    R_U: list[dict] = []
    R_manual: list[dict] = []
    ux_needed: list[dict] = []
    ui_needed: list[dict] = []
    ux_accepted: list[str] = []
    ui_accepted: list[str] = []
    hollow: list[dict] = []

    for r in R:
        rid = r.get("id", "?")
        kind = r.get("test_kind")
        tests = r.get("tests") or []
        ui = r.get("ui", False)

        if "design_status" in r or "design_path" in r:
            errors.append(
                f"{rid}: deprecated design_path/design_status — use ux_* and ui_*"
            )

        if kind is None or kind == "none":
            errors.append(f"{rid}: test_kind missing or 'none'")
            continue
        if kind in ("unit", "contract"):
            if not tests:
                errors.append(f"{rid}: test_kind={kind} but tests[] empty")
            else:
                R_U.append(r)
                for t in tests:
                    if "(planned)" in t.lower() or t.endswith("(planned)"):
                        hollow.append({"id": rid, "test": t, "reason": "marked planned"})
                    else:
                        path_guess = t.split()[0]
                        if not (root / path_guess).is_file():
                            hollow.append(
                                {"id": rid, "test": t, "reason": f"missing file {path_guess}"}
                            )
        elif kind == "manual":
            R_manual.append(r)
        else:
            errors.append(f"{rid}: unknown test_kind={kind!r}")
            continue

        if not ui:
            continue

        ux_path = r.get("ux_path")
        ux_status = r.get("ux_status")
        ui_path = r.get("ui_path")
        ui_status = r.get("ui_status")
        ui_impl = r.get("ui_impl")

        if not ux_path or ux_status not in ("needed", "accepted", "rejected"):
            errors.append(
                f"{rid}: ui=true requires ux_path and ux_status in needed|accepted|rejected"
            )
        else:
            if ux_status == "rejected":
                errors.append(f"{rid}: ux_status=rejected — revise UX before implement")
            elif ux_status == "needed":
                ux_needed.append(r)
            else:
                errors.extend(_check_pack(root, ux_path, UX_REQUIRED, rid, "UX"))
                ux_accepted.append(rid)

        if ui_status not in ("needed", "accepted", "rejected", "n/a"):
            errors.append(
                f"{rid}: ui=true requires ui_status in needed|accepted|rejected|n/a"
            )
        elif ui_status == "rejected":
            errors.append(f"{rid}: ui_status=rejected — revise UI pack")
        elif ui_status == "needed":
            if not ui_path:
                errors.append(f"{rid}: ui_status=needed but ui_path missing")
            ui_needed.append(r)
        elif ui_status == "accepted":
            if not ui_path:
                errors.append(f"{rid}: ui_status=accepted but ui_path missing")
            else:
                errors.extend(_check_pack(root, ui_path, UI_REQUIRED_DOCS, rid, "UI"))
                preview = root / "ui" / "preview" / rid / UI_PREVIEW_INDEX
                if not preview.is_file():
                    errors.append(
                        f"{rid}: ui_status=accepted but missing Code-as-Design "
                        f"preview ui/preview/{rid}/{UI_PREVIEW_INDEX}"
                    )
                ui_accepted.append(rid)

        if ui_impl not in ("config", "code", "hybrid", "none"):
            errors.append(
                f"{rid}: ui=true requires ui_impl in config|code|hybrid|none"
            )

    summary = {
        "R": [r["id"] for r in R],
        "R_U": [r["id"] for r in R_U],
        "R_manual": [r["id"] for r in R_manual],
        "R_manual_titles": [
            {"id": r["id"], "title": r.get("title"), "acceptance": r.get("acceptance")}
            for r in R_manual
        ],
        "ux_needed": [
            {"id": r["id"], "path": r.get("ux_path"), "title": r.get("title")}
            for r in ux_needed
        ],
        "ui_needed": [
            {"id": r["id"], "path": r.get("ui_path"), "title": r.get("title")}
            for r in ui_needed
        ],
        "ux_accepted": ux_accepted,
        "ui_accepted": ui_accepted,
        "hollow_R_U": hollow,
    }
    return errors, summary


def main() -> int:
    ap = argparse.ArgumentParser(description="ADL checker (O(1) + R_manual)")
    ap.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="repo root (default: parent of scripts/)",
    )
    args = ap.parse_args()
    root: Path = args.root
    graph_path = root / "doc" / "structurizr" / "model" / "graph.json"
    req_path = root / "doc" / "structurizr" / "model" / "requirements.json"

    if not graph_path.is_file() or not req_path.is_file():
        print(f"missing model files under {graph_path.parent}", file=sys.stderr)
        return 2

    graph = load_json(graph_path)
    reqs = load_json(req_path)

    g_err, g_sum = check_graph(graph)
    r_err, r_sum = check_requirements(reqs, root)
    errors = g_err + r_err
    project = g_sum.get("project", "adl")

    print(f"=== {project} ADL check ===")
    print(f"graph: {graph_path}")
    print(f"requirements: {req_path}")
    print()
    print("[O(1) plugins]")
    print(f"  K = {g_sum['K']}")
    print(f"  max plugin out-degree = {g_sum['max_plugin_out']}")
    for p, d in g_sum["out_degree"].items():
        print(f"  out({p}) = {d}")
    print()
    print("[R vs R_U vs R_manual]")
    print(f"  |R| = {len(r_sum['R'])}")
    print(f"  |R_U| = {len(r_sum['R_U'])}  {r_sum['R_U']}")
    print(f"  |R_manual| = {len(r_sum['R_manual'])}")
    for item in r_sum["R_manual_titles"]:
        print(f"  - {item['id']}: {item['title']}")
    print()
    print("[UX → impl → UI] (only ui:true REQs)")
    print(f"  UX accepted = {r_sum['ux_accepted']}")
    print(f"  UX needed   = {len(r_sum['ux_needed'])}")
    for item in r_sum["ux_needed"]:
        print(f"  - {item['id']}: {item['path']}")
    print(f"  UI accepted = {r_sum['ui_accepted']}")
    print(f"  UI needed   = {len(r_sum['ui_needed'])}")
    for item in r_sum["ui_needed"]:
        print(f"  - {item['id']}: {item['path']}")
    print()
    hollow = r_sum.get("hollow_R_U") or []
    if hollow:
        print(f"[WARN] hollow R_U ({len(hollow)}) — counted as unit/contract but no real test file yet")
        for h in hollow:
            print(f"  - {h['id']}: {h['test']} ({h['reason']})")
        print()

    if errors:
        print("[FAIL]")
        for e in errors:
            print(f"  - {e}")
        return 1

    if hollow:
        print("[OK with WARN] structural gates green; fill real tests before trusting R_U ≡ features")
    else:
        print("[OK] O(1) + requirements gates satisfied")
    return 0


if __name__ == "__main__":
    sys.exit(main())
