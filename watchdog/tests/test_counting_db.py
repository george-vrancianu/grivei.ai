"""The counting rule through a real rebuild (ticket #65): the committed fixture `archive-counting/` (a DA file, a Contracte file
and archived estimated-value answers) is rebuilt into Postgres and every Record's counted value, badges, suspect rule, shares and
framework link are checked case by case. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline import estimates  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

ARCHIVE = Path(__file__).parent / "fixtures" / "archive-counting"
RON = 100


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    return Archive(root)


@pytest.fixture
def built(db, archive):
    summary = rebuild(archive, db)
    return db, summary


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


def record(url, code):
    cols = "value_bani, counted_bani, badges, suspect_rule, suspect_threshold_bani, framework_role, load_notes"
    (row,) = q(url, f"SELECT {cols} FROM seap.record WHERE code = %s", code)
    return row


def test_a_direct_purchase_at_ten_times_the_cap_of_its_date_is_suspect_and_everything_else_counts(built):
    url, _ = built
    old, new = 135_060 * RON, 270_120 * RON
    expected = {
        "DA94000001": (200_000_000, None, ["SUSPECT_VALUE"], "DIRECT_PURCHASE_10X_CAP", old),
        "DA94000002": (135_059_900, 135_059_900, [], None, None),
        "DA94000003": (200_000_000, None, ["SUSPECT_VALUE"], "DIRECT_PURCHASE_10X_CAP", old),  # the last day of the old caps
        "DA94000004": (200_000_000, 200_000_000, [], None, None),  # the first day of the new caps
        "DA94000005": (270_120_000, None, ["SUSPECT_VALUE"], "DIRECT_PURCHASE_10X_CAP", new),  # exactly 10x
        "DA94000006": (500_000_000, 500_000_000, [], None, None),  # works (CPV 45): cap 900,400, 10x is 9,004,000
        "DA94000007": (910_000_000, None, ["SUSPECT_VALUE"], "DIRECT_PURCHASE_10X_CAP", 900_400 * RON),
        "DA94000008": (5_000_000_000, 5_000_000_000, [], None, None),  # CPV 70 (rent): exempt
        "DA94000009": (None, None, ["NO_VALUE"], None, None),
        "DA94000010": (None, None, ["NO_VALUE"], None, None),  # zero is read as no value
    }
    for code, (value, counted, badges, rule, threshold) in expected.items():
        assert record(url, code)[:5] == (value, counted, badges, rule, threshold), code
    assert "value:zero" in record(url, "DA94000010")[6]


def test_frameworks_are_shown_never_summed_and_subsequent_contracts_are_linked_by_their_award_notice(built):
    url, _ = built
    assert record(url, "CAN9800001~1")[:3] == (10_000_000 * RON, None, ["FRAMEWORK_CEILING"])
    assert record(url, "CAN9800001~2")[:3] == (4_000_000 * RON, 4_000_000 * RON, ["SUBSEQUENT_CONTRACT"])
    assert record(url, "CAN9800004~1")[:3] == (300_000 * RON, 300_000 * RON, [])
    assert record(url, "CAN9800005~1")[:3] == (None, None, ["FRAMEWORK_CEILING", "NO_VALUE"])
    rows = q(url, "SELECT notice_code, agreement_code, ceiling_bani, subsequent_bani, subsequent_count, ratio FROM seap.framework ORDER BY 1")
    assert rows == [
        ("CAN9800001", "CAN9800001~1", 10_000_000 * RON, 5_000_000 * RON, 2, 0.5),
        ("CAN9800002", "CAN9800002~1", 10_000_000 * RON, 2_500_000 * RON, 1, 0.25),  # two framework contracts: the agreement is the notice
        ("CAN9800003", None, None, 700_000 * RON, 1, None),  # the framework is not in the archive: still counted, no agreement, no ceiling
        ("CAN9800005", "CAN9800005~1", None, 500_000 * RON, 1, None),  # a blank ceiling: no ratio
    ]


def test_a_consortium_counts_once_on_the_authority_side_and_its_shares_sum_back_to_the_value(built):
    url, _ = built
    ((winners,),) = q(url, "SELECT winners FROM seap.record WHERE code = 'CAN9800006~1'")
    assert [(w["naturalPerson"], w["share"]) for w in winners] == [(False, "33334"), (True, "33333"), (False, "33333")]  # the person takes a slot
    assert record(url, "CAN9800006~1")[:3] == (100_000, 100_000, ["CONSORTIUM_SHARE"])  # counted once, in full, on the authority side
    shares = q(url, "SELECT winner_position, counted_bani, share_bani FROM seap.search WHERE record_code = 'CAN9800006~1' ORDER BY 1")
    assert shares == [(1, 100_000, 33_334), (2, 100_000, 33_333), (3, 100_000, 33_333)]
    assert q(url, "SELECT share_bani FROM seap.search WHERE record_code = 'CAN9800007~1' ORDER BY 1") == [(100_000,), (100_000,)]
    # for every Record the supplier-side shares add up to what the authority side counted, to the bani
    assert q(url, """SELECT r.code FROM seap.record r JOIN seap.search s ON s.record_code = r.code
                      GROUP BY r.code, r.counted_bani HAVING coalesce(sum(s.share_bani), 0) IS DISTINCT FROM coalesce(r.counted_bani, 0)""") == []
    # ... and the authority side sums the Record table once per Record, the supplier side the shares per key
    assert q(url, "SELECT sum(counted_bani) FROM seap.record WHERE code LIKE 'CAN98000%%'")[0][0] == q(url, "SELECT sum(share_bani) FROM seap.search WHERE record_code LIKE 'CAN98000%%'")[0][0]


def test_the_stored_columns_alone_give_every_total_field(built):
    """suspect and ceiling are decided at load and stored on both tables, so a Total over seap.search needs no rule predicate."""
    url, _ = built
    assert q(url, "SELECT count(*) FROM seap.record WHERE suspect <> (suspect_rule IS NOT NULL)") == [(0,)]
    assert q(url, "SELECT count(*) FROM seap.record WHERE ceiling_bani IS DISTINCT FROM CASE WHEN framework_role = 'CEILING' AND suspect_rule IS NULL THEN value_bani END") == [(0,)]
    # the same totals from the search table's first winner row (the authority side counts a Record once)
    assert q(url, "SELECT count(*) FILTER (WHERE suspect), sum(ceiling_bani), sum(counted_bani) FROM seap.search WHERE winner_position = 1") == \
        q(url, "SELECT count(*) FILTER (WHERE suspect), sum(ceiling_bani), sum(counted_bani) FROM seap.record")


def test_contracts_of_a_billion_or_more_are_checked_against_the_archived_estimate_only(built):
    url, summary = built
    assert record(url, "CAN9810001~1")[:5] == (120_000_000_000, None, ["SUSPECT_VALUE"], "CONTRACT_100X_ESTIMATE", 10_000_000 * RON)
    assert record(url, "CAN9810002~1")[:5] == (200_000_000_000, 200_000_000_000, [], None, None)  # 1.33x its estimate
    assert record(url, "CAN9810003~1")[3:5] == ("CONTRACT_100X_ESTIMATE", 10_000_000 * RON)  # exactly 100x
    assert record(url, "CAN9810004~1")[:5] == (6_000_000_000_000, None, ["SUSPECT_VALUE"], "CONTRACT_OVER_50BN", None)  # no estimate, above 50 bn
    assert record(url, "CAN9810005~1")[1:4] == (300_000_000_000, [], None)  # looked up, no estimate, below 50 bn: counted
    # never looked up: counted for now and noted; the rule cannot be applied without its input
    for code, bani in (("CAN9810006~1", 400_000_000_000), ("CAN9810007~1", 7_000_000_000_000)):
        assert record(url, code)[1:4] == (bani, [], None) and "estimate:not_fetched" in record(url, code)[6]
    assert (summary.estimates, summary.estimates_missing) == (5, 2)
    assert any("2 notice(s) of 1 bn RON or more have none yet; run `pipeline estimates`" in line for line in summary.lines())


class NoEstimate:
    """The e-licitatie client as `estimates.lookup` uses it, answering "no such notice" to every request."""

    base = "https://e-licitatie.ro"

    def post(self, path, body, what):
        return b'{"items":[],"total":0,"searchTooLong":false}', None


def test_the_order_is_rebuild_then_estimates_then_rebuild(db, archive):
    first = rebuild(archive, db)
    assert estimates.candidates(db) == [f"CAN981000{i}" for i in range(1, 8)]  # the 7 notices at 1 bn RON or more
    summary = estimates.lookup(archive, estimates.candidates(db), NoEstimate(), lambda line: None, now=lambda: datetime(2026, 11, 12, tzinfo=timezone.utc))
    assert (summary.asked, summary.skipped) == (2, 5)  # only the two never looked up are asked
    second = rebuild(archive, db)
    assert (first.estimates_missing, second.estimates_missing, second.estimates) == (2, 0, 7)
    assert record(db, "CAN9810006~1")[1] == 400_000_000_000  # no estimate, below 50 bn: counted
    assert record(db, "CAN9810007~1")[:5] == (7_000_000_000_000, None, ["SUSPECT_VALUE"], "CONTRACT_OVER_50BN", None)  # now above 50 bn with no estimate


def test_a_second_rebuild_gives_the_same_graph_and_never_asks_the_network(db, archive, monkeypatch):
    import requests

    monkeypatch.setattr(requests.Session, "post", lambda *a, **k: (_ for _ in ()).throw(AssertionError("the rebuild called the network")))
    monkeypatch.setattr(requests, "post", lambda *a, **k: (_ for _ in ()).throw(AssertionError("the rebuild called the network")))
    dump = lambda: (q(db, "SELECT code, value_bani, counted_bani, badges, suspect_rule, winners FROM seap.record ORDER BY code"),
                    q(db, "SELECT * FROM seap.framework ORDER BY 1"), q(db, "SELECT record_code, winner_position, share_bani FROM seap.search ORDER BY 1, 2"))
    rebuild(archive, db)
    first = dump()
    rebuild(archive, db)
    assert dump() == first
