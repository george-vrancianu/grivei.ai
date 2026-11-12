"""The bulk Connector's fetch half: ADR's quarterly SEAP exports on data.gov.ro into the raw archive (ADR 0004).

Discovery: one CKAN `package_show` per year, `achizitii-publice-<year>` from `since_year` to the current year. The dataset
names are stable and known (research: `achizitii-publice-2021` ... `-2026`), so there is no search to get wrong; a year
without a dataset yet (the current one early in the year) is reported, not an error.

Each resource is classified from its name (fallback and cross-check: the file name in its URL) into a record kind and a
quarter unit; see `classify`. What cannot be classified, or whose name and URL disagree (the research found a DAN resource
that points at the "fără anunț" file), is skipped and reported so a new naming quirk is visible.

Change detection: the manifest's `origin` records the resource id, URL, `last_modified`, `size` and `hash` the API gave.
A resource whose latest archived unit has the same id and the same marker is unchanged (skipped, no download). Anything
else (a changed marker, or a new resource id for a quarter already archived) is archived as a NEW dated unit beside the
old ones, which are never touched; a re-upload on the same UTC day goes to `<day>.2`. If a quarter has several resources of
one kind (CSV and XLS both, before mid-2024) only the preferred format is fetched, CSV first.

This module only fetches. It never loads: `rebuild` is a separate step, so files are in the archive before any load.
"""
from __future__ import annotations

import json
import logging
import posixpath
import re
import time
import unicodedata
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

import requests

from .archive import MANIFEST, QUARANTINE_DIR, Archive
from .fetch import USER_AGENT, fetch_bulk_file

CKAN = "https://data.gov.ro/api/3/action/package_show?id="
DATASET = "achizitii-publice-{year}"
SYSTEM = "data.gov.ro"
FORMAT_PREFERENCE = ("csv", "xlsx", "xls")  # anything else after these
log = logging.getLogger("pipeline.datagov")
MARKER = ("url", "lastModified", "size", "hash")


@dataclass(frozen=True)
class Item:
    """One resource's outcome. Fields not known for an outcome stay None."""

    dataset: str
    resource_id: str | None = None
    name: str | None = None
    kind: str | None = None
    unit: str | None = None
    reason: str | None = None
    path: Path | None = None


@dataclass
class FetchSummary:
    archived: list[Item] = field(default_factory=list)
    unchanged: list[Item] = field(default_factory=list)
    ignored: list[Item] = field(default_factory=list)  # known kinds we do not fetch (initiere, modificare, SAD, other format)
    unclassified: list[Item] = field(default_factory=list)
    failed: list[Item] = field(default_factory=list)
    missing_datasets: list[str] = field(default_factory=list)

    @property
    def touched(self) -> list[Path]:
        """The archive directories written by this run (what a refresh step reports)."""
        return [i.path for i in self.archived if i.path]

    def counts(self) -> dict[str, int]:
        return {k: len(getattr(self, k)) for k in ("archived", "unchanged", "ignored", "unclassified", "failed")}

    def lines(self) -> list[str]:
        out = [f"{k}: {n}" for k, n in self.counts().items()]
        out += [f"  archived: {i.kind} {i.unit}: {i.path}" for i in self.archived]
        for title, items in (("unclassified", self.unclassified), ("failed", self.failed)):
            out += [f"  {title}: {i.dataset} / {i.name!r} ({i.kind or '?'} {i.unit or '?'}): {i.reason}" for i in items]
        for name in self.missing_datasets:
            out.append(f"  no dataset yet: {name}")
        return out


# ---- classification -----------------------------------------------------------------------------------------

def _plain(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text.lower()).split())


def _kind(text: str) -> tuple[str | None, str | None]:
    """(wanted kind, ignored label) for a resource name or file name. Order matters: DAN and 'fără anunț' both contain
    words of other kinds."""
    t = _plain(text)
    if "notificar" in t or re.search(r"\bdan\b", t):
        return "dan", None
    if "fara anunt" in t:
        return "fara-anunt", None
    if "modificare" in t:
        return None, "contract modifications"
    if "initiere" in t:
        return None, "initiation notices"
    if re.search(r"\binvitat\w* sad\b|\bsad\b", t):
        return None, "DPS invitations"
    if re.search(r"achizitii? directe?|achizitie directa|cumpar\w* direct", t):
        return "da", None
    if re.search(r"\bcontracte\b", t):
        return "contracte", None
    return None, None


