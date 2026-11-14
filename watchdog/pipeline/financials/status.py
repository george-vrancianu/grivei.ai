"""The financial statements' part of `pipeline status`: the held files per fiscal year and the data-through year, read from the manifests (nothing is hashed)."""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date

from ..archive import MANIFEST, Archive
from .build import parse_unit
from .fetch import SOURCE, STREAM


@dataclass(frozen=True)
class HeldFile:
    kind: str
    year: int
    release: str
    fetched: str
    published: str | None
    size: int


def held_files(archive: Archive) -> list[HeldFile]:
    out: dict[tuple[str, int, str], HeldFile] = {}
    for path in sorted((archive.root / SOURCE / STREAM).glob(f"*/*/*/{MANIFEST}")):
        try:
            m = json.loads(path.read_text(encoding="utf-8"))
            parsed = parse_unit(m["unit"])
            if parsed is None or not all((path.parent / f["name"]).is_file() for f in m["files"]):
                continue
            held = HeldFile(m["kind"], parsed[0], parsed[1], m["fetchedAt"][:10], str((m.get("origin") or {}).get("lastModified") or "")[:10] or None,
                            sum(f["bytes"] for f in m["files"]))
        except (OSError, ValueError, KeyError, TypeError):
            continue
        key = (held.kind, held.year, held.release)
        if key not in out or held.fetched >= out[key].fetched:
            out[key] = held
    return sorted(out.values(), key=lambda h: (h.year, h.release, h.kind))


def data_through_year(archive: Archive) -> int | None:
    held = held_files(archive)
    return max((h.year for h in held), default=None)


def describe(archive: Archive) -> list[str]:
    held = held_files(archive)
    if not held:
        return []
    years = sorted({h.year for h in held})
    lines = ["", f"financial statements (MF, annual bulk files): {len(held)} file(s) held, fiscal years {years[0]}-{years[-1]}",
             f"  data through fiscal year {years[-1]} (end {date(years[-1], 12, 31)}); the newest year is a first release that MF may revise"]
    for year in years:
        parts = [f"{h.kind} {h.release}" + (f" (published {h.published})" if h.published else "") for h in held if h.year == year]
        lines.append(f"  FY{year}: " + ", ".join(parts))
    return lines
