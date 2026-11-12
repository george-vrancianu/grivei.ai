"""`pipeline validate` (#64c): read every archived bulk file against its kind, report pass or fail per file, change nothing.

Read-only by construction: this module only lists the archive and parses files (`parse_file_stats`). It never imports or
calls `quarantine`, `requeue`, `write_unit` or `plan`, and opens nothing for writing, so it can run on an archive mounted
read-only (`docker run -v ~/grivei-data/raw:/archive:ro ...`). A rebuild would have quarantined every failing unit.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable

from .archive import Archive
from .bulk import KINDS, InvalidFile, parse_file_stats


@dataclass(frozen=True)
class FileResult:
    kind: str
    unit: str
    path: str  # relative to the archive root
    ok: bool
    reason: str | None = None
    problems: tuple[str, ...] = ()
    rows: int = 0
    records: int = 0


def validate_archive(archive: Archive, kinds: Iterable[str] | None = None, match: str = "", on_result: Callable[[FileResult], None] | None = None) -> list[FileResult]:
    """One result per file of every bulk unit (`seap/bulk/<kind>/...`) of a kind in `kinds` (default all) whose path inside the archive (`seap/bulk/<kind>/<unit>/...`) holds `match`."""
    wanted = set(kinds) if kinds else set(KINDS)
    results: list[FileResult] = []

    def add(result: FileResult) -> None:
        results.append(result)
        if on_result:
            on_result(result)

    def relative(path) -> str:
        return str(path.relative_to(archive.root))

    def wanted_dir(directory) -> bool:
        parts = directory.relative_to(archive.root).parts
        return len(parts) >= 5 and parts[1] == "bulk" and parts[2] in wanted and match in "/".join(parts)

    for unit, directory in archive.survey(wanted_dir):
        parts = directory.relative_to(archive.root).parts
        if unit is None:
            add(FileResult(parts[2], parts[3], relative(directory), False, "unit is incomplete: the manifest is unreadable or a file does not match it"))
            continue
        for name in unit.files:
            path = unit.file_path(name)
            try:
                parsed = parse_file_stats(unit.kind, unit.unit, path)
            except InvalidFile as e:
                add(FileResult(unit.kind, unit.unit, relative(path), False, e.reason, tuple(p for p in e.problems if p)))
            except Exception as e:  # an unforeseen reader error is a failure of that file, not of the run
                add(FileResult(unit.kind, unit.unit, relative(path), False, f"{type(e).__name__}: {e}"))
            else:
                add(FileResult(unit.kind, unit.unit, relative(path), True, rows=parsed.rows, records=len(parsed.records)))
    return results


def summary_lines(results: list[FileResult]) -> list[str]:
    passed = sum(r.ok for r in results)
    per_kind: dict[str, list[int]] = {}
    for r in results:
        counts = per_kind.setdefault(r.kind, [0, 0])
        counts[0] += r.ok
        counts[1] += 1
    kinds = ", ".join(f"{k} {p}/{n}" for k, (p, n) in sorted(per_kind.items()))
    return [f"{passed} passed, {len(results) - passed} failed of {len(results)} file(s)" + (f" ({kinds})" if kinds else "")]
