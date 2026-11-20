"""The rebuild as an ordered list of Steps (spec #285, ticket #290).

A `Step` declares its name, a run function on a shared `BuildContext`, the tables it reads and writes, and the code it owns. `STEPS` is the
order the rebuild runs them in; `rebuild()` (rebuild.py) only opens the connection and calls `run_steps`. What the later tickets read from here:

- #291: a staged build commits after every Step and writes the Step's ledger row in the same transaction (`run_steps`); build_ledger.py holds the ledger.
- #295's resume gate asks `owners_of(path)` which Steps a changed file belongs to. `SHARED` files belong to every Step.
- Values one Step hands to a later one are persisted: `run_steps` writes the Step's `build.step` row when it finishes (its `hand_off`, or the
  `RebuildSummary` fields in `summary_fields`), and a consumer Step loads what it needs from the database (hand_offs.py), never from a variable of the
  Step that produced it. The `BuildContext` fields marked "hand-off" are working state inside a Step or loaded at the start of the Step that reads them.

A staged build commits after every Step, in the Step's own transaction with its ledger row (run_steps); otherwise (--in-place) the Steps run in
ONE transaction and nothing commits until the last Step's.

Paths in `owns`, `SHARED` and `OUTSIDE_THE_BUILD` are relative to the repo root: a file, or a directory with a trailing `/` (everything under it)."""
from __future__ import annotations

from contextlib import nullcontext
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Callable

import psycopg

from .analyze import analyze
from .archive import Archive, sha256_of
from .build_ledger import finish_run, now, stamp_step, start_run
from .bulk import KINDS
from .coverage import build_coverage, flagged as flagged_cells
from .coverage import parse_quarter as _parse_quarter
from .crawl import KIND as CRAWL_KIND
from .crawl.unitdir import CRAWLED_KINDS, BACKFILL_KIND, contiguous_through as crawl_through
from .estimates import read_estimates
from .hand_offs import (entities_hand_off, encode, load_anaf_names, load_bulk_rows, load_data_through, load_last_source_file_id, load_loaded_hashes,
                        load_onrc_summary, load_set_aside, onrc_hand_off, units_hand_off, write_step)
from .identity import Overrides, Resolver
from .mf.build import build_mf
from .onrc.build import OnrcNames, build_onrc, build_onrc_placement
from .onrc.people import PersonOverrides
from .onrc.search import build_onrc_search
from .amepip.build import build_amepip
from .aep.build import build_aep
from .financials.build import build_financials
from .banipartide.build import build_donations
from .placement.build import build_placement
from .progress import Progress
from .rebuild import (BUILD_SQL, CORE_SQL, DONATIONS_SQL, FINANCIALS_SQL, SQL_DIR, WITHHELD_SQL, AEP_SQL, AMEPIP_SQL, RebuildSummary, _quarter_label,
                      build_entities, build_frameworks, iter_units, load_anaf, load_records, store_data_through, store_sources)
from .rollup import build_rollup
from .search import create_index
from .signals import build_signals
from .sources import SOURCES

REPO_ROOT = Path(__file__).resolve().parents[2]
P = "watchdog/pipeline/"


@dataclass
class BuildContext:
    """What every Step runs on: the inputs of the rebuild, the one connection, and the values Steps hand to later Steps."""
    archive: Archive
    cur: psycopg.Cursor
    conn: psycopg.Connection
    summary: RebuildSummary
    today: date
    progress: Progress | None = None
    staged: bool = False  # each Step commits on its own transaction (a build beside the live graph); False: one transaction for all (--in-place)
    placement_dir: Path | str | None = None
    known_gaps_path: Path | str | None = None
    overrides: Overrides | None = None  # re-read from the identity file, not handed on
    person_overrides: PersonOverrides | None = None
    # Working state of ONE Step, never read by another (a test pins the field list): a value a later Step needs is loaded from the graph by that Step
    # (hand_offs.py), or rebuilt from the archive and the graph, and persisted in build.step by its producer.
    number: int = 0  # units: the last seap.source_file id handed out (starts at max(seap.source_file.id))
    bulk_rows: dict[tuple[str, tuple[int, int]], int] = field(default_factory=dict)  # units' accumulator; persisted in its build.step row, loaded by coverage
    data_through: dict[str, str] = field(default_factory=dict)  # signals: SEAP's dates per Record kind, loaded from core.data_through

    def phase(self, name: str):
        """A timed `rebuild step NAME` start/done pair in the log (progress.py); nothing without a Progress."""
        return self.progress.step(name) if self.progress else nullcontext()


