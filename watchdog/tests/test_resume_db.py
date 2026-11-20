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
from resume_harness import FIXTURES, Harness, KillPoint, copy_package, edit_code, make_world, onrc_snapshot_kill_points, step_kill_points, unit_kill_points, vacuum_kill_points  # noqa: E402
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
    package = copy_package(tmp_path / "elsewhere" / "pipeline")
    monkeypatch.setattr(pins_module, "PACKAGE", package)  # the code of the next run differs from the one the killed build pinned (the real package)
    edit_code(package, "rebuild.py")
    rerun = h.run(archive, live)
    assert rerun.first.startswith("rebuild: fresh - code changed in rebuild.py, a module every Step shares") and "rebuild.py" in rerun.first and any("dropping the leftover" in x for x in rerun.out)
    with psycopg.connect(live) as c:
        assert c.execute("SELECT code_files->>'rebuild.py', state FROM build.run").fetchone() == (pins_module.code_files(package=package)["rebuild.py"], "complete")


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
    assert "rebuild: fresh - load-quarter always starts over" in out[0] and sum("rebuild: fresh" in line for line in out) == 1  # first, and once
    with psycopg.connect(live) as c:
        assert c.execute("SELECT count(*) FROM seap.record WHERE code = 'DANNEW1'").fetchone() == (1,)


ONRC_POINTS = {p.name: p for p in onrc_snapshot_kill_points()}


def onrc_rows(url, sql):
    with psycopg.connect(url) as c:
        return c.execute(sql).fetchall()


@pytest.mark.parametrize("name, killed_by", [(n, SystemExit(143)) for n in ONRC_POINTS]
                         + [(n, RuntimeError("bug")) for n in ("after-onrc-snapshot-1", "after-onrc-snapshot-4")],
                         ids=[f"{n}-sigterm" for n in ONRC_POINTS] + [f"{n}-bug" for n in ("after-onrc-snapshot-1", "after-onrc-snapshot-4")])
def test_killed_after_an_onrc_snapshot_the_resume_continues_from_the_next_one_and_leaves_the_uninterrupted_graph(harness, name, killed_by):
    rerun = harness.assert_resumes_like_reference(ONRC_POINTS[name], killed_by)  # four snapshots with a rename and status changes
    assert onrc_rows(rerun.url, "SELECT ordinal, snapshot_date::text, applied FROM build.snapshot ORDER BY ordinal") == [
        (1, "2025-03-18", True), (2, "2026-03-02", True), (3, "2026-04-03", True), (4, "2026-05-06", True)]


@pytest.mark.parametrize("k", [1, 2, 3, 4])
def test_each_committed_onrc_snapshot_is_visible_in_the_next_database_after_the_kill(harness, k):
    archive, live = harness.new_archive("visible"), harness.new_live()
    harness.run(archive, live, kill=ONRC_POINTS[f"after-onrc-snapshot-{k}"], killed_by=SystemExit(143))
    next_url = switchover.names_of(live).next_url
    assert [r[0] for r in onrc_rows(next_url, "SELECT ordinal FROM build.snapshot ORDER BY ordinal")] == list(range(1, k + 1))
    assert onrc_rows(next_url, "SELECT count(*) FROM onrc.snapshot") == [(k,)]
    assert onrc_rows(next_url, "SELECT count(*) FROM build.step WHERE name = 'onrc'") == [(0,)]  # the Step itself is not done


def test_the_onrc_summary_is_complete_after_a_resume_in_the_middle_of_the_step(harness):
    ref = harness.reference()
    rerun = harness.assert_resumes_like_reference(ONRC_POINTS["after-onrc-snapshot-2"], SystemExit(143))
    row = "SELECT summary FROM build.step WHERE name = 'onrc'"
    assert onrc_rows(rerun.url, row) == onrc_rows(ref.url, row)
    summary = onrc_rows(rerun.url, row)[0][0]["summary"]
    assert summary["snapshots"] == 4 and summary["first"] == "2025-03-18" and summary["latest"] == "2026-05-06" and summary["status_spans"] > 0 and summary["companies"] > 0


