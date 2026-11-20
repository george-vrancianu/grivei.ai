"""Resume after a crash or kill at a Step boundary (ticket #292, spec #285), through `pipeline rebuild` over a miniature Raw archive into a throwaway
ParadeDB, and the graph it leaves. The kill-everywhere matrix is in resume_harness.py. Needs Docker (the container fixture of test_bulk_loader_db.py)."""
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

import pipeline.pins as pins_module  # noqa: E402
from graph_dump import dump_graph  # noqa: E402
from pipeline import switchover  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.hand_offs import MissingHandOff  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from pipeline.resume import RESUME, Verdict, load_held  # noqa: E402
from resume_harness import FIXTURES, Harness, KillPoint, make_world, step_kill_points  # noqa: E402
from test_bulk_loader_db import HEAD, _write, server  # noqa: E402,F401

POINTS = {p.name: p for p in step_kill_points()}
SMALL = lambda root: make_world(root, ("archive-bulk",))  # noqa: E731
CONTRACTS = lambda root: make_world(root, ("archive-contracts",))  # noqa: E731
CRAWL = lambda root: make_world(root, ("archive-crawl",))  # noqa: E731


@pytest.fixture
def harness(server, tmp_path, monkeypatch, capsys):
    return Harness(server, tmp_path, monkeypatch, capsys)


@pytest.mark.parametrize("name", list(POINTS))
def test_killed_inside_each_step_after_its_body_a_rerun_resumes_and_leaves_the_uninterrupted_graph(harness, name):
    harness.assert_resumes_like_reference(POINTS[name], SystemExit(143))


@pytest.mark.parametrize("name", ["in-units", "in-onrc", "in-crawl-badges"])
def test_a_bug_in_a_step_is_resumed_like_a_kill(harness, name):
    harness.assert_resumes_like_reference(POINTS[name], RuntimeError("bug"))


def test_the_matrix_covers_every_step_of_the_build():
    from pipeline.build_steps import STEPS
    assert list(POINTS) == [f"in-{s.name}" for s in STEPS] and not POINTS["in-schema"].resumes and POINTS["in-commit"].resumes


def test_a_resumed_build_never_applies_the_crawl_badges_twice(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=CRAWL)
    _, killed, rerun = h.kill_then_resume(POINTS["in-frameworks"], SystemExit(143))  # crawl-badges is committed, the build dies in the next Step
    assert rerun.first.startswith("rebuild: resume - ") and "'crawl-badges'" in rerun.first
    with psycopg.connect(rerun.url) as c:
        badged = c.execute("SELECT badges FROM seap.search WHERE badges && ARRAY['CRAWL_ONLY', 'CRAWLED_PROVISIONAL']").fetchall()
        assert badged and all(sum(b in ("CRAWL_ONLY", "CRAWLED_PROVISIONAL") for b in badges) == 1 for (badges,) in badged)
    assert rerun.graph == h.reference().graph


