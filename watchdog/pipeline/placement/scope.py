"""Which authorities are national (#67, Glossary: National authority). `scope = national` is never read off a name.

Two inputs, and one rule between them:

1. The award notice (SEAP): an authority with an award notice has `legalBuyerType` (eForms, e.g. "Autoritate guvernamentala
   centrala") and `caType` (e.g. "Minister sau orice alta autoritate nationala sau federala") on the notice detail.
   `pipeline authority-scope` fetches ONE award notice per authority (the crawled Record's internal id when the graph has one,
   else the id from the notice list filtered by the notice number) and archives the answers unchanged (`lookup.py`).
   `classify_notice` reads them at rebuild: national if either field names a national or central body, local if either names a
   regional or local one and neither names a national one, unknown otherwise. The observed texts are kept.
2. The reviewed classification file, `national_authorities.csv` (`cui,national,override,name,reason`), one line per CUI: for
   authorities without an award notice (only direct purchases) and for MF-list entities, plus the entries a human corrects.
   A deconcentrated county unit that the notice calls central is a `national=false` line with `override=true`.

Rule (`decide`): the award-notice flag wins over the file unless the file line says `override=true`; with no notice flag the
file line decides; with neither the authority is not national. The reason for the answer is returned with it.
`propose` lists authorities without a flag or a line, whose name looks national, as CSV lines to review (never applied by itself).
"""
from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping

import psycopg

from ..archive import Archive
from ..crawl.client import CrawlError
from . import lookup
from .matching import fold
from .tables import DEFAULT_DATA_DIR, read_csv

KIND = "authority-notice"
LIST_PATH = "/api-pub/NoticeCommon/GetCANoticeList/"
NOTICE_PATH = "/api-pub/C_PUBLIC_CANotice/get/{id}"
LIST_FILE, NOTICE_FILE = "list.json", "notice.json"
CLASSIFICATION_FILE = "national_authorities.csv"

CANDIDATES_SQL = """
SELECT DISTINCT ON (authority_cui) authority_cui, ca_notice_id::text, notice_code FROM seap.record
 WHERE kind IN ('CONTRACT', 'AWARD_NOTICE') AND authority_key ~ '^[0-9]+$' AND authority_cui IS NOT NULL
   AND (ca_notice_id IS NOT NULL OR notice_code IS NOT NULL)
 ORDER BY authority_cui, (ca_notice_id IS NULL), published_on DESC, code"""


@dataclass(frozen=True)
class Candidate:
    cui: str
    ca_notice_id: str | None
    notice_code: str | None


def candidates(db_url: str) -> list[Candidate]:
    """One award notice per authority of the loaded graph (a rebuild must have run)."""
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute(CANDIDATES_SQL)
        return [Candidate(*row) for row in cur.fetchall()]


# ---- reading a notice ------------------------------------------------------------------------------------------------

def find(obj: Any, key: str) -> Any:
    """The first value stored under `key`, anywhere in the (nested) notice."""
    if isinstance(obj, Mapping):
        if key in obj and obj[key] is not None:
            return obj[key]
        for value in obj.values():
            if (found := find(value, key)) is not None:
                return found
    elif isinstance(obj, list):
        for value in obj:
            if (found := find(value, key)) is not None:
                return found
    return None


def _describe(value: Any) -> tuple[str, str]:
    """(text, localeKey) of a combo value (`{id, text, localeKey}`) or a bare string."""
    if isinstance(value, Mapping):
        return str(value.get("text") or ""), str(value.get("localeKey") or "")
    return (str(value) if value else ""), ""


def _verdict(text: str, key: str) -> bool | None:
    """True: names a national or central body; False: names a regional or local one; None: unknown. Folded ASCII text and the locale key."""
    t, k = fold(text), key.lower()
    if "nationalorfederal" in k or "centralgovernment" in k or any(w in t for w in ("NATIONAL", "CENTRAL", "MINISTER")):
        return True
    if "regionalorlocal" in k or any(w in t for w in ("REGIONAL", "LOCAL")):
        return False
    return None


@dataclass(frozen=True)
class Observation:
    """What an archived award notice says about its authority."""

    national: bool | None
    legal_buyer_type: str | None
    ca_type: str | None
    fetched_at: datetime
    archive_path: str


def classify_notice(notice: Any) -> tuple[bool | None, str | None, str | None]:
    legal, ca = _describe(find(notice, "legalBuyerType")), _describe(find(notice, "caType"))
    verdicts = [_verdict(*legal) if legal[0] or legal[1] else None, _verdict(*ca) if ca[0] or ca[1] else None]
    national = True if True in verdicts else (False if False in verdicts else None)
    return national, legal[0] or None, ca[0] or None


def read_scopes(archive: Archive) -> dict[str, Observation]:
    """The latest archived observation per authority CUI (never touches the network)."""
    out: dict[str, Observation] = {}
    for unit in lookup.read_units(archive, KIND):
        if NOTICE_FILE not in unit.files:
            continue
        try:
            notice = json.loads(unit.file_path(NOTICE_FILE).read_bytes())
        except (OSError, ValueError):
            continue
        national, legal, ca = classify_notice(notice)
        out[unit.unit] = Observation(national, legal, ca, unit.fetched_at, str(unit.path.relative_to(archive.root)))
    return out


