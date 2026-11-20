"""The pinned inputs of a build (spec #285, ticket #292; GLOSSARY "Pinned inputs").

At the start of a run the build fixes what it will read: the Raw archive units (relative path -> sha256 of the unit's `manifest.json`), the code
version, the schema files and the day that ends the Coverage grid. `build.run` records them (build_ledger.start_run); a resume reads exactly that
set (resume.py decides whether it may). A unit that lands in the archive later is not in the set, so the build never sees it; the next build pins it.

The code version is a content hash of the `pipeline/` package directory (every `.py`, `.sql`, `.toml`, `.csv`, `.json` under it, sorted by relative
path; no `__pycache__`): the image has no `.git`, and the package holds everything the build runs, including the schema files, the identity overrides,
the placement tables and the known gaps. An input file the operator passes from OUTSIDE the package (`--identity-overrides`, `--placement-data`,
`--known-gaps`) is folded into the same hash by `compute_pins(extra=...)`.

Not pinned: GRIVEI_PERSON_ID_SECRET (nothing derived from a secret goes into the served graph)."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Mapping

from .archive import MANIFEST, Archive, sha256_of

PACKAGE = Path(__file__).resolve().parent
SQL_DIR = PACKAGE / "sql"


@dataclass(frozen=True)
class Pins:
    units: Mapping[str, str | None]  # fetch directory relative to the archive root (posix) -> sha256 of its manifest.json; None: no manifest at pin time (incomplete)
    code_version: str
    schema_files: Mapping[str, str]  # sql/*_schema.sql file name -> sha256
    today: date  # the day that ends the Coverage grid's last quarter: a resume on another day gives the same grid


def _files_under(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc")


def _tree_hash(root: Path, h) -> None:
    for path in _files_under(root):
        h.update(path.relative_to(root).as_posix().encode() + b"\0")
        h.update(path.read_bytes() + b"\0")


def code_version(extra: Mapping[str, Path | str | None] | None = None, package: Path = PACKAGE) -> str:
    """sha256 of the package's files and of every explicit outside input (`extra`: a label -> a file or a directory; None is skipped)."""
    h = hashlib.sha256()
    _tree_hash(package, h)
    for label in sorted(extra or {}):
        path = (extra or {})[label]
        if path is None:
            continue
        path = Path(path)
        h.update(b"extra:" + label.encode() + b"\0")
        if path.is_dir():
            _tree_hash(path, h)
        elif path.is_file():
            h.update(path.read_bytes() + b"\0")
    return h.hexdigest()


def schema_files(sql_dir: Path = SQL_DIR) -> dict[str, str]:
    return {p.name: sha256_of(p) for p in sorted(sql_dir.glob("*_schema.sql"))}


def unit_checksums(archive: Archive) -> dict[str, str | None]:
    """Every fetch directory of the archive (quarantine excluded) -> the sha256 of its manifest (the files are not hashed: too big nationally)."""
    out: dict[str, str | None] = {}
    for directory in archive.fetch_dirs():
        manifest = directory / MANIFEST
        out[directory.relative_to(archive.root).as_posix()] = sha256_of(manifest) if manifest.is_file() else None
    return out


def pin_extra(overrides_path, placement_dir, known_gaps_path) -> dict[str, Path | str | None]:
    """The input files a build may be given from outside the package (rebuild's options): folded into the code version when passed."""
    return {"identity-overrides": overrides_path, "placement-data": placement_dir, "known-gaps": known_gaps_path}


def compute_pins(archive: Archive, today: date, extra: Mapping[str, Path | str | None] | None = None) -> Pins:
    return Pins(unit_checksums(archive), code_version(extra), schema_files(), today)
