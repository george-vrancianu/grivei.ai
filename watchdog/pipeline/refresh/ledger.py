"""The ledger: every run and every step of it, in one JSON file in the archive root (`refresh-ledger.json`).

Small by design (a run per day, a handful of steps), rewritten whole through a temp name and a rename, so a kill never leaves
half a file. A run still marked `running` when the next one takes the lock is a dead run: it is closed as `interrupted`.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

LEDGER_NAME = "refresh-ledger.json"
KEEP_RUNS = 500


def stamp(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse(text: str) -> datetime:
    return datetime.strptime(text, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


class Ledger:
    def __init__(self, path: Path):
        self.path = Path(path)
        try:
            self.runs: list[dict] = json.loads(self.path.read_text(encoding="utf-8"))["runs"]
        except (OSError, ValueError, KeyError):
            self.runs = []

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_name(self.path.name + ".tmp")
        tmp.write_text(json.dumps({"version": 1, "runs": self.runs[-KEEP_RUNS:]}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, self.path)

    def close_dead_runs(self, now: datetime) -> None:
        for run in self.runs:
            if run["status"] == "running":
                run["status"], run["ended"] = "interrupted", stamp(now)
                for step in run["steps"]:
                    if step["status"] == "running":
                        step["status"], step["ended"] = "interrupted", stamp(now)

    def begin(self, kind: str, trigger: str, now: datetime) -> dict:
        run = {"id": (self.runs[-1]["id"] + 1) if self.runs else 1, "kind": kind, "trigger": trigger, "started": stamp(now), "ended": None, "status": "running", "alert": None, "steps": []}
        self.runs.append(run)
        self.save()
        return run

    def begin_step(self, run: dict, name: str, now: datetime) -> dict:
        step = {"name": name, "started": stamp(now), "ended": None, "status": "running", "attempts": 0, "failureClass": None, "counts": {}, "touched": [], "warnings": [], "error": None, "marker": None}
        run["steps"].append(step)
        self.save()
        return step

    def last_success(self, name: str, kind: str | None = None) -> dict | None:
        """The newest `ok` step of that name (of runs of `kind`, if given), with its end time."""
        for run in reversed(self.runs):
            if kind is not None and run["kind"] != kind:
                continue
            for step in reversed(run["steps"]):
                if step["name"] == name and step["status"] == "ok":
                    return step
        return None

    def consecutive_failed_runs(self) -> int:
        """Trailing refresh runs that failed (a run that only found nothing due, or was blocked by the lock, is not in the ledger as failed)."""
        n = 0
        for run in reversed([r for r in self.runs if r["kind"] == "refresh"]):
            if run["status"] == "running":
                continue
            if run["status"] not in ("failed", "interrupted"):
                break
            n += 1
        return n
