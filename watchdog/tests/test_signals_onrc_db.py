"""The six ONRC and financial-statement Signal rules through a real rebuild (ticket #184): `archive-onrc-signals/` (built by
`fixtures/build_onrc_signals_archive.py`, whose docstring lists every case) is rebuilt and each rule's Signals are compared with the expected set: positive,
boundary and negative cases, and the facts that are context only. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
import sys
from datetime import date
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

sys.path.insert(0, str(Path(__file__).parent / "fixtures"))
from build_onrc_signals_archive import AUTH, day, world  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

ARCHIVE = Path(__file__).parent / "fixtures" / "archive-onrc-signals"
A1, A2 = (str(AUTH[k][1]) for k in ("A1", "A2"))


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


@pytest.fixture(scope="module")
def labels():
    return {str(s.cui): label for label, s in world().items()}


@pytest.fixture
def built(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    summary = rebuild(Archive(root), db)
    return db, summary


def found(url, labels, rule):
    """The rule's Signals as (authority CUI, last date, sorted supplier labels, numbers), in date order."""
    rows = q(url, "SELECT authority_key, last_date, supplier_keys, numbers, record_count FROM seap.signal WHERE rule = %s ORDER BY last_date, authority_key", rule)
    return [(a, d, sorted(labels[k] for k in keys), n, c) for a, d, keys, n, c in rows]


def who(signals):
    return [(a, d, s) for a, d, s, _, _ in signals]


def test_young_firm(built, labels):
    url, summary = built
    got = found(url, labels, "YOUNG_FIRM")
    assert who(got) == [
        (A1, day(10), ["YF_FIRST_EARLY"]),   # the first Record, day 10 (the day-80 Record is context only: no Signal)
        (A1, day(90), ["YF_FIRST_90"]),      # boundary: day 90 is in
        (A2, day(90), ["YF_FIRST_90"]),      # the same supplier's other Record of its first day: also a first Record
        (A2, day(180), ["YF_LARGE_180"]),    # boundary: exactly 1,000,000 RON on day 180
    ]
    assert got[1][3] == {"days": 90, "registered": "2025-03-01", "counted": "3000000"}
    assert got[3][3] == {"days": 180, "registered": "2025-03-01", "counted": "100000000"}
    # not in any Signal: day 91, a Record of 5M on day 181, 999,999.99 RON on day 150, a Record before registering, an old firm
    assert q(url, "SELECT count(*) FROM seap.signal WHERE rule = 'YOUNG_FIRM' AND last_date IN (%s, %s, %s, %s, %s, %s)", day(91), day(181), day(150), day(-5), day(30), day(80))[0][0] == 0
    assert summary.signals["YOUNG_FIRM"] == 4


def test_works_without_a_construction_caen(built, labels):
    url, _ = built
    got = found(url, labels, "NO_CONSTRUCTION_CAEN")
    assert who(got) == [(A1, date(2025, 4, 10), ["NC_NONE_1M"]), (A1, date(2025, 4, 14), ["NC_REV2_DIV45"])]
    assert got[0][3] == {"value": "100000000", "authorisedCodes": 1}  # exactly 1,000,000 RON; NC_UNDER (999,999.99) is not in
    assert got[1][3] == {"value": "200000000", "authorisedCodes": 1}  # CAEN Rev.2 4511 is car trade: division 45 is construction only in Rev.1


def test_a_record_after_the_anaf_strike_off(built, labels):
    url, _ = built
    got = found(url, labels, "AFTER_STRIKE_OFF")
    assert who(got) == [(A1, date(2025, 3, 16), ["SO_STRUCK"]), (A2, date(2025, 6, 1), ["SO_STRUCK"])]  # not 03-14 nor the day itself (03-15)
    assert got[0][3] == {"struckOff": "2025-03-15", "daysAfter": 1}
    assert got[1][3] == {"struckOff": "2025-03-15", "daysAfter": 78}


def test_insolvency_is_undated_and_looks_at_the_last_six_months_of_the_newest_snapshot(built, labels):
    url, _ = built
    got = found(url, labels, "INSOLVENCY")
    assert who(got) == [
        (A1, date(2025, 11, 6), ["IN_FIRST_APR"]),        # boundary: exactly 6 months before the 2026-05-06 snapshot (2025-11-05 is out)
        (A1, date(2026, 1, 15), ["IN_SINCE_AT_LEAST"]),
        (A2, date(2026, 2, 10), ["IN_REORG"]),            # reorganisation, told by the status name
        (A1, date(2026, 5, 6), ["IN_FIRST_APR"]),         # the snapshot day itself (2026-05-07 is after it)
    ]
    assert got[0][3] == {"status": "insolvență", "firstSeen": "2026-04-03", "sinceAtLeast": False}
    assert got[1][3] == {"status": "insolvență", "firstSeen": "2025-03-18", "sinceAtLeast": True}
    assert got[2][3] == {"status": "reorganizare judiciară", "firstSeen": "2026-05-06", "sinceAtLeast": False}


