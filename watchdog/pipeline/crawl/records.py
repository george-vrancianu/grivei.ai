"""Crawled Records: an archived crawl unit (list pages + contracts pages) read into Records at rebuild time (ADR 0004).

Identity as for the bulk Records (ADR 0002 as amended): a contract is `<award notice code>~<contract number>`
(`CAN1069731~54202`), an award notice is its notice code, so a crawled Record and the bulk Record of the same thing are the
same Record and the bulk supersedes it (rebuild.py). Which kind a notice becomes mirrors the bulk files: a notice with an
initiation procedure (`procedureId` set) is read as CONTRACT Records, one per contract number, like the Contracte files; a
notice without one (`procedureId` null: Negociere fara publicare prealabila, Norme proprii, Procedura simplificata proprie)
is read as one AWARD_NOTICE Record, like the "fara anunt de initiere" files, its value the sum of its contracts, so no
money is counted twice. A notice without contracts yields nothing.

Provenance of a crawled Record: `via` crawl, `fetchedAt` from the archive manifest, `sysNoticeTypeId` / `sysNoticeVersionId`
and the internal id from the list row, and the public URL built here, at load time (`notice_url`).
Money is integer bani from `defaultCurrencyContractValue` (RON); the JSON is read with exact decimals, never floats.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from ..archive import Unit
from ..bulk import BulkRecord, InvalidFile, Winner
from ..bulk.values import to_tax_id

# (notice type, legacy form?) -> route under https://e-licitatie.ro/pub/notices/. The SPA (navigateToView) picks the route from
# sysNoticeTypeId and sysNoticeVersionId; version 1 is the legacy form. Same table as watchdog/sql/002_load_seap.sql
# (`seap_ca_notice_url`; research #12 §1). A type without a known route gets no URL rather than a wrong one.
_ROUTES = {
    (3, True): "ca-notices/view-c/v1/", (3, False): "ca-notices/view-c/",  # CAN
    (18, True): "ca-notices/view-scn/v1/", (18, False): "ca-notices/view-rfq/",  # SCNA (sic: as the public list does)
    (13, True): "ca-notices/view-rfq/v1/", (13, False): "ca-notices/view-rfq/",  # RFQ
    (20, True): "ca-notices/view-rfq/v1/", (20, False): "ca-notices/view-rfq/",
    (16, True): "ca-notices/view-pc/v1/", (16, False): "ca-notices-pc/view/",  # PC
    (8, True): "ca-notices/view-dc/v1/", (8, False): "ca-notices-dc/view/",  # DC
}
PUBLIC = "https://e-licitatie.ro/pub/notices/"


def notice_url(type_id: int | None, version_id: int | None, ca_notice_id: int) -> str | None:
    """The public page of an award notice. A missing version is taken as the current form (as the legacy loader does)."""
    route = _ROUTES.get((type_id, (version_id if version_id is not None else 2) == 1))
    return f"{PUBLIC}{route}{ca_notice_id}" if route and type_id is not None else None


def _json(unit: Unit, name: str) -> Any:
    try:
        return json.loads(unit.file_path(name).read_text(encoding="utf-8"), parse_float=Decimal)
    except (OSError, ValueError) as e:
        raise InvalidFile(f"{name}: not readable JSON ({e})") from None


def _day(text: Any) -> date | None:
    if not isinstance(text, str) or len(text) < 10:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def _bani(value: Any) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return int((Decimal(value) * 100).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    except (ArithmeticError, ValueError, TypeError):
        return None


def _text(node: Any) -> str | None:
    """`{"text": "..."}` as the list rows carry their enumerations."""
    value = node.get("text") if isinstance(node, dict) else None
    return value.strip() if isinstance(value, str) and value.strip() else None


def _authority(text: Any) -> tuple[str | None, str]:
    """`4384206 - MUNICIPIUL BRASOV` -> (CUI digits, name)."""
    s = (text or "").strip()
    m = re.match(r"^(?:RO\s*)?(\d{2,10})\s+-\s+(.+)$", s)
    if m:
        return m[1], m[2].strip()
    return None, s


def _cpv(text: Any) -> tuple[str | None, str | None]:
    s = (text or "").strip()
    m = re.match(r"^(\d{8}-\d)\s*-\s*(.*)$", s)
    if m:
        return m[1], m[2].strip() or None
    return (s or None), None


def _winners(contract: dict) -> list[Winner]:
    out: list[Winner] = []
    for w in contract.get("winners") or []:
        cui, _ = to_tax_id(str(w["fiscalNumber"]) if w.get("fiscalNumber") is not None else None)
        winner = Winner((w.get("name") or "").strip() or None, cui)
        if (winner.name or winner.cui) and winner not in out:
            out.append(winner)
    return out


@dataclass(frozen=True)
class ParsedCrawl:
    records: dict[str, list[BulkRecord]]  # by Record kind label ('CONTRACT', 'AWARD_NOTICE')
    rows: int  # list rows read


def parse_unit(unit: Unit) -> ParsedCrawl:
    """Read one complete crawl unit. Raises InvalidFile (the whole unit is quarantined); never a partial result."""
    notices: dict[Any, dict] = {}
    contracts: dict[Any, dict[Any, dict]] = {}
    for name in unit.files:
        if name.startswith("notices-") and name.endswith(".json"):
            payload = _json(unit, name)
            for row in (payload or {}).get("items") or []:
                if not isinstance(row, dict) or "caNoticeId" not in row or not row.get("noticeNo"):
                    raise InvalidFile(f"{name}: a list row without caNoticeId or noticeNo")
                notices[row["caNoticeId"]] = row
        elif name.startswith("contracts-") and name.endswith(".json"):
            m = re.fullmatch(r"contracts-(\d+)-s\d+\.json", name)
            if not m:
                raise InvalidFile(f"{name}: unexpected file name")
            payload = _json(unit, name)
            by_id = contracts.setdefault(int(m[1]), {})
            for c in (payload or {}).get("items") or []:
                by_id[c.get("caNoticeContractId", len(by_id))] = c
    if not any(n.startswith("notices-") for n in unit.files):
        raise InvalidFile("no notice list pages")
    for notice_id in contracts:
        if notice_id not in notices:
            raise InvalidFile(f"contracts of notice {notice_id}, which no list page has")
    out: dict[str, list[BulkRecord]] = {"CONTRACT": [], "AWARD_NOTICE": []}
    for notice_id, items in contracts.items():
        if items:
            _assemble(notices[notice_id], list(items.values()), out)
    return ParsedCrawl(out, len(notices))


def _assemble(notice: dict, contracts: list[dict], out: dict[str, list[BulkRecord]]) -> None:
    code = str(notice["noticeNo"]).strip()
    published = _day(notice.get("noticeStateDate"))
    if published is None:
        raise InvalidFile(f"notice {code}: no noticeStateDate")
    cui, authority = _authority(notice.get("contractingAuthorityNameAndFN"))
    cpv_code, cpv_description = _cpv(notice.get("cpvCodeAndName"))
    type_id, version_id = notice.get("sysNoticeTypeId"), notice.get("sysNoticeVersionId")
    ca_id = int(notice["caNoticeId"])
    common = dict(
        published_on=published, state=None, authority_name=authority, authority_cui=cui, cpv_code=cpv_code, cpv_description=cpv_description,
        contract_type=_text(notice.get("sysAcquisitionContractType")), estimated_bani=None, notice_code=code,
        procedure=_text(notice.get("sysProcedureType")), via="CRAWL", url=notice_url(type_id, version_id, ca_id), ca_notice_id=ca_id,
        sys_notice_type_id=type_id, sys_notice_version_id=version_id,
    )
    notice_title = (notice.get("contractTitle") or "").strip() or code

    def value_of(group: list[dict]) -> int | None:
        found = [b for c in group if (b := _bani(c.get("defaultCurrencyContractValue"))) is not None]
        return sum(found) if found else None

    def awarded(group: list[dict]) -> date | None:
        days = [d for c in group if (d := _day(c.get("contractDate")))]
        return min(days) if days else None

    def winners_of(group: list[dict]) -> tuple[Winner, ...]:
        seen: dict[Winner, None] = {}
        for c in group:
            for w in _winners(c):
                seen.setdefault(w, None)
        return tuple(seen)

    def number(c: dict) -> str:
        return " ".join(str(c.get("contractNo") or "").split())

    if notice.get("procedureId") is None:  # no initiation procedure: an award notice, like the "fara anunt" files
        winners = winners_of(contracts)
        numbers = tuple(dict.fromkeys(number(c) for c in contracts))
        out["AWARD_NOTICE"].append(BulkRecord(
            kind="AWARD_NOTICE", code=code, awarded_on=awarded(contracts), title=notice_title, value_bani=value_of(contracts),
            supplier_name=winners[0].name if winners else None, supplier_cui=winners[0].cui if winners else None,
            winners=winners, contract_numbers=numbers, **common))
        return
    by_number: dict[str, list[dict]] = {}
    for c in contracts:
        by_number.setdefault(number(c), []).append(c)
    for n, group in by_number.items():
        winners = winners_of(group)
        notes = ["contract_number:missing"] if not n else []
        if len(group) > 1:
            notes.append("value:contracts_share_number")  # distinct contracts under one number: their values add
        out["CONTRACT"].append(BulkRecord(
            kind="CONTRACT", code=f"{code}~{n}", awarded_on=awarded(group), title=(group[0].get("contractTitle") or "").strip() or notice_title,
            value_bani=value_of(group), supplier_name=winners[0].name if winners else None, supplier_cui=winners[0].cui if winners else None,
            notes=tuple(notes), winners=winners, contract_numbers=(n,), **common))
