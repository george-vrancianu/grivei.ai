"""Builds `archive-amepip/`, AMEPIP's list of public enterprises for the roles world (ticket #183). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_amepip_archive.py

`archive-amepip/` holds ONLY the AMEPIP unit (`amepip/list/enterprises/2026-01-13/2026-11-14/datecompanii_ind-finnefin.xlsx`): a small workbook with
the real file's shape (January 2026 release: sheets `Indicatori calculati` and `Indicatori formular`, one row per company and year, columns `cui`,
`company`, `registration_number`, `status`, `an` / `year`), produced by running the REAL `fetch_amepip` against a stub of data.gov.ro's CKAN (no
network). The seam-1 test copies it onto a copy of `archive-roles/` + `archive-roles-names/` (see build_roles_archive.py), so the list and the
Records meet on the same CUIs:
- 2000007 (ALFA DEMO SRL, a supplier) and 2000031 (CNAIR DEMO SA, both roles) are on the list: flagged. 2000007 is written `RO 2000007` and under
  a different spelling of its name; the list holds two years of it.
- 1000017 (the hospital), 1000009 (the commune) and the name-only suppliers are not on the list: never flagged.
- 4300011 is on the list and in no Record (no entity: nothing to flag); 4300029 is only in the `Indicatori formular` sheet; a row without a CUI is dropped.

The rows are invented; the sheet names, column names and the Romanian status wording are the real file's.
"""
from __future__ import annotations

import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from openpyxl import Workbook

HERE = Path(__file__).resolve().parent
WATCHDOG = HERE.parents[1]
sys.path.insert(0, str(WATCHDOG))

from pipeline.amepip.fetch import fetch_amepip  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

OUT = HERE / "archive-amepip"
FILE = "datecompanii_ind-finnefin.xlsx"
DATASET = {"id": "00000000-0000-0000-0000-00000000a001", "name": "amepip-indicatori-financiari-demo", "license_id": "CC-BY-4.0",
           "title": "AMEPIP - Indicatori financiari, nefinanciari si de guvernanta corporativa - ian 2026"}
RESOURCE = {"id": "00000000-0000-0000-0000-00000000b001", "name": "Date financiare si non-financiare", "format": "XLSX", "size": 0,
            "last_modified": "2026-01-13T14:23:50.041841", "url": f"https://data.gov.ro/dataset/{DATASET['id']}/resource/{'00000000-0000-0000-0000-00000000b001'}/download/{FILE}"}

CALC_HEADER = ["company_id", "cui", "company", "registration_number", "CAEN(ONRC)", "status", "ticker_symbol", "an", "CAEN(BILANT)"]
CALC = [
    (1, "RO 2000007", "ALFA DEMO S.R.L.", "J40/1/2005", "4120", "funcţiune", None, 2022, "4120"),
    (1, "RO 2000007", "ALFA DEMO SRL", "J40/1/2005", "4120", "funcţiune", None, 2023, "4120"),
    (2, 2000031, "CNAIR DEMO S.A.", "J40/2/2005", "4211", "este sub incidenţa Legii nr. 85/2014, insolvenţă", None, 2023, "4211"),
    (3, 4300011, "COMPANIA FARA CONTRACTE SA", "J05/3/1991", "3600", "funcţiune", None, 2021, "3600"),
    (3, 4300011, "COMPANIA FARA CONTRACTE SA", "J05/3/1991", "3600", "funcţiune", None, 2023, "3600"),
    (9, None, "RAND FARA CUI", None, None, "funcţiune", None, 2023, None),
]
FORM_HEADER = ["company_id", "cui", "company", "registration_number", "year", "data_transmitere", "versiune"]
FORM = [(2, 2000031, "CNAIR DEMO S.A.", "J40/2/2005", 2023, datetime(2025, 12, 30, 11, 12, 18), 1),
        (4, 4300029, "REGIA SOLO FORMULAR", "J01/4/1992", 2023, datetime(2025, 12, 30, 11, 12, 18), 1)]


class _Response:
    def __init__(self, body: bytes | dict):
        self._body = body

    def raise_for_status(self) -> None:
        pass

    def json(self) -> dict:
        return self._body  # type: ignore[return-value]

    def iter_content(self, chunk_size: int):
        yield self._body  # type: ignore[misc]


def ckan_stub(file_bytes: bytes):
    """data.gov.ro's CKAN as `fetch_amepip` asks it: the search answer, then the file."""
    resource = {**RESOURCE, "size": len(file_bytes)}

    def http(url, **kwargs):
        if "package_search" in url:
            return _Response({"success": True, "result": {"count": 1, "results": [{**DATASET, "resources": [resource]}]}})
        if url == RESOURCE["url"]:
            return _Response(file_bytes)
        raise AssertionError(f"unexpected request {url}")

    return http


def workbook_bytes() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Indicatori calculati"
    ws.append(CALC_HEADER)
    for row in CALC:
        ws.append(row)
    form = wb.create_sheet("Indicatori formular")
    form.append(FORM_HEADER)
    for row in FORM:
        form.append(row)
    wb.create_sheet("kpi").append(["id", "name", "code", "measure_unit"])  # a sheet with no cui column: ignored
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / FILE
        wb.save(path)
        return path.read_bytes()


def main() -> None:
    shutil.rmtree(OUT, ignore_errors=True)
    summary = fetch_amepip(Archive(OUT), now=datetime(2026, 11, 14, 9, 0, tzinfo=timezone.utc), http=ckan_stub(workbook_bytes()))
    if summary.failed:
        raise SystemExit(f"fetch failed: {summary.failed}")
    print("\n".join(summary.lines()))


if __name__ == "__main__":
    main()
