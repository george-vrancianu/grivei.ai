"""The `splitting` rule (ticket #75) as a pure function over row dicts: no database. The DB side is the seam 1 fixtures (archive-splitting)."""
from datetime import date, timedelta

from pipeline.counting import RON
from pipeline.signals import RULES, splitting
from test_signals import NEW_SUPPLIES, NEW_WORKS, OLD_SUPPLIES, row, winner

A, S1, S2 = "1000017", "2000007", "2000015"
CAP = NEW_SUPPLIES  # 270,120 RON in 2023
HALF = CAP // 2 + 100 * RON  # two of these are over the cap, each is well under it
D0 = date(2023, 3, 1)


def buy(code, day, value, authority=A, supplier=S1, cpv="30197000-6", **kw):
    return row(code=code, day=day, value=value, authority=authority, cpv=cpv, winners=[winner(supplier)], **kw)


def found(*rows):
    return list(splitting.detect(sorted((r for r in rows if splitting.eligible(r)), key=splitting.order_key)))


def test_two_purchases_each_under_the_cap_and_over_it_together_are_a_signal():
    [hit] = found(buy("DA1", D0, HALF), buy("DA2", D0 + timedelta(days=10), HALF))
    assert hit.rule == "SPLITTING" and hit.authority_key == A and hit.supplier_keys == (S1,)
    assert (hit.first_date, hit.date, hit.record_codes) == (D0, D0 + timedelta(days=10), ("DA1", "DA2"))
    assert hit.numbers == {"purchases": 2, "sum": str(2 * HALF), "cap": str(CAP), "cpvGroup": "301", "from": "2023-03-01", "to": "2023-03-11"}
    assert hit.reproduce == {"authority": A, "signal": "SPLITTING", "supplier": S1, "cpv": "301", "from": "2023-03-01", "to": "2023-03-11"}
    assert hit.value_bani == 2 * HALF


def test_rule_is_registered_with_the_dispatched_kinds():
    assert splitting in RULES and splitting.KINDS == ("DA", "DAN")


