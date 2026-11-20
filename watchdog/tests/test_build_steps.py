"""The declared Step list of the rebuild (pipeline/build_steps.py): no database. The declarations are what #291 (commit per Step) and #295 (the resume
gate's ownership check) read, so they must be complete and consistent."""
import ast
import re
from pathlib import Path

import pytest

from graph_dump import GRAPH_SCHEMAS
from pipeline.build_steps import OUTSIDE_THE_BUILD, SHARED, STEPS, Step, expand, owners_of

WATCHDOG = Path(__file__).resolve().parents[1]
REPO = WATCHDOG.parent
PIPELINE = WATCHDOG / "pipeline"
SQL_FILES = sorted((PIPELINE / "sql").glob("*.sql"))


def _tables_in_sql():
    found = set()
    for path in SQL_FILES:
        found.update(f"{s}.{t}" for s, t in re.findall(r"^\s*CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\.(\w+)", path.read_text(encoding="utf-8"), re.I | re.M))
    return found


def test_step_names_are_unique_and_the_first_is_the_schema():
    names = [s.name for s in STEPS]
    assert len(names) == len(set(names))
    assert names[0] == "schema"


def test_placement_and_mf_are_one_step_that_announces_both_progress_names():
    step = next(s for s in STEPS if s.name == "placement-mf")
    assert step.progress_names == ("placement", "mf")
    assert [s for s in STEPS if "mf" in s.progress_names or "placement" in s.progress_names] == [step]


def test_progress_names_are_the_ones_the_status_file_has_always_shown():
    names = [n for s in STEPS for n in s.progress_names]
    assert names == ["schema", "anaf-identities", "onrc", "estimates", "crawl-status", "crawl-badges", "frameworks", "entities", "placement", "mf", "amepip",
                     "aep", "financials", "donations", "coverage", "record-indexes", "signals", "rollup", "search-index", "analyze-search", "onrc-search", "commit"]


def test_every_table_a_step_reads_is_written_by_an_earlier_step():
    written: set[str] = set()
    for step in STEPS:
        missing = set(step.reads) - written
        assert not missing, f"{step.name} reads {sorted(missing)} that no earlier Step writes"
        written |= set(step.writes)


def test_declared_tables_exist_and_every_table_is_written_by_some_step():
    tables = _tables_in_sql()
    declared = {t for s in STEPS for t in (*s.reads, *s.writes)}
    assert declared <= tables, f"not in any schema file: {sorted(declared - tables)}"
    assert tables <= {t for s in STEPS for t in s.writes}, f"no Step writes: {sorted(tables - {t for s in STEPS for t in s.writes})}"


def test_every_graph_schema_is_in_the_schema_files_and_build_step_is_the_hand_off_table():
    assert {t.split(".")[0] for t in _tables_in_sql()} <= set(GRAPH_SCHEMAS)
    assert "build.step" in _tables_in_sql() and "build.step" in STEPS[0].writes


def test_a_step_that_reads_build_step_reads_a_hand_off_written_by_an_earlier_step():
    assert [s.name for s in STEPS if "build.step" in s.reads] == ["entities", "coverage"]


def _files(patterns):
    return {p for p in expand(patterns, PIPELINE)}


