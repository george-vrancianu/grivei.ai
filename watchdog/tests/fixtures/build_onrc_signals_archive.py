"""Builds `archive-onrc-signals/`, the raw-archive fixture of the six ONRC and financial-statement Signal rules (ticket #184). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_onrc_signals_archive.py

One archive holds every Source the rules read, made the way production makes them: the REAL `fetch_onrc` and `fetch_financials` run against CKAN stubs
(build_onrc_archive.py, build_financials_archive.py), SEAP's bulk files are written as units, and ANAF's answers are archived. Every name, CUI and number
is invented (CUIs carry valid check digits). The ONRC snapshots are archive-onrc's: the legacy 2025-03-18 one (the earliest, so a status it shows is
"since at least"), and three current ones, the newest 2026-05-06 ("now" for the insolvency rule). Statements: FY2022 and FY2023 (a first release and a revised
one) and FY2024 (a first release only: the newest year, so the no-statement rule leaves it out). Each case below is one supplier; `+` marks a Signal.

Authorities: A1 PRIMARIA SEMNAL UNU, A2 SPITALUL SEMNAL DOI. A firm registered 2025-03-01 is "young" (day N = 2025-03-01 plus N days).

YOUNG FIRM (YF_*, SRL registered 2025-03-01; first Record = the supplier's earliest)
  YF_FIRST_EARLY  DA day 10 (+, A1), DA day 80 (small, not the first Record: context only, no Signal)
  YF_FIRST_90     DA day 90 (+ boundary), a second DA the same day from A2 (+, also a first Record)
  YF_FIRST_91     DA day 91 (no: boundary)
  YF_LARGE_180    DA day 100 (first, no), contract of exactly 1,000,000 RON day 180 (+ boundary, A2)
  YF_LARGE_181    contract 5,000,000 RON day 181 (first Record, no)
  YF_UNDER_1M     contract 999,999.99 RON day 150 (first Record, no)
  YF_BEFORE       DA 5 days BEFORE registering (no), DA day 30 (not the first Record: no)
  OLD_FIRM        registered 2015, several 2025 Records and a 2026 contract (no); the 2026 Record makes the base-rate year 2025 for every rule
NO CONSTRUCTION CAEN (NC_*, DA works, CPV 45, one day each from 2025-04-10 in the order listed)
  NC_NONE_1M      6201 (Rev.3), exactly 1,000,000 RON (+ boundary)       NC_UNDER       6201, 999,999.99 RON (no)
  NC_REV2         4120 and 6201 (Rev.2), 2M (no: construction)            NC_REV3        4399 (Rev.3), 2M (no: construction)
  NC_REV2_DIV45   4511 (Rev.2: car trade; division 45 is construction only in Rev.1), 2M (+)
  NC_REV1_45      4521 (Rev.1: construction), 2M (no)                      NC_SUPPLIES    6201, supplies (CPV 30) 2M (no: not works)
  NC_UNKNOWN      no authorised CAEN loaded, works 2M (no: unknown is never a Signal)
AFTER STRIKE-OFF (SO_*, ANAF answers)
  SO_STRUCK       ANAF "RADIERE din data 15.03.2025": DA 03-14 (no), 03-15 (no: the day itself), 03-16 (+, A1), 06-01 (+, A2)
  SO_ONRC_ONLY    ANAF registered, ONRC "radiata" (undated: not read): DA 2025-07-01 (no)
  SO_NO_DATE      ANAF "RADIERE" without a date: DA 2025-07-02 (no)
INSOLVENCY (IN_*, ONRC statuses; newest snapshot 2026-05-06, so the window is 2025-11-06 to 2026-05-06)
  IN_FIRST_APR    insolvency first seen 2026-04-03: DA 2025-11-05 (no), 2025-11-06 (+ boundary), 2026-05-06 (+), 2026-05-07 (no: after the snapshot)
  IN_SINCE_AT_LEAST  insolvency shown by every snapshot, the legacy one included: DA 2026-01-15 (+, "since at least")
  IN_FORMER       insolvent in one snapshot only, in operation now: DA 2026-01-20 (no)
  IN_DISSOLVED    "dizolvare": DA 2026-01-21 (no)            IN_REORG   "reorganizare judiciara": DA 2026-02-10 (+, A2)
FEW EMPLOYEES (FE_*, contracts; statements FY2023 and FY2024)
  FE_BOUNDARY     2023: exactly 5,000,000 RON; first release 4 employees, REVISED release 1 employee (+: the revised figure is the one read)
  FE_UNDER        2023: 4,999,999.99 RON, 0 employees (no)     FE_TWO     2023: 6M, 2 employees (no)       FE_BLANK  2023: 6M, employees BLANK (no)
  FE_SUMMED       2024: 3M (A1) + 2M (A2) = 5M, FY2024 0 employees (+, two Signals); FY2023 9 employees
  FE_OTHER_YEAR   2023: 6M, a FY2022 statement with 1 employee but none for FY2023 (no)
  (`archive-onrc-signals-revised/` holds FY2024's REVISED release alone, for the variant in which the newest year counts: FE_SUMMED then reports 5 employees for FY2024 (no
  Signal) and NF_NEWEST_YEAR becomes a Signal.)
NO FINANCIAL STATEMENT (NF_*, contracts; the years evaluated are 2023 only: FY2022 is the first held, FY2024 the newest without its revised release)
  NF_EXACT        SRL, 2023: exactly 1,000,000 RON, no statement (+ boundary)    NF_UNDER   SRL, 999,999.99 RON (no)
  NF_SA           SA, 2023: 2M (+)                                                NF_PRIOR_ONLY  SRL 2M, FY2022 statement (no: Y-1 is enough)
  NF_YEAR_ONLY    SRL 2M, FY2023 statement (no)                                   NF_OTHER_FORM  a national company 2M (no: not SRL or SA)
  NF_NEWEST_YEAR  SRL 2M in 2024 (no: the newest fiscal year is left out)         NF_FIRST_YEAR  SRL 2M in 2022 (no: FY2021 is not held)
  NF_NOT_ONRC     ANAF knows it, ONRC does not: 2M in 2023 (no: legal form unknown)
"""
from __future__ import annotations