def test_exactly_the_cap_together_is_no_signal_and_one_ban_more_is():
    assert found(buy("DA1", D0, CAP // 2), buy("DA2", D0, CAP // 2)) == []
    assert len(found(buy("DA1", D0, CAP // 2), buy("DA2", D0, CAP // 2 + 1))) == 1


def test_a_single_purchase_is_never_a_signal():
    assert found(buy("DA1", D0, CAP)) == []


def test_the_window_is_30_days_counting_both_ends_and_a_31_day_span_is_a_near_miss():
    assert len(found(buy("DA1", D0, HALF), buy("DA2", D0 + timedelta(days=29), HALF))) == 1  # 30 days inclusive
    assert found(buy("DA1", D0, HALF), buy("DA2", D0 + timedelta(days=30), HALF)) == []  # 31 days inclusive


def test_overlapping_windows_merge_into_one_signal_from_first_to_last():
    # windows [1,2] and [2,3] qualify, 1 and 3 are 40 days apart: still one Signal
    [hit] = found(buy("DA1", D0, HALF), buy("DA2", D0 + timedelta(days=20), HALF), buy("DA3", D0 + timedelta(days=40), HALF))
    assert hit.record_codes == ("DA1", "DA2", "DA3") and (hit.first_date, hit.date) == (D0, D0 + timedelta(days=40))
    assert hit.numbers["purchases"] == 3 and hit.numbers["sum"] == str(3 * HALF)


def test_disjoint_windows_of_the_same_triple_are_two_signals():
    hits = found(buy("DA1", D0, HALF), buy("DA2", D0 + timedelta(days=5), HALF), buy("DA3", D0 + timedelta(days=100), HALF), buy("DA4", D0 + timedelta(days=101), HALF))
    assert [h.record_codes for h in hits] == [("DA1", "DA2"), ("DA3", "DA4")]
    assert hits[0].date < hits[1].first_date  # from / to tell the two apart


def test_purchases_on_the_same_day_count_and_a_later_one_on_that_day_is_in_the_window():
    [hit] = found(buy("DA1", D0, HALF), buy("DA2", D0, HALF // 2), buy("DA3", D0, HALF // 2))
    assert hit.record_codes == ("DA1", "DA2", "DA3")


def test_another_supplier_cpv_group_or_authority_is_not_grouped():
    assert found(buy("DA1", D0, HALF), buy("DA2", D0, HALF, supplier=S2)) == []
    assert found(buy("DA1", D0, HALF), buy("DA2", D0, HALF, cpv="30297000-6")) == []
    assert found(buy("DA1", D0, HALF), buy("DA2", D0, HALF, authority="1000009")) == []
    assert len(found(buy("DA1", D0, HALF), buy("DA2", D0, HALF, cpv="30199999-9"))) == 1  # the same three digits


def test_cpv_70_and_the_exempt_divisions_are_left_out():
    assert found(buy("DA1", D0, HALF, cpv="70220000-9"), buy("DA2", D0, HALF, cpv="70220000-9")) == []


def test_suspect_blank_and_over_cap_purchases_neither_trigger_nor_count():
    over = CAP + 1
    assert found(buy("DA1", D0, HALF), buy("DA2", D0, over)) == []  # over its cap: over-cap's, not a member
    assert found(buy("DA1", D0, HALF), buy("DA2", D0, 10 * CAP, suspect=True)) == []
    assert found(buy("DA1", D0, HALF), buy("DA2", D0, None)) == []
    assert found(buy("DA1", D0, HALF), buy("DA2", D0, 0)) == []
    # a suspect Record in the middle is not a member of the Signal the others make
    [hit] = found(buy("DA1", D0, HALF), buy("DA9", D0 + timedelta(days=2), 10 * CAP, suspect=True), buy("DA2", D0 + timedelta(days=3), HALF))
    assert hit.record_codes == ("DA1", "DA2")


def test_natural_persons_and_consortia_are_left_out():
    person = row(code="DA3", day=D0, value=HALF, authority=A, winners=[winner(None, natural=True)])
    assert found(buy("DA1", D0, HALF), person) == []
    consortium = row(code="DA4", day=D0, value=HALF, authority=A, winners=[winner(S1), winner(S2)])
    assert found(buy("DA1", D0, HALF), consortium) == []


def test_contracts_are_not_direct_purchases():
    assert found(buy("DA1", D0, HALF), buy("CAN1", D0, HALF, kind="CONTRACT")) == []


def test_the_cap_of_the_last_purchases_date_decides_across_10_september_2022():
    old_a, new_b = date(2022, 9, 1), date(2022, 9, 20)
    # 200,000 RON together is over the old cap but at or under the new one, and the last date is in the new era: no Signal
    assert found(buy("DA1", old_a, 100_000 * RON), buy("DA2", new_b, 100_000 * RON)) == []
    # 135,060 (at the old cap) + 135,100 = 270,160 > the NEW cap in force on the last date: a Signal carrying the new cap
    [hit] = found(buy("DA1", old_a, OLD_SUPPLIES), buy("DA2", new_b, 135_100 * RON))
    assert hit.numbers["cap"] == str(NEW_SUPPLIES)
    # both before: the old cap decides
    [hit] = found(buy("DA1", date(2022, 8, 1), 100_000 * RON), buy("DA2", date(2022, 8, 20), 100_000 * RON))
    assert hit.numbers["cap"] == str(OLD_SUPPLIES)
    # a purchase over the OLD cap on an old date is over-cap's, even though it is under the new cap
    assert found(buy("DA1", old_a, OLD_SUPPLIES + 1), buy("DA2", new_b, NEW_SUPPLIES // 2)) == []


def test_works_have_their_own_cap_by_contract_type_and_by_cpv_45():
    each = 500_000 * RON  # over the supplies cap together, under the works cap
    assert found(buy("DA1", D0, each, cpv="45233140-2"), buy("DA2", D0, each, cpv="45233140-2")) != []  # 1,000,000 RON > 900,400
    assert found(buy("DA1", D0, 400_000 * RON, cpv="45233140-2"), buy("DA2", D0, 400_000 * RON, cpv="45233140-2")) == []  # 800,000 < works cap
    assert found(buy("DA1", D0, 400_000 * RON, kind="DAN", contract_type="Lucrari"), buy("DA2", D0, 400_000 * RON, kind="DAN", contract_type="Lucrari")) == []
    [hit] = found(buy("DA1", D0, 500_000 * RON, kind="DAN", contract_type="Lucrari"), buy("DA2", D0, 500_000 * RON, kind="DAN", contract_type="Lucrari"))
    assert hit.numbers["cap"] == str(NEW_WORKS)
    # a works purchase over the works cap is over-cap's
    assert found(buy("DA1", D0, NEW_WORKS + 1, cpv="45233140-2"), buy("DA2", D0, 1000, cpv="45233140-2")) == []


def test_detect_streams_one_triple_at_a_time_from_rows_in_order_by_order():
    pulled = []

    def stream():
        for r in sorted([buy("DA1", D0, HALF), buy("DA2", D0 + timedelta(days=5), HALF),
                         buy("DA3", D0, HALF, supplier=S2), buy("DA4", D0 + timedelta(days=5), HALF, supplier=S2)], key=splitting.order_key):
            pulled.append(r["code"])
            yield r

    hits = splitting.detect(stream())
    assert pulled == []  # lazy
    first = next(hits)
    assert first.supplier_keys == (S1,) and pulled == ["DA1", "DA2", "DA3"]  # the next triple's first row ends the run; the rest is not read yet
    assert next(hits).supplier_keys == (S2,) and pulled == ["DA1", "DA2", "DA3", "DA4"]


def test_the_rule_declares_the_ordering_the_runner_uses():
    from pipeline.signals import _rows

    class Cur:
        sql = None
        connection = None

        def cursor(self, **kw):
            return self

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def execute(self, sql):
            Cur.sql = sql

        def __iter__(self):
            return iter(())

    cur = Cur()
    cur.connection = cur
    list(_rows(cur, splitting.WHERE, splitting.ORDER_BY))
    assert Cur.sql.endswith(f"ORDER BY {splitting.ORDER_BY}") and splitting.ORDER_BY.endswith("award_date, code")
    list(_rows(cur, "TRUE"))
    assert Cur.sql.endswith("ORDER BY code")
