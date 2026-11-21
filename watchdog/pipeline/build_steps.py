"""The rebuild as an ordered list of Steps (spec #285, ticket #290).

A `Step` declares its name, a run function on a shared `BuildContext`, the tables it reads and writes, and the code it owns. `STEPS` is the
order the rebuild runs them in; `rebuild()` (rebuild.py) only opens the connection and calls `run_steps`. What the rest of the build reads from here:

- A staged build commits after every Step and writes the Step's ledger row in the same transaction (`run_steps`); build_ledger.py holds the ledger.
- A Step may commit in pieces inside itself (`Step.segments`, run outside the Step's transaction: the `onrc` Step commits per ONRC snapshot, #294; the `units` Step per Raw archive unit with its `build.unit` row, #293); its `run` then finishes the Step in the Step's transaction.
- A resumed build (`run_steps(..., resume=True)`, decided by resume.py before the Steps run) skips the committed Steps and restores what they reported
  (hand_offs.restore_summary); the Steps that remain load their hand-offs from the graph as in an uninterrupted run. No Step may therefore be run twice.
- #295's resume gate asks `owners_of(path)` which Steps a changed file belongs to (resume.decide). `SHARED` files, and files no declaration claims, belong to every Step.
- Values one Step hands to a later one are persisted: `run_steps` writes the Step's `build.step` row when it finishes (its `hand_off`, or the
  `RebuildSummary` fields in `summary_fields`), and a consumer Step loads what it needs from the database (hand_offs.py), never from a variable of the
  Step that produced it. The `BuildContext` fields marked "hand-off" are working state inside a Step or loaded at the start of the Step that reads them.

Otherwise (plain --in-place) the Steps run in ONE transaction and nothing commits until the last Step's.

Paths in `owns`, `SHARED` and `OUTSIDE_THE_BUILD` are relative to the `pipeline/` package directory (`pins.PACKAGE`; the image has no repo around it): a file, or a
directory with a trailing `/` (everything under it)."""
from __future__ import annotations

from contextlib import nullcontext
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Callable

import psycopg

from .analyze import analyze, local_work_mem
from .archive import QUARANTINE_DIR, Archive, sha256_of
from .build_ledger import finish_run, now, resume_run, stamp_step, start_run
from .bulk import KINDS
from .coverage import build_coverage, flagged as flagged_cells
from .coverage import parse_quarter as _parse_quarter
from .crawl import KIND as CRAWL_KIND
from .crawl.unitdir import CRAWLED_KINDS, BACKFILL_KIND, contiguous_through as crawl_through
from .estimates import read_estimates
from .hand_offs import (entities_hand_off, encode, load_anaf_names, load_bulk_rows, load_data_through, load_last_source_file_id, load_loaded_hashes,
                        load_onrc_summary, load_set_aside, onrc_hand_off, units_hand_off, write_step)
from .hand_offs import committed_steps, restore_summary
from .hand_offs import UnitRow, load_units, restore_units, set_aside_json, unit_counts, write_unit
from .identity import Overrides, Resolver
from .mf.build import build_mf
from .onrc.build import OnrcNames, build_onrc_placement, build_onrc_snapshots, finish_onrc
from .onrc.people import PersonOverrides
from .onrc.search import build_onrc_search
from .amepip.build import build_amepip
from .aep.build import build_aep
from .financials.build import build_financials
from .banipartide.build import build_donations
from .placement.build import build_placement
from .pins import PACKAGE, Pins, files_under
from .progress import Progress
from .rebuild import (BUILD_SQL, CORE_SQL, DONATIONS_SQL, FINANCIALS_SQL, SQL_DIR, WITHHELD_SQL, AEP_SQL, AMEPIP_SQL, RebuildSummary, _quarter_label,
                      build_entities, build_frameworks, iter_units, load_anaf, load_records, store_data_through, store_sources)
