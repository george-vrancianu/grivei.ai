"""Builds `archive-cross-donors/` and `archive-cross-soe/`, the raw-archive fixtures of the two cross-Source Signal rules (ticket #185). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_cross_signals_archive.py

Both are OVERLAYS: the Seam 1 and Restricted tests copy them onto the world they extend, so the Records meet the Mandates and the roles that world already has.
Every name, CUI and amount is invented (CUIs carry valid check digits).

`archive-cross-donors/` goes onto the party world (`archive-placement` + `archive-mf` + `archive-aep`, see build_aep_archive.py): BaniPartide's firm table (the REAL
`fetch_banipartide` against a Datasette stub, build_banipartide_archive.py), one SEAP DA unit and the archived ANAF answers of the donor firms. Mandates in force on the
award days: MUNICIPIUL BRASOV is PSD (2020-10-27 to 2024-09-27), ORAS RASNOV is PNL (same dates), COMUNA SANPETRU is the alliance USR PLUS (members PARTIDUL USR and
PARTIDUL LIBERTATE UNITATE SI SOLIDARITATE) and the county hospital is a subordinate body of the municipality (a derived Party). Each case is one donor firm with one
DA Record; the days are the award day and the donation day, `+` marks a Signal.

  DON_WITHIN        Brasov 2023-06-01   donation PSD 2023-03-01 (92 days)                                           +
  DON_SAME_DAY      Brasov 2023-06-02   donation PSD 2023-06-02 (the award day itself is in)                         +
  DON_DAY_365       Brasov 2023-06-05   donation PSD 2022-06-05 (365 days: the boundary is in)                      +
  DON_DAY_366       Brasov 2023-06-06   donation PSD 2022-06-05 (366 days: out)
  DON_AFTER         Brasov 2023-06-07   donation PSD 2023-06-08 (after the award: out)
  DON_LOAN          Brasov 2023-06-08   LOAN from PSD 2023-05-01 (a loan counts)                                    +  kind LOAN
  DON_OTHER_PARTY   Brasov 2023-06-09   donation PNL 2023-05-01 (PSD is in force: another party)
  DON_NO_DAY        Brasov 2023-06-13   donation PSD whose cell lists two dates (no single day: never triggers)
  DON_PFA           Brasov 2023-06-14   a sole trader (PFA): its donation row is dropped when the firm table is read (ADR 0009), so no Signal can name it
  DON_PREDECESSOR   Rasnov 2023-06-20   donation PDL 2023-05-01 (the Democratic-Liberal Party, a predecessor of PNL: not merged)
  DON_PNL           Rasnov 2023-06-21   donation PNL 2023-05-01 (the positive control for the predecessor case)    +
  DON_ALLIANCE      Sanpetru 2023-05-10 donation USR 2023-02-01 (a member party of the alliance that holds the Mandate)  +
  DON_NOT_MEMBER    Sanpetru 2023-05-11 donation PSD 2023-02-01 (not a member of the alliance)
  DON_DERIVED       hospital 2023-06-12 donation PSD 2023-05-01 (the hospital inherits Brasov's Party: a derived Party) +  derived
  DON_MANDATE_OLD   Brasov 2024-11-15   donation PSD 2023-12-15 (336 days; the Mandate in force on the award day is PNL since the 2024 handover: the outgoing Party is not it)
  DON_MANDATE_NEW   Brasov 2024-11-16   donation PNL 2023-12-15 (337 days; the Party of the Mandate in force on the award day)                +

`archive-cross-soe/` goes onto `archive-onrc-people` (build_onrc_people_archive.py: ONRC's people, SEAP counterparties): AMEPIP's list (BETA ONRC SRL, DUBLA ONRC SA
and OMEGA ONLY SRL are public enterprises), one SEAP DA unit and ANAF's answer for OMEGA. The persons are that world's (BETA and ALFA share ION POPESCU 12/03/1975; BETA
and GAMMA share only a name; DUBLA and OMEGA share STEFAN VLAD DUMITRESCU 01/02/1970; BETA's TOMA GHEORGHE is also an IF member of FAM TOMA IF).

  SOE_FIRES         BETA (public enterprise) awards ALFA (private; the same confirmed person administers both): DA 2026-04-20 twice, DA 2026-04-27      + 2 Signals
  SOE_NAMESAKE      BETA awards GAMMA, whose administrator is a namesake with another birth date: DA 2026-04-21
  SOE_SUPPLIER_SOE  DUBLA awards OMEGA, which is itself a public enterprise (the same person administers both): DA 2026-04-22
  SOE_IF            BETA awards FAM TOMA IF; the shared name is an IF member row, never read: DA 2026-04-23
"""
from __future__ import annotations

