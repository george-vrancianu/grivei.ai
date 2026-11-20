"""The unit loop's resume pieces that need no database (ticket #293): the resume decision inside the `units` Step, the progress counters a mid-loop
resume restores, and the archive's partial listing and pending quarantine move. The end-to-end kills are in test_resume_units_db.py."""
import json
from datetime import date, datetime, timezone

from pipeline.archive import Archive
from pipeline.build_steps import STEPS
from pipeline.pins import Pins
from pipeline.progress import Progress
from pipeline.resume import FRESH, RESUME, Held, decide

NAMES = [s.name for s in STEPS]
UNITS = {"seap/bulk/dan/2024Q1/2024-05-01": "aa", "seap/bulk/dan/2024Q2/2024-08-01": "bb", "seap/bulk/dan/2025Q1/2025-06-20": "cc"}
PINS = Pins(UNITS, "code-1", {"core_schema.sql": "c1"}, date(2026, 11, 20))
UNITS_AT = NAMES.index("units")  # a resume inside the loop: the Steps before `units` are committed


def _held(rows=(), total=3, quarantined=(), steps=UNITS_AT) -> Held:
    return Held(PINS, "building", [(n, i) for i, n in enumerate(NAMES[:steps])], frozenset(quarantined), unit_rows=tuple(rows), units_total=total)


def _first(n):
    return [(path, UNITS[path]) for path in list(UNITS)[:n]]


def test_a_resume_inside_the_unit_loop_says_after_which_unit_it_continues():
    v = decide(PINS, _held(_first(2)), STEPS)
    assert v.verdict == RESUME
    assert "continuing the units Step after unit 2 of 3" in v.reason and "unchanged" in v.reason


def test_a_resume_before_the_first_unit_is_the_plain_step_resume():
    v = decide(PINS, _held(()), STEPS)
    assert v.verdict == RESUME and "continuing after the committed Step 'estimates' with 'units'" in v.reason


def test_a_recorded_unit_whose_manifest_differs_from_the_pin_is_fresh():
    v = decide(PINS, _held([("seap/bulk/dan/2024Q1/2024-05-01", "zz")]), STEPS)
    assert v.verdict == FRESH and "seap/bulk/dan/2024Q1/2024-05-01" in v.reason


def test_a_recorded_unit_the_pin_does_not_hold_is_fresh():
    v = decide(PINS, _held([("seap/bulk/dan/1999Q1/1999-01-01", "aa")]), STEPS)
    assert v.verdict == FRESH


def test_a_unit_quarantined_by_a_committed_row_is_not_a_difference_mid_loop():
    gone = "seap/bulk/dan/2024Q2/2024-08-01"
    now = Pins({k: v for k, v in UNITS.items() if k != gone}, "code-1", {"core_schema.sql": "c1"}, date(2026, 11, 20))  # the unit was moved out of the archive
    v = decide(now, _held(_first(2), quarantined=[f"quarantine/{gone}"]), STEPS)
    assert v.verdict == RESUME and "after unit 2 of 3" in v.reason


def test_progress_restores_the_counters_of_the_units_already_committed():
    lines = []
    p = Progress(out=lines.append)
    p.start(10, "/a")
    p.restore_units(done=4, loaded=2, skipped=1, quarantined=1, records=7)
    p.unit_done(5, 10, "dan", "2024Q1", 1, 3, 3, "loaded")
    assert p.state["done"] == 5 and p.state["loaded"] == 3 and p.state["records"] == 10
    p.finish(10)
    assert lines[-1].split(" ", 1)[1].startswith("rebuild done units=5 loaded=3 skipped=1 quarantined=1 records=10 in ")


def _archive(tmp_path) -> Archive:
    a = Archive(tmp_path / "a")
    for day, unit in ((1, "2024Q1"), (2, "2024Q2"), (3, "2025Q1")):
        a.write_unit(source="seap", stream="bulk", kind="dan", unit=unit, fetched_at=datetime(2025, 1, day, tzinfo=timezone.utc), files={"f.csv": b"|A|\n1\n"}, via="v")
    return a


def test_the_listing_leaves_out_the_units_already_recorded(tmp_path):
    a = _archive(tmp_path)
    first = a.units("seap")[0].path.relative_to(a.root).as_posix()
    assert [u.unit for u in a.units("seap", exclude={first})] == ["2024Q2", "2025Q1"]
    assert a.incomplete("seap", exclude={first}) == []


def test_a_pending_quarantine_move_is_completed_once_and_a_finished_one_is_left_alone(tmp_path):
    a = _archive(tmp_path)
    unit = a.units("seap")[1]
    rel = unit.path.relative_to(a.root)
    view = a.pinned({d.relative_to(a.root).as_posix(): "x" for d in a.fetch_dirs()}, set())
    assert view.complete_quarantine(rel, "bad headers", ["line 2"]) is True
    dest = a.root / "quarantine" / rel
    assert not unit.path.exists() and json.loads((dest / "reason.json").read_text()) == {"reason": "bad headers", "problems": ["line 2"]}
    assert view.complete_quarantine(rel, "bad headers", ["line 2"]) is False  # already moved: nothing to do
    assert view.quarantined() == [dest]
