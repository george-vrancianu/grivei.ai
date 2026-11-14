"""The ONRC and financial-statement Signal rules (ticket #184) as pure functions over row dicts and context: no database. The DB side is
tests/test_signals_onrc_db.py; the cases of the fixture archive are listed in fixtures/build_onrc_signals_archive.py."""
from datetime import date

import pytest

from pipeline.counting import RON
from pipeline.signals import RULES, after_strike_off, few_employees, insolvency, no_construction_caen, no_financial_statement, young_firm
from pipeline.signals.reference import company_form, is_construction_caen, months_before, strike_off_date
from test_signals import row, winner

A = "1000017"
REGISTERED = date(2025, 3, 1)


def test_the_six_rules_read_a_reference_source_and_say_so():
    new = [r for r in RULES if r.SLUG in {"YOUNG_FIRM", "NO_CONSTRUCTION_CAEN", "AFTER_STRIKE_OFF", "INSOLVENCY", "FEW_EMPLOYEES", "NO_FINANCIAL_STATEMENT"}]
    assert len(new) == 6
    for r in new:
        assert callable(r.load) and callable(r.detect) and r.KINDS


# ---- the shared readers -----------------------------------------------------------------------------------------------------------------

def test_a_strike_off_date_is_read_from_anafs_text_and_a_bare_radiere_has_none():
    assert strike_off_date("RADIERE din data 11.10.2022") == date(2022, 10, 11)
    assert strike_off_date("INREGISTRAT din data 26.11.1992 - Radiere din data 01.02.2020") == date(2020, 2, 1)
    assert strike_off_date("RADIERE") is None and strike_off_date("INREGISTRAT din data 26.11.1992") is None and strike_off_date(None) is None
    assert strike_off_date("RADIERE din data 31.02.2020") is None  # not a date


def test_months_before_clamps_the_day():
    assert months_before(date(2026, 5, 6), 6) == date(2025, 11, 6)
    assert months_before(date(2026, 8, 31), 6) == date(2026, 2, 28)
    assert months_before(date(2026, 2, 28), 6) == date(2025, 8, 28)


@pytest.mark.parametrize("code,version,expected", [
    ("4211", 2, True), ("4120", 2, True), ("4399", 3, True), ("4110", None, True), ("4321", 3, True),
    ("4511", 2, False), ("4511", 3, False), ("6201", 3, False), ("4010", 2, False),  # division 45 is vehicles in Rev.2 and Rev.3
    ("4521", 1, True), ("4521", 0, True), ("4211", 1, False),  # CAEN 1998 and 2003 put construction in division 45
    ("", 2, False),
])
def test_construction_is_division_41_to_43_in_rev2_and_rev3_and_45_in_rev1(code, version, expected):
    assert is_construction_caen(code, version) is expected


@pytest.mark.parametrize("form,expected", [
    ("SRL", "SRL"), ("S.R.L.", "SRL"), ("SOCIETATE COMERCIALA CU RASPUNDERE LIMITATA", "SRL"), ("Societate cu răspundere limitată", "SRL"), ("SRL-D", "SRL"),
    ("SA", "SA"), ("S.A.", "SA"), ("SOCIETATE PE ACTIUNI", "SA"), ("SOCIETATE COMERCIALA PE ACTIUNI", "SA"),
    ("SOCIETATE IN COMANDITA PE ACTIUNI", None), ("PERSOANA FIZICA AUTORIZATA", None), ("PFA", None), ("COMPANIE NATIONALA", None), ("", None), (None, None),
])
def test_only_an_srl_or_an_sa_is_a_company_the_no_statement_rule_reads(form, expected):
    assert company_form(form) == expected


# ---- young firm ----------------------------------------------------------------------------------------------------------------------

def _young(rows, first=None):
    ctx = young_firm.Context({"1": REGISTERED}, first or {})
    return [young_firm.match(r, ctx) for r in rows]


def test_young_firm_first_record_day_90_is_in_and_day_91_is_not():
    first = {"1": date(2025, 5, 30)}
    on = row(day=date(2025, 5, 30), winners=[winner("1")])  # 2025-03-01 + 90
    after = row(day=date(2025, 5, 31), winners=[winner("1")])
    assert young_firm.match(on, young_firm.Context({"1": REGISTERED}, first))["days"] == 90
    assert young_firm.match(after, young_firm.Context({"1": REGISTERED}, first)) is None