@dataclass(frozen=True)
class Step:
    name: str
    run: Callable[[BuildContext], None]
    reads: tuple[str, ...] = ()  # qualified tables read, that an earlier Step wrote (a table the Step itself fills is not listed as read, nor its own reload of what it wrote before: `units` reloads seap.source_file)
    writes: tuple[str, ...] = ()  # qualified tables the Step puts rows into (indexes and statistics are not tables: see the comments below)
    owns: tuple[str, ...] = ()  # the code only this Step uses (beside SHARED); a file two Steps use is listed under both
    progress: tuple[str, ...] | None = None  # the `rebuild step NAME` names it shows; default (name,); () for none; several: `run` opens them itself
    summary_fields: tuple[str, ...] = ()  # the `RebuildSummary` fields the Step fills: stored in its build.step row (so a later run can print the same output)
    hand_off: Callable[[BuildContext], dict] | None = None  # the row's other values (what is not a summary field); both together are `summary`

    @property
    def progress_names(self) -> tuple[str, ...]:
        return (self.name,) if self.progress is None else self.progress


def _schema(c: BuildContext) -> None:
    c.cur.execute(CORE_SQL.read_text(encoding="utf-8"))
    for source in SOURCES:  # each Source's own schema (sql/<schema>_schema.sql), in registry order
        c.cur.execute((SQL_DIR / f"{source.schema}_schema.sql").read_text(encoding="utf-8"))
    store_sources(c.cur)
    c.cur.execute(WITHHELD_SQL.read_text(encoding="utf-8"))  # after `seap`: its rows hang off seap.record
    c.cur.execute(AMEPIP_SQL.read_text(encoding="utf-8"))  # a Reference source's own tables (#183): not in the registry
    c.cur.execute(AEP_SQL.read_text(encoding="utf-8"))  # AEP's Mandates and Party (#180): after seap (Party per Record joins its Records)
    c.cur.execute(FINANCIALS_SQL.read_text(encoding="utf-8"))  # MF's annual financial statements (#179): a Reference source too
    c.cur.execute(DONATIONS_SQL.read_text(encoding="utf-8"))  # BaniPartide's firm donations (#182): a Reference source too
    c.cur.execute(BUILD_SQL.read_text(encoding="utf-8"))  # the build ledger: build.step (hand-offs and times), written by every Step (run_steps), and build.run
    start_run(c.cur, c.staged)


def _anaf_identities(c: BuildContext) -> None:
    load_anaf(c.cur, c.archive, c.summary)  # its names are read back from core.anaf_company by the Step that needs them (units)
    analyze(c.cur, "core.anaf_company")


def _onrc(c: BuildContext) -> None:
    c.summary.onrc = build_onrc(c.cur, c.archive, c.placement_dir, c.person_overrides)  # #175: the held snapshots -> the `onrc` schema; before the Records, so ONRC can confirm a CUI (ADR 0018)


def _estimates(c: BuildContext) -> None:
    c.summary.estimates = len(read_estimates(c.archive))  # the archived e-licitatie lookups for the counting rule; the rebuild never asks the network (the units re-read them)


def reset_identity(cur: psycopg.Cursor, table: str) -> None:
    """Set the `id` identity sequence of `table` to continue after the rows committed there (max(id) + 1; 1 when empty). A Step that inserts into an
    identity column calls it first: an earlier attempt of the Step that rolled back has still used up some ids (sequences are not transactional)."""
    cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 0) + 1, false) FROM {table}")