import shutil
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
sys.path.insert(0, str(HERE))

import build_onrc_archive as base  # noqa: E402
from build_financials_archive import ckan_stub, dataset, resource, row as fin_row, table  # noqa: E402
from build_identity_archive import anaf_entry, anaf_response  # noqa: E402
from build_onrc_archive import FETCHED, FUNCTIUNE, INSOLVENTA, RADIATA, S1, S2, S3, S4, ckan, cui_with_check_digit, datasets  # noqa: E402
from build_signals_archive import DA_HEADER, contract, da  # noqa: E402
from build_roles_archive import H22  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.financials.fetch import fetch_financials  # noqa: E402
from pipeline.onrc.fetch import fetch_onrc  # noqa: E402

OUT = HERE / "archive-onrc-signals"
OUT_REVISED = HERE / "archive-onrc-signals-revised"  # only FY2024's revised release: copied over `archive-onrc-signals` it makes the newest year evaluable
REORGANIZARE, DIZOLVARE = 1111, 1112
EXTRA_STATUS_NAMES = {REORGANIZARE: "reorganizare judiciară", DIZOLVARE: "dizolvare"}  # the codes are invented: the rule reads the NAME ONRC publishes
NOW = datetime(2026, 11, 14, 9, 0, tzinfo=timezone.utc)
REGISTERED = date(2025, 3, 1)  # the young firms' registration day
AUTH = {"A1": ("PRIMARIA SEMNAL UNU", cui_with_check_digit(320001)), "A2": ("SPITALUL SEMNAL DOI", cui_with_check_digit(320002))}
NEG, NONE = "Licitatie deschisa", "Fara acord cadru"
WORKS, SUPPLIES = "45233140-2", "30197000-6"