def onrc_with_a_broken_snapshot(root):
    make_world(root, ("archive-onrc-signals",))
    Archive(root).write_unit(source="onrc", stream="snapshot", kind="firme", unit="2026-03-20", fetched_at=datetime(2026, 11, 13, 5, tzinfo=timezone.utc),
                             files={"junk.csv": b"x\n"}, origin={"system": "data.gov.ro", "layout": "current", "resources": []})
    return root


def test_a_snapshot_set_aside_before_the_kill_is_still_named_after_the_resume(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=onrc_with_a_broken_snapshot)
    rerun = h.assert_resumes_like_reference(ONRC_POINTS["after-onrc-snapshot-3"], SystemExit(143))  # 2025-03-18, 2026-03-02, the broken 2026-03-20 are done
    assert onrc_rows(rerun.url, "SELECT snapshot_date::text, applied FROM build.snapshot ORDER BY ordinal")[2] == ("2026-03-20", False)
    assert any("skipped snapshot 2026-03-20" in line for line in rerun.out)


def test_an_in_place_build_stays_one_transaction_even_with_the_onrc_snapshot_ledger(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys)
    live = h.new_live()
    h.run(h.new_archive("inplace"), live, "--in-place", kill=ONRC_POINTS["after-onrc-snapshot-2"], killed_by=RuntimeError("bug"))
    assert onrc_rows(live, "SELECT count(*) FROM information_schema.schemata WHERE schema_name IN ('build', 'onrc')") == [(0,)]  # all or nothing: two snapshots did not stay


def test_finishing_the_onrc_step_without_its_snapshot_loop_fails_loudly():
    from pipeline.onrc.build import OnrcSummary, finish_onrc
    with pytest.raises(RuntimeError, match="build_onrc_snapshots"):
        finish_onrc(None, OnrcSummary(snapshots=2))  # a summary restored from a hand-off holds no snapshots to finish from


# --- the code-ownership gate (#295). The build hashes a copy of the package (`copy_package`, `pins.PACKAGE` patched) that is edited between the kill and the
# resume, so the real source tree is never touched. The edit is hash-level (the build keeps running the real modules): it shows the gate's verdict, the ledger
# and that the graph equals an uninterrupted build over the same (edited) package.

ONRC_SEARCH_KILL = POINTS["in-onrc-search"]


def _without_changed_files(graph: dict) -> dict:
    return {**graph, "build.run": [{k: v for k, v in row.items() if k != "changed_files"} for row in graph["build.run"]]}


def _code_change(h, tmp_path, monkeypatch, kill: KillPoint, relpath: str, label: str = "a", edit=None, between=None, flags: tuple[str, ...] = ()):
    """Kill at `kill`, edit `relpath` in the package copy (or call `edit(package)`), run `between()` if given, rerun (both runs with `flags`, e.g. `--in-place --staged`): (the rerun, the live url, the package copy)."""
    package = copy_package(tmp_path / label / "elsewhere" / "pipeline")  # not <repo>/watchdog/pipeline: the gate must not depend on where the package sits
    monkeypatch.setattr(pins_module, "PACKAGE", package)
    archive, live = h.new_archive("code-gate"), h.new_live()
    h.run(archive, live, *flags, kill=kill, killed_by=SystemExit(143))
    (edit or (lambda p: edit_code(p, relpath)))(package)
    if between:
        between()
    return h.run(archive, live, *flags), live, package


