"""The crawl's side of the raw archive: one directory per crawl unit (a day), written file by file, manifest LAST.

    <root>/seap/crawl/<kind>/<unit>/<fetched on>/notices-<from>_<to>-p0000.json     every list response, unchanged
                                                 contracts-<caNoticeId>-s00000.json  every contracts response, unchanged
                                                 manifest.json                       <- written last; the unit is complete from then on

`<unit>` is a day (`2026-10-03`) for the nightly crawl; #78's backfill may use another unit name for a wider window.
Each file is written under a `.part` name and renamed (`os.replace`), so a file under its final name is whole; the
manifest is written the same way and only after every file, so **a unit without a readable manifest is not complete**: a
killed crawl leaves a directory without one, which a rebuild ignores and the next crawl resumes (the files already in
it are reused, the rest is fetched). It is the same layout and manifest as `Archive.write_unit` (sha256 per file), so
`Archive.units()` reads a crawl day like any other unit.

A re-crawl of a complete unit is a new `<fetched on>` directory (the archive is never edited in place, ADR 0004); a rebuild
loads them oldest first and per-identity precedence decides.
"""
from __future__ import annotations

import calendar
import json
import os
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from ..archive import MANIFEST, MANIFEST_VERSION, Archive, _format_time, _parse_time, sha256_of

SOURCE, STREAM, KIND = "seap", "crawl", "award-notices"
PART = ".part"


def kind_dir(archive: Archive, kind: str = KIND) -> Path:
    return archive.root / SOURCE / STREAM / kind


def manifest_of(directory: Path) -> dict | None:
    """The manifest when this fetch directory is complete: it parses and every file it lists is there with its recorded size
    (a stat, not a hash: this runs for every day on every crawl; a rebuild verifies the hashes). Else None."""
    try:
        m = json.loads((directory / MANIFEST).read_text(encoding="utf-8"))
        if m["version"] != MANIFEST_VERSION or not m["files"]:
            return None
        for entry in m["files"]:
            if (directory / entry["name"]).stat().st_size != entry["bytes"]:
                return None
        return m
    except (OSError, ValueError, KeyError, TypeError):
        return None


def fetches(archive: Archive, unit: str, kind: str = KIND) -> list[tuple[Path, dict | None]]:
    """Every fetch directory of one unit, oldest name first, with its manifest (None while incomplete)."""
    base = kind_dir(archive, kind) / unit
    if not base.is_dir():
        return []
    return [(d, manifest_of(d)) for d in sorted(base.iterdir()) if d.is_dir()]


def complete_days(archive: Archive, kind: str = KIND) -> dict[date, datetime]:
    """Every crawl day that has at least one complete fetch -> when its latest complete fetch finished. Derived from the archive."""
    out: dict[date, datetime] = {}
    base = kind_dir(archive, kind)
    if not base.is_dir():
        return out
    for unit_dir in base.iterdir():
        try:
            day = date.fromisoformat(unit_dir.name)
        except ValueError:
            continue  # not a day unit (a wider window of the backfill)
        for directory, manifest in fetches(archive, unit_dir.name, kind):
            if manifest:
                fetched = _parse_time(manifest["fetchedAt"])
                out[day] = max(out.get(day, fetched), fetched)
    return out


def cursor(archive: Archive, kind: str = KIND) -> date | None:
    """The crawl cursor: the last day with a complete manifest. Derived from the archive, so it survives a rebuild."""
    days = complete_days(archive, kind)
    return max(days) if days else None


# The Record kinds the crawl yields, with the bulk file kind that covers the same days (the mapping the rebuild uses for CRAWL_ONLY).
CRAWLED_KINDS = {"CONTRACT": "contracte", "AWARD_NOTICE": "fara-anunt"}


def last_bulk_quarter_end(archive: Archive, kind: str = "contracte") -> date | None:
    """The last day of the latest quarter with a complete bulk unit of `kind`, from the directory names (no hashing)."""
    base = archive.root / "seap" / "bulk" / kind
    best: tuple[int, int] | None = None
    if base.is_dir():
        for unit in base.iterdir():
            m = re.fullmatch(r"(\d{4})Q([1-4])", unit.name)
            if m and any(manifest_of(d) for d in unit.iterdir() if d.is_dir()):
                key = (int(m[1]), int(m[2]))
                best = max(best, key) if best else key
    if best is None:
        return None
    year, quarter = best
    month = quarter * 3
    return date(year, month, calendar.monthrange(year, month)[1])


