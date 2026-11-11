#!/usr/bin/env python3
"""Injects a graph.json into viewer/graph.template.html -> a self-contained page.
  python tools/build_viewer.py --data viewer/timisoara.graph.json --out viewer/timisoara.html --title "Watchdog Timișoara"
"""
import argparse, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--data", default="viewer/graph.json"); ap.add_argument("--out", default="viewer/graph.html"); ap.add_argument("--title", default="Watchdog")
a = ap.parse_args()
data = json.loads((root / a.data).read_text(encoding="utf-8"))
tpl = (root / "viewer/graph.template.html").read_text(encoding="utf-8")
out = tpl.replace("__TITLE__", a.title).replace("__GRAPH_DATA__", json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))
(root / a.out).write_text(out, encoding="utf-8")
print(a.out, len(out) // 1024, "KB")
