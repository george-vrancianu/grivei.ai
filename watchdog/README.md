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
`da_bulk.py` parses a direct-purchase bulk file, `rebuild.py` derives the `seap` schema from the archive (`sql/seap_schema.sql`).
`datagov.py` is the bulk Connector's fetch half: `python -m pipeline --archive <dir> fetch-datagov [--since-year 2021] [--delay 1]`
finds the `achizitii-publice-YYYY` datasets on data.gov.ro, archives each quarter's DA, DAN, Contracte and "fără anunț de inițiere"
file (kinds `da`, `dan`, `contracte`, `fara-anunt`) with the resource identity in the manifest, skips unchanged resources on later
runs and archives a re-upload as a new dated unit; it prints archived / unchanged / ignored / unclassified / failed.
Run the loader with `python -m pipeline --archive <dir> rebuild --db <url>`; Docker and the full runbook are in `../deploy/README.md`.
Its tests (`tests/test_pipeline_archive.py`, `tests/test_pipeline_datagov.py`, with the miniature archive in `tests/fixtures/archive/`) need no database; the
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

- Python: `python3 -m venv` fails on this machine (no `ensurepip` for Python 3.14), so the venv is made with `uv venv --python 3.12` and
  packages go in with `uv pip install -r requirements.txt` (plain `pip` inside the venv also works once it exists).
- Progress: `tail -f ~/grivei-data/fetch.log`. One timestamped line per resource (`archived` with its size, `unchanged`, `out-of-scope` for kinds we do not want (DPS invitations, initiation notices),
  `unclassified` for names no rule knows, `conflict` when a resource's name and URL name different kinds (it is not archived: look at it),
  `superseded` for the XLS of a quarter whose CSV is fetched, `failed` with the reason), then the summary (`archived: N ...`). Exit code 1 means at least one failure. `du -sh $PIPELINE_ARCHIVE` shows the size.
- Resume: kill it if you must (`pkill -f 'pipeline fetch-datagov'`) and run the same command again (append with `>>` to keep the log).
  Everything already archived is skipped without a download. A download cut short leaves only a `.download-*` scratch file (removed on the
  next start) or, at worst, a `*.part` file in a unit directory without a manifest; that directory is ignored by `rebuild` and never
  edited, and the file is fetched again into a new `<day>.2` directory. Failed resources are retried by simply rerunning.
- Rerunning later (new quarters, re-uploads) is the same command; changed files are archived beside the old ones.

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
