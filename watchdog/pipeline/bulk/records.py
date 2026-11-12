"""The SEAP bulk record kinds and the parse of one file into Records.

A kind is a `KindSpec` in the `KINDS` registry: its label, its header table and how a row of canonical fields becomes a
Record. DA (direct purchase) and DAN (direct-purchase award notification) are registered here; the contract and award
notice kinds (#64) register their own spec and loader beside them without touching the reading, validation or
quarantine code. The archive says which kind a unit holds (`seap/bulk/<kind>/...`).

Identity: DA and DAN are identified by their public code (ADR 0002). One file is parsed all or nothing, and inside it:
- an exact duplicate row (every field equal after parsing) is dropped;
- the same code with different content keeps the later publication date, a tie going to the later row (the rule the
  loader applies across files too, see rebuild.py).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Callable

from . import headers, values
from .errors import InvalidFile
from .readers import read_file


@dataclass(frozen=True)
class BulkRecord:
    """A DA or DAN as read from a bulk file. Money is integer bani; both dates are kept (ADR 0002)."""

    kind: str  # 'DA' | 'DAN'
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
    build: Callable[[str, dict[str, values.Cell]], BulkRecord]


def _build_direct(label: str, f: dict[str, values.Cell]) -> BulkRecord:
    """DA and DAN share their fields; a column a kind lacks is simply absent from `f`."""
    notes: list[str] = []

    def money(field: str) -> int | None:
        bani, mangled = values.to_bani(f.get(field))
        if mangled:
            notes.append(f"{field}:scientific_notation")
        return bani

    def cui(field: str) -> str | None:
        digits, note = values.to_cui(f.get(field))
        if note:
            notes.append(f"{field}:{note}")
        return digits

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


KINDS: dict[str, KindSpec] = {
    "da": KindSpec("DA", headers.DA, _build_direct),
    "dan": KindSpec("DAN", headers.DAN, _build_direct),
}


def parse_file(kind: str, unit: str, path: Path) -> list[BulkRecord]:
    """Read and validate one file of `kind` ('da', 'dan') from quarter `unit`. Raises InvalidFile; never a partial result."""
    spec = KINDS[kind]
    header, rows = read_file(path)
    columns = headers.resolve(spec.table, spec.label, unit, header)

    seen: set[BulkRecord] = set()
    by_code: dict[str, BulkRecord] = {}
    for number, cells in rows:
        if len(cells) != len(columns):
            raise InvalidFile(f"line {number}: {len(cells)} fields, expected {len(columns)}", [f"line {number}: {len(cells)} fields, expected {len(columns)}"])
        fields = {c: cell for c, cell in zip(columns, cells) if c}
        try:
            record = spec.build(spec.label, fields)
        except ValueError as e:
            raise InvalidFile(f"line {number}: {e}", [f"line {number}: {e}"]) from None
        if record in seen:  # an exact duplicate row
            continue
        seen.add(record)
        earlier = by_code.get(record.code)
        if earlier is None or record.published_on >= earlier.published_on:
            by_code[record.code] = record
    if not by_code:
        raise InvalidFile("no data rows")
    return list(by_code.values())