class Supplier:
    """One supplier of the world: its ONRC registration per snapshot, authorised CAEN codes, ANAF answer and Records."""

    all: list["Supplier"] = []

    def __init__(self, label: str, *, form="SRL", registered="10/03/2015", states: dict | None = None, caen=(), anaf="INREGISTRAT din data 01.01.2000", in_onrc=True):
        n = len(Supplier.all) + 1
        self.label, self.cui = label, cui_with_check_digit(320100 + n)
        self.name = f"{label.replace('_', ' ')} {form if form in ('SRL', 'SA') else 'SRL'}"
        self.reg = f"J40/{2000 + n}/2015"
        self.form, self.registered, self.caen, self.anaf, self.in_onrc = form, registered, list(caen), anaf, in_onrc
        self.states = states if states is not None else {S4: [FUNCTIUNE]}
        self.records: list[tuple] = []  # (kind, day, value RON as str, authority, cpv)
        Supplier.all.append(self)

    def da(self, day: date, value: str, authority="A1", cpv=SUPPLIES) -> "Supplier":
        self.records.append(("da", day, value, authority, cpv))
        return self

    def ct(self, day: date, value: str, authority="A1") -> "Supplier":
        self.records.append(("ct", day, value, authority, None))
        return self

    @property
    def tuple(self) -> tuple[str, str]:
        return (self.name, str(self.cui))


def day(n: int) -> date:
    return REGISTERED + timedelta(days=n)


def world() -> dict[str, Supplier]:
    Supplier.all = []
    s: dict[str, Supplier] = {}

    def add(label, **kw) -> Supplier:
        s[label] = Supplier(label, **kw)
        return s[label]

    young = {"registered": "01/03/2025"}
    add("YF_FIRST_EARLY", **young).da(day(10), "50000").da(day(80), "40000")
    add("YF_FIRST_90", **young).da(day(90), "30000").da(day(90), "30000", "A2")
    add("YF_FIRST_91", **young).da(day(91), "30000")
    add("YF_LARGE_180", **young).da(day(100), "30000").ct(day(180), "1000000", "A2")
    add("YF_LARGE_181", **young).ct(day(181), "5000000")
    add("YF_UNDER_1M", **young).ct(day(150), "999999.99")
    add("YF_BEFORE", **young).da(day(-5), "20000").da(day(30), "20000")
    add("OLD_FIRM").da(date(2025, 4, 2), "20000").da(date(2025, 6, 2), "30000").ct(date(2026, 4, 20), "20000")  # a 2026 Contracte Record: the data-through year is 2026

    for i, (label, codes, value, cpv) in enumerate((("NC_NONE_1M", [("6201", 3)], "1000000", WORKS), ("NC_UNDER", [("6201", 3)], "999999.99", WORKS),
                                      ("NC_REV2", [("4120", 2), ("6201", 2)], "2000000", WORKS), ("NC_REV3", [("4399", 3)], "2000000", WORKS),
                                      ("NC_REV2_DIV45", [("4511", 2)], "2000000", WORKS), ("NC_REV1_45", [("4521", 1)], "2000000", WORKS),
                                      ("NC_SUPPLIES", [("6201", 3)], "2000000", SUPPLIES), ("NC_UNKNOWN", [], "2000000", WORKS))):
        add(label, caen=codes).da(date(2025, 4, 10) + timedelta(days=i), value, cpv=cpv)  # one day each: a Signal groups a day's Records of an authority

    add("SO_STRUCK", anaf="RADIERE din data 15.03.2025").da(date(2025, 3, 14), "20000").da(date(2025, 3, 15), "20000").da(date(2025, 3, 16), "20000").da(date(2025, 6, 1), "20000", "A2")
    add("SO_ONRC_ONLY", states={S4: [RADIATA]}).da(date(2025, 7, 1), "20000")
    add("SO_NO_DATE", anaf="RADIERE").da(date(2025, 7, 2), "20000")

    add("IN_FIRST_APR", states={S2: [FUNCTIUNE], S3: [FUNCTIUNE, INSOLVENTA], S4: [FUNCTIUNE, INSOLVENTA]}).da(date(2025, 11, 5), "20000").da(date(2025, 11, 6), "20000") \
        .da(date(2026, 5, 6), "20000").da(date(2026, 5, 7), "20000")
    add("IN_SINCE_AT_LEAST", states={d: [FUNCTIUNE, INSOLVENTA] for d in (S1, S2, S3, S4)}).da(date(2026, 1, 15), "20000")
    add("IN_FORMER", states={S2: [FUNCTIUNE, INSOLVENTA], S3: [FUNCTIUNE], S4: [FUNCTIUNE]}).da(date(2026, 1, 20), "20000")
    add("IN_DISSOLVED", states={S4: [FUNCTIUNE, DIZOLVARE]}).da(date(2026, 1, 21), "20000")
    add("IN_REORG", states={S4: [FUNCTIUNE, REORGANIZARE]}).da(date(2026, 2, 10), "20000", "A2")

    add("FE_BOUNDARY").ct(date(2023, 6, 10), "5000000")
    add("FE_UNDER").ct(date(2023, 6, 11), "4999999.99")
    add("FE_TWO").ct(date(2023, 6, 12), "6000000")
    add("FE_BLANK").ct(date(2023, 6, 13), "6000000")
    add("FE_SUMMED").ct(date(2024, 2, 1), "3000000", "A1").ct(date(2024, 9, 1), "2000000", "A2")
    add("FE_OTHER_YEAR").ct(date(2023, 6, 14), "6000000")

    add("NF_EXACT").ct(date(2023, 5, 10), "1000000")
    add("NF_UNDER").ct(date(2023, 5, 11), "999999.99")
    add("NF_SA", form="SA").ct(date(2023, 5, 12), "2000000")
    add("NF_PRIOR_ONLY").ct(date(2023, 5, 13), "2000000")
    add("NF_YEAR_ONLY").ct(date(2023, 5, 14), "2000000")
    add("NF_OTHER_FORM", form="COMPANIE NATIONALA").ct(date(2023, 5, 15), "2000000")
    add("NF_NEWEST_YEAR").ct(date(2024, 5, 16), "2000000")
    add("NF_FIRST_YEAR").ct(date(2022, 5, 17), "2000000")
    add("NF_NOT_ONRC", in_onrc=False).ct(date(2023, 5, 18), "2000000")
    return s


