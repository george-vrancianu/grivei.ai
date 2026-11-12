"""The benchmark's Python mirror of the API's filter handling against the API itself (#91). The expectations are what
`explorer/packages/api/test/benchParity.test.ts` computes with the API's own `buildWhere` and `rollupPlan` (it fails when they no
longer match `tests/fixtures/bench_parity.json`; `UPDATE_BENCH_PARITY=1 npm test` there rewrites the file). This test fails when
`pipeline/bench.py` no longer produces the same predicates, parameters and rollup plans over every shipped query."""
import json
from pathlib import Path

import pytest

from pipeline import bench

PARITY = json.loads((Path(__file__).parent / "fixtures" / "bench_parity.json").read_text(encoding="utf-8"))


def test_the_parity_file_covers_every_shipped_query():
    labels = {c["label"] for c in PARITY}
    assert {q["label"] for q in bench.load_queries()} <= labels, "run `UPDATE_BENCH_PARITY=1 npm test` in explorer/packages/api after changing bench_queries.json"
    assert len(PARITY) > len(bench.load_queries())  # plus the extra filters of the vitest


@pytest.mark.parametrize("case", PARITY, ids=[c["label"] for c in PARITY])
def test_where_and_rollup_plan_match_the_apis(case):
    w = bench.build_where(case["filter"])
    assert {"sql": w.sql, "params": w.params, "winnerSide": w.winner_side, "empty": w.empty, "qFolded": w.q_folded} == case["where"]
    assert bench.rollup_plan(case["filter"]) == case["rollup"]
