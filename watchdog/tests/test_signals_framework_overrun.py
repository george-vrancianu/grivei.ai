"""The `framework-overrun` rule (ticket #76) as a pure function over row dicts: no database. The DB side is the seam 1 fixtures (archive-framework-overrun)."""
import logging
from datetime import date, timedelta

import pytest

from pipeline.counting import RON
from pipeline.signals import RULES, framework_overrun as fo
from test_signals import row, winner

A, S1, S2 = "1000017", "2000007", "2000015"
D0 = date(2023, 3, 1)
CEILING = 1_000_000 * RON


def ceiling(code, value=CEILING, notice="CAN1", day=D0, authority=A, suppliers=(S1,), cpv="33690000-3", suspect=False):
    return {**row(code=code, kind="CONTRACT", day=day, value=value, authority=authority, cpv=cpv, winners=[winner(s) for s in suppliers], suspect=suspect,
                  counted=None), "notice_code": notice, "framework_role": "CEILING", "counted_bani": None,  # a ceiling is never summed
            "ceiling_bani": None if suspect or not value else value}


def subsequent(code, value, day, notice="CAN1", authority=A, suppliers=(S1,), cpv="33690000-3", suspect=False):
    return {**row(code=code, kind="CONTRACT", day=day, value=value, authority=authority, cpv=cpv, winners=[winner(s) for s in suppliers], suspect=suspect,
                  counted=None if suspect else value), "notice_code": notice, "framework_role": "SUBSEQUENT", "ceiling_bani": None}


def found(*rows):
    """Rows as the stream hands them over: the ORDER_BY order, each notice one run."""
    return list(fo.detect(sorted(rows, key=lambda r: (r["notice_code"], r["award_date"], r["code"]))))


def days(n):
    return D0 + timedelta(days=n)


def test_the_rule_is_registered_after_splitting_and_reads_streamed_rows():
    assert fo in RULES and RULES.index(fo) == [r.SLUG for r in RULES].index("FRAMEWORK_OVERRUN")
    assert [r.SLUG for r in RULES] == ["OVER_CAP", "SPLITTING", "FRAMEWORK_OVERRUN", "NO_PUBLICATION"]
    assert fo.KINDS == ("CONTRACT",) and fo.ORDER_BY == "notice_code, award_date, code" and "framework_role IS NOT NULL" in fo.WHERE


def test_the_subsequent_contract_that_pushes_the_sum_over_110_percent_dates_the_signal_and_later_ones_are_not_members():
    [hit] = found(ceiling("F1"), subsequent("C1", 600_000 * RON, days(10)), subsequent("C2", 400_000 * RON, days(20)), subsequent("C3", 200_000 * RON, days(30)),
                  subsequent("C4", 50_000 * RON, days(40)))
    # 600 + 400 = 1,000 (100%), + 200 = 1,200 > 1,100: C3 crosses; C4 comes after it
    assert hit.rule == "FRAMEWORK_OVERRUN" and hit.authority_key == A
    assert (hit.first_date, hit.date) == (D0, days(30))
    assert hit.record_codes == ("F1", "C1", "C2", "C3")
    assert hit.numbers == {"ceiling": str(CEILING), "subsequent": str(1_250_000 * RON), "ratio": 1.25}  # every subsequent contract reported, as seap.framework
    assert hit.value_bani == 1_200_000 * RON and hit.supplier_keys == (S1,)


def test_a_framework_that_stays_under_110_percent_is_no_signal():
    assert found(ceiling("F1"), subsequent("C1", 600_000 * RON, days(10)), subsequent("C2", 499_000 * RON, days(20))) == []
    assert found(ceiling("F1")) == []  # no subsequent contracts at all


def test_exactly_110_percent_is_no_signal_and_one_ban_more_is():
    assert found(ceiling("F1"), subsequent("C1", 1_100_000 * RON, days(10))) == []
    [hit] = found(ceiling("F1"), subsequent("C1", 1_100_000 * RON + 1, days(10)))
    assert hit.date == days(10)


