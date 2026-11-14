"""`pipeline fetch-financials`: the Ministry of Finance's yearly bulk files of annual financial statements from data.gov.ro into the raw archive (ADR 0004), unchanged and dated.

The source (checked on data.gov.ro). MF (organisation `mfp`, licence CC-BY-4.0) publishes one dataset per fiscal year, titled "Situatii financiare
<year>", holding one text file per kind of reporter. Three kinds share one 20-indicator layout and are the companies' statements:

    WEB_BL_BS_SL_AN<year>.txt   companies filing long or short balance sheets and annual reports   (bl-bs-sl, ~9 MB)
    WEB_UU_AN<year>.txt         companies filing the abbreviated format, the many small ones          (uu, ~80 MB)
    WEB_IR_AN<year>.txt         companies reporting under IFRS                                        (ir, a few KB)

The other files of a dataset (banks, insurers, funds, NGOs, brokers ...) have other columns and are not read. Each year's files appear in June of the
following year; MF then RE-PUBLISHES the previous year's files a year later with corrections (`actualizat`): for FY2023 inside the same dataset as
a resource named "... - actualizat", for FY2024 as a separate dataset "Situatii financiare 2024 actualizat iunie 2026". Both are fetched; the graph
stores which release each figure comes from. Only fiscal years from 2021 are fetched (`FIRST_YEAR`). The 2021 dataset also carries files of older years
(2012-2020): skipped by that rule.

Layout: `<archive>/financials/statements/<kind>/<year>-<first|revised>/<fetched on>/<file as fetched>` + manifest (resource id, URL, last_modified, size,
hash, licence). A resource already archived with the same marker (URL, last_modified, size, hash) is `unchanged` (not downloaded); a changed one is archived
as a new dated unit. A download whose header is not the statements layout is `invalid` (a deterministic failure: retrying fetches the same file); a network
or portal error is `failed` (transient). Nothing half-written is left in the archive.
"""
from __future__ import annotations

import json
import logging
import posixpath
import re
import tempfile
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

import requests

from ..archive import MANIFEST, Archive
from ..fetch import USER_AGENT
from ..placement.matching import fold

ORGANISATION = "mfp"
CKAN = "https://data.gov.ro/api/3/action/package_search?rows=100&fq=organization:" + ORGANISATION + "&q=situatii+financiare"
DATASET_PAGE = "https://data.gov.ro/dataset/"
SOURCE, STREAM = "financials", "statements"
SYSTEM = "data.gov.ro"
FIRST_YEAR = 2021  # the first fiscal year held (spec #173); the 2021 dataset also carries older years' files, which are skipped
MARKER = ("url", "lastModified", "size", "hash")
# the resource's name, upper-cased with every run of other characters as one space: kind and fiscal year
_NAME = re.compile(r"^WEB (BL BS SL AN|UU AN|IR AN|IR) ?(\d{4})(?!\d)")
_TITLE = re.compile(r"^SITUATI\w* FINANCIARE")
KINDS = {"BL BS SL AN": "bl-bs-sl", "UU AN": "uu", "IR AN": "ir", "IR": "ir"}
KIND_ORDER = ("bl-bs-sl", "ir", "uu")  # when one CUI is in two kinds of file of the same year and release, the earlier kind wins
log = logging.getLogger("pipeline.financials")


@dataclass
class FinancialsFetchSummary:
    archived: list[str] = field(default_factory=list)  # "<kind> <year> <release>"
    unchanged: list[str] = field(default_factory=list)
    superseded: int = 0
    unclassified: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)  # transient: the portal or the network
    invalid: list[str] = field(default_factory=list)  # deterministic: the download is not a statements file

    def lines(self) -> list[str]:
        out = [f"archived: {len(self.archived)}", f"unchanged: {len(self.unchanged)}", f"superseded: {self.superseded}",
               f"unclassified: {len(self.unclassified)}", f"failed: {len(self.failed)}", f"invalid: {len(self.invalid)}"]
        out += [f"  archived: {a}" for a in self.archived] + [f"  unclassified: {t}" for t in self.unclassified]
        out += [f"  failed: {t}" for t in self.failed] + [f"  invalid: {t}" for t in self.invalid]
        return out


def classify(dataset: dict, resource: dict) -> tuple[str, int, str] | None:
    """(kind, fiscal year, release) of a statements resource, or None for any other file (a column list, a bank's file, an older year)."""
    name = re.sub(r"[^A-Z0-9]+", " ", str(resource.get("name") or "").upper()).strip()
    m = _NAME.match(name)
    path = unquote(urlparse(resource.get("url") or "").path).lower()
    if not m or not path.endswith(".txt") or int(m[2]) < FIRST_YEAR:
        return None
    revised = "ACTUALIZAT" in name or "ACTUALIZAT" in re.sub(r"[^A-Z0-9]+", " ", fold(dataset.get("title") or "")) or "ACTUALIZAT" in str(dataset.get("name") or "").upper()
    return KINDS[m[1]], int(m[2]), "revised" if revised else "first"