def test_a_later_record_within_90_days_is_context_only():
    ctx = young_firm.Context({"1": REGISTERED}, {"1": date(2025, 3, 10)})
    later = row(code="DA2", day=date(2025, 4, 20), value=50_000 * RON, winners=[winner("1")])
    assert young_firm.match(later, ctx) is None


def test_every_record_of_the_first_day_is_a_first_record():
    ctx = young_firm.Context({"1": REGISTERED}, {"1": date(2025, 3, 10)})
    for code in ("DA1", "DA2"):  # two authorities (or a contract and its award notice) on the supplier's first day
        assert young_firm.match(row(code=code, day=date(2025, 3, 10), winners=[winner("1")]), ctx)["days"] == 9


def test_young_firm_large_record_is_exactly_1m_ron_within_180_days():
    ctx = young_firm.Context({"1": REGISTERED}, {"1": date(2025, 3, 2)})
    kw = dict(code="C1", kind="CONTRACT", winners=[winner("1")])
    assert young_firm.match(row(day=date(2025, 8, 28), value=1_000_000 * RON, **kw), ctx)["days"] == 180
    assert young_firm.match(row(day=date(2025, 8, 29), value=1_000_000 * RON, **kw), ctx) is None  # day 181
    assert young_firm.match(row(day=date(2025, 8, 28), value=1_000_000 * RON - 1, **kw), ctx) is None  # one ban under
    assert young_firm.match(row(day=date(2025, 8, 28), value=0, counted=None, **kw), ctx) is None  # a blank value counts as nothing


def test_a_record_before_the_registration_never_triggers_and_a_suspect_one_neither():
    ctx = young_firm.Context({"1": REGISTERED}, {"1": date(2025, 3, 10)})
    assert young_firm.match(row(day=date(2025, 2, 28), winners=[winner("1")]), ctx) is None
    assert young_firm.match(row(day=date(2025, 3, 2), winners=[winner("1")], suspect=True), ctx) is None


# ---- works without a construction CAEN ------------------------------------------------------------------------------------------------

WORKS = dict(cpv="45233140-2")


def test_no_construction_caen_is_unknown_safe_and_threshold_exact():
    codes = {"1": [("6201", 3)], "2": [("4120", 2)], "3": [("6201", 3), ("4399", 3)]}
    big = 1_000_000 * RON
    assert no_construction_caen.match(row(value=big, winners=[winner("1")], **WORKS), codes) == {"value": str(big), "authorisedCodes": 1}
    assert no_construction_caen.match(row(value=big - 1, winners=[winner("1")], **WORKS), codes) is None
    assert no_construction_caen.match(row(value=big, winners=[winner("2")], **WORKS), codes) is None  # a construction code
    assert no_construction_caen.match(row(value=big, winners=[winner("3")], **WORKS), codes) is None  # one construction code among others is enough
    assert no_construction_caen.match(row(value=big, winners=[winner("9")], **WORKS), codes) is None  # no codes on record: unknown
    assert no_construction_caen.match(row(value=big, winners=[winner("1")]), codes) is None  # supplies, not works
    assert no_construction_caen.match(row(value=big, winners=[winner("1")], contract_type="Lucrari", kind="DAN"), codes) is not None
    assert no_construction_caen.match(row(value=big, winners=[winner("1"), winner("2")], **WORKS), codes) is None  # one capable consortium member is enough
    assert no_construction_caen.match(row(value=big, winners=[winner("1"), winner("x", natural=True)], **WORKS), codes) is None  # a winner with no entity: unknown


# ---- after strike-off ----------------------------------------------------------------------------------------------------------------

def test_a_record_on_the_strike_off_day_is_not_after_it():
    struck = {"1": date(2025, 3, 15)}
    assert after_strike_off.match(row(day=date(2025, 3, 15), winners=[winner("1")]), struck) is None
    assert after_strike_off.match(row(day=date(2025, 3, 16), winners=[winner("1")]), struck) == {"struckOff": "2025-03-15", "daysAfter": 1}
    assert after_strike_off.match(row(day=date(2025, 3, 16), winners=[winner("1")], suspect=True), struck) is None
    assert after_strike_off.match(row(day=date(2025, 3, 16), value=0, counted=None, winners=[winner("1")]), struck) is not None  # a blank value still counts


