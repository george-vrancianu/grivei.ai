"""The Signal rules (ticket #74), as pure functions over row dicts: no database. The DB side is tests/test_signals_db.py."""
from datetime import date

import pytest

from pipeline.counting import CAPS, RON
from pipeline.signals import RULES, no_publication, over_cap
from pipeline.signals.common import authority_day_hits

OLD_SUPPLIES, OLD_WORKS = 135_060 * RON, 450_200 * RON
NEW_SUPPLIES, NEW_WORKS = 270_120 * RON, 900_400 * RON


def row(code="DA1", kind="DA", day=date(2023, 3, 1), value=0, authority="1000017", cpv="30197000-6", contract_type=None, suspect=False,
        procedure=None, winners=(), counted=None):
    return {"code": code, "kind": kind, "channel": "CONTRACT" if kind in ("CONTRACT", "AWARD_NOTICE") else "DIRECT_PURCHASE", "authority_key": authority,
            "award_date": day, "value_bani": value, "counted_bani": value if counted is None else counted, "suspect": suspect, "cpv_code": cpv,
            "contract_type": contract_type, "procedure": procedure, "winners": list(winners)}


def winner(key, natural=False):
    return {"key": None if natural else key, "naturalPerson": natural, "name": None if natural else key}


# ---- over-cap ------------------------------------------------------------------------------------------------------------------------

def test_the_caps_come_from_the_counting_rule_not_a_copy():
    assert (CAPS[1].supplies_services, CAPS[1].works) == (NEW_SUPPLIES, NEW_WORKS)


def test_a_value_exactly_at_the_cap_is_no_signal_and_just_above_it_is():
    assert over_cap.match(row(value=NEW_SUPPLIES)) is None
    found = over_cap.match(row(value=NEW_SUPPLIES + 1))
    assert found == {"value": str(NEW_SUPPLIES + 1), "cap": str(NEW_SUPPLIES), "multiple": pytest.approx(1.0, abs=1e-6)}


def test_ten_times_the_cap_is_a_suspect_value_and_never_a_signal_but_just_below_is():
    assert over_cap.match(row(value=10 * NEW_SUPPLIES)) is None
    assert over_cap.match(row(value=10 * NEW_SUPPLIES + 1)) is None
    assert over_cap.match(row(value=10 * NEW_SUPPLIES - 1))["multiple"] == pytest.approx(10.0, abs=1e-6)
    assert over_cap.match(row(value=10 * NEW_SUPPLIES - 1, suspect=True)) is None  # the stored flag always wins


def test_the_cap_changed_on_10_september_2022_and_the_boundary_day_is_in_the_new_era():
    value = OLD_SUPPLIES + 100 * RON  # 135,160 RON: over the old cap, far below the new one
    assert over_cap.match(row(value=value, day=date(2022, 9, 9)))["cap"] == str(OLD_SUPPLIES)
    assert over_cap.match(row(value=value, day=date(2022, 9, 10))) is None
    assert over_cap.match(row(value=NEW_SUPPLIES + 100 * RON, day=date(2022, 9, 10)))["cap"] == str(NEW_SUPPLIES)


def test_works_have_their_own_cap_by_contract_type_and_by_cpv_45():
    value = NEW_SUPPLIES + 100 * RON  # over the supplies cap, below the works cap
    assert over_cap.match(row(value=value))["cap"] == str(NEW_SUPPLIES)
    assert over_cap.match(row(kind="DAN", value=value, contract_type="Lucrari")) is None
    assert over_cap.match(row(value=value, cpv="45233140-2")) is None
    assert over_cap.match(row(value=NEW_WORKS + 1, cpv="45233140-2"))["cap"] == str(NEW_WORKS)
    assert over_cap.match(row(kind="DAN", value=NEW_WORKS + 1, contract_type="Lucrari"))["cap"] == str(NEW_WORKS)


def test_rents_cpv_70_are_exempt_and_so_is_any_listed_division():
    assert over_cap.match(row(value=NEW_SUPPLIES + 1, cpv="70220000-9")) is None
    assert over_cap.match(row(value=NEW_SUPPLIES + 1, cpv="71220000-9")) is not None


def test_only_direct_purchases_with_a_value_are_over_cap():
    assert over_cap.match(row(kind="CONTRACT", value=NEW_SUPPLIES + 1)) is None
    assert over_cap.match(row(kind="AWARD_NOTICE", value=NEW_SUPPLIES + 1)) is None
    assert over_cap.match(row(value=None)) is None
    assert over_cap.match(row(value=NEW_SUPPLIES + 1, cpv=None)) is not None  # no CPV: supplies and services


