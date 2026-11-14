# Release recipe

The repeatable steps a **Release** follows to make one more **Source** explorable on the shared graph (vocabulary in `GLOSSARY.md`). SEAP, in Release 1, is the worked example.

Each step is either **generic** (built once and reused) or **Source-supplied** (decided per Source). The recipe is also the charting template: every later Release gets its own wayfinder map, and the Source-supplied steps below become its first tickets.

Decided in [Release recipe: the repeatable steps for adding a Source](https://github.com/george-vrancianu/grivei.ai/issues/34).

## 1. Connector and Raw archive

- **Generic:** the Raw archive and the rule that the graph is rebuildable from it (ADR 0004); the one locked `refresh` run, its ledger, `pipeline status`, alerting, and the three failure classes (transient, deterministic, suspicious success); quarantine and re-run verbs ([Refresh pipeline operations](https://github.com/george-vrancianu/grivei.ai/issues/28)).
- **Source-supplied:** a Connector that meets this contract:
  - fetches into the Raw archive, unchanged and dated, with a manifest per unit (a day, a quarter, a file) written last;
  - loads idempotently from the archive, and supports a full rebuild;
  - adds its own steps to the `refresh` run, each due from its last success and isolated, so one Source failing doesn't block the others;
  - sorts its failures into the three classes, with politeness limits of its own;
  - reports its counts, cursor and data-through dates to `pipeline status`.
- **Ticket:** research the Source's bulk and API options, then decide its seeding scope, time window and refresh cadence.
- **SEAP:** quarterly bulk exports from 2021, plus a nightly crawl of current-quarter award notices, with the bulk superseding the crawl by public code (ADR 0002, [seeding](https://github.com/george-vrancianu/grivei.ai/issues/9)).

## 2. Graph

- **Generic:** a shared core schema: entities, aliases, placement, provenance, Signals, coverage, and the pipeline ledger.
- **Source-supplied:** one Postgres schema of its own (`seap.*`, `onrc.*`) for its typed tables, its denormalised search table and its `pg_search` index. It joins the core only through entity keys.
- **SEAP:** Records (direct purchases, contracts with lots and winners, award notices), with the authority and supplier entities in the core.

## 3. Identity

- **Generic:** the ANAF-confirmed CUI as the key for organisations, name-only entities when that fails, aliases never merging, and the identity override file (ADR 0003).
- **Source-supplied:** an identity ADR in ADR 0003's pattern: how the Source's subjects map onto existing entity keys, and what stays separate.
- **People:** a Source whose subjects are people (ONRC administrators, AEP donors, parties on portal.just.ro) follows this recipe like any other. Its people are shown on the public host only on the public tier; the rest is Restricted to a Private view (ADR 0015).
- **SEAP:** ADR 0003, [Supplier identity](https://github.com/george-vrancianu/grivei.ai/issues/22).

## 4. Reference sources

- A **Reference source** (ANAF, MF's Lista entităților publice, ANCPI, Wikidata, INS's SIRUTA) gets a Connector and a place in the Raw archive, but no search surface and never a Release of its own. It joins through the first Release that needs it.
- **SEAP:** brought in ANAF (placement, identity), Wikidata and ANCPI (points, outlines), and MF's list (the coverage denominator).

## 5. Search surface

- **Generic:** the engine (ParadeDB `pg_search` in the same Postgres, [Search engine](https://github.com/george-vrancianu/grivei.ai/issues/19)); the one-to-one round-trip between the URL and the filter, which the frontend owns; top 50 per tab; "why it matched" highlights; the `Total` type, which states what it left out; offset pagination; persisted queries ([GraphQL schema](https://github.com/george-vrancianu/grivei.ai/issues/33)).
- **Source-supplied:**
  - the denormalised search table and its index;
  - the filter (the `RecordFilter` analogue) and its chips;
  - the namespace `<source> { search, record }` and `entity.<source>`;
  - its **ranking measure** (SEAP: matched RON), its default results tab (SEAP: Suppliers), and its latency target (SEAP: under ~500 ms).
- **Contract:** the search must accept the same plain-text query as every other Source and return a match count and its top results, so the frontend can compose views across Sources. Combined views are grouped by Source and never ranked across Sources (ADR 0005).

## 6. Lenses

- **Generic:** the map of Romania, the National and Unplaced tiles, one lens at a time.
- **Source-supplied:** which lenses it supports. **Coverage is mandatory.** Money applies only to a Source with a money measure. A Source without one declares its own count lens in its Release.
- **SEAP:** Money (default), Coverage, Flow ([Main screen](https://github.com/george-vrancianu/grivei.ai/issues/7)).

## 7. Entity page

- **Generic:** one entity page with three fixed tabs (Overview, Records, Relationships), each with its own URL.
- **Source-supplied:** a section on each tab: a role section on Overview, its records on Records (behind a Source switch, with its own filter), and its edges on Relationships. An entity with nothing in a Source shows nothing for it. The page is never reorganised per Source.
- **SEAP:** [SEAP authority and supplier views](https://github.com/george-vrancianu/grivei.ai/issues/8).

## 8. Data caveats and Signals

- **Generic:** the methodology page structure, the badge enum (which doubles as filter chips), and the Signal shape (a set of Records reproduced by a filter URL, counted, never scored).
- **Source-supplied:**
  - a **data caveats** ticket, **mandatory** even if it finds nothing: what is summed or counted, what is left out, and which badges and methodology sections follow;
  - **Signal rules**, optional: each has its own methodology section with its time window and how often it fires nationally.
- **Signal rules across Sources:** a rule that needs several Sources belongs to the **later** of the Releases it needs, and gets its own methodology section.
- **SEAP:** [Data caveats](https://github.com/george-vrancianu/grivei.ai/issues/23), [Signal definitions](https://github.com/george-vrancianu/grivei.ai/issues/24).

## 9. Coverage

- **Generic:** the Coverage lens and `/explore/coverage` page, the four coverage statuses, the known-gap grid, the Unplaced tile, and the data-through dates per Source × record kind ([Coverage lens](https://github.com/george-vrancianu/grivei.ai/issues/26)).
- **Source-supplied:**
  - a **placement rule**: what puts one of its records in a county (SEAP: the contracting authority; ONRC: the registered seat; portal.just.ro: the court seat); records that can't be placed go to the Unplaced tile;
  - its known-gap rules;
  - its record kinds, and the grid's period (a quarter for SEAP, possibly something else elsewhere);
  - data-through dates per record kind;
  - a denominator for "N of M", or a statement that there is none.

## 10. Landing-page status

- The Source's row on the landing page is `wip` from the moment its Release's map is charted, and `live` only when it is publicly explorable (at Go-live or after). A finished but local Release stays `wip`.

## 11. Definition of done

A Release is done when:

- a full rebuild from the Raw archive succeeds with the Source in it;
- its Coverage shows on the Coverage lens and page;
- its methodology sections exist;
- its search meets its own latency target;
- all of its user-facing copy is bilingual (EN default, RO at `/ro/`);
- its refresh steps have run unattended for a week with no alert.

Release 1's own run of this list (the real rebuild, the latency benchmark, the validation fixture, the unattended week) is in [release-1-runbook.md](release-1-runbook.md).

Release 2's run of it (ONRC and its Reference sources, the Party-filtered search, the Restricted check) is in [release-2-runbook.md](release-2-runbook.md).

## First reuse (Release 2 only)

The second Source is the first to reuse the generic parts, so Release 2 also builds, once:

- the Source picker beside the search bar, with match counts per Source;
- the Source switch on the Records tab;
- the Source selector on the Coverage lens and page;
- a `sources` registry: name, record kinds, lenses, placement rule, methodology anchor, and landing-page row (`watchdog/pipeline/sources.py`; the rebuild stores it as `core.source`, and `sources`, `coverage(source)` and `pipeline status` read it through the API adapters in `explorer/packages/api/src/sources.ts`. A new Source adds an entry, its own `sql/<schema>_schema.sql` and an adapter, and `tests/test_sources_registry.py` checks its landing-page row, because `site/` is static HTML);
- the move of SEAP's tables into a `seap` schema.

Later Releases skip this section.