# ---- insolvency ----------------------------------------------------------------------------------------------------------------------

@pytest.mark.parametrize("name,expected", [("insolvență", True), ("Reorganizare judiciară", True), ("faliment", True), ("INSOLVENTA", True),
                                           ("închidere procedură insolvență", False), ("ieșire din insolvență", False),
                                           ("dizolvare", False), ("lichidare", False), ("radiată", False), ("funcțiune", False), (None, False)])
def test_insolvency_rate_window_is_the_six_months_to_the_snapshot():
    assert insolvency.base_window(insolvency.Context(date(2026, 5, 6), {})) == (date(2025, 11, 6), date(2026, 5, 6))


def test_the_status_is_read_by_the_name_ONRC_publishes(name, expected):
    assert insolvency.is_insolvency_status(name) is expected


def test_the_insolvency_window_is_the_six_months_up_to_the_snapshot_and_the_status_is_undated():
    ctx = insolvency.Context(date(2026, 5, 6), {"1": insolvency.Status("insolvență", date(2026, 4, 3), False)})
    hit = lambda d: insolvency.match(row(day=d, winners=[winner("1")]), ctx)  # noqa: E731
    assert hit(date(2025, 11, 5)) is None and hit(date(2026, 5, 7)) is None
    assert hit(date(2025, 11, 6)) == {"status": "insolvență", "firstSeen": "2026-04-03", "sinceAtLeast": False}
    assert hit(date(2026, 5, 6)) is not None
    assert insolvency.match(row(day=date(2026, 1, 1), winners=[winner("2")]), ctx) is None


# ---- at most one employee ------------------------------------------------------------------------------------------------------------

def test_a_blank_employee_count_never_fires_and_the_thresholds_are_exact():
    five = 5_000_000 * RON
    assert few_employees.qualifies(five, 1) and few_employees.qualifies(five, 0)
    assert not few_employees.qualifies(five, 2) and not few_employees.qualifies(five - 1, 0)
    assert not few_employees.qualifies(10 * five, None)  # blank: never


def test_few_employees_reads_the_award_year_of_the_record():
    ctx = few_employees.Context(2024, {("1", 2023): (1, 500_000_000)})
    assert few_employees.match(row(day=date(2023, 6, 1), value=1_000 * RON, winners=[winner("1")]), ctx) == {"fiscalYear": 2023, "employees": 1, "awarded": "500000000"}
    assert few_employees.match(row(day=date(2024, 6, 1), value=1_000 * RON, winners=[winner("1")]), ctx) is None  # another year: no statement for it
    assert few_employees.match(row(day=date(2023, 6, 1), value=0, counted=None, winners=[winner("1")]), ctx) is None  # adds nothing to the sum


# ---- no financial statement ----------------------------------------------------------------------------------------------------------

@pytest.mark.parametrize("years,revised,expected", [
    ([2022, 2023, 2024], False, (2023, 2023)),  # the newest year has only its first release: left out
    ([2022, 2023, 2024], True, (2023, 2024)),   # its revised release is held: it counts
    ([2021, 2022, 2023, 2024, 2025], False, (2022, 2024)),
    ([2024], True, None),                        # no year before it is held: absence cannot be told
    ([2023, 2024], False, None),
    ([], False, None),
])
def test_the_newest_fiscal_year_is_left_out_until_its_revised_release(years, revised, expected):
    assert no_financial_statement.evaluated_years(years, revised) == expected


def test_the_no_statement_rule_only_looks_at_evaluated_years():
    ctx = no_financial_statement.Context(2023, 2023, {("1", 2023): (200_000_000, "SA"), ("1", 2024): (200_000_000, "SA")})
    assert no_financial_statement.match(row(day=date(2023, 5, 1), value=1000, winners=[winner("1")]), ctx) == {"fiscalYear": 2023, "awarded": "200000000", "legalForm": "SA"}
    assert no_financial_statement.match(row(day=date(2024, 5, 1), value=1000, winners=[winner("1")]), ctx) is None  # the newest fiscal year: left out
    assert no_financial_statement.match(row(day=date(2022, 5, 1), value=1000, winners=[winner("1")]), ctx) is None  # before the first evaluated year
