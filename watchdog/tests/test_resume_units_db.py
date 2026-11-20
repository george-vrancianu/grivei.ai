"""Commit per Raw archive unit in the `units` Step, and resume in the middle of the loop (ticket #293, spec #285), through `pipeline rebuild` over a
miniature Raw archive into a throwaway ParadeDB, and the graph it leaves. The kill points are `unit_kill_points()` of resume_harness.py. Needs Docker (the
container fixture of test_bulk_loader_db.py).

The fixture world (`UNITS_WORLD`) has every outcome of the loop: loaded bulk units (DA, DAN and Contracte, before and after the kills), a duplicate file
(a re-fetched DA unit: skipped), a unit the build quarantines itself (unknown headers), a file that switches kind partway (a set-aside tail) and crawled
days, one of them empty (skipped, no Records)."""
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.hand_offs import load_bulk_rows, load_set_aside, load_units  # noqa: E402
from pipeline.resume import load_held  # noqa: E402
from resume_harness import Harness, _summary, make_world, unit_kill_points  # noqa: E402
from test_bulk_loader_db import server  # noqa: E402,F401
from test_real_headers import _CONTRACTE_HEAD, _CONTRACTE_ROWS, _DA_HEAD, _DA_ROW, _DA_ROW_2  # noqa: E402

AFTER = 9  # the kills fire at the ninth of twenty units: the duplicate, the set-aside file and a quarantine are committed before it, another quarantine and the crawled days after
POINTS = {p.name: p for p in unit_kill_points(AFTER)}


def UNITS_WORLD(root):
    """Bulk units (DA with a duplicate, DAN), Contracte units with one the build quarantines, crawled days, and one DA file with a Contracte tail pasted in."""
    make_world(root, ("archive-bulk", "archive-contracts", "archive-crawl"))
    Archive(root).write_unit(source="seap", stream="bulk", kind="da", unit="2022Q2", fetched_at=datetime(2022, 9, 15, 9, tzinfo=timezone.utc),
                             files={"t2.csv": (_DA_HEAD + _DA_ROW + _DA_ROW_2 + _CONTRACTE_HEAD + _CONTRACTE_ROWS).encode()}, via="v")
    return root


@pytest.fixture
def harness(server, tmp_path, monkeypatch, capsys):
    return Harness(server, tmp_path, monkeypatch, capsys, world=UNITS_WORLD)


def _done_line(lines: list[str]) -> str:
    """The `rebuild done` line without its timestamp and its duration."""
    line = next(x for x in lines if " rebuild done " in x)
    return re.sub(r" in \S+$", "", line.split(" ", 1)[1])


def _unit_lines(lines: list[str]) -> list[str]:
    return [re.sub(r" (loaded in \S+)$", " loaded", x.split(" ", 1)[1]) for x in lines if " rebuild unit " in x]


def _rows(url: str) -> list[tuple]:
    with psycopg.connect(url) as c:
        return c.execute("SELECT ordinal, path, status FROM build.unit ORDER BY ordinal").fetchall()


def test_the_fixture_has_every_outcome_of_the_loop(harness):
    ref = harness.reference()
    statuses = [status for _, _, status in _rows(ref.url)]
    assert set(statuses) == {"loaded", "skipped", "quarantined"} and len(statuses) > AFTER + 3
    before, after = statuses[:AFTER - 1], statuses[AFTER - 1:]  # committed when a kill hits the AFTER-th unit; the rest
    assert {"loaded", "skipped", "quarantined"} <= set(before) and {"loaded", "quarantined"} <= set(after)
    with psycopg.connect(ref.url) as c:
        assert c.execute("SELECT min(ordinal) FROM build.unit WHERE jsonb_array_length(duplicate_files) > 0").fetchone()[0] < AFTER
        assert c.execute("SELECT ordinal FROM build.unit WHERE jsonb_array_length(set_aside) > 0").fetchall() == [(6,)]
        assert c.execute("SELECT count(*) FROM build.unit WHERE path LIKE 'seap/crawl/%'").fetchone()[0] >= 3
        assert c.execute("SELECT count(*) FROM build.unit WHERE bulk_kind IS NOT NULL").fetchone()[0] >= 3


def test_every_unit_has_a_row_in_the_ledger_of_a_finished_build(harness):
    ref = harness.reference()
    rows = _rows(ref.url)
    assert [o for o, _, _ in rows] == list(range(1, len(rows) + 1))
    units = [x for x in _unit_lines(ref.out)]
    assert len(units) == len(rows)
    with psycopg.connect(ref.url) as c:
        assert c.execute("SELECT count(DISTINCT units_total), max(units_total) FROM build.unit").fetchone() == (1, len(rows))
        loaded_files = c.execute("SELECT coalesce(sum(files_loaded), 0) FROM build.unit").fetchone()[0]
        assert loaded_files == c.execute("SELECT count(*) FROM seap.source_file").fetchone()[0]
        assert c.execute("SELECT summary->>'files_loaded' FROM build.step WHERE name = 'units'").fetchone()[0] == str(loaded_files)
        # the per-unit lists live in build.unit only: the Step's row keeps the scalar counts (and the incomplete listing)
        assert set(c.execute("SELECT summary FROM build.step WHERE name = 'units'").fetchone()[0]) == {"files_loaded", "units_total", "incomplete"}


@pytest.mark.parametrize("name", list(POINTS))
def test_killed_at_a_unit_a_rerun_resumes_and_leaves_the_uninterrupted_graph(harness, name):
    rerun = harness.assert_resumes_like_reference(POINTS[name], SystemExit(143))
    ref = harness.reference()
    assert _done_line(rerun.out) == _done_line(ref.out)  # AC 3: the counts of the final line


