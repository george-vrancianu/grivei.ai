"""`pipeline fetch-onrc`: ONRC's open "Firme inregistrate la Registrul Comertului" snapshots from data.gov.ro into the raw archive (ADR 0004).

Discovery: CKAN `package_search` for the datasets titled "Firme inregistrate la Registrul Comertului pana la data de <date>"; each is one
snapshot (the register as of that date). Two file layouts exist, told apart by the resource names:

- `current` (from mid-2025): `OD_FIRME.CSV`, `OD_STARE_FIRMA.CSV`, `OD_CAEN_AUTORIZAT.CSV` (and, not fetched yet, the people files
  `OD_REPREZENTANTI_LEGALI.CSV`, `OD_REPREZENTANTI_IF.CSV`: ticket #177 adds them to `CURRENT_ROLES` and the next run archives them);
- `legacy` (2021 to mid-2025): four company files (`neradiate`/`radiate` x `fara`/`cu sediu`) with the status codes inline, and a
  status nomenclature file. No registration date and no CAEN codes.

The status names come from ONRC's nomenclature: a resource of the same dataset, else the dataset `nomenclatoare-<dd-mm-yyyy>` of the same date.

Which snapshots are wanted (`wanted`): every monthly snapshot from March 2026 (when birth dates first appear), and for the earlier ones the
last snapshot of each calendar quarter back to 2021 (they date a status and a name only). Seeding and the monthly refresh are the same run:
everything wanted that is not held yet is fetched, newest first.

Layout: `<archive>/onrc/snapshot/firme/<snapshot date>/<fetched on>/<files as published>` + manifest (resource identity per file: id, URL,
last_modified, size, hash, and the data rows counted while downloading). A snapshot is unchanged when every wanted resource is archived
with the same marker (no download); a re-upload is archived as a new dated unit beside the old one. A failed run leaves nothing but a
`.onrc-download-*` scratch file (removed at the next start); rerunning the same command resumes.

Failure classes (the refresh step maps them): `failed` = transient (network, CKAN, HTTP errors); `invalid` = deterministic (a file whose header
is not the expected one, e.g. an HTML error page); `unclassified` and `warnings` = suspicious success (a dataset with an unknown layout,
a snapshot far smaller than the one before). ONRC carries no CNP, so no field is stripped; nothing is read here.
"""
from __future__ import annotations

import json
import logging
import posixpath
import re
import tempfile
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

import requests

from ..archive import MANIFEST, Archive
from ..fetch import USER_AGENT

CKAN = "https://data.gov.ro/api/3/action/"
SEARCH_QUERY = "firme Registrul Comerțului"
PAGE = 100
TITLE_START = "firme inregistrate la registrul comertului"
NOMENCLATURE_DATASET = "nomenclatoare-{day}-{month}-{year}"
SOURCE, STREAM, KIND = "onrc", "snapshot", "firme"
SYSTEM = "data.gov.ro"
MARKER = ("url", "lastModified", "size", "hash")

MONTHLY_FROM = date(2026, 3, 1)  # birth dates first appear in March 2026 (spec #173)
QUARTERLY_FROM = date(2021, 1, 1)
SHRINK_WARNING = 0.75  # a snapshot with fewer than this share of the previous one's companies is a suspicious success

# The files a `current` snapshot is fetched with, by role. The people files join the tuple with ticket #177.
CURRENT_FILES = {"od_firme.csv": "firme", "od_stare_firma.csv": "stare", "od_caen_autorizat.csv": "caen"}
CURRENT_ROLES: tuple[str, ...] = ()
# the columns a file must start with (after a BOM): an HTML error page or a changed export is `invalid`, never an archive entry
EXPECTED_COLUMNS = {
    "firme": ("DENUMIRE", "CUI", "COD_INMATRICULARE"), "stare": ("COD_INMATRICULARE", "COD"), "caen": ("COD_INMATRICULARE", "COD_CAEN_AUTORIZAT"),
    "legacy": ("DENUMIRE", "CUI", "COD_INMATRICULARE", "STARE_FIRMA"), "nomenclature": ("COD", "DENUMIRE"),
}
log = logging.getLogger("pipeline.onrc")

_RO_MONTHS = {"ianuarie": 1, "februarie": 2, "martie": 3, "aprilie": 4, "mai": 5, "iunie": 6, "iulie": 7, "august": 8, "septembrie": 9, "octombrie": 10,
              "noiembrie": 11, "decembrie": 12}


def _fold(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)).lower()