from .rollup import build_rollup
from .search import create_index
from .search_rows import write_search
from .signals import build_signals, restricted_slugs
from .sources import SOURCES
from .stop import pause_point

P = ""  # the declarations below are package-relative (see the module doc); `P +` stays so a path reads as a package path


@dataclass
class BuildContext:
    """What every Step runs on: the inputs of the rebuild, the one connection, and the values Steps hand to later Steps."""
    archive: Archive
    cur: psycopg.Cursor
    conn: psycopg.Connection
    summary: RebuildSummary
    today: date
    progress: Progress | None = None
    staged: bool = False  # each Step commits on its own transaction, and the `units` Step each unit (a build beside the live graph); False: one transaction for all (--in-place)
    placement_dir: Path | str | None = None
    known_gaps_path: Path | str | None = None
    overrides: Overrides | None = None  # re-read from the identity file, not handed on
    person_overrides: PersonOverrides | None = None
    pins: Pins | None = None  # the pinned inputs of the run (pins.py): written into build.run by the schema Step
    # Working state of ONE Step, never read by another (a test pins the field list): a value a later Step needs is loaded from the graph by that Step
    # (hand_offs.py), or rebuilt from the archive and the graph, and persisted in build.step by its producer.
    number: int = 0  # units: the last seap.source_file id handed out (starts at max(seap.source_file.id))
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
    segments: Callable[[BuildContext], None] | None = None  # work that commits in pieces of its own, run before `run` and outside the Step's transaction: a staged build commits each piece (and a rerun after a kill continues from the next one); in-place the pieces are savepoints of the one transaction. `run` finishes the Step in its transaction
    work_mem: str | None = None  # `work_mem` for the Step's own statements (SET LOCAL, in its transaction, put back when it ends: analyze.local_work_mem); None = the server's. The index builds of search-index and record-indexes use maintenance_work_mem (the session's), not this
    vacuum: tuple[str, ...] = ()  # qualified tables `VACUUM ANALYZE`d right after the Step commits, staged builds only (beside or `--in-place --staged`) (VACUUM cannot run inside the one in-place transaction)

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
    start_run(c.cur, c.staged, c.pins)


def _anaf_identities(c: BuildContext) -> None:
    load_anaf(c.cur, c.archive, c.summary)  # its names are read back from core.anaf_company by the Step that needs them (units)
    analyze(c.cur, "core.anaf_company")


# `work_mem` of the heavy Steps (per sort or hash node, and each parallel worker gets its own; the db container has 12 GiB, shared_buffers 3 GB).
# Sorts and hash aggregates over the whole register or the whole `seap.search` get 512 MB; the Steps whose statements are smaller get 256 MB.
ONRC_WORK_MEM = "512MB"  # the span anti-joins over the whole register's history (the span primary keys are index builds: maintenance_work_mem); the reader's aggregates (onrc-search)
BIG_WORK_MEM = "512MB"  # rollup: GROUP BY over every seap.search row; search-rows: one INSERT ... SELECT joining four tables with an aggregate
MEDIUM_WORK_MEM = "256MB"  # entities: GROUP BYs over the parties; signals: the ORDER BY of each rule's query


def _onrc_snapshots(c: BuildContext) -> None:
    c.summary.onrc = build_onrc_snapshots(c.cur, c.archive, work_mem=ONRC_WORK_MEM)  # #294: one transaction (a commit, staged) per snapshot, outside the Step's own transaction


def _onrc(c: BuildContext) -> None:
    c.summary.onrc = finish_onrc(c.cur, c.summary.onrc, c.placement_dir, c.person_overrides)  # #175: the held snapshots -> the `onrc` schema; before the Records, so ONRC can confirm a CUI (ADR 0018)


def _estimates(c: BuildContext) -> None:
    c.summary.estimates = len(read_estimates(c.archive))  # the archived e-licitatie lookups for the counting rule; the rebuild never asks the network (the units re-read them)


