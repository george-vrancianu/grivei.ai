"""Builds `archive-banipartide/`, BaniPartide's firm-donor table for the roles world (ticket #182). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_banipartide_archive.py

`archive-banipartide/` holds ONLY the `banipartide` unit, produced by running the REAL `fetch_banipartide` against a stub of db.banipartide.ro's Datasette (no
network): the table `Donatori persoane juridice`'s CSV export in the real shape (columns rowid, Nume, Suma, An, Partid, Tip donație, CUI, Reprezentant societate,
Sediu, Naționalitatea donatorului, Data donației, Felul donației, Filiala partidului). The seam-1 test copies it onto a copy of `archive-roles/` +
`archive-roles-names/` (see build_roles_archive.py), so the donations and the Records meet on the same CUIs. Every name, CUI and amount is invented.

  rowid 1  ALFA DEMO SRL 2000007 (a supplier)   donation  PNL     2023  50,000      one readable date 15.03.2023
  rowid 2  ALFA DEMO SRL 2000007                loan      PSD     2024  250,000.50  `250000,50`; the cell lists two dates, so no date is set
  rowid 3  BETA DEMO SRL 2000015 (a supplier)   donation  USR     2022  8,005.36    the compact date `4102022` reads as 4 October 2022
  rowid 4  CNAIR DEMO SA 2000031 (both roles)   donation  PSD+PC  2021  12,000      `RO 2000031`, `9 iunie 2021`; the party exactly as published
  rowid 5  a donor with no entity 5443785       donation  PNL     2020  700         loaded, but no page shows it
  rowid 6  `P.F. ZAMFIR ADRIAN FICTIV`          a truncated CNP as a number: an individual, dropped
  rowid 7  `POPA ELENA FICTIVA`                 a loan with an empty id: an individual, dropped
  rowid 8  a foreign body                       `n/a2`: not CUI-keyed, dropped
  rowid 9  ALFA                                 a zero amount: dropped; rowid 10: an unknown `Tip donație`: dropped

Every row carries a (fictitious) company representative in `Reprezentant societate`: the Connector strips that column at fetch, so it is in no archived file.
"""
from __future__ import annotations

import csv
import io
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
WATCHDOG = HERE.parents[1]
sys.path.insert(0, str(WATCHDOG))

from pipeline.archive import Archive  # noqa: E402
from pipeline.banipartide.fetch import DATABASE, DB, fetch_banipartide  # noqa: E402

OUT = HERE / "archive-banipartide"
NOW = datetime(2026, 11, 14, 9, 0, tzinfo=timezone.utc)
DB_HASH = "a27b538b18959ef0899003168196055f75664d82859ac1aab3ab48df4e408405"
METADATA = {"title": "db.banipartide.ro", "source": "Expert Forum", "source_url": "https://expertforum.ro/tag/finantare-politica/", "license": "CC Attribution 4.0 License",
            "license_url": "http://creativecommons.org/licenses/by/4.0/"}
HEADER = ["rowid", "Nume", "Suma", "An", "Partid", "Tip donație", "CUI", "Reprezentant societate", "Sediu", "Naționalitatea donatorului", "Data donației", "Felul donației", "Filiala partidului"]
DONATION, LOAN = "Donatii p. juridice", "Imprumuturi p. juridice"
REPRESENTATIVE = "Reprezentant Fictiv"
ROWS = [
    (1, "S.C. ALFA DEMO - S.R.L.", "50000", "2023", "PNL", DONATION, "2000007", "Cluj-Napoca, Jud. Cluj", "română", "15.03.2023", "Bani"),
    (2, "S.C. ALFA DEMO - S.R.L.", "250000,50", "2024", "PSD", LOAN, "2000007", "Cluj-Napoca, Jud. Cluj", "română", "20.01.2024; 15.05.2024", ""),
    (3, "BETA DEMO SRL", "8005.36", "2022", "USR", DONATION, "2000015", "București Sector 1", "română", "4102022", "Bani"),
    (4, "CNAIR DEMO SA", "12000", "2021", "PSD+PC", DONATION, "RO 2000031", "București Sector 1", "română", "9 iunie 2021", "Virament"),
    (5, "Donor fara intrare SRL", "700", "2020", "PNL", DONATION, "5443785\u00a0", "Brăila", "română", "", "Bani"),
    (6, "P.F. ZAMFIR ADRIAN FICTIV", "6000", "2008", "PDL", DONATION, "1,85E+12", "Sibiu", "română", "07.05.2008", "Bani"),
    (7, "POPA ELENA FICTIVA", "233800", "2020", "USR", LOAN, "", "", "", "", ""),
    (8, "Ambasada Exemplu", "5000", "2013", "PNL", DONATION, "n/a2", "", "croată", "17 iulie 2013", "Bani"),
    (9, "S.C. ALFA DEMO - S.R.L.", "0", "2023", "PNL", DONATION, "2000007", "Cluj-Napoca, Jud. Cluj", "română", "01.02.2023", "Bani"),
    (10, "S.C. ALFA DEMO - S.R.L.", "100", "2023", "PNL", "Altceva", "2000007", "Cluj-Napoca, Jud. Cluj", "română", "01.02.2023", "Bani"),
]


def export() -> bytes:
    out = io.StringIO(newline="")
    writer = csv.writer(out, lineterminator="\r\n")
    writer.writerow(HEADER)
    for rowid, name, amount, year, party, kind, cui, seat, nationality, when, how in ROWS:
        writer.writerow([rowid, name, amount, year, party, kind, cui, REPRESENTATIVE if cui else "", seat, nationality, when, how, ""])
    return out.getvalue().encode("utf-8")


class _Response:
    def __init__(self, body):
        self._body = body
        self.content = body if isinstance(body, bytes) else b""

    def raise_for_status(self) -> None:
        pass

    def json(self):
        return self._body


def datasette_stub(db_hash: str = DB_HASH, body: bytes | None = None, requested: list[str] | None = None):
    """db.banipartide.ro's Datasette as the Connector asks it: the root listing (database hash), the metadata, the firm table's CSV export. Anything else fails the test."""
    table = export() if body is None else body

    def http(url, **kwargs):
        if requested is not None:
            requested.append(url)
        if url == f"{DB}/.json":
            return _Response({DATABASE: {"name": DATABASE, "hash": db_hash}})
        if url == f"{DB}/-/metadata.json":
            return _Response(METADATA)
        if url.startswith(f"{DB}/{DATABASE}/Donatori%20persoane%20juridice.csv"):
            return _Response(table)
        raise AssertionError(f"unexpected request {url}")

    return http


def main() -> None:
    shutil.rmtree(OUT, ignore_errors=True)
    summary = fetch_banipartide(Archive(OUT), now=NOW, http=datasette_stub())
    if summary.failed or summary.invalid:
        raise SystemExit(f"fetch failed: {summary.failed} {summary.invalid}")
    print("\n".join(summary.lines()))


if __name__ == "__main__":
    main()