def _run_start(archive: Archive, days: set[date], bulk_kind: str | None) -> date | None:
    """Where the days a kind still needs from the crawl begin: the day after its last bulk quarter (the bulk has those days),
    else the first complete crawl day."""
    end = last_bulk_quarter_end(archive, bulk_kind) if bulk_kind else None
    return end + timedelta(days=1) if end else (min(days) if days else None)


def contiguous_through(archive: Archive, kind: str = KIND, bulk_kind: str | None = None) -> date | None:
    """The last day of the unbroken run of complete days that starts where the bulk of `bulk_kind` ends (else at the first complete
    day), or None when that first day is not complete: what is complete in the archive. The cursor (the maximum) is for
    planning; this is the honest "crawled through" date when there are holes below it."""
    days = complete_days(archive, kind)
    day = _run_start(archive, set(days), bulk_kind)
    if day is None or day not in days:
        return None
    while day + timedelta(days=1) in days:
        day += timedelta(days=1)
    return day


def missing_days(archive: Archive, kind: str = KIND, bulk_kind: str | None = None) -> list[date]:
    """The days without a complete fetch between where the crawl is needed (see `contiguous_through`) and the cursor."""
    days = complete_days(archive, kind)
    start = _run_start(archive, set(days), bulk_kind)
    return [d for d in days_between(start, max(days)) if d not in days] if days and start and start <= max(days) else []


class UnitWriter:
    """Writes one crawl unit. `open` resumes an incomplete fetch directory of the unit, or starts a new one."""

    def __init__(self, archive: Archive, unit: str, directory: Path, kind: str = KIND):
        self.archive, self.unit, self.dir, self.kind = archive, unit, directory, kind

    @classmethod
    def open(cls, archive: Archive, unit: str, now: datetime, kind: str = KIND) -> "UnitWriter":
        existing = fetches(archive, unit, kind)
        name = now.astimezone(timezone.utc).date().isoformat()
        has_complete = any(m for _, m in existing)
        for directory, manifest in reversed(existing):
            # An interrupted fetch is resumed. When the unit was already fetched completely (a re-crawl), only one begun
            # today is: an older leftover would mix stale list pages into a fresh fetch, so it stays as it is (ignored).
            if manifest is None and (not has_complete or directory.name.split(".")[0] == name):
                return cls(archive, unit, directory, kind)
        base = kind_dir(archive, kind) / unit
        directory, n = base / name, 1
        while directory.exists():  # a second complete fetch on the same UTC day
            n += 1
            directory = base / f"{name}.{n:02d}"  # zero-padded: names sort in fetch order past .9
        directory.mkdir(parents=True)
        return cls(archive, unit, directory, kind)

    @property
    def resumed(self) -> bool:
        return any(self.dir.iterdir())

    def has(self, name: str) -> bool:
        return (self.dir / name).is_file()

    def read(self, name: str) -> bytes:
        return (self.dir / name).read_bytes()

    def put(self, name: str, data: bytes) -> None:
        """Store a response unchanged: under a temporary name, then renamed, so the final name is never a partial file."""
        part = self.dir / (name + PART)
        part.write_bytes(data)
        os.replace(part, self.dir / name)

    def commit(self, fetched_at: datetime, url: str, extra: dict[str, Any]) -> Path:
        """Write the manifest, last: every file of the directory with its sha256. The unit is complete from this instant."""
        entries = []
        for f in sorted(self.dir.iterdir()):
            if f.name == MANIFEST or f.name.endswith(PART) or f.name.endswith(".tmp"):
                continue
            entries.append({"name": f.name, "sha256": sha256_of(f), "bytes": f.stat().st_size})
        manifest = {
            "version": MANIFEST_VERSION, "source": SOURCE, "stream": STREAM, "kind": self.kind, "unit": self.unit,
            "fetchedAt": _format_time(fetched_at), "url": url, "via": "crawl", "files": entries, "crawl": extra,
        }
        tmp = self.dir / (MANIFEST + ".tmp")
        tmp.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, self.dir / MANIFEST)
        return self.dir


def days_between(first: date, last: date) -> list[date]:
    return [first + timedelta(days=i) for i in range((last - first).days + 1)]