def reset_identity(cur: psycopg.Cursor, table: str) -> None:
    """Set the `id` identity sequence of `table` to continue after the rows committed there (max(id) + 1; 1 when empty). A Step that inserts into an
    identity column calls it first: an earlier attempt of the Step that rolled back has still used up some ids (sequences are not transactional)."""
    cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 0) + 1, false) FROM {table}")


def _units_end(c: BuildContext) -> None:
    """Nothing to run in the Step's own transaction: the unit loop (`_units`, the Step's segments) has committed every unit; the row follows."""


def _units(c: BuildContext) -> None:
    """The unit loop: no `rebuild step` name (each unit reports through `progress.unit_done`). Each unit commits with its `build.unit` row (staged builds),
    so a resumed Step finds the units already committed in that table and continues from the next one (#293)."""
    reset_identity(c.cur, "seap.search_load")  # its ids become the BM25 key field: a unit that rolled back has used some up
    c.number = load_last_source_file_id(c.cur)  # the committed units' last id (a rolled-back unit's ids were never committed)
    recorded = load_units(c.cur)
    restore_units(c.summary, recorded, c.archive.root)  # what the committed units reported: the lists the loop goes on appending to
    for row in recorded:
        if row.quarantined_to:  # recorded quarantined: finish a move that a kill left pending, and count it as quarantined for this build
            c.archive.complete_quarantine(Path(row.path), row.reason or "", row.problems)
    for unit_dir in c.summary.quarantined:
        c.archive.add_pinned_quarantine(unit_dir)
    estimates = read_estimates(c.archive)  # the same answers the `estimates` Step counted, read again: a Step never relies on another's memory
    names_cur = c.conn.cursor()  # the resolver asks in the middle of the Record load: a cursor of its own
    try:
        names = OnrcNames(names_cur, load_anaf_names(c.cur))
        resolver = Resolver(names, c.overrides)  # ANAF's names from core.anaf_company, ONRC's from onrc.registration
        _load_units(c, resolver, estimates, recorded, names)
    finally:
        names_cur.close()


def _load_units(c: BuildContext, resolver: Resolver, estimates: dict, recorded: list[UnitRow], names: OnrcNames) -> None:
    root = c.archive.root
    for o in iter_units(c.archive, c.summary, c.progress, load_loaded_hashes(c.cur), recorded):
        rel = o.unit.path.relative_to(root).as_posix()
        loaded_files = 0
        names.prefetch(resolver.asked_cuis(r for _, rows in o.files for r in rows))  # the unit's CUIs in one statement: resolving its Records asks nothing
        with c.conn.transaction():  # the unit's own transaction (a savepoint inside the one in-place transaction): its rows and its build.unit row commit together
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
                loaded_files += 1
            bulk = (KINDS[o.unit.kind].label, _parse_quarter(o.unit.unit)) if o.status == "loaded" and o.unit.stream == "bulk" else None
            moved_to = (Path(QUARANTINE_DIR) / rel).as_posix() if o.status == "quarantined" else None
            write_unit(c.cur, UnitRow(
                o.index, rel, (c.pins.units if c.pins else {}).get(rel), o.status, o.total, o.reason, len(o.unit.files), o.rows, sum(len(rows) for _, rows in o.files),
                loaded_files, bulk, encode(o.duplicate_files, root), set_aside_json([(o.unit.file_path(n), a) for n, a in o.set_aside.items()], root), moved_to, o.problems))
        if c.progress:  # after the commit: the line says the unit is durable
            c.progress.unit_done(o.index, o.total, o.unit.kind, o.unit.unit, len(o.unit.files), o.rows,
                                 sum(len(rows) for _, rows in o.files), o.status, o.reason)
        if c.staged:
            pause_point(c.cur, f"after unit {o.index}/{o.total} ({o.unit.kind} {o.unit.unit})")


