#!/usr/bin/env python3
"""
Copy <username>_levels.json files from the extraction folder into
public/data/users/<User_name>_levels.json (spaces -> underscores).

Model and generation settings (meta.levels) are left out of the copy: the
prototype doesn't use them, and participants are not told the text is
AI-generated. The originals in the extraction folder are not changed.

Usage:
    python3 scripts/import_levels.py                 # every *_levels.json found
    python3 scripts/import_levels.py Augur "Betty Logan"
    python3 scripts/import_levels.py --source /other/folder
Default source: ../../python/WikiPeople/project1-extraction (relative to the
GitHub folder that holds this repo).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "users"
DEFAULT_SOURCE = ROOT.parent.parent / "python" / "WikiPeople" / "project1-extraction"
LEVELS = ["extract", "prioritize", "select", "connect", "judge"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("users", nargs="*")
    ap.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    args = ap.parse_args()

    if args.users:
        files = [args.source / f"{u}_levels.json" for u in args.users]
    else:
        files = sorted(p for p in args.source.glob("*_levels.json"))
    OUT.mkdir(parents=True, exist_ok=True)

    for f in files:
        if not f.exists():
            print(f"missing: {f.name}")
            continue
        data = json.loads(f.read_text(encoding="utf-8"))
        meta = data.get("meta", {})
        data["meta"] = {"username": meta.get("username"), "window_start": meta.get("window_start")}
        name = meta.get("username") or f.name[: -len("_levels.json")]
        dest = OUT / f"{name.replace(' ', '_')}_levels.json"
        dest.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        missing = [lv for lv in LEVELS if not data.get(lv)]
        note = f"  (missing levels: {', '.join(missing)})" if missing else ""
        print(f"{name}: {dest.relative_to(ROOT)}  {dest.stat().st_size / 1e6:.2f} MB{note}")


if __name__ == "__main__":
    main()
