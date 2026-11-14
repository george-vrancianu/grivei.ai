"""The two cross-Source Signal rules (ticket #185) as pure functions over row dicts and context: no database. The Seam 1 cases are in explorer/packages/api/test/seam1.test.ts
(watchdog/tests/fixtures/build_cross_signals_archive.py lists the fixture's cases)."""
from datetime import date

from pipeline.signals import RULES, donor_to_party, restricted_slugs, soe_board_in_supplier
from test_signals import row, winner

A = "1000017"
SOE = "2000015"
FIRM, OTHER = "3000019", "3000027"


# ---- registration --------------------------------------------------------------------------------------------------------------------

def test_the_two_rules_read_reference_sources_and_only_the_soe_rule_is_restricted():
    new = [r for r in RULES if r.SLUG in {"DONOR_TO_PARTY", "SOE_BOARD_IN_SUPPLIER"}]
    assert [r.SLUG for r in new] == ["DONOR_TO_PARTY", "SOE_BOARD_IN_SUPPLIER"]
    for r in new:
        assert callable(r.load) and callable(r.detect) and callable(r.where) and r.KINDS
    assert restricted_slugs() == ["SOE_BOARD_IN_SUPPLIER"]


# ---- donor to Party -------------------------------------------------------------------------------------------------------------------

def donation(days=100, party="Partidul Social Democrat", derived=False, kind="DONATION"):
    return {"days": days, "party": party, "derived": derived, "kind": kind}


def test_a_record_with_a_matching_donation_is_a_signal_and_its_numbers_come_from_the_donation():
    ctx = donor_to_party.Context({"DA1": donation(100)})
    hits = donor_to_party.detect([row("DA1", winners=[winner(FIRM)], authority=A, day=date(2024, 12, 1)), row("DA2", winners=[winner(FIRM)], authority=A, day=date(2024, 12, 1))], ctx)
    assert [(h.rule, h.authority_key, h.record_codes) for h in hits] == [("DONOR_TO_PARTY", A, ("DA1",))]
    assert hits[0].numbers == donation(100) and hits[0].supplier_keys == (FIRM,)
    assert hits[0].reproduce == {"authority": A, "signal": "DONOR_TO_PARTY", "from": "2024-12-01", "to": "2024-12-01"}


def test_a_suspect_record_and_a_kind_the_rule_does_not_read_never_trigger():
    ctx = donor_to_party.Context({"DA1": donation()})
    assert donor_to_party.detect([row("DA1", suspect=True, winners=[winner(FIRM)])], ctx) == []
    assert donor_to_party.match(row("DA1", kind="FRAMEWORK"), ctx) is None


def test_two_records_of_one_authority_and_day_are_one_signal_with_the_nearest_donation():
    ctx = donor_to_party.Context({"DA1": donation(200, "Partidul A"), "DA2": donation(30, "Partidul B", derived=True, kind="LOAN")})
    hits = donor_to_party.detect([row("DA1", winners=[winner(FIRM)]), row("DA2", winners=[winner(OTHER)])], ctx)
    assert len(hits) == 1 and hits[0].record_codes == ("DA1", "DA2") and hits[0].supplier_keys == (FIRM, OTHER)
    assert hits[0].numbers == donation(30, "Partidul B", derived=True, kind="LOAN")


def test_the_nearest_donation_wins_and_ties_are_broken_by_party_and_kind():
    assert donor_to_party.best([donation(40, "B"), donation(10, "Z"), donation(10, "A", kind="LOAN"), donation(10, "A")]) == donation(10, "A")


def test_the_where_narrows_the_rows_to_the_records_with_a_donation():
    sql, params = donor_to_party.where(donor_to_party.Context({"DA2": donation(), "DA1": donation()}))
    assert sql == "NOT suspect AND code = ANY(%s)" and params == (["DA1", "DA2"],)


# ---- SOE board member in a supplier ---------------------------------------------------------------------------------------------------------

def test_an_enterprises_record_to_a_supplier_that_shares_a_person_is_a_signal_without_any_name():
    ctx = soe_board_in_supplier.Context({(SOE, FIRM): 2})
    hits = soe_board_in_supplier.detect([row("DA1", authority=SOE, winners=[winner(FIRM)]), row("DA2", authority=SOE, winners=[winner(OTHER)]),
                                         row("DA3", authority=A, winners=[winner(FIRM)])], ctx)
    assert [(h.authority_key, h.record_codes, h.numbers) for h in hits] == [(SOE, ("DA1",), {"persons": 2})]
    assert set(hits[0].numbers) == {"persons"} and hits[0].supplier_keys == (FIRM,)  # no name, no birth date, no person id


def test_a_consortium_triggers_when_any_keyed_winner_shares_a_person_and_a_natural_winner_never_does():
    ctx = soe_board_in_supplier.Context({(SOE, FIRM): 1})
    assert len(soe_board_in_supplier.detect([row("DA1", authority=SOE, winners=[winner(OTHER), winner(FIRM)])], ctx)) == 1
    assert soe_board_in_supplier.detect([row("DA1", authority=SOE, winners=[winner(None, natural=True)])], ctx) == []


def test_a_suspect_record_a_record_with_no_authority_and_another_kind_are_never_signals():
    ctx = soe_board_in_supplier.Context({(SOE, FIRM): 1})
    assert soe_board_in_supplier.detect([row("DA1", authority=SOE, suspect=True, winners=[winner(FIRM)]), row("DA2", authority=None, winners=[winner(FIRM)])], ctx) == []
    assert soe_board_in_supplier.match(row("DA3", authority=SOE, kind="FRAMEWORK", winners=[winner(FIRM)]), ctx) is None


def test_the_where_names_the_enterprises_and_suppliers_of_the_context_only():
    sql, params = soe_board_in_supplier.where(soe_board_in_supplier.Context({(SOE, FIRM): 1, (SOE, OTHER): 1}))
    assert "authority_key = ANY(%s)" in sql and "s.supplier_key = ANY(%s)" in sql and params == ([SOE], [FIRM, OTHER])