def _crawl_status(c: BuildContext) -> None:
    cur = c.cur
    analyze(cur, "seap.source_file", "seap.record", "seap.search_load")  # the unit loop filled them; every step from here on reads them
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
    analyze(cur, "seap.crawl_state", "seap.record")  # the UPDATE above rewrote crawl_status: `search-rows` joins it into the badges


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
    set_aside = load_set_aside(c.cur, c.archive.root)  # the units' hand-offs, from build.unit
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


def _record_indexes(c: BuildContext) -> None:
    # the entity(key) roles look a record up by authority, and the Signals' queries look a search row (a load row, until `search-rows`) up by supplier: index after the load, not during it, before the Signals
    c.cur.execute("CREATE INDEX record_authority_key_idx ON seap.record (authority_key)")
    c.cur.execute("CREATE INDEX search_load_supplier_key_idx ON seap.search_load (supplier_key)")  # seap.search gets its own, after it is written (`search-rows`)
    c.cur.execute("CREATE INDEX record_notice_code_idx ON seap.record (notice_code) WHERE framework_role IS NOT NULL")
    analyze(c.cur, "seap.record")


def _search_rows(c: BuildContext) -> None:
    # #305: seap.search written once, with the placement, Party, Signal and crawl columns joined in; the load table goes
    write_search(c.cur, restricted_slugs())
    reset_identity(c.cur, "seap.search")  # the identity continues after the copied ids


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
    P + "identity.py", P + "identity_overrides.toml", P + "progress.py", P + "stop.py", P + "hand_offs.py", P + "build_ledger.py", P + "sources.py", P + "sole_trader.py", P + "fetch.py",
    P + "sql/",  # the schema files: each Step's tables are created by the first Step, so a change to any is a change to all
    P + "pins.py",  # the pinned inputs build_ledger.start_run writes into build.run
    P + "bulk/", P + "crawl/",  # the Record parsers and the crawl unit directories: read by the schema-independent loaders of several Steps
)

# Code a build never runs (the verbs, the benchmarks, the refresh run), or runs only after the commit (the vacuum and the outlines in `geo/`):
# a change here does not touch the graph a Step builds.
OUTSIDE_THE_BUILD = (
    P + "__main__.py", P + "cli.py", P + "acceptance.py", P + "acceptance_cli.py", P + "backup.py", P + "bench.py", P + "bench_onrc.py",
    P + "bench_onrc_queries.json", P + "bench_queries.json", P + "datagov.py", P + "placement_cli.py", P + "seap_status.py", P + "switchover.py",
    P + "validate.py", P + "refresh/", P + "geo/",
    P + "resume.py",  # the resume decision: made before any Step runs
)

# Code several Steps run: listed under each of them, with what it imports (the declarations test checks the closure).
_PLACEMENT = (P + "placement/", P + "anaf.py")
# onrc/ file by file: onrc/search.py (the onrc-search Step's BM25 index) belongs to that Step alone, so a fix there resumes after every Step before it (#295).
# rebuild.py (SHARED) imports its `SearchSummary` and the post-commit `vacuum`; `build_onrc_search` is imported by build_steps.py for the onrc-search body alone.
# None of it runs in another Step.
_ONRC = (*(P + f"onrc/{name}.py" for name in ("__init__", "build", "fetch", "people", "read", "status")), *_PLACEMENT)  # onrc/build.py reads the gazetteer from placement/
_ONRC_SEARCH = (P + "onrc/__init__.py", P + "onrc/search.py")
_MF = (P + "mf/", *_PLACEMENT)

