"""The SEAP bulk record kinds and the parse of one file into Records.

A kind is a `KindSpec` in the `KINDS` registry: its label, its header table and how a row of canonical fields becomes a
Record. DA (direct purchase) and DAN (direct-purchase award notification) are registered here; the contract and award
notice kinds (#64) register their own spec and loader beside them without touching the reading, validation or
quarantine code. The archive says which kind a unit holds (`seap/bulk/<kind>/...`).

Identity (ADR 0002 and its 2026-11-11 amendment):
- DA and DAN are identified by their public code;
- a contract (kind CONTRACT, from the Contracte files) by its award notice code and contract number, `CAN1069731~54202`
  (`~` between them: a contract number may hold `/` and spaces, a notice code never holds `~`). Lots and winners are
  attributes: rows repeated per lot and per winner collapse into one Record;
- an award notice (kind AWARD_NOTICE, from the "fara anunt de initiere" files) by its notice code, `CAN1139746`; its
  contracts are attributes (`contract_numbers`), and its value is the sum of its contracts' values.

One file is parsed all or nothing, and inside it:
- an exact duplicate row (every field equal after parsing) is dropped;
- DA/DAN: the same code with different content keeps the later publication date, a tie going to the later row;
- contracts and award notices: the rows of one identity collapse into a Record from the rows of its most recent notice
  publication (older rows of the same identity in the same file are a superseded version and are dropped);
- the loader applies the same "later publication wins, a tie goes to the later file" rule across files (rebuild.py).

A contract's value (`contract_value`) is counted once when all its lots carry the same value (the value is repeated on
every lot row and every winner row) and is summed over lots when the lot values differ. A row without a lot number is a
lot of its own. Winners keep the order of their first row in the file.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Callable, NamedTuple

from . import headers, values
from .errors import InvalidFile
from .readers import read_file


class Winner(NamedTuple):
    name: str | None
    cui: str | None


@dataclass(frozen=True)
class BulkRecord:
    """A DA, DAN, contract or award notice as read from a bulk file. Money is integer bani; both dates are kept (ADR 0002)."""

    kind: str  # 'DA' | 'DAN' | 'CONTRACT' | 'AWARD_NOTICE'
    code: str
    published_on: date  # assigns the quarter
    awarded_on: date | None  # aggregation date; the loader falls back to published_on
    state: str | None
    authority_name: str
    authority_cui: str | None
    title: str
    contract_type: str | None
    cpv_code: str | None
    cpv_description: str | None
    estimated_bani: int | None
    value_bani: int | None
    supplier_name: str | None
    supplier_cui: str | None
    notes: tuple[str, ...] = ()  # data quirks seen while reading, e.g. 'value:scientific_notation'
    # contracts and award notices only (empty / None for DA and DAN):
    winners: tuple[Winner, ...] = ()  # in published (file row) order; DA and DAN have their one supplier above
    notice_code: str | None = None  # the award notice (CAN/SCNA...): a contract's link to its notice and, for #65, to its framework
    contract_numbers: tuple[str, ...] = ()  # a contract's own number; an award notice's contracts
    procedure: str | None = None
    concluded_by: str | None = None  # `Incheiat prin`: 'Cu acord cadru' | 'Cu acord cadru subsecvent' | 'Fara acord cadru'; #65 needs it
    initiation_code: str | None = None  # the initiation notice (CN/SCN...), when the file has it
    lot_count: int | None = None  # distinct lot numbers, when the file has them
    # crawled Records only (#77; a bulk Record keeps the defaults): how it was obtained, and what the crawl saw of the notice
    via: str = "BULK"  # 'BULK' | 'CRAWL'
    url: str | None = None  # the public e-licitatie page, built at load time from the notice type and version
    ca_notice_id: int | None = None  # the internal id (`caNoticeId`)
    sys_notice_type_id: int | None = None
    sys_notice_version_id: int | None = None

    @property
    def all_winners(self) -> tuple[Winner, ...]:
        if self.winners:
            return self.winners
        return (Winner(self.supplier_name, self.supplier_cui),) if self.supplier_name or self.supplier_cui else ()

    @property
    def award_date(self) -> date:
        return self.awarded_on or self.published_on

    @property
    def quarter(self) -> str:
        return f"{self.published_on.year}Q{(self.published_on.month - 1) // 3 + 1}"


@dataclass(frozen=True)
class KindSpec:
    label: str  # the Record kind in the graph and in seap.source_file
    table: headers.HeaderTable
    build: Callable[[str, dict[str, values.Cell]], Any]  # one row of canonical fields -> a hashable row
    assemble: Callable[[str, list[Any]], list[BulkRecord]]  # the distinct rows of a file -> its Records


def _build_direct(label: str, f: dict[str, values.Cell]) -> BulkRecord:
    """DA and DAN share their fields; a column a kind lacks is simply absent from `f`."""
    notes: list[str] = []

    def money(field: str) -> int | None:
        bani, mangled = values.to_bani(f.get(field))
        if mangled:
            notes.append(f"{field}:scientific_notation")
        return bani

    def cui(field: str) -> str | None:
        tax_id, note = values.to_tax_id(f.get(field))
        if note:
            notes.append(f"{field}:{note}")
        return tax_id

    code, published = values.text(f.get("code")), values.to_date(f.get("published_on"))
    if not code or published is None:
        raise ValueError("no public code or publication date")
    return BulkRecord(
        kind=label,
        code=code,
        published_on=published,
        awarded_on=values.to_date(f.get("awarded_on")),
        state=values.text(f.get("state")) or None,
        authority_name=values.text(f.get("authority_name")),
        authority_cui=cui("authority_cui"),
        title=values.text(f.get("title")),
        contract_type=values.text(f.get("contract_type")) or None,
        cpv_code=values.text(f.get("cpv_code")) or None,
        cpv_description=values.text(f.get("cpv_description")) or None,
        estimated_bani=money("estimated"),
        value_bani=money("value"),
        supplier_name=values.text(f.get("supplier_name")) or None,
        supplier_cui=cui("supplier_cui"),
        notes=tuple(notes),
    )


def _assemble_direct(label: str, rows: list[BulkRecord]) -> list[BulkRecord]:
    by_code: dict[str, BulkRecord] = {}
    for record in rows:
        earlier = by_code.get(record.code)
        if earlier is None or record.published_on >= earlier.published_on:
            by_code[record.code] = record
    return list(by_code.values())


# ---- contracts and award notices ---------------------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ContractRow:
    """One row of a Contracte or "fara anunt" file: a contract's lot and winner."""

    notice_code: str
    published_on: date
    awarded_on: date | None
    authority_name: str
    authority_cui: str | None
    procedure: str
    concluded_by: str
    initiation_code: str
    contract_type: str
    contract_number: str
    lot: str
    title: str
    cpv_code: str
    cpv_description: str
    value_bani: int | None
    supplier_name: str
    supplier_cui: str | None
    notes: tuple[str, ...]


