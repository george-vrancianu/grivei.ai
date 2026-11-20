"""The resume decision (ticket #292): a pure function of the current pins, what the next database holds and `--fresh`. No database."""
from datetime import date

from pipeline.build_steps import STEPS
from pipeline.pins import Pins
from pipeline.resume import FRESH, RESUME, Held, decide

NAMES = [s.name for s in STEPS]
TODAY = date(2026, 11, 20)


def _pins(units=None, code="code-1", schema=None, today=TODAY, code_files=None) -> Pins:
    return Pins(units if units is not None else {"seap/bulk/dan/2024Q1/2024-05-01": "aa", "seap/bulk/dan/2024Q2/2024-08-01": "bb"}, code,
                schema if schema is not None else {"core_schema.sql": "c1"}, today, code_files=code_files or {})


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


def test_a_verb_that_always_starts_over_gives_its_own_reason():
    v = _decide(_held(), fresh="load-quarter always starts over")
    assert v.verdict == FRESH and v.line == "rebuild: fresh - load-quarter always starts over"


def test_a_direct_staged_call_is_fresh_with_the_one_reason_the_decision_owns():
    v = _decide(None, direct=True)
    assert v.verdict == FRESH and "a direct call" in v.reason and v.pins == _pins()


def test_the_pins_a_resume_reads_include_the_quarantine_listing_it_held():
    held = _held(pins=Pins(_pins().units, "code-1", {"core_schema.sql": "c1"}, TODAY, ("seap/bulk/dan/2025Q1/2026-01-01",)))
    assert _decide(held).pins.quarantined == ("seap/bulk/dan/2025Q1/2026-01-01",)


# --- the code-ownership gate (#295): a code change confined to Steps that have not run resumes ---

def _code(**files) -> dict:
    return {"estimates.py": "e1", "onrc/search.py": "s1", "rebuild.py": "r1", "cli.py": "c1", **files}


def _gate(changed: dict, steps=3, partial=(), held_files=None, **kw):
    held = Held(_pins(code_files=held_files or _code()), "building", [(n, i) for i, n in enumerate(NAMES[:steps])], frozenset(),
                unit_rows=(("p", None),) if "units" in partial else (), units_total=2, snapshot_rows="onrc" in partial)
    return _decide(held, _pins(code="code-2", code_files=_code(**changed)), **kw)


def test_a_change_confined_to_a_step_that_has_not_run_resumes_with_the_new_code_and_names_the_file():
    v = _gate({"onrc/search.py": "s2"}, steps=NAMES.index("onrc-search"))
    assert v.verdict == RESUME and "onrc/search.py" in v.reason and "not yet run" in v.reason and "onrc/search.py" in v.line
    assert v.changed_files == ("onrc/search.py",)
    assert v.pins.code_version == "code-2" and v.pins.code_files["onrc/search.py"] == "s2" and v.pins.units == _pins().units  # the code the rest runs with; the other pins are the held ones


def test_a_change_to_the_code_of_a_completed_step_starts_fresh():
    v = _gate({"estimates.py": "e2"}, steps=NAMES.index("estimates") + 1)
    assert v.verdict == FRESH and "estimates.py" in v.reason and "'estimates'" in v.reason and v.changed_files == ("estimates.py",)


def test_a_change_to_a_shared_module_starts_fresh_even_before_any_step_that_uses_it_ran():
    v = _gate({"rebuild.py": "r2"}, steps=1)
    assert v.verdict == FRESH and "rebuild.py" in v.reason and "shares" in v.reason


def test_a_file_no_declaration_claims_and_an_outside_input_are_shared_so_they_start_fresh():
    assert _gate({"brand_new.py": "x"}).verdict == FRESH
    assert _gate({"extra:placement-data/a.csv": "x"}).verdict == FRESH


def test_a_file_outside_the_build_does_not_block_a_resume():
    assert _gate({"cli.py": "c2"}).verdict == RESUME


def test_a_file_added_or_deleted_counts_as_changed():
    held_without = {k: v for k, v in _code().items() if k != "onrc/search.py"}
    assert _gate({}, steps=NAMES.index("onrc-search"), held_files=held_without).changed_files == ("onrc/search.py",)
    assert _gate({"onrc/search.py": "s1", "estimates.py": "e1"}, steps=NAMES.index("onrc-search"), held_files={**_code(), "estimates.py": "e1", "gone.py": "g"}).verdict == FRESH  # gone.py: unclaimed, so shared


def test_a_step_with_committed_work_but_no_ledger_row_counts_as_run():
    steps = NAMES.index("onrc")  # onrc is next: its snapshots may be committed already
    assert _gate({"onrc/build.py": "b2"}, steps=steps).verdict == RESUME
    v = _gate({"onrc/build.py": "b2"}, steps=steps, partial={"onrc"})
    assert v.verdict == FRESH and "'onrc'" in v.reason


def test_a_mid_unit_loop_resume_is_gated_by_the_code_too():
    """#293 resumes inside the `units` Step when `build.unit` rows exist; a changed units-owned file must start fresh first (#295): the rows are units' work."""
    pins = _pins(code_files=_code())
    unit_rows = ((next(iter(pins.units)), next(iter(pins.units.values()))),)
    held = Held(pins, "building", [(n, i) for i, n in enumerate(NAMES[:NAMES.index("units")])], frozenset(), unit_rows=unit_rows, units_total=2)
    same = _decide(held, pins)
    assert same.verdict == RESUME and "unit 1 of 2" in same.reason  # unchanged code: the mid-loop resume
    v = _decide(held, _pins(code="code-2", code_files=_code(**{"coverage/grid.py": "g2"})))  # coverage/ belongs to units and to the later coverage Step: only the units rows make it "run"
    assert v.verdict == FRESH and "coverage/grid.py" in v.reason and "'units'" in v.reason
    assert _decide(held, _pins(code="code-2", code_files=_code(**{"onrc/search.py": "s2"}))).verdict == RESUME  # a later Step's file: the loop continues with the new code


def test_the_other_fresh_conditions_still_win_over_the_gate():
    held = Held(_pins(code_files=_code()), "building", [("schema", 0), ("units", 5)], frozenset())
    v = _decide(held, _pins(code="code-2", code_files=_code(**{"onrc/search.py": "s2"})))
    assert v.verdict == FRESH and "not a proper prefix" in v.reason


def test_a_changed_version_with_no_file_difference_is_fresh_code_changed():
    assert "code changed (build" in _decide(_held(pins=_pins(code="code-0"))).reason


def test_the_first_line_truncates_a_long_list_of_files():
    many = {f"onrc/f{i}.py": "x" for i in range(8)}
    v = _gate(many, steps=NAMES.index("onrc-search"), owners=lambda path: {"onrc-search"})
    assert v.verdict == RESUME and "+3 more" in v.line


def test_owners_are_injected_so_a_fake_step_list_can_be_gated():
    v = _gate({"estimates.py": "e2"}, steps=NAMES.index("estimates") + 1, owners=lambda path: {"signals"})
    assert v.verdict == RESUME