# The progress names are the ones the status file and the tests have always shown; the unit loop has none (`progress=()`).
STEPS: tuple[Step, ...] = (
    # fresh build only: it drops and recreates every schema. The DDL creates every table; `writes` lists the table it fills.
    Step("schema", _schema, writes=("core.source", "build.run", "build.step")),  # build.run (its one row) and build.step: the schema Step creates them; every Step writes its own row (run_steps)
    Step("anaf-identities", _anaf_identities, writes=("core.anaf_company",), owns=(P + "anaf.py",), summary_fields=("anaf_found", "anaf_not_found")),
    Step("onrc", _onrc, segments=_onrc_snapshots, owns=_ONRC, reads=("core.anaf_company",), hand_off=lambda c: onrc_hand_off(c.summary.onrc),
         writes=("build.snapshot", "onrc.snapshot", "onrc.status_span", "onrc.name_span", "onrc.registration", "onrc.caen", "onrc.status_name", "onrc.coverage_cell",
                 "onrc.role", "onrc.person", "onrc.possible_match", "onrc.person_override"),
         vacuum=("onrc.status_span", "onrc.name_span", "onrc.registration", "onrc.caen"), work_mem=ONRC_WORK_MEM),  # the visibility map for onrc-search's index-only scans (the span tables are insert-only now, #304; registration has one dead version per CUI's primary registration)
    Step("estimates", _estimates, owns=(P + "estimates.py",), summary_fields=("estimates",)),
    Step("units", _units_end, segments=_units, progress=(), owns=(P + "estimates.py", P + "search.py", P + "coverage/", *_ONRC),  # estimates.py: the counting rule; search.py: value_bucket; coverage/: parse_quarter (bulk_rows); onrc/: OnrcNames
         hand_off=lambda c: units_hand_off(c.summary.files_loaded, c.summary.incomplete, c.archive.root, c.summary.units_total),
         reads=("core.anaf_company", "onrc.registration"),  # the resolver confirms a CUI by ANAF's answers, then the register's
         writes=("seap.source_file", "seap.record", "seap.search_load", "withheld.natural_person_name", "build.unit")),
    Step("crawl-status", _crawl_status, reads=("seap.source_file",), writes=("seap.record", "seap.crawl_state")),
    Step("frameworks", _frameworks, reads=("seap.record",), writes=("seap.framework",), summary_fields=("estimates_missing",)),
    Step("entities", _entities, owns=_ONRC, hand_off=lambda c: entities_hand_off(c.summary.entities, c.summary.onrc),
         reads=("build.step", "seap.search_load", "seap.record", "seap.source_file", "core.anaf_company", "onrc.registration", "onrc.snapshot"), writes=("core.entity", "core.alias"), work_mem=MEDIUM_WORK_MEM),
    Step("placement-mf", _placement_mf, progress=("placement", "mf"), owns=(*_PLACEMENT, *_MF, *_ONRC), summary_fields=("placement", "mf"),
         reads=("seap.record", "core.anaf_company", "core.entity", "onrc.registration", "onrc.snapshot"),
         writes=("core.county", "core.uat", "core.placement", "core.mf_principal", "core.mf_snapshot", "core.mf_entity")),
    Step("amepip", _amepip, owns=(P + "amepip/", *_MF), summary_fields=("amepip",), reads=("core.entity",), writes=("amepip.snapshot", "amepip.enterprise")),
    Step("aep", _aep, owns=(P + "aep/", *_MF), summary_fields=("aep",),
         reads=("core.county", "core.uat", "core.entity", "core.placement", "core.mf_principal", "seap.record"),
         writes=("aep.snapshot", "aep.mandate", "aep.gap", "aep.authority", "aep.record_party", "aep.subordinate")),
    Step("financials", _financials, owns=(P + "financials/", *_MF), summary_fields=("financials",), writes=("financials.source_file", "financials.statement")),
    Step("donations", _donations, owns=(P + "banipartide/",), summary_fields=("donations",), reads=("core.entity", "onrc.registration"), writes=("donations.source_file", "donations.donation")),
    Step("coverage", _coverage, owns=(P + "coverage/",), summary_fields=("coverage", "set_aside_without_gap"), reads=("build.step", "build.unit", "seap.record", "seap.crawl_state"), writes=("seap.coverage_cell",)),
    # creates indexes on seap.record and seap.search_load (no rows written): before the Signals, whose per-authority and per-supplier queries use them
    Step("record-indexes", _record_indexes, reads=("seap.record", "seap.search_load")),
    Step("signals", _signals, owns=(P + "signals/", P + "aep/", *_MF), summary_fields=("records", "signals"),
         reads=("seap.record", "seap.search_load", "seap.framework", "core.anaf_company", "core.entity", "onrc.registration", "onrc.caen", "onrc.status_name",
                "onrc.status_span", "onrc.role", "aep.mandate", "aep.record_party", "donations.donation", "financials.source_file",
                "financials.statement", "amepip.enterprise"),
         writes=("core.data_through", "seap.signal", "seap.signal_member", "seap.signal_rule"), work_mem=MEDIUM_WORK_MEM),
    # after placement, aep and the Signals: seap.search is written here and nowhere else, then the load table is dropped (the rows of a table written once need no vacuum before the rollup)
    Step("search-rows", _search_rows, owns=(P + "search_rows.py", P + "signals/", P + "aep/", *_MF),  # signals/: which rules are Restricted (restricted_slugs); the rest is what that package imports, as for the signals Step
         reads=("seap.search_load", "seap.record", "core.placement", "aep.record_party", "aep.mandate", "seap.signal", "seap.signal_member"), writes=("seap.search",), work_mem=BIG_WORK_MEM),
    Step("rollup", _rollup, owns=(P + "rollup.py",), reads=("seap.search",),
         writes=("seap.rollup_cube", "seap.rollup_entity", "seap.rollup_prefix", "seap.rollup_meta"), work_mem=BIG_WORK_MEM),
    Step("search-index", _search_index, owns=(P + "search.py",), reads=("seap.search",)),  # creates the seap.search_bm25 index
    Step("analyze-search", _analyze_search, reads=("seap.search",)),  # statistics only
    Step("onrc-search", _onrc_search, owns=_ONRC_SEARCH, summary_fields=("onrc_search",),
         reads=("seap.record", "seap.search", "onrc.registration", "onrc.status_span", "onrc.name_span", "onrc.caen", "onrc.status_name", "onrc.snapshot"),
         writes=("onrc.search",), work_mem=ONRC_WORK_MEM),
    Step("commit", _commit),
)


