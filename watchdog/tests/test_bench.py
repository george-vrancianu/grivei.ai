"""The keystroke benchmark's pure parts (#91): the filter -> SQL mapping mirrors the API's, the tasks a keystroke runs, statistics,
verdicts, the query file. No database; tests/test_bench_db.py runs it against a rebuilt fixture graph."""
import json

import pytest

from pipeline import bench
from pipeline.bench import build_where, judge_scans, plan_tasks, rollup_plan, state_of, summarize, verdict


def test_the_last_token_is_a_regex_prefix_and_the_others_must_all_match():
    w = build_where({"q": "Spital Urgență Ma"})
    assert w.sql == "doc &&& %s::text AND doc @@@ pdb.regex(%s::text)"
    assert w.params == ["spital urgenta", "ma.*"]
    assert w.q_folded == "spital urgenta ma"
    one = build_where({"q": "ma"})
    assert one.sql == "doc @@@ pdb.regex(%s::text)" and one.params == ["ma.*"]


def test_legal_forms_and_ro_prefixed_cuis_fold_like_the_api_folds_them():
    assert build_where({"q": "ALFA S.R.L. RO4384206"}).params == ["alfa", "4384206.*"]
    assert build_where({"q": "SRL"}).empty  # a stop-word-only query is the empty query


def test_regex_metacharacters_are_escaped_and_never_reach_the_text_regex():
    assert build_where({"q": "a+b"}).params == ["a", "b.*"]  # the fold splits on `+`: no metacharacter reaches the regex from the text query
    assert bench._regex_escape("a.b*") == r"a\.b\*"


def test_no_text_means_the_all_predicate_so_aggregates_push_down():
    assert build_where({}).sql == "id @@@ pdb.all()" and build_where({}).empty
    chips = build_where({"channel": "CONTRACT", "valueBucket": "OVER_1B", "from": "2024-01-01"})
    assert chips.sql.startswith("id @@@ pdb.all() AND ") and not chips.empty
    assert chips.params == ["2024-01-01", "CONTRACT", "OVER_1B"]


def test_a_supplier_county_makes_the_filter_winner_side_and_the_authority_county_not():
    assert build_where({"county": "RO-BV", "countySide": "SUPPLIER"}).winner_side
    assert not build_where({"county": "RO-BV"}).winner_side and not build_where({"county": "RO-BV", "countySide": "AUTHORITY"}).winner_side
    assert "supplier_area = %s" in build_where({"county": "RO-BV", "countySide": "SUPPLIER"}).sql


def test_the_rollup_serves_no_text_whole_year_channel_bucket_signals_and_nothing_else():
    assert rollup_plan({}) == {"yearFrom": None, "yearTo": None, "channel": None, "valueBucket": None, "hasSignals": None}
    assert rollup_plan({"from": "2025-01-01", "to": "2025-12-31", "hasSignals": True})["yearFrom"] == 2025
    for narrower in ({"q": "ma"}, {"from": "2025-03-01"}, {"to": "2025-06-30"}, {"badges": ["SUSPECT_VALUE"]}, {"procedure": ["x"]}, {"cpv": "45"},
                      {"county": "RO-BV"}, {"authority": "1"}, {"supplier": "1"}, {"signal": "OVER_CAP"}, {"uat": "1"}):
        assert rollup_plan(narrower) is None, narrower
    assert rollup_plan({"q": "srl"}) is not None  # folds to nothing


def test_states():
    assert state_of({}) == "empty"
    assert state_of({"channel": "CONTRACT"}) == "chips"
    assert state_of({"badges": ["SUSPECT_VALUE"]}) == "chips-scan"
    assert state_of({"q": "ma"}) == "text" and state_of({"q": "ma", "channel": "CONTRACT"}) == "text"


def _tasks(f, **kw):
    return {t.name: t for t in plan_tasks(f, **kw)}