# ---- the lookup ---------------------------------------------------------------------------------------------------------

def list_body(code: str) -> dict:
    return {"sysNoticeTypeIds": [], "sortProperties": [], "pageIndex": 0, "pageSize": 10, "number": code,
            "startPublicationDate": None, "endPublicationDate": None}


def lookup_scopes(archive: Archive, client: lookup.LookupClient, todo_all: Iterable[Candidate], note: Callable[[str], None] = print,
                  max_authorities: int | None = None) -> tuple[int, int]:
    """Fetch one award notice per authority not yet answered. Returns (archived, failed); a failure is logged and the run goes on."""
    done = lookup.looked_up(archive, KIND)
    todo = [c for c in todo_all if c.cui not in done]
    if max_authorities is not None:
        todo = todo[:max_authorities]
    note(f"authority-scope {len(todo)} authorities to ask ({len(done)} already archived)")
    archived = failed = 0
    for i, c in enumerate(todo, start=1):
        try:
            responses: dict[str, bytes] = {}
            request: dict[str, Any] = {}
            notice_id = c.ca_notice_id
            if notice_id is None:  # a bulk Record has only the public code: the list, filtered by it, gives the internal id
                raw, parsed = client.post(LIST_PATH, list_body(c.notice_code or ""), f"notice list {c.notice_code}")
                responses[LIST_FILE] = raw
                request["list"] = {"path": LIST_PATH, "body": list_body(c.notice_code or "")}
                rows = [r for r in ((parsed or {}).get("items") or []) if isinstance(r, Mapping) and r.get("noticeNo") == c.notice_code]
                notice_id = str(rows[0].get("caNoticeId") or rows[0].get("id") or "") if rows else None
            if notice_id:
                path = NOTICE_PATH.format(id=notice_id)
                raw, _ = client.get(path, f"notice {notice_id}")
                responses[NOTICE_FILE] = raw
                request["notice"] = {"path": path}
            where = lookup.archive_lookup(archive, KIND, c.cui, request, responses, lookup.now())
        except CrawlError as e:
            failed += 1
            note(f"authority-scope {i}/{len(todo)} cui={c.cui} failed: {e}")
            continue
        archived += 1
        note(f"authority-scope {i}/{len(todo)} cui={c.cui} archived {where.relative_to(archive.root)}"
             + ("" if notice_id else " (notice not found)"))
    note(f"authority-scope done archived={archived} failed={failed}")
    return archived, failed


# ---- the reviewed file and the rule ----------------------------------------------------------------------------------------

@dataclass(frozen=True)
class Entry:
    cui: str
    national: bool
    override: bool
    name: str
    reason: str


def _flag(text: str | None) -> bool:
    return (text or "").strip().lower() in {"true", "yes", "1", "da"}


def read_classification(data_dir: Path | str | None = None) -> dict[str, Entry]:
    path = Path(data_dir or DEFAULT_DATA_DIR) / CLASSIFICATION_FILE
    if not path.is_file():
        return {}
    out: dict[str, Entry] = {}
    for r in read_csv(path):
        cui = re.sub(r"\D", "", r["cui"]).lstrip("0")
        if cui:
            out[cui] = Entry(cui, _flag(r.get("national")), _flag(r.get("override")), r.get("name") or "", r.get("reason") or "")
    return out


def decide(cui: str, observation: Observation | None, entries: Mapping[str, Entry]) -> tuple[bool, str]:
    """(national, where the answer came from): `award-notice`, `file`, `file-override` or `default`."""
    entry = entries.get(cui)
    flag = observation.national if observation else None
    if entry and entry.override:
        return entry.national, "file-override"
    if flag is not None:
        return flag, "award-notice"
    if entry:
        return entry.national, "file"
    return False, "default"


_NATIONAL_NAME = re.compile(r"^(MINISTERUL|AGENTIA NATIONALA|AUTORITATEA NATIONALA|COMPANIA NATIONALA|CONSILIUL NATIONAL|"
                            r"INSPECTORATUL GENERAL|CASA NATIONALA|INSTITUTUL NATIONAL|SECRETARIATUL GENERAL|ACADEMIA ROMANA|"
                            r"PRESEDINTIA|PARLAMENTUL|GUVERNUL|CURTEA|BANCA NATIONALA)\b")


def propose(authorities: Iterable[tuple[str, str]], observations: Mapping[str, Observation], entries: Mapping[str, Entry]) -> list[str]:
    """CSV lines for authorities `(cui, name)` with no award-notice flag and no line, whose name looks national. A proposal only:
    a human reads each one and pastes the ones that are right (with their reason) into the file."""
    lines = []
    for cui, name in sorted(set(authorities)):
        if cui in entries or (cui in observations and observations[cui].national is not None):
            continue
        if _NATIONAL_NAME.match(fold(name)):
            lines.append(f'{cui},true,false,"{name}",name pattern (proposal: review before keeping)')
    return lines