def test_the_running_sum_is_ordered_by_award_date_then_code_not_by_the_order_they_are_given():
    [hit] = found(ceiling("F1"), subsequent("C9", 700_000 * RON, days(5)), subsequent("C1", 700_000 * RON, days(10)))
    assert hit.date == days(10) and hit.record_codes == ("F1", "C9", "C1")
    [hit] = found(ceiling("F1"), subsequent("C2", 600_000 * RON, days(5)), subsequent("C1", 600_000 * RON, days(5)))  # same day: the lower code first
    assert hit.record_codes == ("F1", "C1", "C2")


@pytest.mark.parametrize("fw", [
    ceiling("F1", value=None),  # no value in SEAP
    ceiling("F1", suspect=True),  # a suspect ceiling is left out
    ceiling("F1", value=0),  # zero: the counting rule stores it as no ceiling
])
def test_a_blank_ceiling_never_triggers(fw):
    assert found(fw, subsequent("C1", 5_000_000 * RON, days(10))) == []


def test_a_notice_with_no_ceiling_record_loaded_never_triggers():
    assert found(subsequent("C1", 5_000_000 * RON, days(10))) == []


def test_a_framework_awarded_before_2021_never_triggers_even_with_later_subsequent_contracts_and_2021_01_01_is_in():
    assert found(ceiling("F1", day=date(2020, 12, 31)), subsequent("C1", 2_000_000 * RON, date(2021, 3, 1))) == []
    [hit] = found(ceiling("F1", day=date(2021, 1, 1)), subsequent("C1", 2_000_000 * RON, date(2021, 3, 1)))
    assert hit.first_date == date(2021, 1, 1)


def test_the_framework_date_is_the_earliest_of_its_ceiling_records():
    assert found(ceiling("F1", day=date(2020, 11, 1)), ceiling("F2", day=date(2021, 2, 1)), subsequent("C1", 3_000_000 * RON, date(2021, 3, 1))) == []


def test_several_ceiling_records_of_one_notice_are_summed_and_all_are_members():
    # 600,000 + 400,000 = 1,000,000; 1,100,001 of subsequent contracts crosses; against the larger one alone (600,000) it would cross sooner
    [hit] = found(ceiling("F1", value=600_000 * RON, suppliers=(S1,)), ceiling("F2", value=400_000 * RON, suppliers=(S2,)),
                  subsequent("C1", 1_100_000 * RON, days(10)), subsequent("C2", 1 * RON, days(11)))
    assert hit.numbers["ceiling"] == str(CEILING) and hit.record_codes == ("F1", "F2", "C1", "C2") and hit.supplier_keys == (S1, S2)
    assert hit.numbers["ratio"] == pytest.approx(1.100001)


def test_a_suspect_subsequent_contract_is_left_out_of_the_sum_and_of_the_members():
    assert found(ceiling("F1"), subsequent("C1", 600_000 * RON, days(10)), subsequent("C2", 900_000 * RON, days(15), suspect=True), subsequent("C3", 400_000 * RON, days(20))) == []
    [hit] = found(ceiling("F1"), subsequent("C1", 600_000 * RON, days(10)), subsequent("C2", 9_000_000 * RON, days(15), suspect=True), subsequent("C3", 600_000 * RON, days(20)))
    assert hit.record_codes == ("F1", "C1", "C3")


def test_one_signal_per_framework_and_frameworks_do_not_mix():
    hits = found(ceiling("F1", notice="CAN1"), subsequent("C1", 1_200_000 * RON, days(10), notice="CAN1"),
                 ceiling("F2", notice="CAN2", authority="1000009", cpv="15000000-8"), subsequent("D1", 600_000 * RON, days(10), notice="CAN2", authority="1000009", cpv="15000000-8"),
                 ceiling("F3", notice="CAN3", suppliers=(S2,), cpv="15000000-8"), subsequent("E1", 1_150_000 * RON, days(30), notice="CAN3", suppliers=(S2,), cpv="15000000-8"))
    assert [h.record_codes for h in hits] == [("F1", "C1"), ("F3", "E1")]  # CAN2 is at 60%