def _units(c: BuildContext) -> None:
    """The unit loop: no `rebuild step` name (each unit reports through `progress.unit_done`)."""
    reset_identity(c.cur, "seap.search")  # its ids are the BM25 key field
    c.number = load_last_source_file_id(c.cur)
    estimates = read_estimates(c.archive)  # the same answers the `estimates` Step counted, read again: a Step never relies on another's memory
    names_cur = c.conn.cursor()  # the resolver asks in the middle of the Record load: a cursor of its own
    try:
        resolver = Resolver(OnrcNames(names_cur, load_anaf_names(c.cur)), c.overrides)  # ANAF's names from core.anaf_company, ONRC's from onrc.registration
        _load_units(c, resolver, estimates)
    finally:
        names_cur.close()


def _load_units(c: BuildContext, resolver: Resolver, estimates: dict) -> None:
    for o in iter_units(c.archive, c.summary, c.progress, load_loaded_hashes(c.cur)):
        if o.status == "loaded" and o.unit.stream == "bulk":
            cell = (KINDS[o.unit.kind].label, _parse_quarter(o.unit.unit))
            c.bulk_rows[cell] = max(c.bulk_rows.get(cell, 0), o.rows)
        for name, rows in o.files:
            c.number += 1
            crawled = o.unit.stream == "crawl"  # one source_file per Record kind of a crawled day: `name` is the kind
            c.cur.execute(
                "INSERT INTO seap.source_file (id, kind, unit, file_name, sha256, via, url, fetched_at, row_count, stream, load_notes) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (c.number, name if crawled else KINDS[o.unit.kind].label, o.unit.unit, o.unit.unit if crawled else name,
                 sha256_of(o.unit.path / "manifest.json" if crawled else o.unit.file_path(name)),
                 None if crawled else o.unit.via, None if crawled else o.unit.url, o.unit.fetched_at, len(rows), "backfill" if o.unit.kind == BACKFILL_KIND else o.unit.stream,
                 [aside.note()] if (aside := o.set_aside.get(name)) else []),
            )
            load_records(c.cur, c.number, rows, resolver, estimates)
            c.summary.files_loaded += 1
        if c.progress:
            c.progress.unit_done(o.index, o.total, o.unit.kind, o.unit.unit, len(o.unit.files), o.rows,
                                 sum(len(rows) for _, rows in o.files), o.status, o.reason)


def _crawl_status(c: BuildContext) -> None:
    cur = c.cur
    analyze(cur, "seap.source_file", "seap.record", "seap.search")  # the unit loop filled them; every step from here on reads them
    # crawled survivors: provisional until the bulk has reached their quarter, crawl-only once it has (and they have no match);
    # a backfilled Record (#78) is crawl-only from the start: the bulk does not hold its kind for 2021-22, and for 2023+ it was chosen for missing from it
    cur.execute(
        """UPDATE seap.record r SET crawl_status = CASE WHEN EXISTS (
               SELECT 1 FROM seap.source_file f WHERE f.stream = 'bulk' AND f.kind = r.kind AND f.unit = r.quarter)
           OR (SELECT f.stream FROM seap.source_file f WHERE f.id = r.source_file_id) = 'backfill'
           THEN 'CRAWL_ONLY' ELSE 'PROVISIONAL' END WHERE r.via = 'CRAWL'""")
    for kind, bulk_kind in CRAWLED_KINDS.items():  # per kind: the bulk covers its quarters, the crawl the days after them with no hole
        through = crawl_through(c.archive, CRAWL_KIND, bulk_kind)  # derived from the archive, so a rebuild reproduces it
        if through:
            cur.execute("INSERT INTO seap.crawl_state (stream, kind, through) VALUES (%s, %s, %s)", (CRAWL_KIND, kind, through))
    analyze(cur, "seap.crawl_state", "seap.record")  # the UPDATE above rewrote crawl_status: crawl-badges filters on it