def _build_contract_row(label: str, f: dict[str, values.Cell]) -> ContractRow:
    notes: list[str] = []

    def cui(field: str) -> str | None:
        tax_id, note = values.to_tax_id(f.get(field))
        if note:
            notes.append(f"{field}:{note}")
        return tax_id

    bani, mangled = values.to_bani(f.get("value"))
    if mangled:
        notes.append("value:scientific_notation")
    notice, published = values.text(f.get("notice_code")), values.to_date(f.get("published_on"))
    if not notice or published is None:
        raise ValueError("no award notice code or publication date")
    number, number_note = values.contract_number(f.get("contract_number"))  # an Excel-coerced number is turned back into its text
    number = " ".join(number.split())  # as published; only runs of blanks collapse
    if number_note:
        notes.append(f"contract_number:{number_note}")
    if not number:
        notes.append("contract_number:missing")
    return ContractRow(
        notice_code=notice,
        published_on=published,
        awarded_on=values.to_date(f.get("awarded_on")),
        authority_name=values.text(f.get("authority_name")),
        authority_cui=cui("authority_cui"),
        procedure=values.text(f.get("procedure")),
        concluded_by=values.text(f.get("concluded_by")),
        initiation_code=values.text(f.get("initiation_code")),
        contract_type=values.text(f.get("contract_type")),
        contract_number=number,
        lot=values.text(f.get("lot")),
        title=values.text(f.get("title")),
        cpv_code=values.text(f.get("cpv_code")),
        cpv_description=values.text(f.get("cpv_description")),
        value_bani=bani,
        supplier_name=values.text(f.get("supplier_name")),
        supplier_cui=cui("supplier_cui"),
        notes=tuple(notes),
    )


def contract_value(rows: list[ContractRow]) -> tuple[int | None, bool]:
    """The value of one contract from its rows (a row per lot and winner): (bani or None, whether a lot's rows disagreed).

    The value of a lot is the first value on its rows. The contract counts once when all its lots carry the same value
    (it is repeated on every lot and winner row), and is the sum of the lots' values when they differ. A row without a lot
    number is a lot of its own. No value on any row: None ("no value in SEAP").
    """
    lots: dict[Any, int | None] = {}
    disagree = False
    for index, row in enumerate(rows):
        key = row.lot or ("row", index)
        if key not in lots or lots[key] is None:
            lots[key] = row.value_bani
        elif row.value_bani is not None and row.value_bani != lots[key]:
            disagree = True
    found = [v for v in lots.values() if v is not None]
    if not found:
        return None, disagree
    return (found[0] if len(set(found)) == 1 else sum(found)), disagree


def _first(rows: list[ContractRow], attribute: str) -> str | None:
    return next((v for r in rows if (v := getattr(r, attribute))), None)


def _winners(rows: list[ContractRow]) -> tuple[Winner, ...]:
    seen: dict[Winner, None] = {}
    for r in rows:
        if r.supplier_name or r.supplier_cui:
            seen.setdefault(Winner(r.supplier_name or None, r.supplier_cui), None)
    return tuple(seen)