import csv
import io
import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
sys.path.insert(0, str(HERE))

import build_amepip_archive as amepip  # noqa: E402
import build_banipartide_archive as bani  # noqa: E402
from build_identity_archive import DA_HEADER, anaf_entry, anaf_response  # noqa: E402
from build_onrc_archive import BETA, DUBLA, OMEGA, ALFA, GAMMA, cui_with_check_digit  # noqa: E402
from build_onrc_people_archive import FAM  # noqa: E402
from build_placement_archive import CUI, make_cui  # noqa: E402
from build_roles_archive import da as soe_da  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.amepip.fetch import fetch_amepip  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.banipartide.fetch import fetch_banipartide  # noqa: E402

OUT_DONORS = HERE / "archive-cross-donors"
OUT_SOE = HERE / "archive-cross-soe"
NOW = datetime(2026, 11, 14, 9, 0, tzinfo=timezone.utc)
DON = {label: make_cui(5200000 + 10 * n) for n, label in enumerate(
    ["WITHIN", "SAME_DAY", "DAY_365", "DAY_366", "AFTER", "LOAN", "OTHER_PARTY", "NO_DAY", "PFA", "PREDECESSOR", "PNL", "ALLIANCE", "NOT_MEMBER", "DERIVED", "MANDATE_OLD", "MANDATE_NEW"], start=1)}
DON_NAMES = {label: ("ZAMFIR DEMO PFA" if label == "PFA" else f"DONATOR {label.replace('_', ' ')} SRL") for label in DON}
AUTHORITIES = {"brasov": ("MUNICIPIUL BRASOV", CUI["brasov"]), "rasnov": ("ORAS RASNOV", CUI["rasnov"]), "sanpetru": ("COMUNA SANPETRU", CUI["sanpetru"]),
               "hospital": ("SPITALUL CLINIC JUDETEAN DEMO BRASOV", make_cui(5100320))}  # build_aep_archive.py NAMES / NEW (not imported: it needs xlwt)
# label -> (authority, award day, party as published, donation kind, donation day text, amount)
DONATION, LOAN = bani.DONATION, bani.LOAN
CASES = {
    "WITHIN": ("brasov", date(2023, 6, 1), "PSD", DONATION, "01.03.2023", "10000"),
    "SAME_DAY": ("brasov", date(2023, 6, 2), "PSD", DONATION, "02.06.2023", "11000"),
    "DAY_365": ("brasov", date(2023, 6, 5), "PSD", DONATION, "05.06.2022", "12000"),
    "DAY_366": ("brasov", date(2023, 6, 6), "PSD", DONATION, "05.06.2022", "13000"),
    "AFTER": ("brasov", date(2023, 6, 7), "PSD", DONATION, "08.06.2023", "14000"),
    "LOAN": ("brasov", date(2023, 6, 8), "PSD", LOAN, "01.05.2023", "15000"),
    "OTHER_PARTY": ("brasov", date(2023, 6, 9), "PNL", DONATION, "01.05.2023", "16000"),
    "NO_DAY": ("brasov", date(2023, 6, 13), "PSD", DONATION, "01.05.2023; 02.05.2023", "17000"),
    "PFA": ("brasov", date(2023, 6, 14), "PSD", DONATION, "01.05.2023", "18000"),
    "PREDECESSOR": ("rasnov", date(2023, 6, 20), "PDL", DONATION, "01.05.2023", "19000"),
    "PNL": ("rasnov", date(2023, 6, 21), "PNL", DONATION, "01.05.2023", "20000"),
    "ALLIANCE": ("sanpetru", date(2023, 5, 10), "USR", DONATION, "01.02.2023", "21000"),
    "NOT_MEMBER": ("sanpetru", date(2023, 5, 11), "PSD", DONATION, "01.02.2023", "22000"),
    "DERIVED": ("hospital", date(2023, 6, 12), "PSD", DONATION, "01.05.2023", "23000"),
    "MANDATE_OLD": ("brasov", date(2024, 11, 15), "PSD", DONATION, "15.12.2023", "24000"),
    "MANDATE_NEW": ("brasov", date(2024, 11, 16), "PNL", DONATION, "15.12.2023", "25000"),
}


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def donors_export() -> bytes:
    out = io.StringIO(newline="")
    writer = csv.writer(out, lineterminator="\r\n")
    writer.writerow(bani.HEADER)
    for rowid, (label, (_, _, party, kind, when, amount)) in enumerate(CASES.items(), start=1):
        year = when[-4:]
        writer.writerow([rowid, DON_NAMES[label], amount, year, party, kind, DON[label], bani.REPRESENTATIVE, "București Sector 1", "română", when, "Bani", ""])
    return out.getvalue().encode("utf-8")