def test_at_most_one_employee(built, labels):
    url, _ = built
    got = found(url, labels, "FEW_EMPLOYEES")
    assert who(got) == [
        (A1, date(2023, 6, 10), ["FE_BOUNDARY"]),  # exactly 5M RON; the REVISED release (1 employee) is read, the first said 4
        (A1, date(2024, 2, 1), ["FE_SUMMED"]),     # two Records, two authorities: 3M + 2M = 5M for the year (FY2024: 0 reported)
        (A2, date(2024, 9, 1), ["FE_SUMMED"]),
    ]
    assert got[0][3] == {"fiscalYear": 2023, "employees": 1, "awarded": "500000000"}
    assert got[1][3] == {"fiscalYear": 2024, "employees": 0, "awarded": "500000000"}
    # FE_UNDER (4,999,999.99 RON), FE_TWO (2 employees), FE_BLANK (blank never fires) and FE_OTHER_YEAR (a statement for another year) are out


def test_no_financial_statement_leaves_the_newest_fiscal_year_out(built, labels):
    url, _ = built
    got = found(url, labels, "NO_FINANCIAL_STATEMENT")
    assert who(got) == [(A1, date(2023, 5, 10), ["NF_EXACT"]), (A1, date(2023, 5, 12), ["NF_SA"])]
    assert got[0][3] == {"fiscalYear": 2023, "awarded": "100000000", "legalForm": "SRL"}
    assert got[1][3] == {"fiscalYear": 2023, "awarded": "200000000", "legalForm": "SA"}


def test_each_rule_has_a_methodology_row_with_its_firing_rate(built):
    url, _ = built
    rows = {r[0]: r for r in q(url, "SELECT slug, base_rate_year, authorities, with_signal, data_through FROM seap.signal_rule")}
    assert {"YOUNG_FIRM", "NO_CONSTRUCTION_CAEN", "AFTER_STRIKE_OFF", "INSOLVENCY", "FEW_EMPLOYEES", "NO_FINANCIAL_STATEMENT"} <= set(rows)
    # (base-rate year, authorities the rule could see in it, authorities with a Signal of the rule dated in it): recomputed from this load, never typed in
    assert rows["YOUNG_FIRM"][1:4] == (2025, 2, 2)
    assert rows["NO_CONSTRUCTION_CAEN"][1:4] == (2025, 2, 1)
    assert rows["AFTER_STRIKE_OFF"][1:4] == (2025, 2, 2)
    assert rows["INSOLVENCY"][1:4] == (2026, 2, 2)  # measured over the 6 months to the snapshot (2025-11-06 to 2026-05-06), the slice the rule sees
    assert rows["FEW_EMPLOYEES"][1:4] == (2024, 2, 2)  # the newest year the rule can see: the newest fiscal year held
    assert rows["NO_FINANCIAL_STATEMENT"][1:4] == (2023, 1, 1)  # the only year it evaluates


def test_once_the_newest_fiscal_years_revised_release_is_held_that_year_is_evaluated(db, tmp_path, labels):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    shutil.copytree(ARCHIVE.parent / "archive-onrc-signals-revised", root, dirs_exist_ok=True)  # FY2024's revised release: 5 employees for FE_SUMMED
    rebuild(Archive(root), db)
    nf = found(db, labels, "NO_FINANCIAL_STATEMENT")
    assert who(nf) == [(A1, date(2023, 5, 10), ["NF_EXACT"]), (A1, date(2023, 5, 12), ["NF_SA"]), (A1, date(2024, 5, 16), ["NF_NEWEST_YEAR"])]  # 2024 now counts
    assert who(found(db, labels, "FEW_EMPLOYEES")) == [(A1, date(2023, 6, 10), ["FE_BOUNDARY"])]  # the revised FY2024 figure (5) replaces the first release's 0
    assert q(db, "SELECT base_rate_year FROM seap.signal_rule WHERE slug = 'NO_FINANCIAL_STATEMENT'")[0][0] == 2024