def onrc_companies(suppliers: list[Supplier]) -> tuple[dict, dict]:
    companies, caen = {}, {}
    for a in AUTH.values():
        companies[f"J03/{a[1]}/1995"] = {d: base.row(a[0], a[1], [FUNCTIUNE], "Bistriţa-Năsăud", "Bistriţa", "02/02/1995", "ADMINISTRATIE") for d in (S1, S2, S3, S4)}
    for sup in suppliers:
        if not sup.in_onrc:
            continue
        companies[sup.reg] = {d: base.row(sup.name, sup.cui, codes, "Cluj", "Cluj-Napoca", sup.registered, sup.form) for d, codes in sup.states.items()}
        if sup.caen:
            caen[sup.reg] = sup.caen
    return companies, caen


def financials(s: dict[str, Supplier]) -> tuple[list[dict], dict]:
    files: dict[str, bytes] = {}

    def add(res: dict, body: bytes) -> dict:
        files[res["url"]] = body
        return res

    def r(label: str, **v) -> str:
        return fin_row(str(s[label].cui), **v)

    fy22 = table(r("FE_OTHER_YEAR", turnover=900_000_000, employees=1), r("NF_PRIOR_ONLY", turnover=3_000_000, employees=12))
    fy23 = table(r("FE_BOUNDARY", turnover=6_000_000, employees=4), r("FE_UNDER", turnover=5_000_000, employees=0), r("FE_TWO", turnover=7_000_000, employees=2),
                 r("FE_BLANK", turnover=7_000_000, employees=""), r("FE_SUMMED", turnover=4_000_000, employees=9), r("NF_YEAR_ONLY", turnover=2_500_000, employees=5))
    fy23_revised = table(r("FE_BOUNDARY", turnover=6_500_000, employees=1))
    fy24 = table(r("FE_SUMMED", turnover=6_000_000, employees=0))
    datasets_ = [
        dataset("situatii_financiare_2022", "Situații financiare 2022", add(resource("s2022", "WEB_BL_BS_SL_AN2022.txt", "2023-07-14"), fy22)),
        dataset("situatii_financiare2023", "Situații financiare 2023", add(resource("s2023", "WEB_BL_BS_SL_AN2023.txt", "2024-07-12"), fy23),
                add(resource("s2023r", "WEB_BL_BS_SL_AN2023 - actualizat", "2025-07-27"), fy23_revised)),
        dataset("situatii_financiare_2024", "Situațiile financiare 2024", add(resource("s2024", "WEB_BL_BS_SL_AN2024.txt", "2025-06-30"), fy24)),
    ]
    return datasets_, files