def test_another_authoritys_subsequent_contracts_count_in_the_sums_as_seap_framework_does_but_are_not_members():
    # 1,200,000 of the framework authority's own, plus 9,000,000 signed by a beneficiary authority under the same notice
    [hit] = found(ceiling("F1"), subsequent("C1", 1_200_000 * RON, days(10)), subsequent("X1", 9_000_000 * RON, days(11), authority="1000009"))
    assert hit.record_codes == ("F1", "C1") and hit.authority_key == A
    assert hit.numbers == {"ceiling": str(CEILING), "subsequent": str(10_200_000 * RON), "ratio": 10.2}


def test_a_subsequent_contract_of_another_authority_can_cross_and_dates_the_signal_while_reproduce_stops_at_the_last_member():
    [hit] = found(ceiling("F1"), subsequent("C1", 600_000 * RON, days(10)), subsequent("X1", 600_000 * RON, days(20), authority="1000009"),
                  subsequent("C2", 100_000 * RON, days(30)))
    # 600 + 600 = 1,200 > 1,100 at X1 (day 20): dated by it; the members are the authority's own Records up to that day
    assert hit.date == days(20) and hit.record_codes == ("F1", "C1") and hit.authority_key == A
    assert hit.reproduce["to"] == days(10).isoformat() and hit.value_bani == 600_000 * RON
    assert hit.numbers["subsequent"] == str(1_300_000 * RON)


def test_an_overrun_made_only_of_other_authorities_subsequent_contracts_is_a_signal_of_the_ceiling_authority():
    [hit] = found(ceiling("F1"), subsequent("X1", 700_000 * RON, days(10), authority="1000009"), subsequent("X2", 500_000 * RON, days(12), authority="1000010"))
    assert hit.authority_key == A and hit.date == days(12) and hit.record_codes == ("F1",) and hit.reproduce["to"] == D0.isoformat()


def test_a_suspect_earlier_ceiling_still_fixes_the_framework_date():
    assert found(ceiling("F0", suspect=True, day=date(2020, 6, 1)), ceiling("F1", day=date(2021, 2, 1)), subsequent("C1", 3_000_000 * RON, date(2021, 3, 1))) == []


def test_the_signal_is_dated_by_its_latest_record():
    [hit] = found(ceiling("F1", day=days(50)), subsequent("C1", 1_200_000 * RON, days(10)))  # a ceiling dated after the subsequent contract (odd data)
    assert hit.date == days(50) and hit.first_date == days(50)


def test_reproduce_has_the_supplier_only_when_every_member_has_exactly_that_one_winner():
    [hit] = found(ceiling("F1"), subsequent("C1", 1_200_000 * RON, days(10)))
    assert hit.reproduce == {"authority": A, "signal": "FRAMEWORK_OVERRUN", "supplier": S1, "cpv": "33690000-3", "from": "2023-03-01", "to": "2023-03-11"}
    [hit] = found(ceiling("F1", suppliers=(S1,)), subsequent("C1", 1_200_000 * RON, days(10), suppliers=(S2,)))  # several suppliers
    assert "supplier" not in hit.reproduce and hit.supplier_keys == (S1, S2)
    [hit] = found(ceiling("F1", suppliers=(S1, S2)), subsequent("C1", 1_200_000 * RON, days(10), suppliers=(S1, S2)))  # a consortium: a row per winner
    assert "supplier" not in hit.reproduce
    [hit] = found({**ceiling("F1"), "winners": [winner(S1), winner("x", natural=True)]}, subsequent("C1", 1_200_000 * RON, days(10)))
    assert "supplier" not in hit.reproduce and hit.supplier_keys == (S1,)


def test_reproduce_cpv_is_the_longest_common_prefix_and_absent_when_there_is_none():
    [hit] = found(ceiling("F1", cpv="33690000-3"), subsequent("C1", 1_200_000 * RON, days(10), cpv="33600000-6"))
    assert hit.reproduce["cpv"] == "336"
    [hit] = found(ceiling("F1", cpv="33690000-3"), subsequent("C1", 1_200_000 * RON, days(10), cpv="15000000-8"))
    assert "cpv" not in hit.reproduce
    [hit] = found(ceiling("F1", cpv=" 33690000-3"), subsequent("C1", 1_200_000 * RON, days(10), cpv="33690000-3"))  # whitespace is not part of the prefix
    assert hit.reproduce["cpv"] == "33690000-3"