def da_row(code: str, day: date, authority, supplier) -> str:
    return (f"|{code}|,|03/20/2023|,|Oferta acceptata|,|{authority[0]}|,|{authority[1]}|,|Achizitie {code}|,|30197000-6|,|Articole de papetarie (Rev.2)|,"
            f"|{day:%m/%d/%Y}|,1000,1000,|{supplier[0]}|,|{supplier[1]}|")


def build_donors() -> None:
    shutil.rmtree(OUT_DONORS, ignore_errors=True)
    a = Archive(OUT_DONORS)
    summary = fetch_banipartide(a, now=NOW, http=bani.datasette_stub(body=donors_export()))
    assert not summary.failed and not summary.invalid, summary.lines()
    rows = [da_row(f"DA97{n:06d}", day, AUTHORITIES[authority], (DON_NAMES[label], DON[label])) for n, (label, (authority, day, *_)) in enumerate(CASES.items(), start=1)]
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2023Q2", fetched_at=at(2026, 11, 14), files={"raport-achizitii-directe-t2-2023.csv": ("\n".join([DA_HEADER, *rows]) + "\n").encode()},
                 via="Achizitii directe 2023 T2", url="https://data.gov.ro/fixture/raport-achizitii-directe-t2-2023.csv")
    entries = [anaf_entry(int(DON[label]), DON_NAMES[label]) for label in DON]
    archive_batch(a, sorted(e["date_generale"]["cui"] for e in entries), date(2026, 11, 2), anaf_response(entries, []), at(2026, 11, 2, 8))


def build_soe() -> None:
    shutil.rmtree(OUT_SOE, ignore_errors=True)
    a = Archive(OUT_SOE)
    calc = [(n, cui, name, reg, "4120", "funcţiune", None, 2023, "4120") for n, (name, cui, reg) in enumerate((BETA, DUBLA, OMEGA), start=1)]
    original = amepip.CALC, amepip.FORM
    amepip.CALC, amepip.FORM = calc, []
    try:
        summary = fetch_amepip(a, now=NOW, http=amepip.ckan_stub(amepip.workbook_bytes()))
    finally:  # the module is shared by the other tests of one process: leave it as found
        amepip.CALC, amepip.FORM = original
    assert not summary.failed, summary.lines()
    das = [soe_da("DA96000001", "2026-04-20", "100000", BETA[:2], ALFA[:2]), soe_da("DA96000002", "2026-04-20", "50000", BETA[:2], ALFA[:2]),
           soe_da("DA96000003", "2026-04-27", "30000", BETA[:2], ALFA[:2]), soe_da("DA96000004", "2026-04-21", "20000", BETA[:2], GAMMA[:2]),
           soe_da("DA96000005", "2026-04-22", "40000", DUBLA[:2], OMEGA[:2]), soe_da("DA96000006", "2026-04-23", "10000", BETA[:2], FAM[:2])]
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2026Q2", fetched_at=at(2026, 11, 14), files={"raport-achizitii-directe-t2-2026.csv": ("\n".join([DA_HEADER, *das]) + "\n").encode()},
                 via="Achizitii directe 2026 T2", url="https://data.gov.ro/fixture/raport-achizitii-directe-t2-2026.csv")
    entry = anaf_entry(OMEGA[1], OMEGA[0], state="INREGISTRAT din data 01.01.2000")
    archive_batch(a, [OMEGA[1]], date(2026, 11, 2), anaf_response([entry], []), at(2026, 11, 2, 8))


if __name__ == "__main__":
    build_donors()
    build_soe()
    print(f"wrote {OUT_DONORS} and {OUT_SOE}")
