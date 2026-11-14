"""Builds `archive-onrc-people/`, the raw-archive fixture of ONRC's people (ticket #177). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_onrc_people_archive.py

It is `archive-onrc` (build_onrc_archive.py: four snapshots, a SEAP slice, archived ANAF answers) with the two people files added to the three
`current` snapshots (the real file names and columns, checked against the live data.gov.ro files: `^`-separated, a BOM, `dd/mm/yyyy` birth dates that
sometimes carry a time, the birthplace in `LOCALITATE_NASTERE`, `JUDET_NASTERE`, `TARA_NASTERE`; the IF file puts the county after a comma), and two
more registrations (a PFA and an IF that are SEAP suppliers). Every name, CUI and number is invented. The people, by organisation:

  ALFA ONRC SRL    supplier   ION POPESCU 12/03/1975 (Cluj), MARIA IONESCU 05/05/1980 (Iasi), GHEORGHE RADU 15/06/1968 (born in Cluj)
  BETA ONRC SRL    supplier   POPESCU ION 12/03/1975 (the SAME person as in ALFA: word order differs), a legal-person representative, TOMA GHEORGHE 02/02/1965
  GAMMA ONRC SRL   supplier   ION POPESCU 20/08/1962 (a namesake: another birth date, another person)
  DELTA ONRC SRL   supplier   GHEORGHE RADU 15/06/1968 (born in Bihor: the same name and date as ALFA's but a different county = a POSSIBLE MATCH, never served),
                              TUDOR NEGRU with no birth date (an UNLINKED role holder)
  DUBLA ONRC SA    both       STEFAN-VLAD DUMITRESCU 01/02/1970 (with diacritics and a hyphen)
  OMEGA ONLY SRL   ONRC only  DUMITRESCU STEFAN VLAD 01/02/1970 (the same person as at DUBLA: normalised key equal): its people are never named on a page
  POPESCU DEMO PFA no CUI     a row with a birth date: a PFA's holder is the registration itself, never linked
  VASILESCU DEMO PFA  supplier  PFA with a CUI: one row in the legal-representative file, never served
  FAM TOMA IF      supplier   an IF (family enterprise): TOMA GHEORGHE 02/02/1965 (born "BISTRA, ALBA", the same person as BETA's administrator) and TOMA ELENA
"""
from __future__ import annotations

import hashlib
import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1]))

import build_onrc_archive as base  # noqa: E402
from build_onrc_archive import ALFA, AUTH, BETA, BOM, COMPANIES, DELTA, DUBLA, FETCHED, FUNCTIUNE, GAMMA, OMEGA, PFA, S2, S3, S4, ckan, cui_with_check_digit, datasets  # noqa: E402
from build_identity_archive import anaf_entry, anaf_response  # noqa: E402
from build_roles_archive import DA_HEADER, da  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.onrc.fetch import fetch_onrc  # noqa: E402

OUT = HERE / "archive-onrc-people"

PFA2 = ("VASILESCU DEMO PFA", cui_with_check_digit(310011), "F40/1011/2019")  # a PFA with a CUI, a SEAP supplier
FAM = ("FAM TOMA IF", cui_with_check_digit(310012), "F01/1012/2018")  # an IF (family enterprise), a SEAP supplier
LEGAL_HEADER = "COD_INMATRICULARE^PERSOANA_IMPUTERNICITA^CALITATE^DATA_NASTERE^LOCALITATE_NASTERE^JUDET_NASTERE^TARA_NASTERE^LOCALITATE^JUDET^TARA"
IF_HEADER = "COD_INMATRICULARE^NUME^DATA_NASTERE^LOCALITATE_NASTERE^JUDET_NASTERE^TARA_NASTERE^CALITATE"