def step_summary(step: Step, ctx: BuildContext) -> dict:
    """What the Step stores in its `build.step` row: the `RebuildSummary` fields it fills and its `hand_off` values."""
    root = ctx.archive.root
    out = {name: encode(getattr(ctx.summary, name), root) for name in step.summary_fields}
    if step.hand_off:
        out.update(step.hand_off(ctx))
    return out


def run_steps(ctx: BuildContext, steps: tuple[Step, ...] = STEPS, *, resume: bool = False) -> None:
    """Run the Steps in order on the context's one connection, each in its own explicit transaction. A staged build (beside the live graph) commits
    after every Step, with the Step's `build.step` row; otherwise one outer transaction holds them all, so each Step's block is a savepoint and the
    commit is the outer block's exit. The last Step also marks the build complete (build_ledger.finish_run). A Step with one progress name runs inside
    that timed phase; a Step with several (placement-mf) or none (units) announces them itself.

    `resume` (a staged build into a next database that already holds committed Steps, resume.py): the committed Steps are skipped, never run twice
    (the schema Step would drop the graph, `search-rows` would find its load table already dropped), and what they reported is restored into `ctx.summary`.
    The hand-offs the remaining Steps need are loaded from the graph by those Steps, as in an uninterrupted run."""
    start = 0
    if resume:
        start = committed_steps(ctx.cur, steps)
        restore_summary(ctx.cur, ctx.summary, steps[:start], ctx.archive.root)
        for unit_dir in ctx.summary.quarantined:  # the units the committed `units` Step moved: quarantined as far as this build is concerned (Coverage flags their cells)
            ctx.archive.add_pinned_quarantine(unit_dir)
        if ctx.progress and ctx.summary.units_total:  # the `units` Step is committed: its progress counters come from build.unit
            ctx.progress.resumed(ctx.summary.units_total, ctx.archive.root, unit_counts(load_units(ctx.cur)))
        if ctx.staged:
            resume_run(ctx.cur)  # an earlier run may have paused it
            if ctx.progress and start:
                ctx.progress.committed(steps[start - 1].name)  # the step reached counts what the earlier run committed: a pause or a kill before this run's first commit names it
        if start and ctx.staged:  # a kill between that Step's commit and its VACUUM skipped it: speed only, so it is simply run again (the graph and the ledger do not change)
            _vacuum_after(ctx, steps[start - 1])
    if ctx.staged:
        _run_each(ctx, steps, start)
    else:
        with ctx.conn.transaction():  # the commit phase line (the `commit` Step) ends before this COMMIT: only a staged Step's commit is inside its timed phase
            _run_each(ctx, steps, start)


