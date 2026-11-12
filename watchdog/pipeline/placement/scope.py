"""Which authorities are national (#67, Glossary: National authority). `scope = national` is never read off a name.

Two inputs, and one rule between them:

1. The award notice (SEAP): an authority with an award notice has `legalBuyerType` (eForms, e.g. "Autoritate guvernamentala
   centrala") and `caType` (e.g. "Minister sau orice alta autoritate nationala sau federala") on the notice detail.
   `pipeline authority-scope` fetches ONE award notice per authority (the crawled Record's internal id when the archive has one,
   else the id from the notice list filtered by the notice number) and archives the answers unchanged (`lookup.py`). The authorities
   come from the raw archive (`candidates`), never from a loaded graph, so the lookup runs before the one national load.
   `classify_notice` reads them at rebuild with an explicit mapping (`_verdict`): national if a field names a central government
   authority (`legalBuyerType`) or a national authority (`caType`); NOT national if either names a deconcentrated service or a
   regional or local authority (this wins over "central"); unknown (the file decides) for bodies governed by public law or public
   undertakings "controlled by" a central authority, and for any text not in the mapping. The observed texts are kept.
2. The reviewed classification file, `national_authorities.csv` (`cui,national,override,name,reason`), one line per CUI: for
   authorities without an award notice (only direct purchases) and for MF-list entities, plus the entries a human corrects.
   A deconcentrated county unit that the notice calls central is a `national=false` line with `override=true`.

Rule (`decide`): the award-notice flag wins over the file unless the file line says `override=true`; with no notice flag the
file line decides; with neither the authority is not national. The reason for the answer is returned with it.
`propose` lists authorities without a flag or a line, whose name looks national, as CSV lines to review (never applied by itself).
"""
from __future__ import annotations

import csv
import io
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping

from ..archive import Archive
from ..crawl.client import CrawlError
from ..identity import resolve_authority
from . import lookup
from .matching import fold
from .tables import DEFAULT_DATA_DIR, read_csv

KIND = "authority-notice"
LIST_PATH = "/api-pub/NoticeCommon/GetCANoticeList/"
NOTICE_PATH = "/api-pub/C_PUBLIC_CANotice/get/{id}"
LIST_FILE, NOTICE_FILE = "list.json", "notice.json"
CLASSIFICATION_FILE = "national_authorities.csv"



@dataclass(frozen=True)
class Candidate:
    cui: str
    ca_notice_id: str | None
    notice_code: str | None


def candidates(archive: Archive, say: Callable[[str], None] | None = None) -> list[Candidate]:
    """One award notice per authority, read from the raw archive's contracts and award notices (bulk files and crawled days, as a
    rebuild reads them; no graph needed). An authority counts when its CUI passes the check digit (a rebuild keys it on that CUI).
    Its notice: one with the internal id (a crawled Record's) first, else the latest published, ties by Record code. In CUI order."""
    from ..anaf import archived_records

    best: dict[str, tuple[tuple, Candidate]] = {}
    for index, total, unit, records, skipped in archived_records(archive):
        if records is None:
            if say:
                say(f"authority-scope scan unit {index}/{total} kind={unit.kind} unit={unit.unit} skipped ({skipped})")
            continue
        for r in records:
            if r.kind not in ("CONTRACT", "AWARD_NOTICE") or not (r.ca_notice_id is not None or r.notice_code):
                continue
            authority = resolve_authority(r.authority_cui, r.authority_name)
            if authority.identity != "CUI" or not authority.cui:
                continue
            rank = (r.ca_notice_id is None, -r.published_on.toordinal(), r.code)
            if authority.cui not in best or rank < best[authority.cui][0]:
                best[authority.cui] = (rank, Candidate(authority.cui, None if r.ca_notice_id is None else str(r.ca_notice_id), r.notice_code))
    return [best[cui][1] for cui in sorted(best)]


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


# The mapping (README "National authorities"), on the folded ASCII text and the eForms locale key. Not a substring test: the
# texts below are the ones the research observed or expects; anything else is unknown and the reviewed file decides.
_CONTROLLED = ("CONTROLAT", "ORGANISM DE DREPT PUBLIC", "INTREPRINDERE PUBLICA")  # universities, hospitals, institutes: not "the whole country"
_LEGAL_NATIONAL = {"AUTORITATE GUVERNAMENTALA CENTRALA"}
_LEGAL_LOCAL = {"AUTORITATE LOCALA", "AUTORITATE REGIONALA", "AUTORITATE GUVERNAMENTALA REGIONALA", "AUTORITATE GUVERNAMENTALA LOCALA"}
_CA_NATIONAL = ("MINISTER SAU ORICE ALTA AUTORITATE NATIONALA", "AGENTIE BIROU NATIONAL", "AGENTIE SAU BIROU NATIONAL")
_CA_LOCAL = ("AUTORITATE REGIONALA SAU LOCALA", "DE INTERES LOCAL SAU REGIONAL", "AGENTIE BIROU REGIONAL")
CONTROLLED = "controlled"  # a marker, not a verdict: the body is controlled by a central authority, so only the file can say


def _verdict(text: str, key: str, *, legal: bool) -> bool | str | None:
    """True: a central or national authority; False: a deconcentrated service, or a regional or local authority; None: unknown
    (including bodies controlled by a central authority, which come back as CONTROLLED so a ministry caType cannot make them national). `legal` is `legalBuyerType`, else `caType`."""
    t, k = fold(text), key.lower()
    if "DECONCENTRAT" in t:
        return False
    if any(w in t for w in _CONTROLLED) or k.endswith("body-pl-cga"):
        return CONTROLLED
    if legal:
        if t in _LEGAL_NATIONAL or k.endswith(".cga"):
            return True
        if t in _LEGAL_LOCAL or "regionalorlocal" in k or k.endswith((".la", ".ra")):
            return False
        return None
    if any(t.startswith(w) for w in _CA_NATIONAL) or "nationalorfederal" in k:
        return True  # "... inclusiv subdiviziunile regionale sau locale" is still the national type
    if any(t.startswith(w) for w in _CA_LOCAL) or "regionalorlocal" in k:
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
    verdicts = [_verdict(*legal, legal=True) if legal[0] or legal[1] else None, _verdict(*ca, legal=False) if ca[0] or ca[1] else None]
    # a deconcentrated or local answer wins; a controlled body is unknown even when the caType names a ministry (the file decides)
    national = False if False in verdicts else (None if CONTROLLED in verdicts else (True if True in verdicts else None))
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
    spellings: dict[str, list[str]] = {}
    for cui, name in sorted(authorities):  # SEAP spells an authority several ways: one line per CUI, if any spelling looks national
        spellings.setdefault(cui, []).append(name)
    lines = []
    for cui, names in spellings.items():
        if cui in entries or (cui in observations and observations[cui].national is not None):
            continue
        if matching := [n for n in names if _NATIONAL_NAME.match(fold(n).lstrip("\"' "))]:
            out = io.StringIO()  # the file's column order; csv escapes the quotes and commas in a name
            csv.writer(out, lineterminator="").writerow([cui, "true", "false", matching[0], "name pattern (proposal: review before keeping)"])
            lines.append(out.getvalue())
    return lines