def test_a_unit_added_after_the_build_started_is_not_in_the_resumed_graph_and_is_due_at_the_next_build(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    archive, live = h.new_archive("added"), h.new_live()
    h.run(archive, live, kill=POINTS["in-crawl-status"], killed_by=SystemExit(143))
    _write(Archive(archive), "dan", "2025Q2", datetime(2026, 9, 1, 9, tzinfo=timezone.utc), HEAD + "A,1,DANNEW1,01/09/2025,added later,c,d,10,O,2\n")
    resumed = h.run(archive, live)
    assert resumed.first.startswith("rebuild: resume - ")
    assert resumed.graph == h.reference().graph  # exactly the pinned set
    with psycopg.connect(live) as c:
        assert c.execute("SELECT count(*) FROM seap.record WHERE code = 'DANNEW1'").fetchone() == (0,)
    nxt = h.run(archive, live)  # the next build pins it
    assert nxt.first.startswith("rebuild: fresh - no next database")
    with psycopg.connect(live) as c:
        assert c.execute("SELECT count(*) FROM seap.record WHERE code = 'DANNEW1'").fetchone() == (1,)


def test_a_pinned_unit_that_was_quarantined_by_a_committed_units_step_is_not_a_difference(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=CONTRACTS)
    rerun = h.assert_resumes_like_reference(POINTS["in-crawl-status"], SystemExit(143))
    assert any("quarantined" in line for line in rerun.out)  # the fixture holds a bad unit: the units Step moved it, and the resume still resumed


def test_a_pinned_unit_that_changed_or_is_gone_starts_a_fresh_build(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    archive, live = h.new_archive("changed"), h.new_live()
    h.run(archive, live, kill=POINTS["in-crawl-status"], killed_by=SystemExit(143))
    gone = archive / "seap/bulk/dan/2025Q1"
    shutil.rmtree(gone)
    rerun = h.run(archive, live)
    assert rerun.first.startswith("rebuild: fresh - 1 pinned unit changed or missing: seap/bulk/dan/2025Q1/") and any("dropping the leftover" in x for x in rerun.out)

    live2 = h.new_live()
    h.run(archive, live2, kill=POINTS["in-crawl-status"], killed_by=SystemExit(143))
    manifest = next((archive / "seap/bulk/dan/2024Q1").glob("*/manifest.json"))
    manifest.write_text(manifest.read_text().replace('"via"', '"via2"', 1) if '"via"' in manifest.read_text() else manifest.read_text() + " ")
    assert h.run(archive, live2).first.startswith("rebuild: fresh - 1 pinned unit changed or missing")


def test_changed_code_starts_a_fresh_build(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    archive, live = h.new_archive("code"), h.new_live()
    h.run(archive, live, kill=POINTS["in-crawl-status"], killed_by=SystemExit(143))
    monkeypatch.setattr(pins_module, "code_version", lambda extra=None, package=pins_module.PACKAGE: "a-different-version")
    rerun = h.run(archive, live)
    assert rerun.first.startswith("rebuild: fresh - code changed") and any("dropping the leftover" in x for x in rerun.out)
    with psycopg.connect(live) as c:
        assert c.execute("SELECT code_version, state FROM build.run").fetchone() == ("a-different-version", "complete")


def test_fresh_starts_over_whatever_the_ledger_says(harness):
    ref = harness.reference()
    archive, live = harness.new_archive("fresh"), harness.new_live()
    harness.run(archive, live, kill=POINTS["in-aep"], killed_by=SystemExit(143))
    assert harness.run(archive, live, "--fresh").first == "rebuild: fresh - --fresh given"  # a resumable ledger is there
    assert dump_graph(live) == ref.graph


def test_the_first_line_says_fresh_for_an_in_place_build_and_when_there_is_no_next_database(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    first = h.run(h.new_archive("a"), h.new_live())
    assert first.first == "rebuild: fresh - no next database"
    in_place = h.run(h.new_archive("b"), h.new_live(), "--in-place")
    assert in_place.first.startswith("rebuild: fresh - in-place builds run in one transaction")  # timestamped by the progress file's line


def test_a_tampered_ledger_with_the_onrc_row_gone_is_not_resumed_and_a_forced_resume_fails_loudly(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=lambda root: make_world(root, ("archive-onrc-signals",)))
    archive, live = h.new_archive("onrc"), h.new_live()
    h.run(archive, live, kill=POINTS["in-units"], killed_by=SystemExit(143))  # anaf-identities, onrc and estimates are committed
    next_url = switchover.names_of(live).next_url
    held = load_held(next_url)
    with psycopg.connect(next_url, autocommit=True) as c:
        c.execute("DELETE FROM build.step WHERE name = 'onrc'")
    # a forced resume (what the decision would never choose): the missing summary is a loud error, never "no ONRC entities"
    with pytest.raises(MissingHandOff, match="no row for the 'onrc' Step"):
        rebuild(Archive(archive), next_url, staged=True, verdict=Verdict(RESUME, "forced", held.pins), today=held.pins.today)
    rerun = h.run(archive, live)  # the decision itself sees the hole and starts fresh
    assert rerun.first.startswith("rebuild: fresh - the committed Steps") and "not a proper prefix" in rerun.first


def test_a_resumed_build_gives_the_status_file_its_unit_total(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    h.run(h.new_archive("ref"), h.new_live())
    reference = json.loads((tmp_path / "status.json").read_text())
    archive, live = h.new_archive("r"), h.new_live()
    h.run(archive, live, kill=POINTS["in-crawl-badges"], killed_by=SystemExit(143))
    h.run(archive, live)
    resumed = json.loads((tmp_path / "status.json").read_text())
    assert resumed["total"] == reference["total"] > 0 and resumed["state"] == "finished"
