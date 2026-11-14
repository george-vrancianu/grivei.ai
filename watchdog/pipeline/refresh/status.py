"""The refresh section of `pipeline status`: recent runs, each step's last success and whether it is due, and the open quarantines."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ..archive import QUARANTINE_DIR, Archive
from .ledger import Ledger

STEP_ORDER = ("crawl", "datagov", "onrc", "amepip", "financials", "banipartide", "anaf", "load")


def quarantine_lines(archive: Archive) -> list[str]:
    held = archive.quarantined()
    if not held:
        return ["quarantine: none open"]
    lines = [f"quarantine: {len(held)} open (shown publicly as \"not yet loaded\"; `pipeline requeue` after a fix)"]
    for path in held[:20]:
        try:
            reason = json.loads((path / "reason.json").read_text(encoding="utf-8")).get("reason", "?")
        except (OSError, ValueError):
            reason = "?"
        lines.append(f"  {path.relative_to(archive.root / QUARANTINE_DIR)}: {reason}")
    if len(held) > 20:
        lines.append(f"  ... and {len(held) - 20} more")
    return lines


def describe_refresh(archive: Archive, ledger: Ledger, steps=None, now: datetime | None = None, recent: int = 5) -> list[str]:
    """`steps` (from `refresh_steps`) lets the output say what is due now; without it only history is shown."""
    now = now or datetime.now(timezone.utc)
    lines = []
    runs = ledger.runs[-recent:]
    if not runs:
        lines.append("refresh: no run on record yet")
    else:
        lines.append(f"refresh: last {len(runs)} run(s), newest first")
        for run in reversed(runs):
            parts = []
            for s in run["steps"]:
                tag = s["status"] if s["status"] != "failed" else f"failed ({s['failureClass']})"
                parts.append(f"{s['name']} {tag}")
            lines.append(f"  #{run['id']} {run['kind']} {run['started']} -> {run['ended'] or '...'} {run['status']}: " + (", ".join(parts) or "nothing due")
                         + (f"; ALERT: {run['alert']}" if run.get("alert") else ""))
            for s in run["steps"]:
                if s["error"] and s["status"] == "failed":
                    lines.append(f"      {s['name']}: {s['error']}")
                for w in s["warnings"]:
                    lines.append(f"      {s['name']} warning: {w}")
        streak = ledger.consecutive_failed_runs()
        if streak:
            lines.append(f"refresh: {streak} failed run(s) in a row")
    for name in STEP_ORDER:
        last = ledger.last_success(name)
        lines.append(f"  step {name}: last success {last['ended'] if last else 'never'}")
    if steps is not None:
        due = [f"{s.name} ({reason})" for s in steps if (reason := s.due(ledger, now))]
        lines.append("refresh: due now: " + (", ".join(due) if due else "nothing"))
    lines += quarantine_lines(archive)
    return lines
