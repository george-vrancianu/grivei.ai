"""Builds `archive-financials/`, MF's annual financial statements for the roles world (ticket #179). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_financials_archive.py

`archive-financials/` holds ONLY the `financials` units, produced by running the REAL `fetch_financials` against a stub of data.gov.ro's CKAN (no
network): MF's bulk files in the real shape (comma-separated, CRLF, header `CUI,CAEN,I1,...,I20`; I7 debts, I10 equity, I13 turnover, I18/I19 net
profit/loss, I20 average employees), spread over the real datasets' layout: FY2022 and FY2024 first releases, FY2023 with its `- actualizat`
resource in the same dataset, FY2024's re-publication as a separate dataset "... actualizat", the newest year FY2025 (first release only; a
UU file too), and files the connector must not take (a column-list `.csv`, a bank's file, a pre-2021 year). The seam-1 test copies it onto a copy of
`archive-roles/` + `archive-roles-names/` (see build_roles_archive.py), so the statements and the Records meet on the same CUIs.

  ALFA DEMO SRL 2000007 (a supplier; awards 2023 and 2024)
      FY2022 first      turnover 4,000,000, profit 200,000, employees BLANK
      FY2023 revised    (first release said turnover 11,000,000, profit 400,000, 40 employees) now turnover 12,000,000, a LOSS of 150,000, 41 employees
      FY2024 first      only the first release holds it (the revised file does not): FIRST although a revised file exists; employees 0 (a reported zero)
      FY2025 first      the newest year: may still be revised; employees BLANK and debts BLANK
  CNAIR DEMO SA 2000031 (both roles)   FY2023 first only: turnover 100,000,000, 3,000 employees
  BETA DEMO SRL 2000015                FY2024 revised only (turnover 8,000,000), FY2025 in the UU file with a BLANK turnover
  GAMMA DEMO SRL 2000023               FY2023 first with turnover 0 (no share can be computed)
  4300011                              in FY2023 and no Record names it (no entity: nothing to show)

The rows are invented; the file and column names are the real ones.
"""
from __future__ import annotations

import shutil
import zlib
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
WATCHDOG = HERE.parents[1]
sys.path.insert(0, str(WATCHDOG))

from pipeline.archive import Archive  # noqa: E402
from pipeline.financials.fetch import fetch_financials  # noqa: E402

OUT = HERE / "archive-financials"
NOW = datetime(2026, 11, 14, 9, 0, tzinfo=timezone.utc)
HEADER = "CUI,CAEN," + ",".join(f"I{i}" for i in range(1, 21))
FIELDS = {"debts": 7, "equity": 10, "turnover": 13, "profit": 18, "loss": 19, "employees": 20}


def row(cui: str, **values: int | str) -> str:
    cells = [""] * 20
    cells[0] = str(values.pop("assets", 1_000_000))  # I1 filler
    for name, v in values.items():
        cells[FIELDS[name] - 1] = str(v)
    return f"{cui},4120," + ",".join(cells)


def table(*rows: str) -> bytes:
    return ("\r\n".join([HEADER, *rows]) + "\r\n").encode("ascii")


def resource(rid: str, name: str, published: str, fmt: str = "TXT") -> dict:
    ext = "csv" if fmt == "CSV" else "txt"
    stem = name.lower().split(" ")[0].removesuffix(".txt").removesuffix(".csv")
    return {"id": rid, "name": name, "format": fmt, "size": 1, "last_modified": f"{published}T11:29:07.618294", "hash": "",
            "url": f"https://data.gov.ro/dataset/ds/resource/{rid}/download/{stem}.{ext}"}


def dataset(name: str, title: str, *resources: dict) -> dict:
    return {"id": f"00000000-0000-0000-0000-{zlib.crc32(name.encode()):012d}", "name": name, "title": title, "license_id": "CC-BY-4.0", "resources": list(resources)}


FILES: dict[str, bytes] = {}


def add(res: dict, body: bytes) -> dict:
    FILES[res["url"]] = body
    return res