def _run_each(ctx: BuildContext, steps: tuple[Step, ...], start: int = 0) -> None:
    for ordinal, step in enumerate(steps):
        if ordinal < start:
            continue
        names = step.progress_names
        with ctx.phase(names[0]) if len(names) == 1 else nullcontext():  # the commit of a staged Step is inside its phase
            if step.segments:
                started = now()
                step.segments(ctx)  # its pieces commit as they finish (staged); the ledger row below is still the Step's
            with ctx.conn.transaction():
                started = started if step.segments else now()
                with local_work_mem(ctx.cur, step.work_mem):
                    step.run(ctx)
                write_step(ctx.cur, step.name, ordinal, step_summary(step, ctx))
                stamp_step(ctx.cur, step.name, started)
                analyze(ctx.cur, "build.step")  # the entities and coverage Steps look rows up in it
                if ordinal == len(steps) - 1:
                    finish_run(ctx.cur)
        if ctx.staged:  # the connection is autocommit: the Step has committed and no transaction block is open
            if ctx.progress:
                ctx.progress.committed(step.name)
            _vacuum_after(ctx, step)
            if ordinal < len(steps) - 1:
                pause_point(ctx.cur, f"after step {step.name}")  # the next Step has not begun


def _vacuum_after(ctx: BuildContext, step: Step) -> None:
    """The Step's declared tables, vacuumed and analyzed between committed Steps so the next scan reads a compact heap. Not a Step: no ledger row. A failure fails the build."""
    if not step.vacuum:
        return
    with ctx.phase(f"vacuum {step.name}"):
        for table in step.vacuum:
            ctx.cur.execute(f"VACUUM ANALYZE {table}")


def expand(patterns: tuple[str, ...], root: Path = PACKAGE) -> set[Path]:
    """The files a list of `owns` / `SHARED` entries names under `root` (the package directory): a file, or every file under a directory entry (trailing `/`)."""
    files: set[Path] = set()
    for pattern in patterns:
        path = root / pattern
        if pattern.endswith("/"):
            files.update(files_under(path))
        else:
            files.add(path)
    return files


def _claims(patterns: tuple[str, ...], path: str) -> bool:
    return any(path == p or (p.endswith("/") and path.startswith(p)) for p in patterns)


def owners_of(path: str, steps: tuple[Step, ...] = STEPS) -> set[str]:
    """The names of the Steps a changed code file belongs to. `path` is package-relative and posix (a key of `Pins.code_files`), and is matched against the
    declarations as text, not on disk: it works in the image (no repo around the package) and for a file that was deleted. Nothing for a file outside the
    build; every Step for a SHARED file, for one no declaration claims, and for an outside input (`extra:...`): the conservative answer."""
    owners = {s.name for s in steps if _claims(s.owns, path)}
    if owners and not _claims(SHARED, path):
        return owners  # a Step's file wins over OUTSIDE_THE_BUILD: an overlap must never hide it (the declarations test forbids one anyway)
    if _claims(OUTSIDE_THE_BUILD, path) and not owners:
        return set()
    return {s.name for s in steps}
