"""Signals through a real rebuild (ticket #74): the tables, the search rows, the base rates, and the load transaction. Needs Docker
(the container fixture of test_bulk_loader_db.py)."""
import shutil
from datetime import date
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline import rebuild as rebuild_module  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

FIXTURES = Path(__file__).parent / "fixtures"


def load(url, tmp_path, name="archive-signals", **kw):
    root = tmp_path / name
    if not root.exists():
        shutil.copytree(FIXTURES / name, root)
    return rebuild(Archive(root), url, **kw)


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


@pytest.fixture
def built(db, tmp_path):
    load(db, tmp_path)
    return db


def test_a_rebuild_fills_the_signals_their_records_and_the_search_rows(built):
    signals = q(built, "SELECT rule, authority_key, first_date, last_date, record_count, value_bani, supplier_keys, numbers FROM seap.signal ORDER BY id")
    by = {(r[0], r[1], r[3]): r for r in signals}
    # over-cap: S on 2023-01-10 holds both Records of the day (ALFA and BETA)
    s = by[("OVER_CAP", "1000017", date(2023, 1, 10))]
    assert s[4] == 2 and s[6] == ["2000007", "2000015"] and s[5] == (300_000 + 280_000) * 100
    assert s[7] == {"value": "30000000", "cap": "27012000", "multiple": 1.110618}
    assert ("OVER_CAP", "1000017", date(2023, 1, 11)) not in by  # exactly the cap
    assert by[("OVER_CAP", "1000017", date(2023, 1, 12))][7]["value"] == "27012001"
    assert ("OVER_CAP", "1000017", date(2023, 1, 13)) not in by  # exactly 10x: suspect
    assert by[("OVER_CAP", "1000017", date(2023, 1, 14))][7]["multiple"] == 10.0  # just below 10x
    assert ("OVER_CAP", "1000017", date(2023, 1, 15)) not in by  # CPV 70
    assert by[("OVER_CAP", "1000009", date(2023, 2, 2))][7]["cap"] == "90040000"  # works
    assert ("OVER_CAP", "1000009", date(2023, 2, 1)) not in by
    assert by[("OVER_CAP", "1000017", date(2023, 2, 3))][6] == []  # a natural person is no supplier
    assert by[("OVER_CAP", "1000009", date(2022, 9, 9))][7]["cap"] == "13506000"  # the old cap
    assert ("OVER_CAP", "1000009", date(2022, 9, 10)) not in by
    # no-publication: both Records of S on 2023-02-10, the consortium members included
    n = by[("NO_PUBLICATION", "1000017", date(2023, 2, 10))]
    assert n[4] == 2 and n[6] == ["2000007", "2000015", "2000023"] and n[7] == {"procedure": "Negociere fara publicare prealabila"}
    assert ("NO_PUBLICATION", "1000017", date(2023, 3, 1)) not in by  # "Negociere" alone is not the rule's procedure
    assert by[("NO_PUBLICATION", "1000017", date(2021, 4, 2))][4] == 1  # backfilled: one award notice, dated by its earliest contract
    assert ("NO_PUBLICATION", "1000017", date(2021, 4, 5)) not in by  # Procedura simplificata proprie
    crawled = by[("NO_PUBLICATION", "1000017", date(2026, 3, 29))]  # crawled: no initiation procedure, one award notice worth 1,000.00 + 2,500.50
    assert crawled[5] == 350050 and crawled[4] == 1
    assert q(built, "SELECT count(*) FROM seap.signal_member m JOIN seap.signal g ON g.id = m.signal_id WHERE g.rule = 'NO_PUBLICATION'")[0][0] == 6
    # the search rows: every Record of a Signal says so, and only those
    assert set(q(built, "SELECT DISTINCT record_code FROM seap.search WHERE has_signals")) == set(q(built, "SELECT DISTINCT record_code FROM seap.signal_member"))
    assert q(built, "SELECT count(*) FROM seap.search WHERE has_signals <> (signals <> '{}')") == [(0,)]
    assert q(built, "SELECT signals FROM seap.search WHERE record_code = 'DA98000001'") == [(["OVER_CAP"],)]
    assert q(built, "SELECT has_signals FROM seap.search WHERE record_code = 'DA98000005'") == [(False,)]  # suspect: never in a Signal


def test_the_reproducing_filter_names_exactly_the_records_of_each_signal(built):
    """The Python side of the hard requirement (the API's seam 1 runs it through GraphQL): the filter's SQL over seap.search."""
    for sid, rule, reproduce in q(built, "SELECT id, rule, reproduce FROM seap.signal"):
        wanted = {c for (c,) in q(built, "SELECT record_code FROM seap.signal_member WHERE signal_id = %s", sid)}
        found = {c for (c,) in q(built, "SELECT record_code FROM seap.search WHERE authority_key = %s AND %s = ANY(signals) AND award_date BETWEEN %s AND %s",
                                 reproduce["authority"], reproduce["signal"], reproduce["from"], reproduce["to"])}
        assert found == wanted and reproduce["signal"] == rule


