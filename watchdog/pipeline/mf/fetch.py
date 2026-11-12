"""`pipeline fetch-mf`: the MF "Lista entitatilor publice" from data.gov.ro into the raw archive (ADR 0004), unchanged and dated.

Discovery: one CKAN `package_show` of the dataset `listaentitatipublice`. Its resources are the monthly files (`.xls`, ~4 MB, about 13,500
rows), the oldest from 2017. The snapshot date ("updated as of") is read from the resource name (`... actualizata la data de 01.11.2026`)
or, failing that, from the file name (`lista_ep_portal_01112026.xls`, DDMMYYYY); a resource with no readable date is reported and never
archived. Only the NEWEST snapshot is fetched; older ones are logged `superseded` (the list is a snapshot, not a history).

Layout: `<archive>/mf/list/entities/<snapshot date>/<fetched on>/<file as fetched>` + manifest (resource id, URL, last_modified, size, hash).
Change detection and resume are the datagov connector's: a resource id with the same marker is `unchanged` (no download); a changed
marker (a re-upload) is archived as a new dated unit beside the old one; a failed run leaves nothing but a `.mf-download-*` scratch file
(removed at the next start) and is retried by running the same command again. A downloaded file that is not a spreadsheet (an HTML error
page) is a failure, not an archive entry.
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

CKAN = "https://data.gov.ro/api/3/action/package_show?id="
DATASET = "listaentitatipublice"
SOURCE, STREAM, KIND = "mf", "list", "entities"
SYSTEM = "data.gov.ro"
MARKER = ("url", "lastModified", "size", "hash")
SPREADSHEET_MAGIC = (b"\xd0\xcf\x11\xe0", b"PK\x03\x04")  # BIFF (.xls, an OLE container) and OOXML (.xlsx, a zip)
log = logging.getLogger("pipeline.mf")


@dataclass
class MfFetchSummary:
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


def snapshot_date(resource: dict) -> date | None:
    """The date the list is as of: `dd.mm.yyyy` in the name, else DDMMYYYY in the name, else DDMMYYYY in the URL's file name."""
    name = resource.get("name") or ""
    filename = posixpath.splitext(posixpath.basename(unquote(urlparse(resource.get("url") or "").path)))[0]
    for text, pattern in ((name, r"(?<!\d)(\d{2})\.(\d{2})\.(\d{4})(?!\d)"), (name, r"(?<!\d)(\d{2})(\d{2})(20\d{2})(?!\d)"),
                          (filename, r"(?<!\d)(\d{2})(\d{2})(20\d{2})(?!\d)")):
        if m := re.search(pattern, text):
            try:
                return date(int(m[3]), int(m[2]), int(m[1]))
            except ValueError:
                continue
    return None


def _origin(dataset: dict, resource: dict) -> dict:
    return {"system": SYSTEM, "dataset": dataset.get("name"), "datasetId": dataset.get("id"), "resourceId": resource["id"],
            "resourceName": (resource.get("name") or "").strip(), "url": resource.get("url"), "lastModified": resource.get("last_modified"),
            "size": resource.get("size"), "hash": resource.get("hash") or "", "format": resource.get("format")}


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


def fetch_mf(archive: Archive, *, now: datetime | None = None, timeout: float = 120, http=requests.get) -> MfFetchSummary:
    """Find the newest snapshot, fetch it unless it is archived with the same marker. `http` is `requests.get` (tests pass a stub)."""
    now = now or datetime.now(timezone.utc)
    summary = MfFetchSummary()
    for stale in archive.root.glob(".mf-download-*") if archive.root.is_dir() else []:
        stale.unlink(missing_ok=True)  # a killed run's scratch file
    try:
        response = http(CKAN + DATASET, timeout=timeout, headers={"User-Agent": USER_AGENT})
        response.raise_for_status()
        body = response.json()
        if not body.get("success"):
            raise ValueError("CKAN answered success=false")
        dataset = body["result"]
        resources = [r for r in dataset["resources"] if isinstance(r, dict) and isinstance(r.get("id"), str) and r["id"]]
    except Exception as e:  # noqa: BLE001
        summary.failed.append(f"dataset request failed: {e}")
        log.warning("failed      %s: %s", DATASET, summary.failed[-1])
        return summary
    dated: list[tuple[date, str, dict]] = []
    for r in resources:
        d = snapshot_date(r)
        label = f"{(r.get('name') or '').strip()!r} ({r.get('url')})"
        if d is None or not r.get("url"):
            summary.unclassified.append(f"{label}: no readable snapshot date or no URL")
            log.warning("unclassified %s", summary.unclassified[-1])
        else:
            dated.append((d, str(r.get("last_modified") or ""), r))
    if not dated:
        summary.failed.append("no resource with a readable snapshot date")
        log.warning("failed      %s: %s", DATASET, summary.failed[-1])
        return summary
    dated.sort(key=lambda x: (x[0], x[1]))
    for d, _, r in dated[:-1]:
        summary.superseded += 1
        log.info("superseded  %s %r: a newer snapshot exists", d, (r.get("name") or "").strip())
    when, _, resource = dated[-1]
    origin = _origin(dataset, resource)
    known = _archived_origins(archive).get(resource["id"])
    if known and all(known.get(k) == origin[k] for k in MARKER):
        summary.unchanged.append(when.isoformat())
        log.info("unchanged   snapshot %s: already archived, same marker", when)
        return summary
    name = posixpath.basename(unquote(urlparse(resource["url"]).path)) or "lista-entitatilor-publice.xls"
    archive.root.mkdir(parents=True, exist_ok=True)
    tmp_path: Path | None = None
    try:
        got = http(resource["url"], stream=True, timeout=timeout, headers={"User-Agent": USER_AGENT})
        got.raise_for_status()
        with tempfile.NamedTemporaryFile(dir=archive.root, prefix=".mf-download-", delete=False) as tmp:
            tmp_path = Path(tmp.name)
            for chunk in got.iter_content(chunk_size=1 << 20):
                tmp.write(chunk)
        with tmp_path.open("rb") as f:
            if not f.read(4).startswith(SPREADSHEET_MAGIC):
                raise ValueError("the download is not a spreadsheet (.xls or .xlsx)")
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
