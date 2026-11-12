# watchdog — public procurement MVP

An entity graph (institutions, companies, later people) built from public sources,
with mandatory provenance for every link. First vertical: public procurement (SEAP).

Full rebuild in one command (empty database + the batches in `data/raw/`): `./run_all.sh`.
The harvester comes in two variants: `connectors/seap_harvest.py` (Python, `pip install -r requirements.txt`), the
reference one, and `connectors/seap_harvest.browser.js` (to paste into the browser console on e-licitatie.ro, if you are
running from a network without direct access). They are not equivalent: when a list query hits the server's result cap
(2,000 direct purchases, 3,000 notices), the .py splits the date range and carries on, while the .js stops with an error
and you have to narrow its date range by hand. The generated viewers: `viewer/brasov.html`, `viewer/timisoara.html` (open them directly in a browser).

```
watchdog/
├── run_all.sh              # rebuild from scratch
├── requirements.txt        # only `requests` (for the harvester); everything else uses psql
├── requirements-dev.txt    # + pytest, for tests/
├── sql/
│   ├── 001_schema.sql      # sources, documents (raw), entities, aliases, edges + typed SEAP tables
│   ├── 002_load_seap.sql   # turns a SEAP JSON batch into document -> entity/edge -> typed tables
│   └── 003_views.sql       # the investigation queries (thresholds, splitting, negotiations, concentration, consortia)
├── connectors/
│   ├── seap_harvest.py     # downloads DA + award notices + contracts for one authority (needs `requests`)
│   └── load_batch.py       # loads the JSON into Postgres and runs the transformation (needs only `psql`)
├── pipeline/               # the explorer's pipeline (raw archive, `rebuild`; see deploy/README.md): `python -m pipeline`
├── tests/                  # pytest: harvester (HTTP stubbed) and loader (throwaway Postgres)
├── data/raw/               # the JSON batches exactly as they came from the source (keep them; they are the evidence)
└── reports/                # the reports produced
```

## Running from scratch

```bash
createdb watchdog
export DATABASE_URL=postgresql://user:pass@localhost/watchdog
psql $DATABASE_URL -f sql/001_schema.sql
python connectors/seap_harvest.py --authority "MUNICIPIUL BRASOV" --from 2024-01-01 --out data/raw/seap_brasov.json
python connectors/load_batch.py --source seap --file data/raw/seap_brasov.json
psql $DATABASE_URL -f sql/003_views.sql
psql $DATABASE_URL -c "SELECT * FROM v_supplier_totals ORDER BY ron_total_share DESC LIMIT 20"
```

For another institution you change only `--authority`. Re-running the same batch does not duplicate data.
Several authorities live in the same database: shared companies are merged automatically by CUI, so the graph
becomes cross-city (see `v_supplier_totals.authority`). Batches already downloaded: Brașov, Timișoara (`data/raw/`).

Viewer per authority:
```bash
python tools/export_graph.py --authority "MUNICIPIUL TIMISOARA" --county Timis --out viewer/timisoara.graph.json
python tools/build_viewer.py --data viewer/timisoara.graph.json --out viewer/timisoara.html --title "Watchdog Timișoara"
```

## Tests

The SEAP Connector's tests live in `tests/`, in two groups. The harvester tests (`tests/test_seap_harvest.py`) stub
the HTTP layer and never call e-licitatie.ro. The loader tests (`tests/test_load_seap.py`) start a throwaway Postgres cluster in a temp directory
(`initdb` + `pg_ctl`, private Unix socket) and are skipped when the Postgres server binaries are missing.

```bash
cd watchdog
python -m venv .venv              # or: uv venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest
```

## The pipeline (explorer)

`pipeline/` is the explorer's pipeline, grown out of this Connector (ADR 0004): `archive.py` is the raw archive (files unchanged under a
dated path, a manifest per unit written last, a quarantine area with a reason file), `fetch.py` downloads a bulk file into it,
`bulk/` reads and validates the DA, DAN, Contracte and "fără anunț de inițiere" bulk files (CSV and XLSX; `headers.py` is the per-quarter header alias table, `values.py` the cell quirks, `records.py` the kind registry), `rebuild.py` derives the `seap` schema from the archive (`sql/seap_schema.sql`) and `progress.py` reports on it.
`datagov.py` is the bulk Connector's fetch half: `python -m pipeline --archive <dir> fetch-datagov [--since-year 2021] [--delay 1]`
finds the `achizitii-publice-YYYY` datasets on data.gov.ro, archives each quarter's DA, DAN, Contracte and "fără anunț de inițiere"
file (kinds `da`, `dan`, `contracte`, `fara-anunt`) with the resource identity in the manifest, skips unchanged resources on later
runs and archives a re-upload as a new dated unit; it prints archived / unchanged / ignored / unclassified / failed.
Run it with `python -m pipeline --archive <dir> rebuild --db <url>`; Docker and the full runbook are in `../deploy/README.md`. The operator's run over the whole national archive is below.
Its tests (`tests/test_pipeline_archive.py`, `tests/test_pipeline_datagov.py`, `tests/test_bulk_loader.py` on `tests/fixtures/archive-bulk/`, rebuilt by `tests/fixtures/build_bulk_archive.py`, with the miniature archive in `tests/fixtures/archive/`) need no database; the
archive -> rebuild -> GraphQL test is in `explorer/packages/api/test/seam1.test.ts`. The legacy JSON-batch loader above is unchanged.