def _quarter(text: str) -> tuple[int | None, int | None]:
    t = _plain(text)
    q = re.search(r"\b[tq]([1-4])\b|\btrimestrul? ([1-4])\b", t)
    y = re.search(r"\b(20[0-3]\d)\b", t)
    return (int(next(g for g in q.groups() if g)) if q else None, int(y.group(1)) if y else None)


def classify(resource: dict, dataset_year: int) -> tuple[tuple[str, str] | None, str]:
    """`((kind, unit), "")` for a wanted file, else `(None, reason)`. A reason starting with 'ignored:' is a known,
    unwanted kind; any other reason is a resource we could not place (reported as unclassified)."""
    name = resource.get("name") or ""
    filename = posixpath.basename(unquote(urlparse(resource.get("url") or "").path))
    kinds = [_kind(x) for x in (name, filename)]
    wanted = {k[0] for k in kinds if k[0]}
    if len(wanted) > 1:
        return None, f"name and URL disagree on the kind ({sorted(wanted)})"
    ignored = [k[1] for k in kinds if k[1]]
    if not wanted:
        return None, f"ignored: {ignored[0]}" if ignored else "unrecognised resource name"
    if ignored:  # e.g. name says DA, file says modification
        return None, f"name and URL disagree on the kind ({sorted(wanted)} vs {ignored[0]})"
    quarters = [_quarter(x) for x in (name, filename)]
    qs = {q for q, _ in quarters if q}
    if len(qs) != 1:
        return None, "no quarter in the name" if not qs else f"name and URL disagree on the quarter ({sorted(qs)})"
    years = {y for _, y in quarters if y} or {dataset_year}
    if years != {dataset_year}:
        return None, f"year {sorted(years)} does not match the dataset year {dataset_year}"
    return (wanted.pop(), f"{dataset_year}Q{qs.pop()}"), ""


# ---- the archive's view of what was fetched -----------------------------------------------------------------

def _latest_markers(archive: Archive) -> dict[str, dict]:
    """resource id -> origin of its latest fetch (by fetch time, then `.N`). Reads manifests only. Quarantined units count:
    a file that failed validation is still what the Source gave, so it is not downloaded again until the Source changes."""
    latest: dict[str, tuple[tuple[str, int], dict]] = {}
    paths = sorted((archive.root / "seap" / "bulk").glob(f"*/*/*/{MANIFEST}"))
    paths += sorted((archive.root / QUARANTINE_DIR / "seap" / "bulk").glob(f"*/*/*/{MANIFEST}"))
    for path in paths:
        try:
            m = json.loads(path.read_text(encoding="utf-8"))
            origin = m["origin"]
            if origin.get("system") != SYSTEM:
                continue
            stamp = (m["fetchedAt"], int(path.parent.name.rpartition(".")[2]) if path.parent.name.count(".") else 1)
            rid = origin["resourceId"]
            if rid not in latest or stamp >= latest[rid][0]:
                latest[rid] = (stamp, origin)
        except (OSError, ValueError, KeyError, TypeError, AttributeError):
            continue
    return {rid: origin for rid, (_, origin) in latest.items()}


def _origin(dataset: dict, resource: dict) -> dict:
    return {
        "system": SYSTEM,
        "dataset": dataset.get("name"),
        "datasetId": dataset.get("id"),
        "resourceId": resource["id"],
        "resourceName": (resource.get("name") or "").strip(),
        "url": resource.get("url"),
        "lastModified": resource.get("last_modified"),
        "size": resource.get("size"),
        "hash": resource.get("hash") or "",
        "format": resource.get("format"),
    }


def _format_rank(resource: dict) -> int:
    fmt = (resource.get("format") or "").lower().lstrip(".")
    return FORMAT_PREFERENCE.index(fmt) if fmt in FORMAT_PREFERENCE else len(FORMAT_PREFERENCE)


def _say(status: str, item: Item, detail: str = "") -> None:
    """One log line per resource: `<status> <kind> <unit> <dataset> <resource name>: <detail>`."""
    level = logging.WARNING if status in ("failed", "unclassified") else logging.INFO
    log.log(level, "%-11s %s %s [%s] %r%s", status, item.kind or "?", item.unit or "?", item.dataset, item.name,
            f": {detail}" if detail else "")


def _remove_stale_downloads(archive: Archive) -> None:
    """A killed run can leave `.download-*` scratch files beside the archive; they are never complete files."""
    for stale in archive.root.glob(".download-*") if archive.root.is_dir() else []:
        stale.unlink(missing_ok=True)