def _crawl_badges(c: BuildContext) -> None:
    # the crawl badges live beside the counting and identity ones on the search rows (the chips filter on them)
    c.cur.execute(
        """UPDATE seap.search s SET badges = s.badges || CASE r.crawl_status WHEN 'PROVISIONAL' THEN 'CRAWLED_PROVISIONAL' ELSE 'CRAWL_ONLY' END
             FROM seap.record r WHERE r.code = s.record_code AND r.crawl_status IS NOT NULL""")


def _frameworks(c: BuildContext) -> None:
    build_frameworks(c.cur)
    c.cur.execute("SELECT count(DISTINCT notice_code) FROM seap.record WHERE load_notes @> ARRAY['estimate:not_fetched']")
    c.summary.estimates_missing = c.cur.fetchone()[0]


def _entities(c: BuildContext) -> None:
    c.summary.onrc = load_onrc_summary(c.cur)  # from the `onrc` row: a missing row raises (hand_offs.MissingHandOff), never "no ONRC entities"
    build_entities(c.cur, c.overrides, c.summary)


def _placement_mf(c: BuildContext) -> None:
    """One Step: mf reads placement's in-memory observations and entries (`summary.placement`), so the two cannot be told apart by a resume."""
    with c.phase("placement"):
        c.summary.placement = build_placement(c.cur, c.archive, c.placement_dir, after_insert=build_onrc_placement)  # #67: county, UAT, village, national, from the archive and the checked-in tables
        analyze(c.cur, "core.county", "core.uat", "core.placement")
    with c.phase("mf"):
        c.summary.mf = build_mf(c.cur, c.archive, c.placement_dir, c.summary.placement.observations, c.summary.placement.entries)  # #80: the Ministry of Finance list, the Coverage denominator
        analyze(c.cur, "core.mf_principal", "core.mf_snapshot", "core.mf_entity")


def _amepip(c: BuildContext) -> None:
    c.summary.amepip = build_amepip(c.cur, c.archive)  # #183: AMEPIP's public enterprises, flagged by CUI on the entities
    analyze(c.cur, "amepip.snapshot", "amepip.enterprise")


def _aep(c: BuildContext) -> None:
    c.summary.aep = build_aep(c.cur, c.archive, c.placement_dir)  # #180: Mandates, Leadership gaps, subordinate bodies, Party per Record (after placement and the MF list)


def _financials(c: BuildContext) -> None:
    c.summary.financials = build_financials(c.cur, c.archive)  # #179: MF's annual statements, one row per CUI per fiscal year; read beside the awards, never added to them
    analyze(c.cur, "financials.source_file", "financials.statement")


def _donations(c: BuildContext) -> None:
    c.summary.donations = build_donations(c.cur, c.archive)  # #182: BaniPartide's firm donors and lenders by CUI; context beside an entity, never a Party or a Signal
    analyze(c.cur, "donations.source_file", "donations.donation")


def _coverage(c: BuildContext) -> None:
    set_aside = load_set_aside(c.cur, c.archive.root)  # the units' hand-offs, from their build.step row
    cells = build_coverage(c.cur, c.archive, c.today, load_bulk_rows(c.cur), c.known_gaps_path)
    c.summary.coverage = flagged_cells(cells)
    gaps = {(x.kind, x.quarter) for x in cells if x.state == "KNOWN_GAP"}
    c.summary.set_aside_without_gap = [path for path, _ in set_aside
                                       if (KINDS[path.parts[-4]].label, _quarter_label(path.parts[-3])) not in gaps]