def test_a_text_keystroke_is_parallel_tasks_with_one_map_and_the_goto_and_the_scan_runs_the_statements_the_api_runs():
    t = _tasks({"q": "ma"})
    assert list(t) == ["total", "map", "entities_authority", "entities_supplier", "records", "goto"]  # ONE map: MainScreen asks for one side
    assert {n: x.serving for n, x in t.items()} == {n: "scan" for n in t}
    assert t["entities_supplier"].statements == ["entities_supplier_cardinality", "entities_supplier_rank", "entities_supplier_stats", "entities_supplier_entities", "entities_supplier_placement"]
    assert t["entities_supplier"].alternatives == ["entities_supplier_terms"]
    assert t["map"].statements == ["map_totals", "map_entities"] and not t["map"].judged_in_rollup_state
    assert t["records"].statements == ["records_count", "records_page", "records_hydrate", "records_entities", "records_placement", "records_files"]
    assert "goto" not in _tasks({}) and "goto" not in _tasks({"channel": "CONTRACT"})  # Go-to depends on the query alone


def test_the_map_is_the_side_the_filter_names_authority_by_default():
    rec = Recorder()
    _tasks({"q": "ma"})["map"].run(rec)
    assert "authority_area AS area" in rec.calls[0][1] and "count(DISTINCT authority_key)" in rec.calls[1][1]
    rec = Recorder()
    _tasks({"q": "ma", "county": "RO-BV", "countySide": "SUPPLIER"})["map"].run(rec)
    assert "supplier_area AS area" in rec.calls[0][1] and "GROUP BY supplier_area, record_code" in rec.calls[0][1] and "count(DISTINCT supplier_key)" in rec.calls[1][1]


class Recorder:
    """A `timed` that records the SQL and answers with canned rows, so a task's statement sequence can be read without a database."""

    def __init__(self, answers=None):
        self.calls: list[tuple[str, str, list]] = []
        self.answers = answers or {}

    def __call__(self, name, sql, params):
        self.calls.append((name, sql, params))
        return self.answers.get(name, [])


def test_the_empty_state_reads_the_rollup_for_total_and_entities_but_scans_the_map():
    t = _tasks({})
    assert {n: x.serving for n, x in t.items()} == {"total": "rollup", "map": "scan", "entities_authority": "rollup", "entities_supplier": "rollup", "records": "rollup"}
    assert t["total"].rollup_statements == ["total"] and t["entities_supplier"].rollup_statements == ["entities_supplier_rank"]
    rec = Recorder({"entities_supplier_rank": [("k1", "1", 1)]})
    t["total"].run(rec)
    t["entities_supplier"].run(rec)
    assert "seap.rollup_cube" in rec.calls[0][1] and "seap.search" not in rec.calls[0][1]
    assert "seap.rollup_entity" in rec.calls[1][1] and "seap.search" not in rec.calls[1][1] and rec.calls[1][2] == ["SUPPLIER"]
    assert [c[0] for c in rec.calls] == ["total", "entities_supplier_rank", "entities_supplier_entities", "entities_supplier_placement"]
    assert "core.entity" in rec.calls[2][1] and "core.placement" in rec.calls[3][1] and rec.calls[3][2] == [["k1"]]


def test_the_empty_states_records_page_is_store_records_on_the_record_table_not_the_index():
    rec = Recorder({"records_page": [("4384206", 7, [{"key": "27272953"}, {"name": "natural person"}])]})
    _tasks({})["records"].run(rec)
    assert [c[0] for c in rec.calls] == ["records_page", "records_entities", "records_placement", "records_files"]
    assert "FROM seap.record ORDER BY value_bani DESC NULLS LAST, code LIMIT 50" in rec.calls[0][1] and "seap.search" not in rec.calls[0][1]
    assert rec.calls[1][2] == [["27272953", "4384206"]] and rec.calls[3][2] == [[7]]


def test_chips_only_records_take_the_count_from_the_rollup_total_and_the_page_from_the_index():
    t = _tasks({"channel": "CONTRACT"})["records"]
    rec = Recorder({"records_page": [("DA1",)], "records_hydrate": [("4384206", 3, [])]})
    t.run(rec)
    assert [c[0] for c in rec.calls] == ["records_page", "records_hydrate", "records_entities", "records_placement", "records_files"]  # no count statement
    assert "winner_position = 1 ORDER BY value_bani DESC NULLS LAST, record_code LIMIT 50" in rec.calls[0][1] and "seap.search" in rec.calls[0][1]