def test_the_rule_windows_and_base_rates(built):
    rows = {r[0]: r for r in q(built, "SELECT slug, window_from, window_to, base_rate, base_rate_year, data_through, authorities, with_signal FROM seap.signal_rule")}
    over, nopub = rows["OVER_CAP"], rows["NO_PUBLICATION"]
    assert over[1] == date(2022, 1, 1) and nopub[1] == date(2021, 1, 1)  # the backfill reaches 2021
    assert over[2] is None and nopub[2] is None
    assert (over[4], nopub[4]) == (2023, 2023)  # the latest complete year before the data-through year (2024)
    assert (over[6], over[7]) == (3, 2) and over[3] == pytest.approx(2 / 3)  # S and the commune of the three authorities with a direct purchase
    assert (nopub[6], nopub[7]) == (3, 1) and nopub[3] == pytest.approx(1 / 3)  # only S had one in 2023; the commune's is in 2024
    assert over[5] == date(2024, 3, 20) and nopub[5] == date(2024, 2, 1)  # the earliest data-through of the kinds each rule reads


def test_base_rates_recompute_on_each_load(built, tmp_path):
    before = q(built, "SELECT slug, base_rate FROM seap.signal_rule ORDER BY slug")
    load(built, tmp_path, "archive-roles")  # a different load into the same database: nothing over the cap, no procedure without publication
    after = q(built, "SELECT slug, base_rate, authorities, with_signal FROM seap.signal_rule ORDER BY slug")
    assert before != [(s, b) for s, b, _, _ in after]
    assert all(b == 0.0 and w == 0 and a > 0 for _, b, a, w in after)
    assert q(built, "SELECT count(*) FROM seap.signal") == [(0,)]
    load(built, tmp_path)  # and back
    assert q(built, "SELECT slug, base_rate FROM seap.signal_rule ORDER BY slug") == before


def test_signals_are_visible_only_when_the_load_commits_and_a_failed_load_keeps_the_previous_ones(built, tmp_path, monkeypatch):
    count = "SELECT (SELECT count(*) FROM seap.signal), (SELECT count(*) FROM seap.signal_member), (SELECT count(*) FROM seap.search WHERE has_signals)"
    previous = q(built, count)
    assert previous[0][0] > 0
    seen = []
    real = rebuild_module.build_rollup

    def peek(cur):
        seen.append(cur.execute("SELECT count(*) FROM seap.signal").fetchone()[0])  # this transaction: the new load's Signals (none)
        # another session cannot read the tables the load is replacing until it commits: it waits, it never sees a half-built set
        with psycopg.connect(built, options="-c lock_timeout=300") as reader, pytest.raises(psycopg.errors.LockNotAvailable):
            reader.execute("SELECT count(*) FROM seap.signal")
        real(cur)

    monkeypatch.setattr(rebuild_module, "build_rollup", peek)
    load(built, tmp_path, "archive-roles")
    assert seen == [0]
    assert q(built, count) == [(0, 0, 0)]  # committed: the new load's Signals (none), and the search rows agree
    monkeypatch.setattr(rebuild_module, "build_rollup", real)
    load(built, tmp_path)
    assert q(built, count) == previous

    def boom(cur):
        raise RuntimeError("the index build failed")

    monkeypatch.setattr(rebuild_module, "build_rollup", boom)
    with pytest.raises(RuntimeError):  # fails after the Signals were built: the previous Signals stay
        load(built, tmp_path, "archive-roles")
    assert q(built, count) == previous


def test_framework_overrun_through_a_rebuild_matches_seap_framework_and_floors_its_window_at_2021(db, tmp_path):
    """#76: the rule's sums are made from the streamed Records; they must equal `seap.framework` (the counting rule's own table). The fixture
    has a 2020 Contracte file, yet the rule's window starts on 2021-01-01 (`WINDOW_FROM`)."""
    load(db, tmp_path, "archive-framework-overrun")
    signals = q(db, "SELECT authority_key, first_date, last_date, record_count, numbers FROM seap.signal WHERE rule = 'FRAMEWORK_OVERRUN' ORDER BY last_date, authority_key")
    assert [(a, f, ld, n) for a, f, ld, n, _ in signals] == [
        ("1000009", date(2023, 1, 2), date(2023, 2, 5), 3), ("1000017", date(2023, 1, 15), date(2023, 2, 20), 2),
        ("2000031", date(2023, 1, 5), date(2023, 2, 20), 4), ("1000017", date(2023, 1, 10), date(2023, 3, 5), 4)]
    by_notice = {r[0]: r for r in q(db, "SELECT notice_code, ceiling_bani, subsequent_bani, ratio FROM seap.framework")}
    for notice, number in (("CAN9700001", signals[3][4]), ("CAN9700007", signals[1][4]), ("CAN9700006", signals[2][4]), ("CAN9700008", signals[0][4])):
        _, ceiling, subsequent, ratio = by_notice[notice]
        assert number == {"ceiling": str(ceiling), "subsequent": str(subsequent), "ratio": ratio}
    # the 2020 Records are before the window: the base-rate year is 2023, not the "latest complete year" 2020
    assert q(db, "SELECT window_from, base_rate_year, base_rate, authorities, with_signal FROM seap.signal_rule WHERE slug = 'FRAMEWORK_OVERRUN'") == [(date(2021, 1, 1), 2023, 1.0, 3, 3)]
    assert q(db, "SELECT DISTINCT notice_code FROM seap.record r JOIN seap.signal_member m ON m.record_code = r.code ORDER BY 1") == [(f"CAN970000{n}",) for n in (1, 6, 7, 8)]