def test_a_bug_in_a_unit_is_resumed_like_a_kill(harness):
    harness.assert_resumes_like_reference(POINTS[f"in-unit-{AFTER}-before-commit"], RuntimeError("bug"))


def test_a_unit_killed_before_its_commit_leaves_the_units_before_it_and_the_resume_says_where_it_continues(harness):
    ref = harness.reference()
    archive, live = harness.new_archive("mid"), harness.new_live()
    harness.run(archive, live, kill=POINTS[f"in-unit-{AFTER}-before-commit"], killed_by=SystemExit(143))
    nxt = live + "_next"
    rows = _rows(nxt)
    assert [o for o, _, _ in rows] == list(range(1, AFTER))  # units 1..N-1 committed; the Nth rolled back with its source_file and records
    with psycopg.connect(nxt) as c:
        assert c.execute("SELECT count(*) FROM seap.source_file").fetchone()[0] == c.execute("SELECT coalesce(sum(files_loaded), 0) FROM build.unit").fetchone()[0]
        assert c.execute("SELECT name FROM build.step ORDER BY ordinal DESC LIMIT 1").fetchone()[0] == "estimates"  # the Step is not committed
    held = load_held(nxt)
    assert (len(held.unit_rows), held.units_total) == (AFTER - 1, len(_rows(ref.url)))
    rerun = harness.run(archive, live)
    assert rerun.first == (f"rebuild: resume - continuing the units Step after unit {AFTER - 1} of {len(_rows(ref.url))}; "
                           "the pinned inputs and the code are unchanged")
    assert rerun.graph == ref.graph
    # the units already committed are not read again: their lines are not printed, the others are, with the same index and total
    assert _unit_lines(rerun.out) == _unit_lines(ref.out)[AFTER - 1:]
    assert _done_line(rerun.out) == _done_line(ref.out)
    status = json.loads((harness.tmp / "status.json").read_text())
    want = (len(_rows(ref.url)), len(_rows(ref.url)))
    assert (status["total"], status["done"]) == want and status["state"] == "finished"


def test_a_resumed_run_has_the_summary_lines_and_the_status_counters_of_an_uninterrupted_one(harness):
    ref = harness.reference()
    archive, live = harness.new_archive("counts"), harness.new_live()
    harness.run(archive, live, kill=POINTS[f"after-unit-{AFTER}-commit"], killed_by=SystemExit(143))
    assert [o for o, _, _ in _rows(live + "_next")] == list(range(1, AFTER + 1))  # the Nth unit committed
    rerun = harness.run(archive, live)
    status = json.loads((harness.tmp / "status.json").read_text())
    # loaded, skipped, quarantined, records: the final line, the status file and the summary lines (RebuildSummary.lines())
    assert _done_line(rerun.out) == _done_line(ref.out)
    assert rerun.graph == ref.graph
    assert _summary(rerun.out, archive) == _summary(ref.out, ref.archive)
    counters = dict(x.split("=") for x in _done_line(ref.out).split()[2:])  # units=N loaded=N skipped=N quarantined=N records=N
    assert {k: str(status[k]) for k in ("loaded", "skipped", "quarantined", "records")} == {k: counters[k] for k in ("loaded", "skipped", "quarantined", "records")}
    assert (status["done"], status["total"]) == (int(counters["units"]),) * 2
    assert any(line.startswith("quarantined: ") for line in rerun.out) and any(line.startswith("skipped, same file already loaded: ") for line in rerun.out)
    assert any(line.startswith("set aside, not loaded: ") for line in rerun.out)


def test_a_kill_between_a_quarantined_units_row_and_its_move_is_completed_by_the_resume(harness):
    ref = harness.reference()
    archive, live = harness.new_archive("move"), harness.new_live()
    harness.run(archive, live, kill=POINTS["before-first-quarantine-move"], killed_by=SystemExit(143))
    nxt = live + "_next"
    with psycopg.connect(nxt) as c:
        [(path, to)] = c.execute("SELECT path, quarantined_to FROM build.unit WHERE status = 'quarantined'").fetchall()
    assert (archive / path).is_dir() and not (archive / to).exists()  # recorded as quarantined, the directory is still in the archive
    held = load_held(nxt)
    assert to in held.quarantined  # held whether or not it has moved
    rerun = harness.run(archive, live)
    assert rerun.first.startswith("rebuild: resume - continuing the units Step after unit ")
    assert not (archive / path).exists() and (archive / to / "reason.json").is_file() and json.loads((archive / to / "reason.json").read_text())["reason"]
    assert rerun.graph == ref.graph


def test_the_loaders_read_the_per_unit_lists_back_from_build_unit_in_unit_order(harness):
    ref = harness.reference()
    with psycopg.connect(ref.url) as c:
        cur = c.cursor()
        rows = load_units(cur)
        assert [r.ordinal for r in rows] == list(range(1, len(rows) + 1))
        assert load_bulk_rows(cur) and all(isinstance(k[1], tuple) for k in load_bulk_rows(cur))
        [(path, aside)] = load_set_aside(cur, ref.archive)
        assert path.name == "t2.csv" and (aside.kind, aside.line, aside.rows) == ("CONTRACT", 4, 2)
    by_path = {r.path: r for r in rows}
    assert any(r.status == "quarantined" and r.quarantined_to == f"quarantine/{r.path}" and r.reason for r in rows)
    assert any(r.duplicate_files for r in rows) and by_path