# ---- the run ------------------------------------------------------------------------------------------------

def fetch_datagov(
    archive: Archive,
    *,
    since_year: int = 2021,
    now: datetime | None = None,
    delay: float = 1.0,
    timeout: float = 120,
) -> FetchSummary:
    """Discover, classify and fetch; return what happened. One failure never stops the rest."""
    now = now or datetime.now(timezone.utc)
    summary = FetchSummary()
    _remove_stale_downloads(archive)
    markers = _latest_markers(archive)
    first_request = True

    def pause():
        nonlocal first_request
        if not first_request and delay:
            time.sleep(delay)
        first_request = False

    for year in range(since_year, now.astimezone(timezone.utc).year + 1):
        name = DATASET.format(year=year)
        pause()
        try:
            response = requests.get(CKAN + name, timeout=timeout, headers={"User-Agent": USER_AGENT})
            if response.status_code == 404:
                summary.missing_datasets.append(name)
                log.info("no dataset yet: %s", name)
                continue
            response.raise_for_status()
            body = response.json()
            if not body.get("success"):
                raise ValueError("CKAN answered success=false")
            dataset = body["result"]
            resources = dataset["resources"]
        except Exception as error:  # noqa: BLE001 - report and carry on with the other years
            summary.failed.append(Item(dataset=name, reason=f"dataset request failed: {error}"))
            _say("failed", summary.failed[-1], summary.failed[-1].reason)
            continue

        chosen: dict[tuple[str, str], list[dict]] = {}
        for resource in resources:
            if not isinstance(resource, dict) or not isinstance(resource.get("id"), str) or not resource["id"]:
                summary.unclassified.append(Item(
                    dataset=name, name=str(resource.get("name") or "").strip() if isinstance(resource, dict) else None,
                    reason="resource has no id" if isinstance(resource, dict) else "entry is not a resource",
                ))
                _say("unclassified", summary.unclassified[-1], summary.unclassified[-1].reason)
                continue
            try:
                what, why = classify(resource, year)
            except Exception as error:  # noqa: BLE001
                what, why = None, f"unreadable resource: {error}"
            item = Item(dataset=name, resource_id=resource.get("id"), name=(resource.get("name") or "").strip())
            if what is None:
                bucket = summary.ignored if why.startswith("ignored:") else summary.unclassified
                bucket.append(replace(item, reason=why.removeprefix("ignored: ")))
                if bucket is summary.unclassified:
                    _say("unclassified", bucket[-1], why)
            elif not resource.get("url"):
                summary.unclassified.append(replace(item, kind=what[0], unit=what[1], reason="resource has no URL"))
                _say("unclassified", summary.unclassified[-1], "resource has no URL")
            else:
                chosen.setdefault(what, []).append(resource)

        for (kind, unit), candidates in sorted(chosen.items()):
            candidates.sort(key=lambda r: str(r.get("last_modified") or ""), reverse=True)  # newest first ...
            candidates.sort(key=_format_rank)  # ... then preferred format first (stable)
            for other in candidates[1:]:
                same = _format_rank(other) == _format_rank(candidates[0])
                summary.ignored.append(Item(
                    dataset=name, resource_id=other["id"], name=(other.get("name") or "").strip(), kind=kind, unit=unit,
                    reason="an older resource of the same file is skipped" if same
                    else f"another format of the same file is fetched ({candidates[0].get('format')})",
                ))
            resource = candidates[0]
            origin = _origin(dataset, resource)
            item = Item(dataset=name, resource_id=resource["id"], name=origin["resourceName"], kind=kind, unit=unit)
            known = markers.get(resource["id"])
            if known and all(known.get(k) == origin[k] for k in MARKER):
                summary.unchanged.append(item)
                _say("unchanged", item, "already archived, same marker")
                continue
            pause()
            try:
                where = fetch_bulk_file(
                    archive, url=resource["url"], kind=kind, unit=unit, via=origin["resourceName"], now=now,
                    timeout=timeout, origin=origin, same_day=True,
                )
            except Exception as error:  # noqa: BLE001 - fetch_bulk_file leaves no unit behind on failure
                summary.failed.append(replace(item, reason=str(error) or type(error).__name__))
                _say("failed", summary.failed[-1], summary.failed[-1].reason)
                continue
            summary.archived.append(replace(item, path=where))
            size = sum(f.stat().st_size for f in where.iterdir() if f.name != MANIFEST)
            _say("archived", item, f"{size} bytes -> {where}")
    return summary