def published_on(resource: dict) -> date | None:
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
    """resource id -> origin of its latest archived fetch (manifests only: nothing is hashed)."""
    latest: dict[str, tuple[str, dict]] = {}
    for path in sorted((archive.root / SOURCE / STREAM).glob(f"*/*/*/{MANIFEST}")):
        try:
            m = json.loads(path.read_text(encoding="utf-8"))
            origin = m["origin"]
            if origin.get("system") == SYSTEM and (origin["resourceId"] not in latest or m["fetchedAt"] >= latest[origin["resourceId"]][0]):
                latest[origin["resourceId"]] = (m["fetchedAt"], origin)
        except (OSError, ValueError, KeyError, TypeError, AttributeError):
            continue
    return {rid: origin for rid, (_, origin) in latest.items()}


def _search(http, timeout: float) -> list[dict]:
    datasets: list[dict] = []
    start = 0
    while True:
        response = http(f"{CKAN}&start={start}", timeout=timeout, headers={"User-Agent": USER_AGENT})
        response.raise_for_status()
        body = response.json()
        if not body.get("success"):
            raise ValueError("CKAN answered success=false")
        page = [d for d in body["result"]["results"] if isinstance(d, dict)]
        datasets += page
        start += len(page)
        if not page or start >= int(body["result"].get("count") or 0):
            return datasets


def fetch_financials(archive: Archive, *, now: datetime | None = None, timeout: float = 300, http=requests.get) -> FinancialsFetchSummary:
    """Find MF's statements files from FY2021, fetch those not archived with the same marker. `http` is `requests.get` (tests pass a stub)."""
    now = now or datetime.now(timezone.utc)
    summary = FinancialsFetchSummary()
    for stale in archive.root.glob(".financials-download-*") if archive.root.is_dir() else []:
        stale.unlink(missing_ok=True)  # a killed run's scratch file
    try:
        datasets = _search(http, timeout)
    except Exception as e:  # noqa: BLE001
        summary.failed.append(f"dataset search failed: {e}")
        log.warning("failed      financials: %s", summary.failed[-1])
        return summary
    # (kind, year, release) -> candidates, newest publication first: a re-published file replaces its first fetch only as a NEW unit, never in place
    found: dict[tuple[str, int, str], list[tuple[date, str, dict, dict]]] = {}
    for d in datasets:
        if not _TITLE.match(fold(d.get("title") or "")):  # "Situații financiare 2023", "Situațiile financiare 2024", "... actualizat"
            continue
        for r in d.get("resources") or []:
            if not (isinstance(r, dict) and isinstance(r.get("id"), str) and r["id"] and r.get("url")):
                continue
            key = classify(d, r)
            if key is None:
                continue
            when = published_on(r)
            if when is None:
                summary.unclassified.append(f"{(r.get('name') or '').strip()!r} ({r.get('url')}): no readable publication date")
                log.warning("unclassified %s", summary.unclassified[-1])
                continue
            found.setdefault(key, []).append((when, str(r.get("last_modified") or ""), d, r))
    if not found:
        summary.failed.append("no statements file (WEB_BL_BS_SL_AN / WEB_UU_AN / WEB_IR_AN) from 2021 in MF's datasets")
        log.warning("failed      financials: %s", summary.failed[-1])
        return summary
    known = _archived_origins(archive)
    for (kind, year, release), candidates in sorted(found.items(), key=lambda kv: (kv[0][1], kv[0][2], kv[0][0])):
        candidates.sort(key=lambda c: (c[0], c[1]), reverse=True)
        summary.superseded += len(candidates) - 1
        when, _, dataset, resource = candidates[0]
        label = f"{kind} {year} {release}"
        origin = _origin(dataset, resource)
        prior = known.get(resource["id"])
        if prior and all(prior.get(k) == origin[k] for k in MARKER):
            summary.unchanged.append(label)
            log.info("unchanged   %s: already archived, same marker", label)
            continue
        _archive_one(archive, summary, label, kind, f"{year}-{release}", dataset, resource, origin, now=now, timeout=timeout, http=http)
    return summary


def _archive_one(archive: Archive, summary: FinancialsFetchSummary, label: str, kind: str, unit: str, dataset: dict, resource: dict, origin: dict, *,
                 now: datetime, timeout: float, http) -> None:
    from .read import FinancialsError, check_file

    name = posixpath.basename(unquote(urlparse(resource["url"]).path)) or "financials.txt"
    archive.root.mkdir(parents=True, exist_ok=True)
    tmp_path: Path | None = None
    try:
        got = http(resource["url"], stream=True, timeout=timeout, headers={"User-Agent": USER_AGENT})
        got.raise_for_status()
        with tempfile.NamedTemporaryFile(dir=archive.root, prefix=".financials-download-", delete=False, suffix=".txt") as tmp:
            tmp_path = Path(tmp.name)
            for chunk in got.iter_content(chunk_size=1 << 20):
                tmp.write(chunk)
        try:
            check_file(tmp_path)
        except FinancialsError as e:
            summary.invalid.append(f"{label} ({resource['url']}): {e}")
            log.warning("invalid     %s", summary.invalid[-1])
            return
        where = archive.write_unit(source=SOURCE, stream=STREAM, kind=kind, unit=unit, fetched_at=now, files={name: tmp_path},
                                   url=resource["url"], via=origin["resourceName"], origin=origin, same_day=True)
    except Exception as e:  # noqa: BLE001 - nothing half-written is left in the archive
        summary.failed.append(f"{label}: {str(e) or type(e).__name__}")
        log.warning("failed      %s", summary.failed[-1])
        return
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)
    summary.archived.append(label)
    log.info("archived    %s: %s bytes -> %s", label, (where / name).stat().st_size, where)
