"""`pipeline fetch-banipartide`: Expert Forum's BaniPartide table of firm donors into the raw archive (ADR 0004), as a one-off archived load (ticket #182).

The source (checked live). banipartide.ro is Expert Forum's platform on party financing; its data is published as a Datasette at db.banipartide.ro (one
SQLite database, `banipartide`, licence CC Attribution 4.0 per its metadata). Each table has a CSV export. The firm donors and lenders are the table
`Donatori persoane juridice` (about 3,600 rows, 2006-2024, under 0.5 MB). Individual donors are another table (`Donatori persoane fizice`), which is NEVER
fetched: the Connector asks for the firm table only (ADR 0009). BaniPartide carries no per-row report reference; its methodology page says the data comes
from Monitorul Oficial and AEP's pages (annual donor publications), which is the underlying source the pages cite.

Loading is one-off: `fetch_banipartide` archives the table once and does nothing while a copy is held (`again=True`, `fetch-banipartide --again`, archives a
new dated copy; the rebuild reads the newest). The refresh step only CHECKS: `check_banipartide` compares the upstream database hash (Datasette's `hash`, also the
`.db` ETag) with the held copy's and reports a newer file; it never downloads.

Raw archive. The table export is archived as fetched EXCEPT the column `Reprezentant societate` (the company representative's name: a personal field, declared
here and stripped at fetch, ADR 0004's amendment). The manifest's `origin` records the stripped column and the SHA-256 and size of the export as the portal
sent it, so the copy is traceable to the upstream bytes. Rows that are not firms (a truncated CNP as a number, `n/a`, an empty id) stay in the archived file as
published and are dropped when it is read (`read.py`).

Layout: `<archive>/banipartide/donors/firms/<db hash prefix>/<fetched on>/donatori_persoane_juridice.csv` + manifest. A download that is not the firm table is
`invalid` (deterministic); a network or portal error is `failed` (transient). Nothing half-written is left in the archive.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from urllib.parse import quote

import requests

from ..archive import MANIFEST, Archive
from ..fetch import USER_AGENT
from .read import BaniPartideError, check_header

SITE = "https://www.banipartide.ro"
DB = "https://db.banipartide.ro"
DATABASE = "banipartide"
TABLE = "Donatori persoane juridice"
PERSONAL_FIELDS = ("Reprezentant societate",)  # stripped at fetch
SOURCE, STREAM, KIND = "banipartide", "donors", "firms"
FILE_NAME = "donatori_persoane_juridice.csv"
SYSTEM = "db.banipartide.ro"
METHODOLOGY_URL = SITE + "/metodologie.html"
UNDERLYING = ("Party annual donor publications in Monitorul Oficial and on AEP's pages, as BaniPartide's methodology states; "
              "BaniPartide's table carries no report reference per row")
log = logging.getLogger("pipeline.banipartide")


@dataclass
class BaniPartideFetchSummary:
    archived: list[str] = field(default_factory=list)  # the unit's name
    held: bool = False  # a copy was already held and `again` was not asked for: nothing was fetched
    failed: list[str] = field(default_factory=list)  # transient: the portal or the network
    invalid: list[str] = field(default_factory=list)  # deterministic: the download is not the firm table

    def lines(self) -> list[str]:
        out = [f"archived: {len(self.archived)}", f"held already (one-off load, nothing fetched): {'yes' if self.held else 'no'}", f"failed: {len(self.failed)}", f"invalid: {len(self.invalid)}"]
        return out + [f"  archived: {a}" for a in self.archived] + [f"  failed: {t}" for t in self.failed] + [f"  invalid: {t}" for t in self.invalid]


@dataclass(frozen=True)
class CheckResult:
    state: str  # "nothing held" | "current" | "newer" | "failed"
    upstream_hash: str | None = None
    held_hash: str | None = None
    detail: str = ""


def table_url() -> str:
    return f"{DB}/{DATABASE}/{quote(TABLE)}.csv?_size=max&_stream=on"


def held_manifests(archive: Archive) -> list[dict]:
    """Manifests of the held copies, oldest first (manifests only: nothing is hashed)."""
    out = []
    for path in sorted((archive.root / SOURCE / STREAM / KIND).glob(f"*/*/{MANIFEST}")):
        try:
            m = json.loads(path.read_text(encoding="utf-8"))
            if m["origin"]["system"] == SYSTEM and all((path.parent / f["name"]).is_file() for f in m["files"]):
                out.append(m)
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return sorted(out, key=lambda m: m["fetchedAt"])


def upstream_state(http, timeout: float) -> tuple[str, dict]:
    """(database hash, metadata) from the Datasette: `/.json` lists the database with its content hash, `/-/metadata.json` its source and licence."""
    root = http(f"{DB}/.json", timeout=timeout, headers={"User-Agent": USER_AGENT})
    root.raise_for_status()
    db_hash = root.json()[DATABASE]["hash"]
    meta = http(f"{DB}/-/metadata.json", timeout=timeout, headers={"User-Agent": USER_AGENT})
    meta.raise_for_status()
    return str(db_hash), meta.json()


def check_banipartide(archive: Archive, *, timeout: float = 60, http=requests.get) -> CheckResult:
    """Whether the upstream database is newer than the held copy. Reads two small JSON documents and downloads nothing."""
    held = held_manifests(archive)
    if not held:
        return CheckResult("nothing held", detail="no BaniPartide copy is held: run `pipeline fetch-banipartide`")
    held_hash = held[-1]["origin"].get("databaseHash")
    try:
        db_hash, _ = upstream_state(http, timeout)
    except Exception as e:  # noqa: BLE001
        return CheckResult("failed", held_hash=held_hash, detail=f"BaniPartide check failed: {str(e) or type(e).__name__}")
    if db_hash == held_hash:
        return CheckResult("current", db_hash, held_hash, "the held copy is the upstream database's current one")
    return CheckResult("newer", db_hash, held_hash, f"BaniPartide published a newer database (hash {db_hash[:12]}, held {str(held_hash)[:12]}): review it and run `pipeline fetch-banipartide --again`")


def strip_personal(raw: bytes) -> tuple[bytes, int]:
    """The export without the declared personal columns, and its row count. Raises BaniPartideError if it is not the firm table."""
    reader = csv.reader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
    header = next(reader, None)
    check_header(header)
    keep = [i for i, name in enumerate(header) if name not in PERSONAL_FIELDS]
    out = io.StringIO(newline="")
    writer = csv.writer(out, lineterminator="\r\n")
    writer.writerow([header[i] for i in keep])
    rows = 0
    for row in reader:
        if not row:
            continue
        writer.writerow([row[i] if i < len(row) else "" for i in keep])
        rows += 1
    return out.getvalue().encode("utf-8"), rows


def fetch_banipartide(archive: Archive, *, now: datetime | None = None, again: bool = False, timeout: float = 300, http=requests.get) -> BaniPartideFetchSummary:
    """Archive the firm-donor table once. `http` is `requests.get` (tests pass a stub)."""
    now = now or datetime.now(timezone.utc)
    summary = BaniPartideFetchSummary()
    if held_manifests(archive) and not again:
        summary.held = True
        log.info("held        banipartide: one-off load already archived (use --again to take a newer database)")
        return summary
    try:
        db_hash, meta = upstream_state(http, timeout)
        got = http(table_url(), timeout=timeout, headers={"User-Agent": USER_AGENT})
        got.raise_for_status()
        raw = got.content
    except Exception as e:  # noqa: BLE001
        summary.failed.append(f"{str(e) or type(e).__name__}")
        log.warning("failed      banipartide: %s", summary.failed[-1])
        return summary
    try:
        stripped, rows = strip_personal(raw)
    except (BaniPartideError, UnicodeDecodeError, csv.Error) as e:
        summary.invalid.append(f"{table_url()}: {e}")
        log.warning("invalid     %s", summary.invalid[-1])
        return summary
    origin = {"system": SYSTEM, "database": DATABASE, "table": TABLE, "databaseHash": db_hash, "url": table_url(), "datasetUrl": SITE + "/donatori-persoane-juridice.html",
              "license": meta.get("license"), "licenseUrl": meta.get("license_url"), "source": meta.get("source"), "sourceUrl": meta.get("source_url"),
              "underlying": UNDERLYING, "underlyingUrl": METHODOLOGY_URL,
              "strippedFields": list(PERSONAL_FIELDS), "upstreamSha256": hashlib.sha256(raw).hexdigest(), "upstreamBytes": len(raw), "rows": rows}
    try:
        where = archive.write_unit(source=SOURCE, stream=STREAM, kind=KIND, unit=db_hash[:12], fetched_at=now, files={FILE_NAME: stripped},
                                   url=table_url(), via=f"BaniPartide, {TABLE}", origin=origin, same_day=True)
    except Exception as e:  # noqa: BLE001 - nothing half-written is left in the archive
        summary.failed.append(f"{str(e) or type(e).__name__}")
        log.warning("failed      banipartide: %s", summary.failed[-1])
        return summary
    summary.archived.append(db_hash[:12])
    log.info("archived    banipartide: %s rows -> %s", rows, where)
    return summary