def test_chips_the_cube_serves_become_year_channel_bucket_signals_predicates_on_the_rollup():
    rec = Recorder()
    _tasks({"from": "2024-01-01", "to": "2025-12-31", "channel": "CONTRACT", "valueBucket": "UP_TO_9M", "hasSignals": True})["total"].run(rec)
    assert "award_year >= %s AND award_year <= %s AND channel = %s AND value_bucket = %s AND has_signals = %s" in rec.calls[0][1]
    assert rec.calls[0][2] == [2024, 2025, "CONTRACT", "UP_TO_9M", True]


def test_a_chip_that_is_not_a_cube_dimension_falls_back_to_the_scan():
    assert {x.serving for x in plan_tasks({"badges": ["SUSPECT_VALUE"]})} == {"scan"}
    assert {x.serving for x in plan_tasks({}, rollup=False)} == {"scan"}


def test_the_entity_tab_asks_cardinality_then_ranks_then_reads_the_pages_stats():
    t = _tasks({"q": "ma"})["entities_authority"]
    rec = Recorder({"entities_authority_cardinality": [({"value": 12.4},)], "entities_authority_rank": [("k1", "100", 2), ("k2", "50", 2)]})
    t.run(rec)
    assert [c[0] for c in rec.calls] == ["entities_authority_cardinality", "entities_authority_rank", "entities_authority_stats", "entities_authority_entities", "entities_authority_placement"]
    assert rec.calls[2][2][-1] == ["k1", "k2"] and rec.calls[3][2] == [["k1", "k2"]]
    assert "pdb.exists()" in rec.calls[1][1] and "ORDER BY sum(share_bani) DESC NULLS LAST, authority_key LIMIT 50" in rec.calls[1][1]


def test_above_the_group_limit_the_terms_aggregation_ranks_instead():
    t = _tasks({"q": "ma"}, exact_group_limit=100)["entities_supplier"]
    spec = json.dumps({"terms": {"field": "supplier_key", "size": 51, "order": {"s": "desc"}}, "aggs": {"s": {"sum": {"field": "share_bani"}}}})
    rec = Recorder({"entities_supplier_cardinality": [({"value": 5000},)], "entities_supplier_terms": [({"buckets": [{"key": "a", "s": {"value": 1}}, {"key": None, "s": {"value": 1}}]},)]})
    t.run(rec)
    assert [c[0] for c in rec.calls] == ["entities_supplier_cardinality", "entities_supplier_terms", "entities_supplier_stats", "entities_supplier_entities", "entities_supplier_placement"]
    assert rec.calls[1][2][0] == spec and rec.calls[2][2][-1] == ["a"]  # a natural person (null key) is not looked up


def test_supplier_county_counts_distinct_records_and_groups_the_page_per_record():
    rec = Recorder({"records_page": [("DA1",)]})
    _tasks({"q": "ma", "county": "RO-BV", "countySide": "SUPPLIER"})["records"].run(rec)
    assert "count(DISTINCT record_code)" in rec.calls[0][1] and "GROUP BY record_code, value_bani, award_date" in rec.calls[1][1]


def test_the_goto_lookup_is_by_cui_for_a_number_and_by_folded_name_otherwise():
    rec = Recorder()
    _tasks({"q": "RO4384206"})["goto"].run(rec)
    _tasks({"q": "municipiul brasov"})["goto"].run(rec)
    assert "key = %s AND identity = 'CUI'" in rec.calls[0][1] and rec.calls[0][2] == ["4384206"]
    assert "name_folded = %s" in rec.calls[1][1] and rec.calls[1][2] == ["municipiul brasov"]


def test_summaries_use_nearest_rank_percentiles():
    assert summarize([]) == {"n": 0, "median": None, "p95": None, "max": None}
    assert summarize([10, 20, 30, 40, 50]) == {"n": 5, "median": 30, "p95": 50, "max": 50}
    s = summarize(list(range(1, 101)))
    assert s["p95"] == 95 and s["median"] == 50.5 and s["max"] == 100


def _entry(state, wall, rollup_wall=None, **extra):
    w = {"cold": wall, "median": wall, "p95": wall, "max": wall}
    r = {"cold": rollup_wall if rollup_wall is not None else wall, "median": 1, "p95": rollup_wall if rollup_wall is not None else wall, "max": 1}
    return {"state": state, "wall_ms": w, "rollup_wall_ms": r, "serving": extra.pop("serving", {}), **extra}


