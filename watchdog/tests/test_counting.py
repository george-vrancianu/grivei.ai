"""The counting rule (#65) as pure functions: caps and their dates, works, exemptions, estimates, frameworks, shares. No database."""
from datetime import date

import pytest

from pipeline.counting import CAPS, RON, Estimate, cap_for, count, framework_role, is_works, split_evenly

D = date.fromisoformat


def direct(value_ron, day="2023-03-01", contract_type=None, cpv="30197000-6", kind="DA", winners=1):
    return count(kind, None if value_ron is None else round(value_ron * RON), D(day), contract_type, cpv, None, None, winners)


# ---- the dated cap table -------------------------------------------------------------------------------------------------


def test_the_cap_table_is_two_dated_eras_in_bani():
    assert [(c.since, c.supplies_services, c.works) for c in CAPS] == [
        (date(2000, 1, 1), 13_506_000, 45_020_000), (date(2022, 9, 10), 27_012_000, 90_040_000)]


@pytest.mark.parametrize("day,works,cap_ron", [
    ("2021-01-01", False, 135_060), ("2022-09-09", False, 135_060), ("2022-09-09", True, 450_200),
    ("2022-09-10", False, 270_120), ("2022-09-10", True, 900_400), ("2026-11-12", False, 270_120)])
def test_the_new_caps_apply_from_the_boundary_day_itself(day, works, cap_ron):
    assert cap_for(D(day), works) == cap_ron * RON


# ---- DA/DAN suspect at 10x the cap ---------------------------------------------------------------------------------------


def test_a_direct_purchase_at_ten_times_the_old_cap_or_more_is_suspect_just_below_it_is_not():
    below = direct(1_350_599.99, "2022-05-01")
    at = direct(1_350_600, "2022-05-01")
    assert (below.suspect_rule, below.counted_bani) == (None, 135_059_999)
    assert (at.suspect_rule, at.suspect_threshold_bani, at.counted_bani) == ("DIRECT_PURCHASE_10X_CAP", 135_060 * RON, None)
    assert "SUSPECT_VALUE" in at.badges and "NO_VALUE" not in at.badges


def test_the_same_value_is_suspect_before_the_boundary_day_and_not_from_it():
    assert direct(2_000_000, "2022-09-09").suspect_rule == "DIRECT_PURCHASE_10X_CAP"
    assert direct(2_000_000, "2022-09-10").suspect_rule is None
    assert direct(2_701_200, "2022-09-10").suspect_rule == "DIRECT_PURCHASE_10X_CAP"
    assert direct(2_701_200, "2022-09-10").suspect_threshold_bani == 270_120 * RON


def test_works_are_told_by_tip_contract_or_cpv_division_45():
    assert is_works("Lucrari", "30197000-6") and is_works("lucrări", None) and is_works(None, "45233120-6")
    assert not is_works("Furnizare", "30197000-6") and not is_works("Servicii", None)
    assert direct(5_000_000, "2023-03-01", "Lucrari").suspect_rule is None  # works cap 900,400: 10x is 9,004,000
    assert direct(9_004_000, "2023-03-01", "Lucrari").suspect_rule == "DIRECT_PURCHASE_10X_CAP"
    assert direct(9_100_000, "2023-03-01", "Furnizare", cpv="45233120-6").suspect_rule == "DIRECT_PURCHASE_10X_CAP"
    assert direct(9_100_000, "2023-03-01", None, cpv="30197000-6").suspect_rule == "DIRECT_PURCHASE_10X_CAP"  # supplies: cap 270,120


def test_cpv_70_rents_are_never_flagged_whatever_the_value():
    assert direct(900_000_000, "2023-03-01", cpv="70220000-9").counted_bani == 900_000_000 * RON
    assert direct(900_000_000, "2023-03-01", "Lucrari", cpv="70220000-9").suspect_rule is None


def test_the_cap_rule_applies_to_direct_purchases_only():
    assert count("CONTRACT", 5_000_000_00, D("2023-03-01"), "Furnizare", "30197000-6", None, "CAN1", 1).suspect_rule is None


# ---- no value ------------------------------------------------------------------------------------------------------------


def test_blank_and_zero_are_no_value_in_seap_and_add_nothing():
    blank, zero = direct(None), direct(0)
    for c in (blank, zero):
        assert (c.value_bani, c.counted_bani, c.suspect_rule) == (None, None, None)
        assert c.badges == ("NO_VALUE",)
    assert blank.notes == () and zero.notes == ("value:zero",)


# ---- frameworks ----------------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("text,role", [
    ("Cu acord cadru", "CEILING"), ("Cu acord cadru subsecvent", "SUBSEQUENT"), (" cu  ACORD cadru   subsecvent ", "SUBSEQUENT"),
    ("Fara acord cadru", None), ("", None), (None, None), ("Cu acord-cadru", None)])
def test_incheiat_prin_tells_ceiling_subsequent_or_neither(text, role):
    assert framework_role(text) == role


def contract(value_bani, concluded_by, winners=1, notice="CAN1", estimates=None):
    return count("CONTRACT", value_bani, D("2023-03-01"), None, None, concluded_by, notice, winners, estimates)


