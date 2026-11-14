"""ONRC search's latency benchmark (#176), no database: the filter -> SQL mapping against the API's own `buildOnrcWhere` (the expectations are what
`explorer/packages/api/test/benchOnrcParity.test.ts` computes; `UPDATE_BENCH_PARITY=1 npm test` there rewrites `fixtures/bench_onrc_parity.json`),
the query file, the statements of one keystroke and the verdict."""
import json
from pathlib import Path

import pytest

from pipeline import bench_onrc

PARITY = json.loads((Path(__file__).parent / "fixtures" / "bench_onrc_parity.json").read_text(encoding="utf-8"))


def test_the_parity_file_covers_every_shipped_query():
    labels = {c["label"] for c in PARITY}
    assert {q["label"] for q in bench_onrc.load_queries()} <= labels, "run `UPDATE_BENCH_PARITY=1 npm test` in explorer/packages/api after changing bench_onrc_queries.json"
    assert len(PARITY) > len(bench_onrc.load_queries())  # plus the extra filters of the vitest


@pytest.mark.parametrize("case", PARITY, ids=[c["label"] for c in PARITY])
def test_where_matches_the_apis(case):
    w = bench_onrc.build_where(case["filter"])
    assert {"sql": w.sql, "params": w.params, "text": w.text, "qFolded": w.q_folded} == case["where"]


def test_the_shipped_queries_load_and_cover_every_chip():
    queries = bench_onrc.load_queries()
    used = {k for q in queries for k in q["filter"]}
    assert used >= {"q", "status", "caen", "county", "registeredFrom", "registeredTo", "seapCounterparty"}
    assert any(q["filter"] == {} for q in queries)  # the empty query
    with pytest.raises(ValueError):
        bench_onrc.load_queries(Path(__file__))  # not JSON


class FakeConn:
    """Records every statement; `count` answers 3 rows, the page answers three registrations with a CUI each."""

    def __init__(self, total=3):
        self.total, self.statements = total, []

    def execute(self, sql, params):
        self.statements.append(sql)
        rows = {"count(*)": [(self.total,)], "SELECT reg_no": [("J1/1/2000",), ("J2/2/2000",)], "r.legal_form": [("J1/1/2000", "N", "3100020", "SRL", None, None, None, False)]}
        for needle, answer in rows.items():
            if needle in sql:
                return type("R", (), {"fetchall": lambda self_, a=answer: a})()
        return type("R", (), {"fetchall": lambda self_: []})()

    def rollback(self):
        pass


def test_one_keystroke_runs_the_count_the_page_with_its_rows_and_the_lens():
    conns = [FakeConn(), FakeConn(), FakeConn()]
    report = bench_onrc.run_keystroke(conns, {"q": "alfa"})
    assert set(report["tasks"]) == {"count", "organisations", "map"}
    assert set(report["statements"]) >= {"count", "organisations_count", "organisations_page", "organisations_rows", "organisations_statuses", "organisations_caen", "organisations_aliases", "organisations_entities", "map"}
    page = next(s for c in conns for s in c.statements if "SELECT reg_no" in s)
    assert "ORDER BY pdb.score(id) DESC, registration_date DESC NULLS LAST, id LIMIT 50" in page


def test_a_query_with_no_text_is_not_ordered_by_a_score_and_no_match_stops_after_the_count():
    conns = [FakeConn(), FakeConn(), FakeConn()]
    bench_onrc.run_keystroke(conns, {})
    assert any("ORDER BY registration_date DESC NULLS LAST, id LIMIT 50" in s for c in conns for s in c.statements)
    none = [FakeConn(0), FakeConn(0), FakeConn(0)]
    report = bench_onrc.run_keystroke(none, {"q": "x"})
    assert "organisations_page" not in report["statements"]