def test_a_fix_in_a_step_that_has_not_run_resumes_runs_the_new_code_and_leaves_the_graph_of_an_uninterrupted_build_with_it(harness, tmp_path, monkeypatch):
    """The 2026-11-20 case. The code change is real: between the kill and the resume `is_sole_trader` (onrc/search.py's filter) is replaced by one that leaves out other names, so the resumed
    onrc-search must run the new behaviour, and the oracle is a build never interrupted under the same replacement."""
    import pipeline.onrc.search as search_module

    unpatched = harness.reference()
    leave_out_half = lambda name, form: bool(name) and name[:1].upper() <= "M"  # noqa: E731  (the fixtures have no sole trader: this leaves out the names up to M)
    rerun, live, package = _code_change(harness, tmp_path, monkeypatch, ONRC_SEARCH_KILL, "onrc/search.py",  # analyze-search is the last committed Step
                                        between=lambda: monkeypatch.setattr(search_module, "is_sole_trader", leave_out_half))
    assert rerun.first.startswith("rebuild: resume - ") and "code changed only in Steps not yet run: onrc/search.py" in rerun.first
    ref = harness.run(harness.new_archive("ref-new-code"), harness.new_live())  # the same edited package and replacement, never interrupted
    assert _without_changed_files(rerun.graph) == _without_changed_files(ref.graph)  # build.run holds the new code_version and code_files in both
    assert rerun.graph["onrc.search"] != unpatched.graph["onrc.search"]  # the new behaviour reached the graph: the resumed Step did not run the old code
    assert rerun.graph["build.run"][0]["changed_files"] == ["onrc/search.py"] and ref.graph["build.run"][0]["changed_files"] == []
    with psycopg.connect(live) as c:
        assert c.execute("SELECT code_files->>'onrc/search.py' FROM build.run").fetchone() == (pins_module.code_files(package=package)["onrc/search.py"],)


@pytest.mark.parametrize("relpath, why", [("estimates.py", "the file of a completed Step"), ("rebuild.py", "a shared module"), ("sql/core_schema.sql", "a schema file"),
                                          ("a_module_nobody_declared.py", "a file no declaration claims")])
def test_a_change_to_a_completed_steps_code_or_to_a_shared_module_starts_fresh(server, tmp_path, monkeypatch, capsys, relpath, why):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    undeclared = relpath.startswith("a_module")
    rerun, _, _ = _code_change(h, tmp_path, monkeypatch, POINTS["in-onrc-search"], relpath, edit=(lambda p: (p / relpath).write_text("x = 1\n")) if undeclared else None)
    assert rerun.first.startswith("rebuild: fresh - ") and (relpath in rerun.first or "schema files changed" in rerun.first), why
    assert any("dropping the leftover" in x for x in rerun.out)
    assert rerun.graph["build.run"][0]["changed_files"] == []  # a fresh build records nothing of the dropped one


def test_a_change_to_a_units_file_after_a_kill_inside_the_unit_loop_starts_fresh_and_leaves_the_uninterrupted_graph(server, tmp_path, monkeypatch, capsys):
    """#293 x #295: the committed `build.unit` rows are units' work with no `build.step` row yet, so the gate counts the Step as run: a mid-loop resume must not mix two versions of its code."""
    from test_resume_units_db import UNITS_WORLD

    h = Harness(server, tmp_path, monkeypatch, capsys, world=UNITS_WORLD)
    kill = unit_kill_points(1)[1]  # after-unit-1-commit: one loaded unit is committed and nothing is quarantined yet (a quarantine move is not undone by a fresh build, so the graphs would differ by design)
    rerun, live, package = _code_change(h, tmp_path, monkeypatch, kill, "coverage/grid.py")  # owned by units and by the coverage Step, which has not run: only the build.unit rows make the gate fresh
    assert rerun.first.startswith("rebuild: fresh - ") and "coverage/grid.py" in rerun.first and "'units'" in rerun.first
    assert any("dropping the leftover" in x for x in rerun.out)
    ref = h.run(h.new_archive("ref-units-code"), h.new_live())  # the same edited package, never interrupted
    assert _without_changed_files(rerun.graph) == _without_changed_files(ref.graph)