def test_a_text_query_passes_under_the_threshold_on_cold_and_warm_p95():
    assert verdict(_entry("text", 499), 500)[0]
    ok, why = verdict(_entry("text", 501), 500)
    assert not ok and "cold 501 ms" in why and "warm p95 501 ms" in why
    cold_only = _entry("text", 100)
    cold_only["wall_ms"]["cold"] = 900
    assert not verdict(cold_only, 500)[0]


def test_the_empty_state_is_judged_on_the_rollup_tasks_and_must_really_use_the_rollup():
    serving = {"total": "rollup", "map": "scan", "entities_authority": "rollup", "records": "rollup"}
    judged = ["total", "entities_authority", "records"]  # the map task is not judged in the rollup states
    assert verdict(_entry("empty", 900, 40, serving=serving, rollup_judged=judged, rollup_verified=True), 500)[0]  # the map scan (900) is the cache's business
    assert not verdict(_entry("empty", 900, 40, serving=serving, rollup_judged=judged, rollup_verified=True), 500, strict_maps=True)[0]
    ok, why = verdict(_entry("empty", 40, 40, serving={**serving, "total": "scan"}, rollup_judged=judged, rollup_verified=True), 500)
    assert not ok and "not served by the rollup" in why
    ok, why = verdict(_entry("chips", 40, 40, serving=serving, rollup_judged=judged, rollup_verified=False), 500)
    assert not ok and "EXPLAIN" in why
    assert not verdict(_entry("empty", 40, 600, serving=serving, rollup_judged=judged, rollup_verified=True), 500)[0]


def test_a_chips_only_state_the_rollup_cannot_serve_is_judged_like_text():
    assert not verdict(_entry("chips-scan", 700, 40), 500)[0]


def test_the_report_table_has_a_line_per_query_and_names_the_host():
    entries = [dict(label="ma", filter={"q": "ma"}, **_entry("text", 120)), dict(label="(empty)", filter={}, **_entry("empty", 900, 30, serving={}, rollup_verified=True))]
    for e in entries:
        e["pass"], e["reason"] = verdict(e, 500)
    report = bench._report("sql", entries, 3, 500.0, False, {})
    table = bench.render_table(report)
    assert "ma" in table and "(empty)" in table and "2/2 passed" in table and "3 warm run(s)" in table and "CPU" in table
    assert report["summary"] == {"total": 2, "passed": 2, "failed": 0, "failedLabels": []}
    assert report["host"]["cpus"] >= 1 and report["targetVcpus"] == 8
    json.dumps(report)  # machine-readable


def test_the_shipped_query_list_loads_covers_every_state_and_has_unique_labels():
    qs = bench.load_queries()
    states = {state_of(q["filter"]) for q in qs}
    assert states == {"text", "empty", "chips", "chips-scan"}
    two_char = [q for q in qs if len(q["filter"].get("q", "")) == 2]
    assert len(two_char) >= 6
    assert any(" " in q["filter"].get("q", "") for q in qs)  # multi-token
    assert any(q["filter"].get("q", "").isdigit() for q in qs)  # CUI / CPV as text
    assert any(q["filter"].get("cpv") for q in qs)


def test_a_query_file_takes_bare_strings_and_rejects_nonsense(tmp_path):
    p = tmp_path / "q.json"
    p.write_text(json.dumps(["ma", {"label": "x", "filter": {"channel": "CONTRACT"}}]))
    assert bench.load_queries(p) == [{"label": "ma", "filter": {"q": "ma"}}, {"label": "x", "filter": {"channel": "CONTRACT"}}]
    for bad in ("[]", '{"a": 1}', '[{"label": "x"}]', '["a", "a"]'):
        p.write_text(bad)
        with pytest.raises(ValueError):
            bench.load_queries(p)


def test_the_main_screen_id_comes_from_the_persisted_query_file(tmp_path):
    p = tmp_path / "pq.json"
    p.write_text(json.dumps({"operations": [{"name": "Other", "sha256": "a"}, {"name": "MainScreen", "sha256": "abc"}]}))
    assert bench.main_screen_id(p) == "abc"
    p.write_text(json.dumps({"operations": []}))
    with pytest.raises(ValueError):
        bench.main_screen_id(p)


