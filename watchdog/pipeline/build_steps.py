"""The rebuild as an ordered list of Steps (spec #285, ticket #290).

A `Step` declares its name, a run function on a shared `BuildContext`, the tables it reads and writes, and the code it owns. `STEPS` is the
order the rebuild runs them in; `rebuild()` (rebuild.py) only opens the connection and calls `run_steps`. What the later tickets read from here:

- #291 commits after every Step and writes the Step's ledger row in the same transaction: the place is `run_steps` (marked there).
- #295's resume gate asks `owners_of(path)` which Steps a changed file belongs to. `SHARED` files belong to every Step.
- Values one Step hands to a later one live on the `BuildContext` (marked "hand-off" below). Persisting them, so a resumed build can reload them,
  is the next change; a Step reads them from the context only, so that is the one place that changes.

The Steps still run in ONE transaction (the connection of the context); nothing commits until the `commit` Step.

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
from .bulk import KINDS
from .coverage import build_coverage, flagged as flagged_cells
from .coverage import parse_quarter as _parse_quarter
from .crawl import KIND as CRAWL_KIND
from .crawl.unitdir import CRAWLED_KINDS, BACKFILL_KIND, contiguous_through as crawl_through
from .estimates import read_estimates
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
from .rebuild import (CORE_SQL, DONATIONS_SQL, FINANCIALS_SQL, SQL_DIR, WITHHELD_SQL, AEP_SQL, AMEPIP_SQL, RebuildSummary, _quarter_label,
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
    placement_dir: Path | str | None = None
    known_gaps_path: Path | str | None = None
    overrides: Overrides | None = None  # re-read from the identity file, not handed on
    person_overrides: PersonOverrides | None = None
    # hand-offs: a Step writes it, a later Step reads it (not yet persisted)
    anaf_names: dict[str, str] = field(default_factory=dict)  # anaf-identities -> units (the resolver)
    names_cur: psycopg.Cursor | None = None  # onrc -> units, entities (the resolver's own cursor, closed by entities)
    resolver: Resolver | None = None  # onrc -> units
    estimates: dict = field(default_factory=dict)  # estimates -> units (re-read from the archive, not data of the graph)
    number: int = 0  # units: the last seap.source_file id handed out
    bulk_rows: dict[tuple[str, tuple[int, int]], int] = field(default_factory=dict)  # units -> coverage: (kind, quarter) -> data rows of the largest bulk unit
    data_through: dict[str, str] = field(default_factory=dict)  # signals -> the status file (SEAP's dates per Record kind)

    def phase(self, name: str):
        """A timed `rebuild step NAME` start/done pair in the log (progress.py); nothing without a Progress."""
        return self.progress.step(name) if self.progress else nullcontext()


@dataclass(frozen=True)
class Step:
    name: str
    run: Callable[[BuildContext], None]
    reads: tuple[str, ...] = ()  # qualified tables read, that an earlier Step wrote (a table the Step itself fills is not listed as read)
    writes: tuple[str, ...] = ()  # qualified tables the Step puts rows into (indexes and statistics are not tables: see the comments below)
    owns: tuple[str, ...] = ()  # the code only this Step uses (beside SHARED); a file two Steps use is listed under both
    progress: tuple[str, ...] | None = None  # the `rebuild step NAME` names it shows; default (name,); () for none; several: `run` opens them itself

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


def _anaf_identities(c: BuildContext) -> None:
    c.anaf_names = load_anaf(c.cur, c.archive, c.summary)
    analyze(c.cur, "core.anaf_company")


def _onrc(c: BuildContext) -> None:
    c.summary.onrc = build_onrc(c.cur, c.archive, c.placement_dir, c.person_overrides)  # #175: the held snapshots -> the `onrc` schema; before the Records, so ONRC can confirm a CUI (ADR 0018)
    c.names_cur = c.conn.cursor()
    c.resolver = Resolver(OnrcNames(c.names_cur, c.anaf_names), c.overrides)


def _estimates(c: BuildContext) -> None:
    c.estimates = read_estimates(c.archive)  # the archived e-licitatie lookups for the counting rule; the rebuild never asks the network
    c.summary.estimates = len(c.estimates)


def _units(c: BuildContext) -> None:
    """The unit loop: no `rebuild step` name (each unit reports through `progress.unit_done`)."""
    for o in iter_units(c.archive, c.summary, c.progress):
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
            load_records(c.cur, c.number, rows, c.resolver, c.estimates)
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
    build_entities(c.cur, c.overrides, c.summary)
    c.names_cur.close()  # the resolver's cursor: the units are loaded


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
    cells = build_coverage(c.cur, c.archive, c.today, c.bulk_rows, c.known_gaps_path)
    c.summary.coverage = flagged_cells(cells)
    gaps = {(x.kind, x.quarter) for x in cells if x.state == "KNOWN_GAP"}
    c.summary.set_aside_without_gap = [path for path, _ in c.summary.set_aside
                                       if (KINDS[path.parts[-4]].label, _quarter_label(path.parts[-3])) not in gaps]


def _signals(c: BuildContext) -> None:
    c.cur.execute("SELECT count(*) FROM seap.record")
    c.summary.records = c.cur.fetchone()[0]
    c.data_through = store_data_through(c.cur)  # SEAP and ONRC are final here; the signals and the status file take SEAP's dates
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
    c.summary.onrc_search = build_onrc_search(c.cur)  # #176: after the SEAP search table (it reads who is a SEAP counterparty); its BM25 index is in this transaction too


def _commit(c: BuildContext) -> None:
    c.conn.commit()  # what leaving the `with` would do; explicit so the commit is timed


# Code every Step depends on: a change here is a change to every Step (the resume gate treats it as belonging to all of them).
SHARED = (
    P + "__init__.py", P + "build_steps.py", P + "rebuild.py", P + "analyze.py", P + "archive.py", P + "counting.py", P + "fold.py",
    P + "identity.py", P + "identity_overrides.toml", P + "progress.py", P + "sources.py", P + "sole_trader.py", P + "fetch.py",
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
    Step("schema", _schema, writes=("core.source",)),
    Step("anaf-identities", _anaf_identities, writes=("core.anaf_company",), owns=(P + "anaf.py",)),
    Step("onrc", _onrc, owns=_ONRC,
         writes=("onrc.snapshot", "onrc.status_span", "onrc.name_span", "onrc.registration", "onrc.caen", "onrc.status_name", "onrc.coverage_cell",
                 "onrc.role", "onrc.person", "onrc.possible_match", "onrc.person_override")),
    Step("estimates", _estimates, owns=(P + "estimates.py",)),
    Step("units", _units, progress=(),
         reads=("core.anaf_company", "onrc.registration"),  # the resolver confirms a CUI by ANAF's answers, then the register's
         writes=("seap.source_file", "seap.record", "seap.search", "withheld.natural_person_name")),
    Step("crawl-status", _crawl_status, reads=("seap.source_file",), writes=("seap.record", "seap.crawl_state")),
    Step("crawl-badges", _crawl_badges, reads=("seap.record",), writes=("seap.search",)),
    Step("frameworks", _frameworks, reads=("seap.record",), writes=("seap.framework",)),
    Step("entities", _entities, owns=_ONRC,
         reads=("seap.search", "seap.record", "core.anaf_company", "onrc.registration", "onrc.snapshot"), writes=("core.entity", "core.alias")),
    Step("placement-mf", _placement_mf, progress=("placement", "mf"), owns=(*_PLACEMENT, *_MF, *_ONRC),
         reads=("seap.record", "core.anaf_company", "core.entity", "onrc.registration", "onrc.snapshot"),
         writes=("core.county", "core.uat", "core.placement", "seap.search", "core.mf_principal", "core.mf_snapshot", "core.mf_entity")),
    Step("amepip", _amepip, owns=(P + "amepip/", *_MF), reads=("core.entity",), writes=("amepip.snapshot", "amepip.enterprise")),
    Step("aep", _aep, owns=(P + "aep/", *_MF),
         reads=("core.county", "core.uat", "core.entity", "core.placement", "core.mf_principal", "seap.record"),
         writes=("aep.snapshot", "aep.mandate", "aep.gap", "aep.authority", "aep.record_party", "aep.subordinate", "seap.search")),
    Step("financials", _financials, owns=(P + "financials/", *_MF), writes=("financials.source_file", "financials.statement")),
    Step("donations", _donations, owns=(P + "banipartide/",), reads=("core.entity", "onrc.registration"), writes=("donations.source_file", "donations.donation")),
    Step("coverage", _coverage, owns=(P + "coverage/",), reads=("seap.record", "seap.crawl_state"), writes=("seap.coverage_cell",)),
    Step("signals", _signals, owns=(P + "signals/", P + "aep/", *_MF),
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
    Step("onrc-search", _onrc_search, owns=_ONRC,
         reads=("seap.record", "seap.search", "onrc.registration", "onrc.status_span", "onrc.name_span", "onrc.caen", "onrc.status_name", "onrc.snapshot"),
         writes=("onrc.search",)),
    Step("commit", _commit),
)


def run_steps(ctx: BuildContext, steps: tuple[Step, ...] = STEPS) -> None:
    """Run the Steps in order on the context's one connection. A Step with one progress name runs inside that timed phase; a Step with several
    (placement-mf) or none (units) announces them itself."""
    for step in steps:
        names = step.progress_names
        with ctx.phase(names[0]) if len(names) == 1 else nullcontext():
            step.run(ctx)
        # #291: the Step's ledger row (and its commit) go here, in the Step's own transaction.


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