def test_a_framework_ceiling_is_shown_with_its_badge_and_never_summed_while_subsequent_and_standalone_are():
    ceiling = contract(10_000_000_00, "Cu acord cadru")
    assert (ceiling.value_bani, ceiling.counted_bani, ceiling.badges, ceiling.framework_role) == (10_000_000_00, None, ("FRAMEWORK_CEILING",), "CEILING")
    sub = contract(4_000_000_00, "Cu acord cadru subsecvent")
    assert (sub.counted_bani, sub.badges) == (4_000_000_00, ("SUBSEQUENT_CONTRACT",))
    assert contract(300_000_00, "Fara acord cadru").counted_bani == 300_000_00
    assert contract(300_000_00, None).badges == ()


def test_the_ceiling_and_the_suspect_flag_are_decided_here_and_stored_for_the_totals_to_sum():
    assert (contract(10_000_000_00, "Cu acord cadru").ceiling_bani, contract(10_000_000_00, "Cu acord cadru").suspect) == (10_000_000_00, False)
    assert contract(4_000_000_00, "Cu acord cadru subsecvent").ceiling_bani is None
    assert contract(300_000_00, None).ceiling_bani is None
    assert contract(None, "Cu acord cadru").ceiling_bani is None  # a blank ceiling has no amount
    # a suspect ceiling is left out as suspect, not shown as a ceiling
    big = count("CONTRACT", 200_000_000_000_00, D("2023-03-01"), None, None, "Cu acord cadru", "CAN1", 1, {"CAN1": Estimate(None)})
    assert (big.suspect, big.ceiling_bani, big.counted_bani) == (True, None, None)


def test_a_ceiling_with_no_value_has_both_badges_and_is_not_summed():
    assert contract(None, "Cu acord cadru").badges == ("FRAMEWORK_CEILING", "NO_VALUE")


# ---- consortium shares ---------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("amount,parts", [(100, 3), (100000, 3), (7, 2), (1, 3), (0, 4), (9_999_999_999_999, 7), (100, 1)])
def test_shares_are_equal_to_the_bani_and_sum_back_exactly(amount, parts):
    shares = split_evenly(amount, parts)
    assert sum(shares) == amount and len(shares) == parts and max(shares) - min(shares) <= 1


def test_the_remainder_bani_go_to_the_first_winners_in_published_order():
    assert split_evenly(100, 3) == [34, 33, 33]
    assert split_evenly(101, 3) == [34, 34, 33]


def test_a_consortium_is_one_record_with_a_share_badge_and_per_winner_shares():
    c = contract(100000, "Fara acord cadru", winners=3)
    assert c.counted_bani == 100000 and "CONSORTIUM_SHARE" in c.badges
    assert c.shares == c.counted_shares == (33334, 33333, 33333)
    sole = contract(100000, None)
    assert sole.shares == () and sole.counted_shares == (100000,) and "CONSORTIUM_SHARE" not in sole.badges


def test_a_suspect_consortium_has_shares_to_show_but_none_to_sum():
    c = direct(2_000_000, "2022-05-01", winners=2)
    assert c.shares == (100_000_000, 100_000_000) and c.counted_shares == ()


# ---- contracts of 1 bn RON or more against their estimate ---------------------------------------------------------------


def mega(value_ron, estimates, kind="CONTRACT"):
    return count(kind, value_ron * RON, D("2023-03-01"), None, None, None, "CAN7", 1, estimates)


def test_a_contract_at_a_hundred_times_its_estimate_or_more_is_suspect_below_it_is_not():
    at = mega(1_000_000_000, {"CAN7": Estimate(10_000_000 * RON)})
    assert (at.suspect_rule, at.suspect_threshold_bani, at.counted_bani) == ("CONTRACT_100X_ESTIMATE", 10_000_000 * RON, None)
    below = mega(1_000_000_000, {"CAN7": Estimate(10_000_001 * RON)})
    assert below.suspect_rule is None and below.counted_bani == 1_000_000_000 * RON
    assert mega(2_000_000_000, {"CAN7": Estimate(1_500_000_000 * RON)}).suspect_rule is None
    assert mega(1_000_000_000, {"CAN7": Estimate(10_000_000 * RON)}, kind="AWARD_NOTICE").suspect_rule == "CONTRACT_100X_ESTIMATE"


def test_below_a_billion_the_estimate_is_not_consulted():
    assert mega(999_999_999, {"CAN7": Estimate(1)}).suspect_rule is None


def test_above_fifty_billion_with_no_estimate_is_suspect_exactly_fifty_is_not():
    assert mega(50_000_000_001, {"CAN7": Estimate(None)}).suspect_rule == "CONTRACT_OVER_50BN"
    assert mega(50_000_000_001, {"CAN7": Estimate(None)}).suspect_threshold_bani is None
    assert mega(50_000_000_000, {"CAN7": Estimate(None)}).suspect_rule is None
    assert mega(3_000_000_000, {"CAN7": Estimate(None)}).counted_bani == 3_000_000_000 * RON  # no estimate, under 50 bn: counted


def test_a_notice_never_looked_up_is_not_the_same_as_one_with_no_estimate():
    for estimates in (None, {}, {"CAN8": Estimate(None)}):
        c = mega(70_000_000_000, estimates)
        assert c.suspect_rule is None and c.counted_bani == 70_000_000_000 * RON and c.notes == ("estimate:not_fetched",)
    assert mega(1_000_000_000, {"CAN7": Estimate(None)}).notes == ()