def test_api_mode_posts_the_persisted_operation_and_times_first_then_repeats(monkeypatch):
    calls = []

    def fake(url, op_id, f, timeout=60.0):
        calls.append((url, op_id, f))
        return (900.0 if len(calls) % 4 == 1 else 20.0), {}

    monkeypatch.setattr(bench, "api_request", fake)
    report = bench.run_api("http://api/graphql", "id1", [{"label": "ma", "filter": {"q": "ma"}}], repetitions=3, threshold_ms=500)
    e = report["queries"][0]
    assert len(calls) == 4 and calls[0] == ("http://api/graphql", "id1", {"q": "ma"})
    assert e["wall_ms"]["cold"] == 900.0 and e["wall_ms"]["median"] == 20.0 and not e["pass"] and report["mode"] == "api"


def test_the_states_the_cache_warms_are_the_empty_one_and_the_two_character_prefixes_alone():
    assert bench.expect_cached({}) and bench.expect_cached({"q": "ma"}) and bench.expect_cached({"q": "Ma"})
    assert bench.expect_cached({"q": "SRL"})  # folds to nothing: the empty state
    for not_warmed in ({"q": "mal"}, {"q": "m"}, {"q": "ma re"}, {"q": "ma", "channel": "CONTRACT"}, {"channel": "CONTRACT"}, {"q": "ma", "hasSignals": False}):
        assert not bench.expect_cached(not_warmed), not_warmed
    assert bench.expect_cached({"q": "ma", "channel": None, "badges": []})


def _api(monkeypatch, first_ms):
    calls = []

    def fake(url, op_id, f, timeout=60.0):
        calls.append(f)
        return (first_ms if sum(1 for c in calls if c == f) == 1 else 5.0), {}

    monkeypatch.setattr(bench, "api_request", fake)


def test_api_mode_fails_a_warmed_state_whose_first_request_was_slow_and_says_so(monkeypatch):
    _api(monkeypatch, 300.0)  # under the 500 ms gate, over the 50 ms a cached answer takes
    report = bench.run_api("http://api/graphql", "id1", [{"label": "ma", "filter": {"q": "ma"}}, {"label": "mal", "filter": {"q": "mal"}}], repetitions=2)
    by = {e["label"]: e for e in report["queries"]}
    assert not by["ma"]["pass"] and by["ma"]["from_warmed_cache"] is False and "not from the warmed cache" in by["ma"]["reason"]
    assert by["mal"]["pass"] and "from_warmed_cache" not in by["mal"]  # an unwarmed text query is held to the gate only
    assert "warmed cache: NO" in bench.render_table(report)
    _api(monkeypatch, 20.0)
    ok = bench.run_api("http://api/graphql", "id1", [{"label": "ma", "filter": {"q": "ma"}}], repetitions=2, cached_ms=50)
    assert ok["queries"][0]["pass"] and ok["queries"][0]["from_warmed_cache"] is True and "warmed cache: yes" in bench.render_table(ok)
    assert ok["cachedMs"] == 50


def test_the_scan_counters_of_an_uncached_request_are_held_to_what_the_state_needs():
    before = {"seap.search": 10, "seap.rollup_cube": 4, "seap.rollup_entity": 4}
    served = judge_scans("empty", before, {"seap.search": 12, "seap.rollup_cube": 5, "seap.rollup_entity": 6})  # the map's two statements
    assert served == {"search": 2, "cube": 1, "entity": 2, "allowed": 2, "ok": True}
    assert judge_scans("empty", before, before)["ok"]  # cached: nothing moved
    assert judge_scans("chips", before, {**before, "seap.search": 13})["ok"]  # the map and the Top-K page
    assert not judge_scans("chips", before, {**before, "seap.search": 14})["ok"]  # a total or an entity tab scanned
    assert not judge_scans("empty", before, {**before, "seap.search": 13})["ok"]
    assert judge_scans("text", before, before) is None and judge_scans("chips-scan", before, before) is None
    entry = _entry("empty", 40, 40, scans={"search": 5, "allowed": 2}, scan_ok=False)
    ok, why = verdict(entry, 500)
    assert not ok and "scanned seap.search 5 time(s), more than the 2" in why