def test_every_file_under_pipeline_is_owned_by_a_step_shared_or_outside_the_build():
    everything = {p for p in PIPELINE.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc"}
    claimed = _files(SHARED) | _files(OUTSIDE_THE_BUILD) | {p for s in STEPS for p in _files(s.owns)}
    assert not everything - claimed, f"owned by no Step, not SHARED, not OUTSIDE_THE_BUILD: {sorted(str(p.relative_to(PIPELINE)) for p in everything - claimed)}"
    assert not _files(SHARED) & _files(OUTSIDE_THE_BUILD)


def test_every_declared_path_exists():
    for patterns in (SHARED, OUTSIDE_THE_BUILD, *(s.owns for s in STEPS)):
        for pattern in patterns:
            assert (PIPELINE / pattern).exists(), pattern


def _imports(path: Path) -> set[Path]:
    """The pipeline files `path` imports (relative imports, at any depth in the file), with the `__init__.py` of each package they run through."""
    found = set()
    if path.suffix != ".py":
        return found
    package = path.parent
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if not isinstance(node, ast.ImportFrom) or not node.level:
            continue
        base = package
        for _ in range(node.level - 1):
            base = base.parent
        target = base.joinpath(*(node.module.split(".") if node.module else []))
        names = [target / n for n in (a.name for a in node.names)]
        for candidate in [target, *names]:
            for file in (candidate.with_suffix(".py"), candidate / "__init__.py"):
                if file.is_file():
                    found.add(file)
        for parent in [target, *target.parents]:  # running a module runs the __init__ of every package above it
            if parent == PIPELINE.parent:
                break
            if (parent / "__init__.py").is_file():
                found.add(parent / "__init__.py")
    return {f for f in found if PIPELINE in f.parents}


@pytest.mark.parametrize("step", STEPS, ids=lambda s: s.name)
def test_a_step_owns_everything_its_owned_code_imports_or_it_is_shared(step):
    """A file a Step's code imports changes that Step's behaviour, so the resume gate must see it as the Step's: owned by it or SHARED."""
    owned = _files(step.owns)
    shared = _files(SHARED)
    seen, todo, outside = set(), list(owned), set()
    while todo:
        file = todo.pop()
        if file in seen or file in shared:
            continue
        seen.add(file)
        for imported in _imports(file):
            if imported in shared or imported in owned:
                todo.append(imported)
            else:
                outside.add((file.relative_to(PIPELINE).as_posix(), imported.relative_to(PIPELINE).as_posix()))
    assert not outside, f"{step.name} owns code that imports files it does not own: {sorted(outside)}"


def test_owners_of_names_every_step_for_a_shared_file_and_the_owning_steps_for_the_rest():
    everyone = {s.name for s in STEPS}
    assert owners_of("rebuild.py") == everyone
    assert owners_of("signals/young_firm.py") == {"signals"}
    assert owners_of("cli.py") == set()


def test_units_owns_the_shared_helpers_it_runs_through_rebuild_py():
    """The closure test does not follow SHARED files' imports: `value_bucket` (search.py) and `parse_quarter` (coverage/) are run by the unit loop."""
    assert "units" in owners_of("search.py")
    assert "units" in owners_of("coverage/__init__.py")
    assert "units" in owners_of("estimates.py") and "units" in owners_of("onrc/build.py")


def test_no_value_is_handed_between_steps_on_the_build_context():
    """A Step reads what an earlier one produced from the graph, not from the context: the context holds the run's inputs and the working state of one Step."""
    from dataclasses import fields

    from pipeline.build_steps import BuildContext

    inputs = {"archive", "cur", "conn", "summary", "today", "progress", "staged", "placement_dir", "known_gaps_path", "overrides", "person_overrides", "pins"}
    one_step = {"number", "bulk_rows"}  # units' own: persisted in its row
    assert {f.name for f in fields(BuildContext)} <= inputs | one_step | {"data_through"}  # data_through: signals' own, loaded from core.data_through


def test_a_fix_in_onrc_search_belongs_to_onrc_search_alone_and_the_other_onrc_files_to_the_steps_that_run_them():
    """#295: the 2026-11-20 case. onrc/search.py is only run by onrc-search, so fixing it resumes after the Steps before it."""
    assert owners_of("onrc/search.py") == {"onrc-search"}
    assert "onrc-search" not in owners_of("onrc/build.py") and {"onrc", "units", "entities", "placement-mf"} <= owners_of("onrc/build.py")


def test_owners_of_reads_the_declarations_as_text_so_it_needs_no_checkout_around_the_package():
    """The image copies the package to /app/pipeline: no repo root, and a deleted file is not on disk. Package-relative text must be enough."""
    everyone = {s.name for s in STEPS}
    assert owners_of("signals/a_rule_that_does_not_exist_yet.py") == {"signals"}
    assert owners_of("brand_new_module.py") == everyone  # no declaration claims it: conservative
    assert owners_of("extra:placement-data/uat.csv") == everyone and owners_of("extra:known-gaps") == everyone
    assert owners_of("switchover.py") == set() and owners_of("geo/topo.py") == set()  # outside the build: no Step


def _direct_imports_of_the_step_bodies() -> dict[str, set[str]]:
    """Step name -> the pipeline files its body uses by name: the names the `Step(...)` call, the local functions it points at (transitively) and its hand_off
    lambda reference, which `build_steps.py` imported from a pipeline module (`from .onrc.build import OnrcNames`)."""
    tree = ast.parse((PIPELINE / "build_steps.py").read_text(encoding="utf-8"))
    imported = {}
    for node in tree.body:
        if isinstance(node, ast.ImportFrom) and node.level == 1 and node.module:
            for a in node.names:
                imported[a.asname or a.name] = next(f for f in (PIPELINE / f"{node.module.replace('.', '/')}.py", PIPELINE / node.module.replace(".", "/") / "__init__.py") if f.is_file())
    functions = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}

    def names(node, seen: set[str]) -> set[str]:
        out = set()
        for n in ast.walk(node):
            if isinstance(n, ast.Name) and n.id not in seen:
                out.add(n.id)
                if n.id in functions:
                    seen.add(n.id)
                    out |= names(functions[n.id], seen)
        return out

    steps = next(n for n in tree.body if isinstance(n, ast.AnnAssign) and getattr(n.target, "id", "") == "STEPS").value
    return {call.args[0].value: {imported[x].relative_to(PIPELINE).as_posix() for x in names(call, set()) if x in imported}
            for call in steps.elts}


@pytest.mark.parametrize("step", STEPS, ids=lambda s: s.name)
def test_a_step_owns_the_pipeline_files_its_body_in_build_steps_py_uses_directly_or_they_are_shared(step):
    """The closure test only follows the imports of owned files; the Step bodies live in build_steps.py (SHARED), so their own imports are checked here."""
    used = _direct_imports_of_the_step_bodies()[step.name]
    claimed = lambda f: owners_of(f) >= {s.name for s in STEPS} or step.name in owners_of(f)  # noqa: E731
    assert not {f for f in used if not claimed(f)}, f"{step.name}'s body uses files it does not own: {sorted(f for f in used if not claimed(f))}"