## Operator: fetch for real

Downloads ADR's quarterly SEAP exports (2021 to now) from data.gov.ro into a raw archive kept outside the repo. Fetch only, nothing is loaded.
Size and duration are not measured; expect several GB and tens of minutes to hours (about a second of politeness delay per request).

```bash
cd watchdog
uv venv --python 3.12 .venv && . .venv/bin/activate && uv pip install -r requirements.txt
export PIPELINE_ARCHIVE=~/grivei-data/raw && mkdir -p "$PIPELINE_ARCHIVE"
nohup python -m pipeline fetch-datagov > ~/grivei-data/fetch.log 2>&1 &
```

- Python: `python3 -m venv` fails on hosts where Python 3.14 has no `ensurepip`, so the venv is made with `uv venv --python 3.12` and
  packages go in with `uv pip install -r requirements.txt` (a uv venv has no `pip` unless made with `uv venv --seed`).
- Progress: `tail -f ~/grivei-data/fetch.log`. One timestamped line per resource (`archived` with its size, `unchanged`, `out-of-scope` for kinds we do not want (DPS invitations, initiation notices),
  `unclassified` for names no rule knows, `conflict` when a resource's name and URL name different kinds (it is not archived: look at it),
  `superseded` for the other resources of a quarter whose preferred one (CSV, then XLSX, then XLS; else the newest) is fetched, including older same-format duplicates; a quarter already archived keeps its resource, `failed` with the reason), then the summary (`archived: N ...`). Exit code 1 means at least one failure. `du -sh $PIPELINE_ARCHIVE` shows the size.
- Resume: kill it if you must (`pkill -f 'pipeline fetch-datagov'`) and run the same command again (append with `>>` to keep the log).
  Everything already archived is skipped without a download. A download cut short leaves only a `.download-*` scratch file (removed on the
  next start) or, at worst, a `*.part` file in a unit directory without a manifest; that directory is ignored by `rebuild` and never
  edited, and the file is fetched again into a new `<day>.2` directory. Failed resources are retried by simply rerunning.
- Rerunning later (new quarters, re-uploads) is the same command; changed files are archived beside the old ones.

## Contracts and award notices: identity, precedence, value

Archived kinds `contracte` (Record kind `CONTRACT`) and `fara-anunt` (`AWARD_NOTICE`), loaded like DA and DAN (header eras in `headers.py`, all or nothing per unit, a failing unit is quarantined, exact duplicate rows dropped). ADR 0002 as amended:

- **Code (the public key `seap.record(code)` takes):** a contract is `<award notice code>~<contract number>`, e.g. `CAN1069731~54202` or `CAN1073017~1398514/1` (the number is kept as published, only runs of blanks collapse; `~` never occurs in a notice code, so the first `~` splits it; a number holding `/` or spaces must be percent-encoded in a URL). In the 2025 XLSX files Excel turned many typed numbers into dates, times and floats; they are read with the cell's number format and turned back (`mmm-yy` -> `m/yyyy`, `mm-dd-yy` -> `m/d/yyyy`, `d-mmm` -> `m/d`, `h:mm` -> `h:mm`; note `contract_number:excel_typed`), so a contract recurring from a CSV quarter keeps its code. Known gaps: a float loses trailing zeros (`222.10` reads `222.1`), a two-digit year or zero-padded day typed into a date cannot be told from the full form, and a float of 1e15 or more (scientific `#,##0` cells, `contract_number:excel_mangled`) has lost its digits and may merge distinct contracts of one notice. On the 2025 Q1 Contracte file that is 2,651 float, 1,460 date and 10 time cells out of about 123,000. An award notice from a "fără anunț" file is its notice code alone, `CAN1139746`. DA and DAN keep their public code.
- **One Record per identity, across all quarters:** the rows repeated per lot and per winner collapse into it. Its lots (`lot_count`) and winners are attributes. Winners are stored in the order of their first row in the file (`seap.record.winners`, `Party` list in GraphQL).
- **Precedence:** the version from the most recent notice publication wins (`published_on` is the award notice's publication date). Loading an older file after a newer one changes nothing, so the result does not depend on the order files arrive in. On the same publication date with different content the later file (archive fetch order) wins; identical content changes nothing. A replacement replaces the whole version (its lots and winners, not a merge); Records absent from a re-uploaded file are kept.
- **Value:** counted once when all lots carry the same value (it is repeated on every lot and winner row), summed over lots when the lot values differ; a row without a lot number is a lot of its own; no value on any row is "no value in SEAP". Within one lot the first value is kept and `value:lot_rows_disagree` goes into `load_notes` (about 0.1 % of contracts in 2025 and 2022). An award notice's value is the sum of its contracts' values. Money is integer bani.
- **Kept for the counting rule (#65), not applied here:** `concluded_by` (`Incheiat prin`: `Cu acord cadru` / `Cu acord cadru subsecvent` / `Fara acord cadru`), `notice_code`, `initiation_code`, `procedure`. `counted_bani` still equals the value, so framework ceilings are not yet left out of sums.
- **Dates:** publication (the award notice's) assigns the quarter; the contract date (`Data contract`, earliest among the version's rows) is the award date, falling back to the publication date.
- Header names were checked on the real 2021 T3 and T4 (CSV), 2022 T1 (pipe CSV) and 2025 T1/T2 (XLSX) files, and the fără-anunț 2025 XLSX. Legacy `.xls` files (2021 T1/T2, 2022 T2 to 2023 T1, and the 2023 T1 DA, DAN and fără-anunț files) are read with `xlrd` (every sheet is one file: an export past 65 536 rows spills onto more sheets that repeat the header; a lone title row above the header is skipped; typed cells are rendered back as for the XLSX, see above), and their header names were checked on the real files. `.ods` is still unsupported.

## Operator: rebuild the graph from the archive for real

Loads the whole raw archive (DA, DAN, Contracte, "fără anunț") into the `seap` schema. A rebuild is **rerun from scratch, never resumed** (ADR 0004: the graph is derived from the archive): it drops and recreates schema `seap` and loads everything in one transaction, committed only at the end. If it is killed, loses its connection or fails, the transaction rolls back: the database keeps the previous `seap` schema (or none, on a first run) and nothing is half-loaded. Rerunning the same command starts over and gives the same graph. The one effect that survives a kill is on the archive: a unit that failed validation has already been moved to `<archive>/quarantine/...` (with its `reason.json`), and a rerun does not look at the quarantine. Units are read and loaded one at a time, so memory is about one quarter (the biggest known file, 280 MB of CSV, peaks at about 250 MB; DA quarters of 770k rows about 1.5 GB). While it runs, the transaction holds locks on schema `seap`: the API cannot read `seap` until the commit, so stop the `api` service (or accept that it waits) during a multi-hour run.

```bash
# once, from a worktree of the integration branch
cd watchdog
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
export PIPELINE_ARCHIVE=~/grivei-data/raw        # the raw archive, outside the repo (the same variable `fetch-datagov` uses)
export DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME   # a Postgres/ParadeDB you can reach; its `seap` schema is replaced

nohup python -m pipeline rebuild > ~/grivei-data/rebuild.log 2>&1 &
```

With Docker Compose the database is not published to the host, so use the pipeline container instead (archive mounted from `GRIVEI_ARCHIVE_DIR`, `DATABASE_URL` already set; a unit above 2 GB would need a larger `mem_limit` in `compose.yaml`):

```bash
cd <repo root> && export GRIVEI_ARCHIVE_DIR=~/grivei-data/raw
nohup docker compose run --rm -T pipeline rebuild > ~/grivei-data/rebuild.log 2>&1 &
```

- **Log:** `~/grivei-data/rebuild.log`, one timestamped line per unit, flushed at once (`tail -f` it). Lines look like
  `2026-11-12T10:15:02+0200 rebuild unit 37/412 kind=contracte unit=2023Q2 files=1 rows=124000 records=98000 loaded in 41.2s`,
  or `... rows=0 records=0 skipped (same file already loaded)` or `... quarantined (headers do not match a DA file)`; first `rebuild start units=412 ...`,
  last `rebuild done units=412 loaded=... skipped=... quarantined=... records=... in H:MM:SS`, then the summary lines (the quarantined paths). `rows` are data rows read, `records` the Records they became (duplicates and repeated lots and winners collapse). On failure the last line is `rebuild FAILED after N/M units: <error>; nothing was loaded, rerun from scratch`.
- **Progress:** `python -m pipeline status` (in Compose: `docker compose run --rm pipeline status`) reads the status file, `<archive>/rebuild-progress.json` by default (`--progress-file` or `PIPELINE_PROGRESS_FILE` to move it; it is rewritten through a temporary file and a rename, so it is never half-written). It prints `state: running|finished|failed|interrupted`, `units: 37/412 done (...)`, the unit in progress, the records loaded so far, start and last update, and the last log line. `interrupted` means the file says running but the process is gone (killed): exit code 1, like `failed`. The file records the process id and the host name (the container id in Docker), and a process is only looked for on the same host: from another host or container (a fresh `docker compose run --rm pipeline status`, where every python is pid 1) it prints `running? (cannot see the process from here)` and how long ago the file was last updated (it is written at least once per unit, so a stale time means the rebuild was killed, e.g. out of memory), exit code 0. The quickest check without the CLI: `tail -n 2 ~/grivei-data/rebuild.log`.
- **After a kill or a failure:** nothing to clean up. Look at the last log line or `status`, fix the cause if there is one, and run the same `nohup ...` command again (`>>` appends to the log). Stop a run on purpose with `pkill -f 'pipeline rebuild'` (SIGTERM is turned into a normal failure and rolled back; in Compose, `docker stop` the run container).
- A run that ends `quarantined` units is a normal success; read `<archive>/quarantine/**/reason.json` for why. Fix the header alias (`pipeline/bulk/headers.py`) or the format support, then `pipeline requeue [--match TEXT]` moves the quarantined units (all, or those whose path or reason contains TEXT, e.g. `--match "unsupported file format"`) back into the archive, and the next rebuild reads them again. Units quarantined by an older build because `.xls` was unsupported need `requeue --match "unsupported file format"` once.

## The data model, in brief

| Layer | Tables | Role |
|---|---|---|
| Provenance | `source`, `document`, `import_batch` | what we received, from where, when; `document.raw` is the untouched payload |
| Graph | `entity`, `entity_alias`, `relation_type`, `edge` | the nodes and links; `edge.document_id` is mandatory |
| Typed SEAP | `seap_award_notice`, `seap_contract`, `seap_contract_winner`, `seap_direct_acquisition` | the domain data, with all fields, for precise queries |
| Investigation | `v_*`, `neighbours()` | a watchdog's standard questions |

Entity resolution: companies are identified by CUI (`norm_cui`), then by `seap_entity_id`, then by
normalized name (`norm_company_name`: no diacritics, no SC/SRL/SA). People (from ONRC/ANI) will
need separate rules — there is no public identifier, so matching is on name + context.

## What's next (connectors)

1. **ONRC** — shareholders/directors for every CUI in `entity` → `OWNS_SHARES`, `ADMINISTERS` edges; `person` nodes appear.
2. **Ministerul Finanțelor** (Ministry of Finance) — balance sheets per CUI → `entity.attrs` (turnover, employees) so you can see small companies with large contracts.
3. **ANI** — declarations of interests of local councillors / mayor / directors → `HOLDS_OFFICE`, `DECLARED_INTEREST`.
4. **portal.just.ro** — court cases in which the companies/people appear → `PARTY_IN_CASE`.

The graph's target question: a path of length ≤ 3 between a decision-maker (`HOLDS_OFFICE` at the authority) and
a winning company (`AWARDED_CONTRACT` / `DIRECT_PURCHASE` from the same authority).

## Legal / ethical notes

The data is public, but people's names are personal data: document the purpose (public interest,
journalism), do not publish more than necessary, always keep the link to the source document.
Query results are *signals*, not conclusions — each one must be verified in the original document.

## Visualization

Two tools, with different roles:

- **Exploration** — `tools/export_graph.py` exports the whole graph from Postgres (`viewer/graph.json`), and
  `tools/build_viewer.py` injects it into `viewer/graph.template.html` → `viewer/graph.html`, a
  self-contained page (D3, force layout): hundreds of nodes, filters by link type and money threshold, search, a
  per-entity file with links to the SEAP documents. This is where you start an investigation.
- **Presentation (Archify)** — `tools/export_archify.py` exports a clean sub-graph (≤ ~15 entities) in
  the JSON IR format of [Archify](https://github.com/tt-a1i/archify) (`diagram_type: architecture`):
  the authority, the selected companies (or `--top N`), the consortium groups as `boundaries`, the links labelled
  with money and with the negotiations without publication. Then, on the machine with Archify:
  `node archify/bin/archify.mjs finalize architecture diagrams/brasov-bloc.architecture.json`.
  Archify has strict layout validators (overlaps, labels); it is designed for the agent to fix the
  diagram iteratively, so the export is a first draft, not a final result. This is where you finish an investigation:
  a clean diagram for an article or a formal complaint.