def test_one_signal_per_authority_and_day_holds_every_over_cap_record_of_it_and_is_reproduced_by_authority_signal_and_the_day():
    big = NEW_SUPPLIES + 500 * RON
    rows = [
        row("DA2", value=big, winners=[winner("2000007")]),
        row("DA1", value=NEW_SUPPLIES + 100 * RON, winners=[winner("2000015"), winner("X", natural=True)]),
        row("DA3", value=NEW_SUPPLIES, winners=[winner("2000031")]),  # at the cap: not in it
        row("DA4", value=big, day=date(2023, 3, 2), winners=[winner("2000007")]),  # another day: another Signal
        row("DA5", value=big, authority="1000009"),  # another authority
    ]
    hits = over_cap.detect(rows)
    assert [(h.authority_key, h.date, h.record_codes) for h in hits] == [
        ("1000009", date(2023, 3, 1), ("DA5",)), ("1000017", date(2023, 3, 1), ("DA1", "DA2")), ("1000017", date(2023, 3, 2), ("DA4",))]
    first = hits[1]
    assert first.supplier_keys == ("2000007", "2000015")  # the natural person is left out, the consortium member is in
    assert first.numbers == {"value": str(big), "cap": str(NEW_SUPPLIES), "multiple": round(big / NEW_SUPPLIES, 6)}  # the largest Record's
    assert first.reproduce == {"authority": "1000017", "signal": "OVER_CAP", "from": "2023-03-01", "to": "2023-03-01"}
    assert first.first_date == first.date == date(2023, 3, 1) and first.value_bani == big + NEW_SUPPLIES + 100 * RON


# ---- no-publication -----------------------------------------------------------------------------------------------------------------

@pytest.mark.parametrize("procedure", ["Negociere fara publicare prealabila", "negociere   fara publicare prealabila", "Negociere fără publicare prealabilă",
                                       "NEGOCIERE FARA PUBLICARE PREALABILA ", "Negociere fara publicare"])
def test_every_spelling_of_negotiation_without_prior_publication_matches(procedure):
    assert no_publication.match(row(kind="CONTRACT", procedure=procedure)) == {"procedure": procedure}


@pytest.mark.parametrize("procedure", ["Negociere", "Negociere cu publicare prealabila", "Licitatie deschisa", "Norme proprii (Anexa 2)",
                                       "Procedura simplificata proprie", "Dialog competitiv", "", None])
def test_other_procedures_do_not_match(procedure):
    assert no_publication.match(row(kind="CONTRACT", procedure=procedure)) is None


def test_it_reads_contracts_and_award_notices_not_direct_purchases():
    assert no_publication.match(row(kind="AWARD_NOTICE", procedure="Negociere fara publicare prealabila")) is not None
    assert no_publication.match(row(kind="DA", procedure="Negociere fara publicare prealabila")) is None


def test_a_suspect_value_is_left_out_of_the_signal_altogether():
    rows = [row("CAN1~1", kind="CONTRACT", procedure="Negociere fara publicare prealabila", value=100 * RON, winners=[winner("2000007")]),
            row("CAN2~1", kind="CONTRACT", procedure="Negociere fara publicare prealabila", value=10**14, suspect=True, counted=None, winners=[winner("2000015")])]
    (hit,) = no_publication.detect(rows)
    assert hit.record_codes == ("CAN1~1",) and hit.supplier_keys == ("2000007",) and hit.value_bani == 100 * RON
    assert no_publication.detect(rows[1:]) == []  # alone, a suspect Record is no Signal


def test_a_blank_value_still_triggers_and_adds_nothing():
    (hit,) = no_publication.detect([row("CAN1", kind="AWARD_NOTICE", procedure="Negociere fara publicare prealabila", value=None, counted=None)])
    assert hit.value_bani == 0 and hit.numbers == {"procedure": "Negociere fara publicare prealabila"}
    assert hit.reproduce == {"authority": "1000017", "signal": "NO_PUBLICATION", "from": "2023-03-01", "to": "2023-03-01"}


def test_no_publication_has_no_window_of_its_own_in_the_rule_so_edges_are_the_datas():
    # the window is derived from the Records the rule reads (signals/__init__.py): 2021-12-31 and 2023-01-01 are both seen if loaded
    rows = [row("A", kind="AWARD_NOTICE", day=date(2021, 12, 31), procedure="Negociere fara publicare prealabila"),
            row("B", kind="AWARD_NOTICE", day=date(2023, 1, 1), procedure="Negociere fara publicare prealabila")]
    assert [h.date for h in no_publication.detect(rows)] == [date(2021, 12, 31), date(2023, 1, 1)]


# ---- the registry --------------------------------------------------------------------------------------------------------------------

def test_every_rule_module_has_the_one_shape_and_a_unique_slug():
    assert [r.SLUG for r in RULES] == ["OVER_CAP", "SPLITTING", "NO_PUBLICATION"]
    for r in RULES:
        assert r.KINDS and r.WHERE and callable(r.detect)


def test_a_record_with_no_authority_key_is_never_in_a_signal():
    assert authority_day_hits("X", [row(authority=None, value=1)], lambda r: {}, lambda m: {}) == []