def test_reproduce_dates_run_from_the_first_to_the_last_member():
    [hit] = found(ceiling("F1"), subsequent("C1", 700_000 * RON, days(10)), subsequent("C2", 500_000 * RON, days(25)), subsequent("C3", 500_000 * RON, days(40)))
    assert (hit.reproduce["from"], hit.reproduce["to"]) == ("2023-03-01", "2023-03-26") and hit.date == days(25)


def _two_frameworks(**second):
    base = dict(notice="CAN2", day=days(5), suppliers=(S1,), cpv="33690000-3")
    base.update(second)
    notice = base["notice"]
    return found(ceiling("F1"), subsequent("C1", 1_200_000 * RON, days(10)),
                 ceiling("G1", notice=notice, day=base["day"], suppliers=base["suppliers"], cpv=base["cpv"]),
                 subsequent("D1", 1_200_000 * RON, days(20), notice=notice, suppliers=base["suppliers"], cpv=base["cpv"]))



def test_two_overlapping_frameworks_of_one_authority_collide_and_both_are_still_emitted(caplog):
    with caplog.at_level(logging.WARNING, logger="pipeline.signals.framework_overrun"):
        hits = _two_frameworks()
    assert [h.record_codes for h in hits] == [("F1", "C1"), ("G1", "D1")]
    assert "also returns Records of another framework" in caplog.text


def test_collisions_are_found_pairwise_and_only_when_the_other_filter_would_return_a_member():
    def pairs(*rows):
        by_notice = {}
        for r in rows:
            by_notice.setdefault(r["notice_code"], []).append(r)
        items = [f for rs in by_notice.values() if (f := fo._framework(rs)) is not None]
        return sorted((a.record_codes[0], b.record_codes[0]) for a, b in fo.collisions(items))

    one = [ceiling("F1"), subsequent("C1", 1_200_000 * RON, days(10))]
    def other(**kw):
        return [ceiling("G1", notice="CAN2", **{k: v for k, v in kw.items() if k in ("day", "suppliers", "cpv", "authority")}),
                subsequent("D1", 1_200_000 * RON, kw.get("off", days(20)), notice="CAN2", **{k: v for k, v in kw.items() if k in ("suppliers", "cpv", "authority")})]
    assert pairs(*one, *other(day=days(5))) == [("F1", "G1"), ("G1", "F1")]  # ranges overlap, same supplier and CPV
    assert pairs(*one, *other(day=days(100), off=days(120))) == []  # disjoint date ranges tell them apart
    assert pairs(*one, *other(day=days(5), suppliers=(S2,))) == []  # another supplier: the supplier key separates them
    assert pairs(*one, *other(day=days(5), cpv="15000000-8")) == []  # another CPV group
    assert pairs(*one, *other(day=days(5), authority="1000009")) == []  # another authority
    # one-way: a framework whose range (day 0..20) contains the other's members (days 5 and 10), while the other's range holds none of its own members
    wide = [ceiling("F1"), subsequent("C1", 1_200_000 * RON, days(20))]
    assert pairs(*wide, *other(day=days(5), off=days(10))) == [("F1", "G1")]


def test_detect_is_a_generator_and_reads_the_stream_once_up_to_its_end():
    pulled = []

    def stream():
        for r in [ceiling("F1"), subsequent("C1", 1_200_000 * RON, days(10)), ceiling("G1", notice="CAN2"), subsequent("D1", 1_200_000 * RON, days(10), notice="CAN2")]:
            pulled.append(r["code"])
            yield r

    out = fo.detect(stream())
    assert pulled == []  # a generator: nothing is read until asked
    next(out)
    assert pulled == ["F1", "C1", "G1", "D1"]  # the collision check needs the (small) list of Signals, so the stream is read up to its end
    assert isinstance(out, type(x for x in ()))


def test_rows_without_a_notice_or_a_framework_role_are_ignored():
    plain = row(code="C0", kind="CONTRACT", day=D0, value=9_000_000 * RON)
    assert found(ceiling("F1"), subsequent("C1", 1_200_000 * RON, days(10)), {**plain, "notice_code": "CAN1", "framework_role": None}) != []
    assert list(fo.detect([plain, {**plain, "notice_code": "CAN9", "framework_role": None}])) == []