def snapshot_date(dataset: dict) -> date | None:
    """The date the register is as of: `dd.mm.yyyy` or `dd <month> yyyy` in the title, else the dataset name's `dd-mm-yyyy`."""
    title, name = _fold(dataset.get("title") or ""), _fold(dataset.get("name") or "")
    month_names = "|".join(_RO_MONTHS)
    candidates = [(title, r"(?<!\d)(\d{1,2})\.(\d{1,2})\.(\d{4})(?!\d)", False), (title, rf"(?<!\d)(\d{{1,2}})\s+({month_names})\s+(\d{{4}})(?!\d)", True),
                  (name, r"(?<!\d)(\d{1,2})-(\d{1,2})-(\d{4})(?!\d)", False), (name, rf"(?<!\d)(\d{{1,2}})-({month_names})-(\d{{4}})(?!\d)", True)]
    for text, pattern, named in candidates:
        if m := re.search(pattern, text):
            try:
                return date(int(m[3]), _RO_MONTHS[m[2]] if named else int(m[2]), int(m[1]))
            except (ValueError, KeyError):
                continue
    return None


def is_snapshot_dataset(dataset: dict) -> bool:
    return _fold(dataset.get("title") or "").startswith(TITLE_START)


def wanted(snapshots: list[date]) -> list[date]:
    """Every snapshot from `MONTHLY_FROM`, and from earlier ones the last of each calendar quarter since `QUARTERLY_FROM`. Newest first."""
    keep = {d for d in snapshots if d >= MONTHLY_FROM}
    quarters: dict[tuple[int, int], date] = {}
    for d in sorted(d for d in snapshots if d >= QUARTERLY_FROM):
        quarters[(d.year, (d.month - 1) // 3)] = d  # sorted ascending: the last one of the quarter wins (March 2026's own quarter ends in a monthly one)
    return sorted(keep | {d for d in quarters.values() if d < MONTHLY_FROM}, reverse=True)


@dataclass
class OnrcFetchSummary:
    archived: list[str] = field(default_factory=list)  # snapshot dates
    unchanged: list[str] = field(default_factory=list)
    not_wanted: int = 0
    unclassified: list[str] = field(default_factory=list)  # suspicious success: a dataset we cannot read the layout or date of
    failed: list[str] = field(default_factory=list)  # transient
    invalid: list[str] = field(default_factory=list)  # deterministic
    warnings: list[str] = field(default_factory=list)  # suspicious success

    def lines(self) -> list[str]:
        out = [f"archived: {len(self.archived)}", f"unchanged: {len(self.unchanged)}", f"not wanted (outside the seeding window): {self.not_wanted}",
               f"unclassified: {len(self.unclassified)}", f"failed: {len(self.failed)}", f"invalid: {len(self.invalid)}"]
        out += [f"  archived: snapshot {d}" for d in self.archived]
        out += [f"  unclassified: {t}" for t in self.unclassified] + [f"  failed: {t}" for t in self.failed] + [f"  invalid: {t}" for t in self.invalid]
        out += [f"  warning: {t}" for t in self.warnings]
        return out


def _get(http, url: str, *, timeout: float, **kw):
    response = http(url, timeout=timeout, headers={"User-Agent": USER_AGENT}, **kw)
    response.raise_for_status()
    return response


def _package(http, name: str, timeout: float) -> dict | None:
    """`package_show` of a dataset; None when it does not exist (404)."""
    try:
        body = _get(http, f"{CKAN}package_show?id={quote(name)}", timeout=timeout).json()
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            return None
        raise
    if not body.get("success"):
        return None
    return body["result"]


def discover(http, timeout: float) -> list[dict]:
    """Every snapshot dataset CKAN lists (paged), as CKAN's package dicts."""
    found: list[dict] = []
    start = 0
    while True:
        body = _get(http, f"{CKAN}package_search?q={quote(SEARCH_QUERY)}&rows={PAGE}&start={start}", timeout=timeout).json()
        if not body.get("success"):
            raise ValueError("CKAN answered success=false")
        results = body["result"]["results"]
        found += [d for d in results if is_snapshot_dataset(d)]
        start += PAGE
        if not results or start >= body["result"]["count"]:
            return found


def _resource_name(resource: dict) -> str:
    return (resource.get("name") or "").strip()


def layout_files(dataset: dict) -> tuple[str, list[tuple[str, dict]]] | None:
    """(layout, [(role, resource)]) of a snapshot dataset's own resources, or None when no known layout fits. The nomenclature is added by the caller."""
    resources = [r for r in dataset.get("resources") or [] if isinstance(r, dict) and r.get("id") and r.get("url")]
    by_name = {_resource_name(r).lower(): r for r in resources}
    if all(n in by_name for n in CURRENT_FILES):
        roles = {**CURRENT_FILES, **{f"od_{r}.csv": r for r in CURRENT_ROLES}}
        return "current", [(role, by_name[n]) for n, role in roles.items() if n in by_name]
    company = [r for r in resources if "radiate" in _fold(_resource_name(r)) and "sediu" in _fold(_resource_name(r))]
    if company:
        return "legacy", [("legacy", r) for r in company] + [("nomenclature", r) for r in resources if "nomenclator" in _fold(_resource_name(r)) and "stari" in _fold(_resource_name(r))]
    return None


def _nomenclature(dataset_files: list[tuple[str, dict]], when: date, http, timeout: float) -> tuple[str, dict] | None:
    if any(role == "nomenclature" for role, _ in dataset_files):
        return None
    package = _package(http, NOMENCLATURE_DATASET.format(day=f"{when.day:02d}", month=f"{when.month:02d}", year=when.year), timeout)
    for r in (package or {}).get("resources") or []:
        if isinstance(r, dict) and r.get("id") and r.get("url") and _resource_name(r).lower() == "n_stare_firma.csv":
            return "nomenclature", r
    return None


def _origin_of(dataset: dict, files: list[tuple[str, dict, int | None]], layout: str, when: date) -> dict:
    return {"system": SYSTEM, "dataset": dataset.get("name"), "datasetId": dataset.get("id"), "datasetTitle": (dataset.get("title") or "").strip(), "layout": layout,
            "snapshot": when.isoformat(),
            "resources": [{"role": role, "resourceId": r["id"], "name": _resource_name(r), "url": r.get("url"), "lastModified": r.get("last_modified"), "size": r.get("size"),
                           "hash": r.get("hash") or "", "format": r.get("format"), "rows": rows} for role, r, rows in files]}


def held_snapshots(archive: Archive) -> dict[str, list[dict]]:
    """snapshot date -> the origins of its archived units (manifests only), oldest fetch first."""
    held: dict[str, list[tuple[str, dict]]] = {}
    for path in sorted((archive.root / SOURCE / STREAM / KIND).glob(f"*/*/{MANIFEST}")):
        try:
            m = json.loads(path.read_text(encoding="utf-8"))
            origin = m["origin"]
            if origin.get("system") == SYSTEM:
                held.setdefault(m["unit"], []).append((m["fetchedAt"], origin))
        except (OSError, ValueError, KeyError, TypeError, AttributeError):
            continue
    return {unit: [o for _, o in sorted(items, key=lambda x: x[0])] for unit, items in held.items()}


def _unchanged(origins: list[dict], files: list[tuple[str, dict]]) -> bool:
    """Every wanted resource is archived (in the newest unit that has it) with the same marker."""
    latest: dict[str, dict] = {}
    for origin in origins:
        for res in origin.get("resources") or []:
            latest[res["resourceId"]] = res
    return all((known := latest.get(r["id"])) is not None and all(known.get(k) == v for k, v in zip(MARKER, (r.get("url"), r.get("last_modified"), r.get("size"), r.get("hash") or ""))) for _, r in files)


def _check_header(path: Path, role: str, name: str) -> None:
    with path.open("rb") as f:
        first = f.readline(8192).decode("utf-8-sig", errors="replace").upper()
    missing = [c for c in EXPECTED_COLUMNS[role] if c not in first]
    if missing:
        raise InvalidFile(f"{name}: the header lacks {', '.join(missing)} (an error page or a changed export?)")


class InvalidFile(Exception):
    """A downloaded file is not what its role says: retrying cannot help."""


def _download(http, resource: dict, role: str, scratch: Path, timeout: float) -> tuple[Path, int]:
    """The resource into a scratch file (header checked); returns the path and its data rows (newlines minus the header)."""
    got = http(resource["url"], stream=True, timeout=timeout, headers={"User-Agent": USER_AGENT})
    got.raise_for_status()
    rows = 0
    with tempfile.NamedTemporaryFile(dir=scratch, prefix=".onrc-download-", delete=False) as tmp:
        path = Path(tmp.name)
        try:
            for chunk in got.iter_content(chunk_size=1 << 20):
                tmp.write(chunk)
                rows += chunk.count(b"\n")
        except BaseException:
            path.unlink(missing_ok=True)
            raise
    try:
        _check_header(path, role, _resource_name(resource))
    except InvalidFile:
        path.unlink(missing_ok=True)
        raise
    return path, max(rows - 1, 0)


def _file_name(resource: dict, taken: set[str]) -> str:
    name = posixpath.basename(unquote(urlparse(resource["url"]).path)) or f"{resource['id']}.csv"
    if name in taken:
        name = f"{resource['id'][:8]}-{name}"
    taken.add(name)
    return name


def _company_rows(origin: dict) -> int | None:
    counted = [r["rows"] for r in origin.get("resources") or [] if r.get("role") in ("firme", "legacy") and r.get("rows") is not None]
    return sum(counted) if counted else None


def _shrunk(held: dict[str, list[dict]], archived: list[str]) -> list[str]:
    """A warning for each snapshot archived in this run that lists far fewer companies than the held snapshot before it (a seed fetches newest first, so this runs once all are in)."""
    out = []
    ordered = sorted(held)
    for unit in archived:
        before = next((p for p in reversed(ordered[:ordered.index(unit)]) if _company_rows(held[p][-1])), None)
        now, then = _company_rows(held[unit][-1]), _company_rows(held[before][-1]) if before else None
        if now is not None and then and now < then * SHRINK_WARNING:
            out.append(f"snapshot {unit} lists {now} companies, far fewer than the {then} of the snapshot before it ({before})")
    return out


def fetch_onrc(archive: Archive, *, now: datetime | None = None, timeout: float = 120, http=requests.get, limit: int | None = None) -> OnrcFetchSummary:
    """Fetch every wanted snapshot not yet held, newest first (`limit` caps how many are downloaded in this run). `http` is `requests.get` (tests pass a stub)."""
    now = now or datetime.now(timezone.utc)
    summary = OnrcFetchSummary()
    for stale in archive.root.glob(".onrc-download-*") if archive.root.is_dir() else []:
        stale.unlink(missing_ok=True)  # a killed run's scratch file
    try:
        datasets = discover(http, timeout)
    except Exception as e:  # noqa: BLE001
        summary.failed.append(f"dataset search failed: {e}")
        log.warning("failed      %s", summary.failed[-1])
        return summary
    dated: dict[date, dict] = {}
    for dataset in datasets:
        when = snapshot_date(dataset)
        if when is None:
            summary.unclassified.append(f"{dataset.get('name')!r}: no readable snapshot date")
            log.warning("unclassified %s", summary.unclassified[-1])
        elif when not in dated or (dataset.get("metadata_modified") or "") >= (dated[when].get("metadata_modified") or ""):
            dated[when] = dataset
    held = held_snapshots(archive)
    chosen = wanted(list(dated))
    summary.not_wanted = len(dated) - len(chosen)
    consecutive_failures = 0
    downloaded = 0
    for when in chosen:
        dataset = dated[when]
        label = f"{when} ({dataset.get('name')})"
        try:
            laid = layout_files(dataset)
            if laid is None:
                summary.unclassified.append(f"{label}: no known file layout")
                log.warning("unclassified %s", summary.unclassified[-1])
                continue
            layout, files = laid
            if layout == "current" and (extra := _nomenclature(files, when, http, timeout)):
                files = [*files, extra]
            if _unchanged(held.get(when.isoformat(), []), files):
                summary.unchanged.append(when.isoformat())
                continue
            if limit is not None and downloaded >= limit:
                continue
            archive.root.mkdir(parents=True, exist_ok=True)
            scratch: list[Path] = []
            try:
                got: list[tuple[str, dict, Path, int]] = []
                for role, resource in files:
                    path, rows = _download(http, resource, role, archive.root, timeout)
                    scratch.append(path)
                    got.append((role, resource, path, rows))
                taken: set[str] = set()
                named = {_file_name(resource, taken): path for _, resource, path, _ in got}
                origin = _origin_of(dataset, [(role, resource, rows if role in ("firme", "legacy") else None) for role, resource, _, rows in got], layout, when)
                where = archive.write_unit(source=SOURCE, stream=STREAM, kind=KIND, unit=when.isoformat(), fetched_at=now, files=named,
                                           url=f"https://data.gov.ro/dataset/{dataset.get('name')}", via=origin["datasetTitle"], origin=origin, same_day=True)
            finally:
                for path in scratch:
                    path.unlink(missing_ok=True)
            downloaded += 1
            consecutive_failures = 0
            summary.archived.append(when.isoformat())
            log.info("archived    snapshot %s (%s) -> %s", when, layout, where)
            held.setdefault(when.isoformat(), []).append(origin)
        except InvalidFile as e:
            summary.invalid.append(f"snapshot {label}: {e}")
            log.warning("invalid     %s", summary.invalid[-1])
        except Exception as e:  # noqa: BLE001 - nothing half-written is left in the archive; the same command resumes
            summary.failed.append(f"snapshot {label}: {str(e) or type(e).__name__}")
            log.warning("failed      %s", summary.failed[-1])
            consecutive_failures += 1
            if consecutive_failures >= 3:
                summary.failed.append("stopped after 3 failures in a row")
                break
    summary.warnings += _shrunk(held, summary.archived)
    return summary