def _signals(c: BuildContext) -> None:
    c.cur.execute("SELECT count(*) FROM seap.record")
    c.summary.records = c.cur.fetchone()[0]
    store_data_through(c.cur)  # SEAP and ONRC are final here; the signals and the status file take SEAP's dates
    c.data_through = load_data_through(c.cur)
    c.summary.signals = build_signals(c.cur, c.data_through)  # #74: before the rollup and the index, so has-Signals, the rollup and the scan agree
    analyze(c.cur, "seap.search")  # placement, aep and signals rewrote its county, party and has_signals columns: the rollup groups by them


def _record_indexes(c: BuildContext) -> None:
    # the entity(key) roles look a record up by authority and a search row by supplier: index after the load, not during it
    c.cur.execute("CREATE INDEX record_authority_key_idx ON seap.record (authority_key)")
    c.cur.execute("CREATE INDEX search_supplier_key_idx ON seap.search (supplier_key)")
    c.cur.execute("CREATE INDEX record_notice_code_idx ON seap.record (notice_code) WHERE framework_role IS NOT NULL")
    analyze(c.cur, "seap.record")


def _rollup(c: BuildContext) -> None:
    build_rollup(c.cur)  # the empty and chips-only states read this; it carries the load generation the API's cache checks


def _search_index(c: BuildContext) -> None:
    create_index(c.cur)  # the pg_search index is part of this transaction: search sees the load only once it commits


def _analyze_search(c: BuildContext) -> None:
    analyze(c.cur, "seap.search")


def _onrc_search(c: BuildContext) -> None:
    reset_identity(c.cur, "onrc.search")
    c.summary.onrc_search = build_onrc_search(c.cur)  # #176: after the SEAP search table (it reads who is a SEAP counterparty); its BM25 index is in this transaction too


def _commit(c: BuildContext) -> None:
    """Nothing to run: the Step's own transaction commits (a staged build), or the one outer transaction (--in-place), right after run_steps wrote its row."""


# Code every Step depends on: a change here is a change to every Step (the resume gate treats it as belonging to all of them).
# Caveat: the closure test does not follow the imports of SHARED files, so Step code that lives in rebuild.py or build_steps.py (load_records, iter_units,
# build_entities, the Step bodies) must have the files it uses listed by hand under the Step that runs it.
SHARED = (
    P + "__init__.py", P + "build_steps.py", P + "rebuild.py", P + "analyze.py", P + "archive.py", P + "counting.py", P + "fold.py",
    P + "identity.py", P + "identity_overrides.toml", P + "progress.py", P + "hand_offs.py", P + "build_ledger.py", P + "sources.py", P + "sole_trader.py", P + "fetch.py",
    P + "sql/",  # the schema files: each Step's tables are created by the first Step, so a change to any is a change to all
    P + "bulk/", P + "crawl/",  # the Record parsers and the crawl unit directories: read by the schema-independent loaders of several Steps
)

# Code a build never runs (the verbs, the benchmarks, the refresh run), or runs only after the commit (the vacuum and the outlines in `geo/`):
# a change here does not touch the graph a Step builds.
OUTSIDE_THE_BUILD = (
    P + "__main__.py", P + "cli.py", P + "acceptance.py", P + "acceptance_cli.py", P + "backup.py", P + "bench.py", P + "bench_onrc.py",
    P + "bench_onrc_queries.json", P + "bench_queries.json", P + "datagov.py", P + "placement_cli.py", P + "seap_status.py", P + "switchover.py",
    P + "validate.py", P + "refresh/", P + "geo/",
)

# Code several Steps run: listed under each of them, with what it imports (the declarations test checks the closure).
_PLACEMENT = (P + "placement/", P + "anaf.py")
_ONRC = (P + "onrc/", *_PLACEMENT)  # onrc/build.py reads the gazetteer from placement/
_MF = (P + "mf/", *_PLACEMENT)