DATASETS = [
    dataset("situatii_financiare_2022", "Situații financiare 2022",
            add(resource("r2022bl", "WEB_BL_BS_SL_AN2022.txt", "2023-08-28"), table(row("2000007", turnover=4_000_000, profit=200_000, loss=0, debts=1_000_000, equity=900_000, employees=""))),
            resource("r2022spec", "WEB_BL_BS_SL_AN2022.csv", "2023-08-28", "CSV")),  # the column list: not a statements file
    dataset("situatii_financiare2023", "Situații financiare 2023",
            add(resource("r2023bl", "WEB_BL_BS_SL_AN2023.txt", "2024-07-12"),
                table(row("2000007", turnover=11_000_000, profit=400_000, loss=0, debts=2_000_000, equity=1_500_000, employees=40),
                      row("2000031", turnover=100_000_000, profit=5_000_000, loss=0, debts=30_000_000, equity=60_000_000, employees=3000),
                      row("2000023", turnover=0, profit=0, loss=0, debts=10_000, equity=5_000, employees=1),
                      row("4300011", turnover=1_000_000, profit=1_000, loss=0, debts=100, equity=900, employees=5))),
            add(resource("r2023bl-rev", "WEB_BL_BS_SL_AN2023 - actualizat", "2025-07-27"),
                table(row("2000007", turnover=12_000_000, profit=0, loss=150_000, debts=2_100_000, equity=1_350_000, employees=41),
                      row("4300011", turnover=1_000_000, profit=1_000, loss=0, debts=100, equity=900, employees=5))),
            resource("r2023ban", "WEB_Inst_de_credit_2023.txt", "2024-07-12")),  # a bank's file: other columns, never read
    dataset("situatii_financiare_2024", "Situațiile financiare 2024",
            add(resource("r2024bl", "WEB_BL_BS_SL_AN2024.txt", "2025-06-30"),
                table(row("2000007", turnover=20_000_000, profit=1_000_000, loss=0, debts=3_000_000, equity=2_500_000, employees=0),
                      row("2000015", turnover=7_000_000, profit=300_000, loss=0, debts=1_000_000, equity=800_000, employees=25)))),
    dataset("situatii_financiare_2024_actualizat", "Situatii financiare 2024 actualizat iunie 2026",
            add(resource("r2024bl-rev", "WEB_BL_BS_SL_AN2024.txt", "2026-06-24"),
                table(row("2000015", turnover=8_000_000, profit=350_000, loss=0, debts=1_100_000, equity=850_000, employees=26)))),
    dataset("situatii_financiare_2025", "Situatii financiare 2025",
            add(resource("r2025bl", "WEB_BL_BS_SL_AN2025.txt", "2026-06-11"),
                table(row("2000007", turnover=30_000_000, profit=900_000, loss=0, equity=3_000_000, employees=""))),
            add(resource("r2025uu", "WEB_UU_AN2025.txt", "2026-06-11"),
                table(row("2000015", profit=100_000, loss=0, debts=500_000, equity=400_000, employees=12)))),
    dataset("situatii_financiare_2021", "Situații financiare 2021",
            add(resource("r2020old", "WEB_BL_BS_SL_AN2020.txt", "2022-06-22"), table(row("2000007", turnover=1)))),  # older than FY2021: never fetched
    dataset("date_identificare_062025", "Date de identificare plătitori actualizate iunie 2025", resource("rdate", "dateidentificare2025.csv", "2025-07-25", "CSV")),
]


class _Response:
    def __init__(self, body: bytes | dict):
        self._body = body

    def raise_for_status(self) -> None:
        pass

    def json(self) -> dict:
        return self._body  # type: ignore[return-value]

    def iter_content(self, chunk_size: int):
        yield self._body  # type: ignore[misc]


def ckan_stub(datasets=None, files=None, page: int = 3):
    """data.gov.ro's CKAN as `fetch_financials` asks it: package_search pages of `page` datasets (the portal may answer fewer than `rows`), then the files."""
    datasets = DATASETS if datasets is None else datasets
    files = FILES if files is None else files

    def http(url, **kwargs):
        if "package_search" in url:
            assert "organization:mfp" in url
            start = int(url.rsplit("start=", 1)[1])
            return _Response({"success": True, "result": {"count": len(datasets), "results": datasets[start:start + page]}})
        if url in files:
            return _Response(files[url])
        raise AssertionError(f"unexpected request {url}")

    return http


def main() -> None:
    shutil.rmtree(OUT, ignore_errors=True)
    summary = fetch_financials(Archive(OUT), now=NOW, http=ckan_stub())
    if summary.failed or summary.invalid:
        raise SystemExit(f"fetch failed: {summary.failed} {summary.invalid}")
    print("\n".join(summary.lines()))


if __name__ == "__main__":
    main()
