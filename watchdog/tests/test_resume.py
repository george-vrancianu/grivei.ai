"""The resume decision (ticket #292): a pure function of the current pins, what the next database holds and `--fresh`. No database."""
from datetime import date

from pipeline.build_steps import STEPS
from pipeline.pins import Pins
from pipeline.resume import FRESH, RESUME, Held, decide

NAMES = [s.name for s in STEPS]
TODAY = date(2026, 11, 20)


def _pins(units=None, code="code-1", schema=None, today=TODAY) -> Pins:
    return Pins(units if units is not None else {"seap/bulk/dan/2024Q1/2024-05-01": "aa", "seap/bulk/dan/2024Q2/2024-08-01": "bb"}, code,
                schema if schema is not None else {"core_schema.sql": "c1"}, today)


def _held(pins=None, steps=3, state="building", quarantined=(), problem=None) -> Held:
    return Held(pins or _pins(), state, [(name, i) for i, name in enumerate(NAMES[:steps])], frozenset(quarantined), problem)


def _decide(held, pins=None, **kw):
    return decide(pins or _pins(), held, STEPS, **kw)


def test_the_same_pins_and_code_and_a_valid_prefix_resume_after_the_last_committed_step():
    v = _decide(_held(steps=3))
    assert v.verdict == RESUME
    assert NAMES[2] in v.reason and NAMES[3] in v.reason and "unchanged" in v.reason
    assert v.pins == _pins()  # a resume reads the pinned set


def test_a_resume_reads_the_pins_the_next_database_holds_not_the_new_units_or_day():
    held = _held(pins=_pins(today=date(2026, 11, 1)))
    now = _pins(units={**_pins().units, "seap/bulk/dan/2024Q3/2024-11-01": "cc"}, today=TODAY)
    v = _decide(held, now)
    assert v.verdict == RESUME
    assert v.pins.today == date(2026, 11, 1) and "seap/bulk/dan/2024Q3/2024-11-01" not in v.pins.units


def test_fresh_forces_a_fresh_build_whatever_the_ledger_says():
    v = _decide(_held(), fresh=True)
    assert v.verdict == FRESH and "--fresh" in v.reason and v.pins == _pins()


def test_an_in_place_build_is_always_fresh():
    v = _decide(_held(), staged=False)
    assert v.verdict == FRESH and "one transaction" in v.reason


def test_no_next_database_is_fresh():
    assert "no next database" in _decide(None).reason and _decide(None).verdict == FRESH


def test_a_next_database_with_no_usable_ledger_is_fresh_with_the_problem():
    v = _decide(_held(problem="no build ledger"))
    assert v.verdict == FRESH and "no build ledger" in v.reason


def test_a_finished_build_that_was_not_swapped_in_is_rebuilt_fresh():
    v = _decide(_held(steps=len(NAMES), state="complete"))
    assert v.verdict == FRESH and "complete" in v.reason


def test_different_code_is_fresh():
    v = _decide(_held(pins=_pins(code="code-0")))
    assert v.verdict == FRESH and "code changed" in v.reason


def test_different_schema_files_are_fresh():
    v = _decide(_held(pins=_pins(schema={"core_schema.sql": "c0"})))
    assert v.verdict == FRESH and "schema" in v.reason and "core_schema.sql" in v.reason


def test_a_changed_or_missing_pinned_unit_is_fresh_and_names_the_first():
    held = _held()
    changed = _decide(held, _pins(units={"seap/bulk/dan/2024Q1/2024-05-01": "XX", "seap/bulk/dan/2024Q2/2024-08-01": "bb"}))
    assert changed.verdict == FRESH and "1 pinned unit" in changed.reason and "seap/bulk/dan/2024Q1/2024-05-01" in changed.reason
    gone = _decide(held, _pins(units={"seap/bulk/dan/2024Q2/2024-08-01": "bb"}))
    assert gone.verdict == FRESH and "seap/bulk/dan/2024Q1/2024-05-01" in gone.reason


def test_a_pinned_unit_the_committed_units_step_quarantined_is_not_a_difference():
    held = _held(quarantined=["quarantine/seap/bulk/dan/2024Q1/2024-05-01"])
    v = _decide(held, _pins(units={"seap/bulk/dan/2024Q2/2024-08-01": "bb"}))
    assert v.verdict == RESUME


def test_a_unit_pinned_incomplete_is_not_compared():
    held = _held(pins=_pins(units={"seap/bulk/dan/2024Q1/2024-05-01": None}))
    assert _decide(held, _pins(units={"seap/bulk/dan/2024Q1/2024-05-01": "now-complete"})).verdict == RESUME


def test_units_added_to_the_archive_are_not_a_difference():
    now = _pins(units={**_pins().units, "seap/bulk/dan/2024Q3/2024-11-01": "cc"})
    assert _decide(_held(), now).verdict == RESUME


def test_ledger_rows_that_are_not_a_prefix_of_the_steps_are_fresh():
    gap = Held(_pins(), "building", [(NAMES[0], 0), (NAMES[2], 2)], frozenset(), None)
    assert _decide(gap).verdict == FRESH and "prefix" in _decide(gap).reason
    renamed = Held(_pins(), "building", [(NAMES[0], 0), ("elsewhere", 1)], frozenset(), None)
    assert _decide(renamed).verdict == FRESH
    empty = _held(steps=0)
    assert _decide(empty).verdict == FRESH