# (registration, holder as ONRC writes it, role, birth date as written, birth locality, birth county)
LEGAL_ROWS = [
    (ALFA[2], "POPESCU ION", "administrator", "12/03/1975", "Loc. Cluj-Napoca", "Cluj"),
    (ALFA[2], "IONESCU MARIA", "administrator", "05/05/1980 09:24:59", "Loc. Iaşi", "Iaşi"),
    (ALFA[2], "RADU GHEORGHE", "reprezentant legal", "15/06/1968", "Loc. Turda", "Cluj"),
    (BETA[2], "ION POPESCU", "administrator", "12/03/1975 00:00:00", "Cluj-Napoca", "Cluj"),  # the same person as ALFA's: word order, a time of day
    (BETA[2], "SC SERVICII EXEMPLU SRL", "reprezentant al persoanei juridice", "", "", ""),  # a legal person: no birth date, an unlinked holder
    (BETA[2], "TOMA GHEORGHE", "administrator", "02/02/1965", "BISTRA, ALBA", ""),
    (GAMMA[2], "POPESCU ION", "administrator", "20/08/1962", "Loc. Turda", "Cluj"),  # a namesake
    (DELTA[2], "RADU GHEORGHE", "administrator", "15/06/1968", "Loc. Oradea", "Bihor"),  # same name and date as ALFA's, another county: a possible match
    (DELTA[2], "NEGRU TUDOR", "administrator", "", "", ""),  # no birth date: an unlinked role holder
    (DUBLA[2], "DUMITRESCU ȘTEFAN-VLAD", "administrator", "01/02/1970", "Loc. Iaşi", "Iaşi"),
    (OMEGA[2], "STEFAN VLAD DUMITRESCU", "administrator", "01/02/1970", "Loc. Iaşi", "Iaşi"),  # an organisation only in ONRC: never named
    (PFA[2], "POPESCU DEMO", "administrator", "04/04/1960", "Loc. Cluj-Napoca", "Cluj"),
    (PFA2[2], "VASILESCU DEMO", "administrator", "06/06/1961", "Loc. Cluj-Napoca", "Cluj"),
]
IF_ROWS = [
    (FAM[2], "TOMA GHEORGHE", "02/02/1965", "BISTRA, ALBA", "reprezentant întreprindere familiala"),
    (FAM[2], "TOMA ELENA", "03/03/1967", "TURDA, CLUJ", "membru întreprindere familiala"),
]


def people_files() -> dict[str, str]:
    legal = [LEGAL_HEADER] + [f"{reg}^{name}^{role}^{born}^{locality}^{county}^{'România' if born else ''}^Cluj-Napoca^Cluj^România" for reg, name, role, born, locality, county in LEGAL_ROWS]
    ifs = [IF_HEADER] + [f"{reg}^{name}^{born}^{place}^^^{role}" for reg, name, born, place, role in IF_ROWS]
    return {"od_reprezentanti_legali.csv": BOM + "\n".join(legal) + "\n", "od_reprezentanti_if.csv": BOM + "\n".join(ifs) + "\n"}


def _row(name, cui, form, county="Cluj", locality="Cluj-Napoca", registered="01/06/2018"):
    return base.row(name, cui, [FUNCTIUNE], county, locality, registered, form)


def build() -> None:
    extra = {PFA2[2]: {d: _row(PFA2[0], PFA2[1], "PFA", registered="03/09/2019") for d in (S2, S3, S4)},
             FAM[2]: {d: _row(FAM[0], FAM[1], "ÎNTREPRINDERE FAMILIALĂ") for d in (S2, S3, S4)}}
    original = dict(COMPANIES)
    current_files = base._current_files
    COMPANIES.update(extra)
    base._current_files = lambda key: {**current_files(key), **people_files()}
    try:
        packages, bodies = datasets()
    finally:  # the base module is shared by the other tests of one process: leave it as found
        COMPANIES.clear()
        COMPANIES.update(original)
        base._current_files = current_files
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)
    summary = fetch_onrc(a, now=FETCHED, http=ckan(packages, bodies))
    assert not summary.failed and not summary.invalid, summary.lines()
    at = lambda y, m, d, h=9: datetime(y, m, d, h, 0, tzinfo=timezone.utc)  # noqa: E731
    das = [da("DA95000001", "2026-02-10", "100000", AUTH[:2], ALFA[:2]), da("DA95000002", "2026-02-12", "50000", AUTH[:2], BETA[:2]),
           da("DA95000003", "2026-02-14", "30000", AUTH[:2], GAMMA[:2]), da("DA95000004", "2026-02-15", "20000", AUTH[:2], DELTA[:2]),
           da("DA95000005", "2026-02-16", "40000", AUTH[:2], DUBLA[:2]), da("DA95000006", "2026-02-17", "10000", DUBLA[:2], ALFA[:2]),
           da("DA95000007", "2026-02-18", "7000", AUTH[:2], PFA2[:2]), da("DA95000008", "2026-02-19", "8000", AUTH[:2], FAM[:2])]
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2026Q1", fetched_at=at(2026, 4, 15),
                 files={"raport-achizitii-directe-t1-2026.csv": ("\n".join([DA_HEADER, *das]) + "\n").encode()},
                 via="Achizitii directe 2026 - T1", url="https://data.gov.ro/fixture/raport-achizitii-directe-t1-2026.csv")
    known = [AUTH, ALFA, BETA, GAMMA, DUBLA, PFA2, FAM]
    entries = [anaf_entry(c, n, state="INREGISTRAT din data 01.01.2000") for n, c, _ in known]
    ids = [c for _, c, _ in known] + [DELTA[1]]
    archive_batch(a, ids, date(2026, 11, 2), anaf_response(entries, [DELTA[1]]), at(2026, 11, 2, 8))


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