# The progress names are the ones the status file and the tests have always shown; the unit loop has none (`progress=()`).
STEPS: tuple[Step, ...] = (
    # fresh build only: it drops and recreates every schema. The DDL creates every table; `writes` lists the table it fills.
    Step("schema", _schema, writes=("core.source", "build.run", "build.step")),  # build.run (its one row) and build.step: the schema Step creates them; every Step writes its own row (run_steps)
    Step("anaf-identities", _anaf_identities, writes=("core.anaf_company",), owns=(P + "anaf.py",), summary_fields=("anaf_found", "anaf_not_found")),
    Step("onrc", _onrc, owns=_ONRC, reads=("core.anaf_company",), hand_off=lambda c: onrc_hand_off(c.summary.onrc),
         writes=("onrc.snapshot", "onrc.status_span", "onrc.name_span", "onrc.registration", "onrc.caen", "onrc.status_name", "onrc.coverage_cell",
                 "onrc.role", "onrc.person", "onrc.possible_match", "onrc.person_override")),
    Step("estimates", _estimates, owns=(P + "estimates.py",), summary_fields=("estimates",)),
    Step("units", _units, progress=(), owns=(P + "estimates.py", P + "search.py", P + "coverage/", *_ONRC),  # estimates.py: the counting rule; search.py: value_bucket; coverage/: parse_quarter (bulk_rows); onrc/: OnrcNames
         hand_off=lambda c: units_hand_off(c.summary.files_loaded, c.bulk_rows, c.summary.duplicate_files, c.summary.set_aside, c.summary.quarantined,
                                           c.summary.incomplete, c.archive.root),
         reads=("core.anaf_company", "onrc.registration"),  # the resolver confirms a CUI by ANAF's answers, then the register's
         writes=("seap.source_file", "seap.record", "seap.search", "withheld.natural_person_name")),
    Step("crawl-status", _crawl_status, reads=("seap.source_file",), writes=("seap.record", "seap.crawl_state")),
    Step("crawl-badges", _crawl_badges, reads=("seap.record",), writes=("seap.search",)),
    Step("frameworks", _frameworks, reads=("seap.record",), writes=("seap.framework",), summary_fields=("estimates_missing",)),
    Step("entities", _entities, owns=_ONRC, hand_off=lambda c: entities_hand_off(c.summary.entities, c.summary.onrc),
         reads=("build.step", "seap.search", "seap.record", "seap.source_file", "core.anaf_company", "onrc.registration", "onrc.snapshot"), writes=("core.entity", "core.alias")),
    Step("placement-mf", _placement_mf, progress=("placement", "mf"), owns=(*_PLACEMENT, *_MF, *_ONRC), summary_fields=("placement", "mf"),
         reads=("seap.record", "core.anaf_company", "core.entity", "onrc.registration", "onrc.snapshot"),
         writes=("core.county", "core.uat", "core.placement", "seap.search", "core.mf_principal", "core.mf_snapshot", "core.mf_entity")),
    Step("amepip", _amepip, owns=(P + "amepip/", *_MF), summary_fields=("amepip",), reads=("core.entity",), writes=("amepip.snapshot", "amepip.enterprise")),
    Step("aep", _aep, owns=(P + "aep/", *_MF), summary_fields=("aep",),
         reads=("core.county", "core.uat", "core.entity", "core.placement", "core.mf_principal", "seap.record"),
         writes=("aep.snapshot", "aep.mandate", "aep.gap", "aep.authority", "aep.record_party", "aep.subordinate", "seap.search")),
    Step("financials", _financials, owns=(P + "financials/", *_MF), summary_fields=("financials",), writes=("financials.source_file", "financials.statement")),
    Step("donations", _donations, owns=(P + "banipartide/",), summary_fields=("donations",), reads=("core.entity", "onrc.registration"), writes=("donations.source_file", "donations.donation")),
    Step("coverage", _coverage, owns=(P + "coverage/",), summary_fields=("coverage", "set_aside_without_gap"), reads=("build.step", "seap.record", "seap.crawl_state"), writes=("seap.coverage_cell",)),
    Step("signals", _signals, owns=(P + "signals/", P + "aep/", *_MF), summary_fields=("records", "signals"),
         reads=("seap.record", "seap.search", "seap.framework", "core.anaf_company", "core.entity", "onrc.registration", "onrc.caen", "onrc.status_name",
                "onrc.status_span", "onrc.role", "aep.mandate", "aep.record_party", "donations.donation", "financials.source_file",
                "financials.statement", "amepip.enterprise"),
         writes=("core.data_through", "seap.signal", "seap.signal_member", "seap.signal_rule", "seap.search")),
    # creates indexes on seap.record and seap.search (no rows written)
    Step("record-indexes", _record_indexes, reads=("seap.record", "seap.search")),
    Step("rollup", _rollup, owns=(P + "rollup.py",), reads=("seap.search",),
         writes=("seap.rollup_cube", "seap.rollup_entity", "seap.rollup_prefix", "seap.rollup_meta")),
    Step("search-index", _search_index, owns=(P + "search.py",), reads=("seap.search",)),  # creates the seap.search_bm25 index
    Step("analyze-search", _analyze_search, reads=("seap.search",)),  # statistics only
    Step("onrc-search", _onrc_search, owns=_ONRC, summary_fields=("onrc_search",),
         reads=("seap.record", "seap.search", "onrc.registration", "onrc.status_span", "onrc.name_span", "onrc.caen", "onrc.status_name", "onrc.snapshot"),
         writes=("onrc.search",)),
    Step("commit", _commit),
)