def _record_of(label: str, code: str, rows: list[ContractRow], value: int | None, numbers: tuple[str, ...], extra_notes: list[str]) -> BulkRecord:
    published = max(r.published_on for r in rows)
    rows = [r for r in rows if r.published_on == published]  # an older notice version of the same identity is superseded
    first = rows[0]
    notes = list(dict.fromkeys([n for r in rows for n in r.notes] + extra_notes))
    winners = _winners(rows)
    lots = {r.lot for r in rows if r.lot}
    awarded = [r.awarded_on for r in rows if r.awarded_on]
    return BulkRecord(
        kind=label,
        code=code,
        published_on=published,
        awarded_on=min(awarded) if awarded else None,
        state=None,
        authority_name=first.authority_name,
        authority_cui=first.authority_cui,
        title=_first(rows, "title") or _first(rows, "cpv_description") or first.notice_code,
        contract_type=_first(rows, "contract_type"),
        cpv_code=_first(rows, "cpv_code"),
        cpv_description=_first(rows, "cpv_description"),
        estimated_bani=None,
        value_bani=value,
        supplier_name=winners[0].name if winners else None,
        supplier_cui=winners[0].cui if winners else None,
        notes=tuple(notes),
        winners=winners,
        notice_code=first.notice_code,
        contract_numbers=numbers,
        procedure=_first(rows, "procedure"),
        concluded_by=_first(rows, "concluded_by"),
        initiation_code=_first(rows, "initiation_code"),
        lot_count=len(lots) or None,
    )


def _latest(rows: list[ContractRow]) -> list[ContractRow]:
    published = max(r.published_on for r in rows)
    return [r for r in rows if r.published_on == published]


def contract_code(notice_code: str, contract_number: str) -> str:
    return f"{notice_code}~{contract_number}"


def _assemble_contracts(label: str, rows: list[ContractRow]) -> list[BulkRecord]:
    groups: dict[str, list[ContractRow]] = {}
    for r in rows:
        groups.setdefault(contract_code(r.notice_code, r.contract_number), []).append(r)
    out = []
    for code, group in groups.items():
        version = _latest(group)
        value, disagree = contract_value(version)
        out.append(_record_of(label, code, group, value, (version[0].contract_number,), ["value:lot_rows_disagree"] if disagree else []))
    return out


def _assemble_award_notices(label: str, rows: list[ContractRow]) -> list[BulkRecord]:
    groups: dict[str, list[ContractRow]] = {}
    for r in rows:
        groups.setdefault(r.notice_code, []).append(r)
    out = []
    for code, group in groups.items():
        version = _latest(group)
        by_contract: dict[str, list[ContractRow]] = {}
        for r in version:
            by_contract.setdefault(r.contract_number, []).append(r)
        results = [contract_value(contract_rows) for contract_rows in by_contract.values()]
        found = [v for v, _ in results if v is not None]
        notes = ["value:lot_rows_disagree"] if any(d for _, d in results) else []
        out.append(_record_of(label, code, group, sum(found) if found else None, tuple(by_contract), notes))
    return out


KINDS: dict[str, KindSpec] = {
    "da": KindSpec("DA", headers.DA, _build_direct, _assemble_direct),
    "dan": KindSpec("DAN", headers.DAN, _build_direct, _assemble_direct),
    "contracte": KindSpec("CONTRACT", headers.CONTRACTE, _build_contract_row, _assemble_contracts),
    "fara-anunt": KindSpec("AWARD_NOTICE", headers.FARA_ANUNT, _build_contract_row, _assemble_award_notices),
}


@dataclass(frozen=True)
class ParsedFile:
    records: list[BulkRecord]
    rows: int  # data rows read, duplicates included


def parse_file_stats(kind: str, unit: str, path: Path) -> ParsedFile:
    """Read and validate one file of `kind` ('da', 'dan', 'contracte', 'fara-anunt') from quarter `unit`. Raises InvalidFile; never a partial result."""
    spec = KINDS[kind]
    header, rows = read_file(path)
    try:
        columns = headers.resolve(spec.table, spec.label, unit, header)

        seen: set[Any] = set()
        distinct: list[Any] = []
        read = 0
        for number, cells in rows:
            read += 1
            if len(cells) != len(columns):
                raise InvalidFile(f"line {number}: {len(cells)} fields, expected {len(columns)}", [f"line {number}: {len(cells)} fields, expected {len(columns)}"])
            if cells == header:  # the header line repeated in the middle of the file (seen in the 2022 T1 Contracte)
                continue
            fields = {c: cell for c, cell in zip(columns, cells) if c}
            try:
                row = spec.build(spec.label, fields)
            except ValueError as e:
                raise InvalidFile(f"line {number}: {e}", [f"line {number}: {e}"]) from None
            if row in seen:  # an exact duplicate row
                continue
            seen.add(row)
            distinct.append(row)
        if not distinct:
            raise InvalidFile("no data rows")
    finally:
        close = getattr(rows, "close", None)
        if close:
            close()  # an XLSX workbook is an open file
    return ParsedFile(spec.assemble(spec.label, distinct), read)


def parse_file(kind: str, unit: str, path: Path) -> list[BulkRecord]:
    """The Records of one file (see `parse_file_stats`)."""
    return parse_file_stats(kind, unit, path).records
