"""The raw archive (ADR 0004): every fetched file is stored unchanged under a dated path, with a manifest per unit.

Layout (one directory per fetch of one unit, `<fetched on>` is the UTC date of the fetch):

    <root>/<source>/<stream>/<kind>/<unit>/<fetched on>/<file as fetched>
    <root>/<source>/<stream>/<kind>/<unit>/<fetched on>/manifest.json      <- written LAST
    <root>/quarantine/<same relative path>/{<files>, manifest.json, reason.json}

e.g. `seap/bulk/da/2022Q1/2022-06-15/raport-achizitii-directe-t1-2022.csv`. A unit is a quarter file today and a
crawl day later. The manifest lists every file with its sha256; a unit counts as archived only when its manifest
exists and every listed file matches, so a fetch that died half way is invisible to a rebuild. The archive is
never edited in place: a re-fetch is a new dated directory.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Mapping

MANIFEST = "manifest.json"
REASON = "reason.json"
QUARANTINE_DIR = "quarantine"
MANIFEST_VERSION = 1


class ArchiveError(Exception):
    pass


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


@dataclass(frozen=True)
class Unit:
    """One complete archived unit: a directory holding the files and a manifest that checks out."""

    path: Path
    source: str
    stream: str
    kind: str
    unit: str
    fetched_at: datetime
    url: str | None
    via: str | None
    files: tuple[str, ...]

    def file_path(self, name: str) -> Path:
        return self.path / name


def _parse_time(text: str) -> datetime:
    return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(timezone.utc)


def _format_time(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Archive:
    def __init__(self, root: str | os.PathLike):
        self.root = Path(root)

    # ---- writing ------------------------------------------------------------------------------------------

    def unit_dir(self, source: str, stream: str, kind: str, unit: str, fetched_at: datetime) -> Path:
        day = fetched_at.astimezone(timezone.utc).date().isoformat()
        return self.root / source / stream / kind / unit / day

    def write_unit(
        self,
        *,
        source: str,
        stream: str,
        kind: str,
        unit: str,
        fetched_at: datetime,
        files: Mapping[str, bytes | Path],
        url: str | None = None,
        via: str | None = None,
    ) -> Path:
        """Store `files` unchanged (name -> bytes, or a path to copy), then write the manifest last."""
        if not files:
            raise ArchiveError("a unit needs at least one file")
        target = self.unit_dir(source, stream, kind, unit, fetched_at)
        if target.exists():
            raise ArchiveError(f"already archived, never overwritten: {target}")
        target.mkdir(parents=True)
        entries = []
        for name in sorted(files):
            if "/" in name or name in (MANIFEST, REASON):
                raise ArchiveError(f"bad file name: {name!r}")
            data = files[name]
            dest = target / name
            if isinstance(data, Path):
                shutil.copyfile(data, dest)
            else:
                dest.write_bytes(data)
            entries.append({"name": name, "sha256": sha256_of(dest), "bytes": dest.stat().st_size})
        manifest = {
            "version": MANIFEST_VERSION,
            "source": source,
            "stream": stream,
            "kind": kind,
            "unit": unit,
            "fetchedAt": _format_time(fetched_at),
            "url": url,
            "via": via,
            "files": entries,
        }
        tmp = target / (MANIFEST + ".tmp")
        tmp.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, target / MANIFEST)  # the unit exists from this instant on
        return target

    def quarantine(self, unit: Unit, reason: str, problems: list[str] | None = None) -> Path:
        """Move a unit that failed validation to the quarantine area, with a reason file. Nothing is deleted."""
        rel = unit.path.relative_to(self.root)
        dest = self.root / QUARANTINE_DIR / rel
        if dest.exists():
            raise ArchiveError(f"already quarantined: {dest}")
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(unit.path), str(dest))
        (dest / REASON).write_text(
            json.dumps({"reason": reason, "problems": problems or []}, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        return dest

    # ---- reading ------------------------------------------------------------------------------------------

    def _unit_dirs(self) -> Iterator[Path]:
        """Every fetch directory (`<source>/<stream>/<kind>/<unit>/<day>`), with or without a manifest; quarantine excluded."""
        if not self.root.is_dir():
            return
        for directory in sorted(self.root.glob("*/*/*/*/*")):
            if directory.is_dir() and directory.relative_to(self.root).parts[0] != QUARANTINE_DIR:
                yield directory

    def units(self) -> list[Unit]:
        """Complete units only, in a stable order (path, i.e. source/stream/kind/unit/fetch day)."""
        return [u for u, _ in self._read_all() if u is not None]

    def incomplete(self) -> list[Path]:
        """Directories whose manifest is unreadable or whose files do not match it: skipped by a rebuild."""
        return [p for u, p in self._read_all() if u is None]

    def quarantined(self) -> list[Path]:
        base = self.root / QUARANTINE_DIR
        return sorted(p.parent for p in base.rglob(REASON)) if base.is_dir() else []

    def _read_all(self) -> list[tuple[Unit | None, Path]]:
        out: list[tuple[Unit | None, Path]] = []
        for directory in self._unit_dirs():
            out.append((self._read_unit(directory), directory))
        return out

    def _read_unit(self, directory: Path) -> Unit | None:
        try:
            m = json.loads((directory / MANIFEST).read_text(encoding="utf-8"))
            if m["version"] != MANIFEST_VERSION:
                return None
            names = []
            for entry in m["files"]:
                f = directory / entry["name"]
                if not f.is_file() or sha256_of(f) != entry["sha256"]:
                    return None
                names.append(entry["name"])
            if not names:
                return None
            return Unit(
                path=directory,
                source=m["source"],
                stream=m["stream"],
                kind=m["kind"],
                unit=m["unit"],
                fetched_at=_parse_time(m["fetchedAt"]),
                url=m.get("url"),
                via=m.get("via"),
                files=tuple(names),
            )
        except (OSError, ValueError, KeyError, TypeError):
            return None