def build_revised(out: Path = OUT_REVISED) -> None:
    """FY2024's revised release (a separate dataset "... actualizat", as MF publishes it), fetched with the real connector into an archive of its own."""
    if out.exists():
        shutil.rmtree(out)
    s = world()
    files: dict[str, bytes] = {}
    res = resource("s2024r", "WEB_BL_BS_SL_AN2024.txt", "2026-06-24")
    files[res["url"]] = table(fin_row(str(s["FE_SUMMED"].cui), turnover=6_500_000, employees=5))
    summary = fetch_financials(Archive(out), now=NOW, http=ckan_stub([dataset("situatii_financiare_2024_actualizat", "Situatii financiare 2024 actualizat iunie 2026", res)], files))
    assert not summary.failed and not summary.invalid, summary.lines()


def build(out: Path = OUT) -> None:
    if out.exists():
        shutil.rmtree(out)
    a = Archive(out)
    s = world()
    suppliers = list(s.values())

    # ONRC: the real fetch against a CKAN stub (archive-onrc's four snapshots, with two more status names)
    companies, caen = onrc_companies(suppliers)
    saved = dict(base.STATUS_NAMES)
    base.STATUS_NAMES.update(EXTRA_STATUS_NAMES)
    try:
        packages, bodies = datasets(companies, caen)
    finally:
        base.STATUS_NAMES.clear()
        base.STATUS_NAMES.update(saved)
    summary = fetch_onrc(a, now=FETCHED, http=ckan(packages, bodies))
    assert not summary.failed and not summary.invalid, summary.lines()

    # MF's statements: the real fetch against the CKAN stub
    found, files = financials(s)
    fin = fetch_financials(a, now=NOW, http=ckan_stub(found, files))
    assert not fin.failed and not fin.invalid, fin.lines()

    # SEAP: one DA unit and one Contracte unit per quarter, published on the award day
    da_rows: dict[tuple[int, int], list[str]] = defaultdict(list)
    ct_rows: dict[tuple[int, int], list[str]] = defaultdict(list)
    n_da = n_ct = 0
    for sup in suppliers:
        for kind, d, value, authority, cpv in sup.records:
            quarter = (d.year, (d.month - 1) // 3 + 1)
            if kind == "da":
                n_da += 1
                da_rows[quarter].append(da(f"DA97{n_da:06d}", d.isoformat(), value, AUTH[authority], sup.tuple, cpv=cpv, published=d.strftime("%m/%d/%Y")))
            else:
                n_ct += 1
                ct_rows[quarter].extend(contract(f"CAN9700{n_ct:03d}", "1", AUTH[authority], NEG, NONE, d.isoformat(), value, sup.tuple))
    fetched = datetime(2026, 11, 10, 9, 0, tzinfo=timezone.utc)
    for (year, q), rows in sorted(da_rows.items()):
        label = f"t{q}-{year}"
        a.write_unit(source="seap", stream="bulk", kind="da", unit=f"{year}Q{q}", fetched_at=fetched,
                     files={f"raport-achizitii-directe-{label}.csv": ("\n".join([DA_HEADER, *rows]) + "\n").encode()},
                     via=f"Achizitii directe {label}", url=f"https://data.gov.ro/fixture/raport-achizitii-directe-{label}.csv")
    for (year, q), rows in sorted(ct_rows.items()):
        label = f"t{q}-{year}"
        a.write_unit(source="seap", stream="bulk", kind="contracte", unit=f"{year}Q{q}", fetched_at=fetched,
                     files={f"raport-contracte-{label}.csv": ("\n".join([H22, *rows]) + "\n").encode()},
                     via=f"Contracte {label}", url=f"https://data.gov.ro/fixture/raport-contracte-{label}.csv")

    # ANAF: every supplier and authority (the strike-off dates are ANAF's)
    entries = [anaf_entry(int(c), n) for n, c in AUTH.values()] + [anaf_entry(int(sup.cui), sup.name, state=sup.anaf) for sup in suppliers]
    ids = sorted(int(e["date_generale"]["cui"]) for e in entries)
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        archive_batch(a, chunk, date(2026, 11, 2), anaf_response([e for e in entries if int(e["date_generale"]["cui"]) in chunk], []), datetime(2026, 11, 2, 8, 0, tzinfo=timezone.utc))


if __name__ == "__main__":
    build()
    build_revised()
    print(f"wrote {OUT} and {OUT_REVISED}")
