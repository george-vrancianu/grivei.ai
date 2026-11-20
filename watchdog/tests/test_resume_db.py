"""Resume after a crash or kill at a Step boundary (ticket #292, spec #285), through `pipeline rebuild` over a miniature Raw archive into a throwaway
ParadeDB, and the graph it leaves. The kill-everywhere matrix is in resume_harness.py. Needs Docker (the container fixture of test_bulk_loader_db.py)."""
import json
import shutil
import signal
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

import pipeline.pins as pins_module  # noqa: E402
from graph_dump import dump_graph  # noqa: E402
from pipeline import cli, switchover  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.hand_offs import MissingHandOff  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from pipeline.resume import RESUME, Verdict, load_held  # noqa: E402
from pipeline.refresh import Pinger, StepResult, run_refresh  # noqa: E402
from pipeline.refresh.steps import Impl  # noqa: E402
from resume_harness import FIXTURES, Harness, KillPoint, make_world, step_kill_points, vacuum_kill_points  # noqa: E402
from test_refresh import Clock  # noqa: E402
from test_bulk_loader_db import HEAD, _write, server  # noqa: E402,F401

POINTS = {p.name: p for p in step_kill_points()}
SMALL = lambda root: make_world(root, ("archive-bulk",))  # noqa: E731
CONTRACTS = lambda root: make_world(root, ("archive-contracts",))  # noqa: E731
CRAWL = lambda root: make_world(root, ("archive-crawl",))  # noqa: E731


def quarantined_world(root):
    """The small archive with its 2025Q1 DAN unit already in quarantine when the build starts (a world must be a module-level function: the reference is cached by it)."""
    make_world(root, ("archive-bulk",))
    archive = Archive(root)
    archive.quarantine(next(u for u in archive.units("seap") if u.kind == "dan" and u.unit == "2025Q1"), "bad headers", [])
    return root


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


@pytest.mark.parametrize("name", [p.name for p in vacuum_kill_points()])
def test_killed_between_a_steps_commit_and_its_vacuum_the_resume_vacuums_again_and_leaves_the_uninterrupted_graph(harness, name):
    point = next(p for p in vacuum_kill_points() if p.name == name)
    rerun = harness.assert_resumes_like_reference(point, SystemExit(143))
    assert any(f"step vacuum {name.removeprefix('before-vacuum-')}: start" in line for line in rerun.out)  # the skipped VACUUM ran on the resume


def test_a_unit_requeued_between_the_kill_and_the_resume_is_still_flagged_as_quarantined_as_pinned(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=quarantined_world)
    rerun = h.assert_resumes_like_reference(POINTS["in-crawl-status"], SystemExit(143), between=lambda archive, live: Archive(archive).requeue(), expect="resume")
    with psycopg.connect(rerun.url) as c:
        assert c.execute("SELECT count(*) FROM seap.coverage_cell WHERE kind = 'DAN' AND quarter = '2025-Q1' AND state = 'NOT_YET_LOADED'").fetchone() == (1,)


def test_a_next_database_from_before_the_pins_is_rebuilt_fresh(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)

    def drop_a_pin_column(archive, live):
        with psycopg.connect(switchover.names_of(live).next_url, autocommit=True) as c:
            c.execute("ALTER TABLE build.run DROP COLUMN pinned_quarantine")

    archive, live = h.new_archive("old"), h.new_live()
    h.run(archive, live, kill=POINTS["in-crawl-status"], killed_by=SystemExit(143))
    drop_a_pin_column(archive, live)
    rerun = h.run(archive, live)
    assert rerun.first == "rebuild: fresh - the next database has no usable build ledger (the build ledger was written before pinned inputs)"
    with psycopg.connect(live) as c:  # rebuilt whole, and complete
        assert c.execute("SELECT state FROM build.run").fetchone() == ("complete",)


def _stub_impl(archive, load) -> Impl:
    impl = Impl(archive, print, None, None, None, None, load)
    impl.crawl = impl.datagov = impl.anaf = lambda: StepResult()
    impl.onrc = lambda limit=None: StepResult()  # the network steps are not under test here
    return impl


def _refresh_load(monkeypatch, h, archive, live):
    """The load callable `pipeline refresh` would build for these options (the refresh verb parsed, not run)."""
    seen = []
    with monkeypatch.context() as m:
        m.setattr(cli, "_refresh", lambda archive, args: seen.append(args) or 0)
        cli.main(["--archive", str(archive), "refresh", *h.args(archive, live)[3:]])
    return cli._loader(Archive(archive), seen[0])


def test_a_resumed_load_inside_a_refresh_leaves_the_units_it_missed_due_at_the_next_refresh(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    archive, live = h.new_archive("refresh"), h.new_live()
    impl = _stub_impl(Archive(archive), _refresh_load(monkeypatch, h, archive, live))
    clock = Clock()
    run = lambda: run_refresh(Archive(archive), impl, pinger=Pinger(None), now=clock.now, sleep=clock.sleep, say=lambda _: None)
    with monkeypatch.context() as m:  # night 1: the load is killed after some of its Steps committed
        POINTS["in-crawl-status"].arm(m, SystemExit(143))
        with pytest.raises(SystemExit):
            run()
    signal.signal(signal.SIGTERM, signal.SIG_DFL)
    _write(Archive(archive), "dan", "2025Q2", datetime(2026, 9, 1, 9, tzinfo=timezone.utc), HEAD + "A,1,DANNEW1,01/09/2025,added later,c,d,10,O,2\n")
    clock.moment += timedelta(days=1)
    night2 = run()  # resumes the build of night 1: the new unit is not in its pins
    assert night2.status == "ok"
    with psycopg.connect(live) as c:
        assert c.execute("SELECT count(*) FROM seap.record WHERE code = 'DANNEW1'").fetchone() == (0,)
    clock.moment += timedelta(days=1)
    night3 = run()  # nothing new was fetched, and the load is still due: it did not cover the unit
    assert "load" in [s["name"] for s in night3.run["steps"]]
    with psycopg.connect(live) as c:
        assert c.execute("SELECT count(*) FROM seap.record WHERE code = 'DANNEW1'").fetchone() == (1,)
    clock.moment += timedelta(days=1)
    assert "load" not in [s["name"] for s in run().run["steps"]]  # and now it is up to date


def test_load_quarter_always_builds_fresh_and_prints_its_verdict_first(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    archive, live = h.new_archive("lq"), h.new_live()
    h.run(archive, live, kill=POINTS["in-crawl-status"], killed_by=SystemExit(143))  # a resumable next database is lying around
    a = Archive(archive)
    _write(a, "dan", "2025Q2", datetime(2026, 9, 1, 9, tzinfo=timezone.utc), HEAD + "A,1,DANNEW1,01/09/2025,quarantined earlier,c,d,10,O,2\n")
    a.quarantine(next(u for u in a.units("seap") if u.unit == "2025Q2"), "quarantined by an older build", [])
    capsys.readouterr()
    previous = signal.getsignal(signal.SIGTERM)
    try:
        code = cli.main(["--archive", str(archive), "load-quarter", "2025Q2", *h.args(archive, live)[3:]])
    finally:
        signal.signal(signal.SIGTERM, previous)
    out = capsys.readouterr().out.splitlines()
    assert code == 0, out
    assert "rebuild: fresh - load-quarter requeued units" in out[0] and sum("rebuild: fresh" in line for line in out) == 1  # first, and once
    with psycopg.connect(live) as c:
        assert c.execute("SELECT count(*) FROM seap.record WHERE code = 'DANNEW1'").fetchone() == (1,)
