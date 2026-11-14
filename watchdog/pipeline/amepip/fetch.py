"""`pipeline fetch-amepip`: AMEPIP's open-data list of public enterprises from data.gov.ro into the raw archive (ADR 0004), unchanged and dated.

The source. AMEPIP (Agentia pentru Monitorizarea si Evaluarea Performantelor Intreprinderilor Publice) publishes, under its data.gov.ro organisation
`agentia-pentru-monitorizarea-si-evaluarea-performantelor-intreprinderilor-publice`, the financial, non-financial and corporate-governance
indicators of every company under OUG 109/2011, licence CC-BY-4.0. There is no dedicated list of CUIs: the indicator tables carry one row per
company and year with its CUI, name, registration number and ONRC status, so the list of public-enterprise CUIs is the set of CUIs in them.
AMEPIP publishes a NEW dataset for each release (an `.xlsx` of January 2026 with sheets `Indicatori calculati` and `Indicatori formular`;
an earlier `.csv` export of August 2024) instead of updating one, so discovery is a CKAN `package_search` on the organisation, not a fixed
dataset id. There is no schedule: releases came about once or twice a year.

Discovery picks the NEWEST resource (by its `last_modified`) of a `.xlsx`, `.xls` or `.csv` file in a dataset whose title mentions
"indicatori". Only that one is fetched (a list, not a history); older ones are logged `superseded`. The snapshot date ("as of") is the date the
resource was published (`last_modified`), which is the list's data-through date.

Layout: `<archive>/amepip/list/enterprises/<snapshot date>/<fetched on>/<file as fetched>` + manifest (resource id, URL, last_modified, size,
hash, licence). Change detection and resume are the MF connector's: the same marker is `unchanged` (no download); a changed marker is archived
as a new dated unit; a failed run leaves nothing but a `.amepip-download-*` scratch file (removed at the next start). A download that holds no
`cui` column is a failure, not an archive entry.
"""
from __future__ import annotations

import json
import logging
import posixpath
import tempfile
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

import requests

from ..archive import MANIFEST, Archive
from ..fetch import USER_AGENT
from ..placement.matching import fold

ORGANISATION = "agentia-pentru-monitorizarea-si-evaluarea-performantelor-intreprinderilor-publice"
CKAN = "https://data.gov.ro/api/3/action/package_search?rows=100&fq=organization:" + quote(ORGANISATION)
DATASET_PAGE = "https://data.gov.ro/dataset/"
SOURCE, STREAM, KIND = "amepip", "list", "enterprises"
SYSTEM = "data.gov.ro"
MARKER = ("url", "lastModified", "size", "hash")
EXTENSIONS = (".xlsx", ".xls", ".csv")
log = logging.getLogger("pipeline.amepip")


@dataclass
class AmepipFetchSummary:
    archived: list[str] = field(default_factory=list)  # snapshot dates
    unchanged: list[str] = field(default_factory=list)
    superseded: int = 0
    unclassified: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)

    def lines(self) -> list[str]:
        out = [f"archived: {len(self.archived)}", f"unchanged: {len(self.unchanged)}", f"superseded: {self.superseded}",
               f"unclassified: {len(self.unclassified)}", f"failed: {len(self.failed)}"]
        out += [f"  archived: snapshot {d}" for d in self.archived]
        out += [f"  unclassified: {t}" for t in self.unclassified] + [f"  failed: {t}" for t in self.failed]
        return out


def published_on(resource: dict) -> date | None:
    """The day the resource was published, from its `last_modified` (ISO), else its `created`."""
    for key in ("last_modified", "created"):
        try:
            return date.fromisoformat(str(resource.get(key) or "")[:10])
        except ValueError:
            continue
    return None


def _origin(dataset: dict, resource: dict) -> dict:
    return {"system": SYSTEM, "dataset": dataset.get("name"), "datasetId": dataset.get("id"), "datasetTitle": (dataset.get("title") or "").strip(),
            "datasetUrl": DATASET_PAGE + str(dataset.get("name") or dataset.get("id")), "license": dataset.get("license_id"),
            "resourceId": resource["id"], "resourceName": (resource.get("name") or "").strip(), "url": resource.get("url"),
            "lastModified": resource.get("last_modified"), "size": resource.get("size"), "hash": resource.get("hash") or "", "format": resource.get("format")}


