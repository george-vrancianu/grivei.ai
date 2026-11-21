"""The search table and its pg_search index through a real rebuild (ticket #68): the index exists and is vacuumed, a rebuild that rolls back
leaves the graph it found, value buckets mirror the contract's. Needs Docker (the container
fixture of test_bulk_loader_db.py); the bucket test does not."""
import re
import shutil
import time
from contextlib import contextmanager
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from pipeline.search import VALUE_BUCKETS, value_bucket  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

ARCHIVE = Path(__file__).parent / "fixtures" / "archive-search"
BUCKETS_TS = Path(__file__).resolve().parents[2] / "explorer/packages/contract/src/value-buckets.ts"


def test_value_buckets_mirror_the_contracts_edges_and_the_upper_edge_is_inclusive():
    ts = re.findall(r'bucket: "(\w+)", upToBani: (null|"\d+")', BUCKETS_TS.read_text())
    assert [(name, None if edge == "null" else int(edge.strip('"'))) for name, edge in ts] == list(VALUE_BUCKETS)
    assert value_bucket(13_506_000) == "UP_TO_135K" and value_bucket(13_506_001) == "UP_TO_270K"
    assert value_bucket(1) == "UP_TO_10K" and value_bucket(100_000_000_000) == "UP_TO_1B" and value_bucket(100_000_000_001) == "OVER_1B"
    assert value_bucket(None) is None


@pytest.fixture
def built(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    rebuild(Archive(root), db)
    return db


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


def test_the_rebuild_builds_the_bm25_index_and_vacuums_the_search_table_after_the_commit(built):
    (definition,) = q(built, "SELECT indexdef FROM pg_indexes WHERE schemaname = 'seap' AND indexname = 'search_bm25'")[0]
    assert "USING paradedb" in definition and "doc" in definition
    assert q(built, "SELECT count(*) FROM seap.search") == [(16,)]
    for _ in range(40):  # the statistics of the vacuum are reported a moment after it
        if q(built, "SELECT last_vacuum FROM pg_stat_user_tables WHERE schemaname = 'seap' AND relname = 'search'")[0][0]:
            break
        time.sleep(0.25)
    else:
        pytest.fail("seap.search was never vacuumed")
    # the index answers: every token required, the last one a prefix
    assert q(built, "SELECT record_code FROM seap.search WHERE doc &&& 'servicii' AND doc @@@ pdb.regex('desz.*') AND winner_position = 1 ORDER BY 1") == [("CAN9500001~1",), ("DA95000005",), ("DA95000006",)]


def test_shares_sum_back_to_the_counted_value_and_the_bucket_is_stored_per_row(built):
    assert q(built, "SELECT r.code FROM seap.record r JOIN seap.search s ON s.record_code = r.code GROUP BY r.code, r.counted_bani "
                    "HAVING coalesce(sum(s.share_bani), 0) <> coalesce(r.counted_bani, 0)") == []
    assert dict(q(built, "SELECT record_code, value_bucket FROM seap.search WHERE winner_position = 1 AND record_code IN ('DA95000003', 'DA95000004', 'DA95000011')")) == {
        "DA95000003": "UP_TO_135K", "DA95000004": "UP_TO_270K", "DA95000011": None}


def _smaller_archive(tmp_path):
    """The search archive without its direct-award unit: a rebuild of it leaves fewer search rows than the full one."""
    root = tmp_path / "smaller"
    shutil.copytree(ARCHIVE, root)
    shutil.rmtree(root / "seap" / "bulk" / "da")
    return root


def test_a_rolled_back_rebuild_leaves_the_graph_it_found(built, tmp_path, monkeypatch):
    import pipeline.build_steps as steps_module
    before = q(built, "SELECT id, record_code, doc FROM seap.search ORDER BY id")

    def boom(_cur):
        raise RuntimeError("died after the search rows were written")

    monkeypatch.setattr(steps_module, "build_rollup", boom)
    with pytest.raises(RuntimeError, match="died after"):
        rebuild(Archive(_smaller_archive(tmp_path)), built)
    assert q(built, "SELECT id, record_code, doc FROM seap.search ORDER BY id") == before


class _Progress:
    """Records the rebuild's calls to the progress reporter (only the ones the rebuild makes at its end matter here)."""
    def __init__(self):
        self.events = []

    def __getattr__(self, name):
        return lambda *a, **k: self.events.append(name)

    @contextmanager
    def step(self, name):
        self.events.append(f"step {name}")
        yield


def test_a_vacuum_that_fails_after_the_commit_is_a_warning_and_the_rebuild_still_finishes(db, tmp_path, monkeypatch, caplog):
    import pipeline.rebuild as rebuild_module

    def boom(_url):
        raise psycopg.OperationalError("vacuum went away")

    monkeypatch.setattr(rebuild_module, "vacuum", boom)
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    progress = _Progress()
    with caplog.at_level("WARNING", logger="pipeline.rebuild"):
        summary = rebuild(Archive(root), db, progress=progress)
    assert summary.records > 0
    assert "finish" in progress.events and "fail" not in progress.events
    assert any("VACUUM" in m for m in caplog.messages)
    assert q(db, "SELECT count(*) FROM seap.search") != [(0,)]  # committed