def step_summary(step: Step, ctx: BuildContext) -> dict:
    """What the Step stores in its `build.step` row: the `RebuildSummary` fields it fills and its `hand_off` values."""
    root = ctx.archive.root
    out = {name: encode(getattr(ctx.summary, name), root) for name in step.summary_fields}
    if step.hand_off:
        out.update(step.hand_off(ctx))
    return out


def run_steps(ctx: BuildContext, steps: tuple[Step, ...] = STEPS) -> None:
    """Run the Steps in order on the context's one connection, each in its own explicit transaction. A staged build (beside the live graph) commits
    after every Step, with the Step's `build.step` row; otherwise one outer transaction holds them all, so each Step's block is a savepoint and the
    commit is the outer block's exit. The last Step also marks the build complete (build_ledger.finish_run). A Step with one progress name runs inside
    that timed phase; a Step with several (placement-mf) or none (units) announces them itself."""
    if ctx.staged:
        _run_each(ctx, steps)
    else:
        with ctx.conn.transaction():
            _run_each(ctx, steps)


def _run_each(ctx: BuildContext, steps: tuple[Step, ...]) -> None:
    for ordinal, step in enumerate(steps):
        names = step.progress_names
        with ctx.phase(names[0]) if len(names) == 1 else nullcontext():  # the commit of a staged Step is inside its phase
            with ctx.conn.transaction():
                started = now()
                step.run(ctx)
                write_step(ctx.cur, step.name, ordinal, step_summary(step, ctx))
                stamp_step(ctx.cur, step.name, started)
                analyze(ctx.cur, "build.step")  # the entities and coverage Steps look rows up in it
                if ordinal == len(steps) - 1:
                    finish_run(ctx.cur)


def expand(patterns: tuple[str, ...], root: Path = REPO_ROOT) -> set[Path]:
    """The files a list of `owns` / `SHARED` entries names: a file, or every file under a directory entry (trailing `/`)."""
    files: set[Path] = set()
    for pattern in patterns:
        path = root / pattern
        if pattern.endswith("/"):
            files.update(p for p in path.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc")
        else:
            files.add(path)
    return files


def owners_of(path: str | Path, steps: tuple[Step, ...] = STEPS, root: Path = REPO_ROOT) -> set[str]:
    """The names of the Steps a changed file (repo-relative or absolute) belongs to: every Step for a SHARED file, none for one outside the build."""
    file = (root / path).resolve()
    if file in {p.resolve() for p in expand(SHARED, root)}:
        return {s.name for s in steps}
    return {s.name for s in steps if file in {p.resolve() for p in expand(s.owns, root)}}