def _archived_origins(archive: Archive) -> dict[str, dict]:
    """resource id -> origin of its latest archived fetch (manifests only)."""
    latest: dict[str, tuple[str, dict]] = {}
    for path in sorted((archive.root / SOURCE / STREAM / KIND).glob(f"*/*/{MANIFEST}")):
        try:
            m = json.loads(path.read_text(encoding="utf-8"))
            origin = m["origin"]
            if origin.get("system") == SYSTEM and (origin["resourceId"] not in latest or m["fetchedAt"] >= latest[origin["resourceId"]][0]):
                latest[origin["resourceId"]] = (m["fetchedAt"], origin)
        except (OSError, ValueError, KeyError, TypeError, AttributeError):
            continue
    return {rid: origin for rid, (_, origin) in latest.items()}


def fetch_amepip(archive: Archive, *, now: datetime | None = None, timeout: float = 120, http=requests.get) -> AmepipFetchSummary:
    """Find the newest list, fetch it unless it is archived with the same marker. `http` is `requests.get` (tests pass a stub)."""
    from .read import AmepipError, read_list  # lazy: the reader needs openpyxl only when a file is validated

    now = now or datetime.now(timezone.utc)
    summary = AmepipFetchSummary()
    for stale in archive.root.glob(".amepip-download-*") if archive.root.is_dir() else []:
        stale.unlink(missing_ok=True)  # a killed run's scratch file
    try:
        response = http(CKAN, timeout=timeout, headers={"User-Agent": USER_AGENT})
        response.raise_for_status()
        body = response.json()
        if not body.get("success"):
            raise ValueError("CKAN answered success=false")
        datasets = [d for d in body["result"]["results"] if isinstance(d, dict)]
    except Exception as e:  # noqa: BLE001
        summary.failed.append(f"dataset search failed: {e}")
        log.warning("failed      amepip: %s", summary.failed[-1])
        return summary
    found: list[tuple[date, str, dict, dict]] = []
    for d in datasets:
        if "INDICATORI" not in fold(d.get("title") or ""):
            continue
        for r in d.get("resources") or []:
            if not (isinstance(r, dict) and isinstance(r.get("id"), str) and r["id"]):
                continue
            ext = posixpath.splitext(unquote(urlparse(r.get("url") or "").path))[1].lower()
            when = published_on(r)
            label = f"{(r.get('name') or '').strip()!r} ({r.get('url')})"
            if ext not in EXTENSIONS or not r.get("url"):
                continue  # a documentation file or a link: not a candidate
            if when is None:
                summary.unclassified.append(f"{label}: no readable publication date")
                log.warning("unclassified %s", summary.unclassified[-1])
                continue
            found.append((when, str(r.get("last_modified") or ""), d, r))
    if not found:
        summary.failed.append("no .xlsx, .xls or .csv resource in an AMEPIP indicators dataset")
        log.warning("failed      amepip: %s", summary.failed[-1])
        return summary
    found.sort(key=lambda x: (x[0], x[1]))
    for when, _, _, r in found[:-1]:
        summary.superseded += 1
        log.info("superseded  %s %r: a newer list exists", when, (r.get("name") or "").strip())
    when, _, dataset, resource = found[-1]
    origin = _origin(dataset, resource)
    known = _archived_origins(archive).get(resource["id"])
    if known and all(known.get(k) == origin[k] for k in MARKER):
        summary.unchanged.append(when.isoformat())
        log.info("unchanged   snapshot %s: already archived, same marker", when)
        return summary
    name = posixpath.basename(unquote(urlparse(resource["url"]).path)) or "amepip-list"
    archive.root.mkdir(parents=True, exist_ok=True)
    tmp_path: Path | None = None
    try:
        got = http(resource["url"], stream=True, timeout=timeout, headers={"User-Agent": USER_AGENT})
        got.raise_for_status()
        with tempfile.NamedTemporaryFile(dir=archive.root, prefix=".amepip-download-", delete=False, suffix=posixpath.splitext(name)[1]) as tmp:
            tmp_path = Path(tmp.name)
            for chunk in got.iter_content(chunk_size=1 << 20):
                tmp.write(chunk)
        try:
            if not read_list(tmp_path):
                raise AmepipError("no company rows")
        except AmepipError as e:
            raise ValueError(f"the download is not a list of public enterprises: {e}") from e
        where = archive.write_unit(source=SOURCE, stream=STREAM, kind=KIND, unit=when.isoformat(), fetched_at=now, files={name: tmp_path},
                                   url=resource["url"], via=origin["resourceName"], origin=origin, same_day=True)
    except Exception as e:  # noqa: BLE001 - nothing half-written is left in the archive
        summary.failed.append(f"snapshot {when}: {str(e) or type(e).__name__}")
        log.warning("failed      snapshot %s: %s", when, summary.failed[-1])
        return summary
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)
    summary.archived.append(when.isoformat())
    log.info("archived    snapshot %s: %s bytes -> %s", when, (where / name).stat().st_size, where)
    return summary