def test_a_change_to_a_file_outside_the_build_does_not_stop_a_resume(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    rerun, _, _ = _code_change(h, tmp_path, monkeypatch, POINTS["in-onrc-search"], "cli.py")
    assert rerun.first.startswith("rebuild: resume - ") and "cli.py" in rerun.first and rerun.graph["build.run"][0]["changed_files"] == ["cli.py"]


def test_a_step_with_committed_snapshots_but_no_ledger_row_counts_as_run_for_the_gate(harness, tmp_path, monkeypatch):
    """onrc is killed after its second snapshot: its own code is changed, so the build starts fresh; onrc-search's is not, so it resumes."""
    rerun, _, _ = _code_change(harness, tmp_path, monkeypatch, ONRC_POINTS["after-onrc-snapshot-2"], "onrc/search.py", "a")
    assert rerun.first.startswith("rebuild: resume - ") and "onrc/search.py" in rerun.first
    rerun, _, _ = _code_change(harness, tmp_path, monkeypatch, ONRC_POINTS["after-onrc-snapshot-2"], "onrc/people.py", "b")
    assert rerun.first.startswith("rebuild: fresh - ") and "'onrc'" in rerun.first


def test_the_changed_files_of_every_resume_are_kept_in_the_ledger(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    package = copy_package(tmp_path / "elsewhere" / "pipeline")
    monkeypatch.setattr(pins_module, "PACKAGE", package)
    archive, live = h.new_archive("code-gate"), h.new_live()
    h.run(archive, live, kill=POINTS["in-onrc-search"], killed_by=SystemExit(143))
    edit_code(package, "cli.py")
    h.run(archive, live, kill=POINTS["in-commit"], killed_by=SystemExit(143))  # resumes with onrc-search, dies in commit
    edit_code(package, "switchover.py")
    rerun = h.run(archive, live)
    assert rerun.first.startswith("rebuild: resume - ") and rerun.graph["build.run"][0]["changed_files"] == ["cli.py", "switchover.py"]


def test_a_ledger_written_before_per_file_code_hashes_is_fresh(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    archive, live = h.new_archive("old-ledger"), h.new_live()
    h.run(archive, live, kill=POINTS["in-aep"], killed_by=SystemExit(143))
    with psycopg.connect(switchover.names_of(live).next_url, autocommit=True) as c:
        c.execute("ALTER TABLE build.run DROP COLUMN code_files")
    assert h.run(archive, live).first.startswith("rebuild: fresh - the next database has no usable build ledger (the build ledger was written before per-file code hashes)")


# --- `rebuild --in-place --staged` (#297): the major-upgrade build into a fresh database nobody reads, committed per Step, Unit and snapshot, resumable

IN_PLACE_STAGED = ("--in-place", "--staged")
UNIT_POINTS = {p.name: p for p in unit_kill_points()}
STAGED_KILLS = [(POINTS["in-onrc"], SystemExit(143)), (POINTS["in-onrc"], RuntimeError("bug")), (POINTS["in-entities"], SystemExit(143)),
                (UNIT_POINTS["after-unit-3-commit"], SystemExit(143)), (UNIT_POINTS["after-unit-3-commit"], RuntimeError("bug")),
                (ONRC_POINTS["after-onrc-snapshot-2"], SystemExit(143)), (ONRC_POINTS["after-onrc-snapshot-2"], RuntimeError("bug"))]


@pytest.mark.parametrize("point, killed_by", STAGED_KILLS, ids=[f"{p.name}-{type(k).__name__}" for p, k in STAGED_KILLS])
def test_an_in_place_staged_build_resumes_like_a_beside_one(harness, point, killed_by):
    rerun = harness.assert_resumes_like_reference(point, killed_by, flags=IN_PLACE_STAGED)
    assert rerun.first.startswith("rebuild: resume - ")


def test_an_in_place_staged_build_commits_per_step_and_the_first_line_says_fresh_on_an_empty_database(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    live = h.new_live()
    killed = h.run(h.new_archive("a"), live, *IN_PLACE_STAGED, kill=POINTS["in-aep"], killed_by=SystemExit(143))
    assert killed.first == "rebuild: fresh - the next database has no usable build ledger (the build schema is missing)"  # the target database exists but is empty
    assert "the database keeps its committed Steps; rerun the same command" in killed.out[-1] and "live graph" not in killed.out[-1]
    assert onrc_rows(live, "SELECT count(*) FROM build.step")[0][0] > 0  # the Steps before the kill are committed in the target database itself
    assert h.run(h.new_archive("b"), live, *IN_PLACE_STAGED, "--fresh").first == "rebuild: fresh - --fresh given"


def test_staged_without_in_place_is_a_parser_error(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    with pytest.raises(SystemExit) as e:
        cli.main(h.args(h.new_archive("a"), h.new_live(), "--staged"))
    assert e.value.code == 2 and "a beside build is always staged" in capsys.readouterr().err


def _databases(server) -> set[str]:
    with psycopg.connect(f"{server}/postgres", autocommit=True) as c:
        return {r[0] for r in c.execute("SELECT datname FROM pg_database")}


def test_a_complete_in_place_staged_build_is_rebuilt_fresh_on_a_rerun_and_makes_no_next_database(harness, server):
    ref = harness.reference()
    archive, live = harness.new_archive("complete"), harness.new_live()
    harness.run(archive, live, *IN_PLACE_STAGED)
    again = harness.run(harness.new_archive("complete2"), live, *IN_PLACE_STAGED)  # the runbook's "run step 2 again"
    assert again.first.startswith("rebuild: fresh - ") and "already complete" in again.first
    assert again.graph == ref.graph
    assert f"{live.rsplit('/', 1)[1]}_next" not in _databases(server)


def test_a_staged_build_over_a_plain_in_place_graph_without_a_build_schema_starts_fresh_then_resumes(harness, server):
    ref = harness.reference()
    live = harness.new_live()
    harness.run(harness.new_archive("plain"), live, "--in-place")
    with psycopg.connect(live, autocommit=True) as c:
        c.execute("DROP SCHEMA build CASCADE")  # a graph from before the build ledger
    archive = harness.new_archive("over")
    killed = harness.run(archive, live, *IN_PLACE_STAGED, kill=POINTS["in-onrc"], killed_by=SystemExit(143))
    assert killed.first.startswith("rebuild: fresh - ") and "build schema is missing" in killed.first
    rerun = harness.run(archive, live, *IN_PLACE_STAGED)
    assert rerun.first.startswith("rebuild: resume - ")
    assert rerun.graph == ref.graph
    assert f"{live.rsplit('/', 1)[1]}_next" not in _databases(server)


def test_the_code_gate_applies_to_an_in_place_staged_build_like_to_a_beside_one(server, tmp_path, monkeypatch, capsys):
    """#295 x #297: the target database holds the ledger; a change to a completed Step's file starts fresh, one to a Step not yet run resumes."""
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    rerun, _, _ = _code_change(h, tmp_path, monkeypatch, POINTS["in-onrc-search"], "estimates.py", "a", flags=IN_PLACE_STAGED)
    assert rerun.first.startswith("rebuild: fresh - ") and "estimates.py" in rerun.first and "'estimates'" in rerun.first
    rerun, _, _ = _code_change(h, tmp_path, monkeypatch, POINTS["in-onrc-search"], "onrc/search.py", "b", flags=IN_PLACE_STAGED)
    assert rerun.first.startswith("rebuild: resume - ") and "code changed only in Steps not yet run: onrc/search.py" in rerun.first
    assert rerun.graph["build.run"][0]["changed_files"] == ["onrc/search.py"]
