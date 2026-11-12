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
`bulk/` reads and validates the DA, DAN, Contracte and "fără anunț de inițiere" bulk files (CSV and XLSX; `headers.py` is the per-quarter header alias table, `values.py` the cell quirks, `records.py` the kind registry), `rebuild.py` derives the `seap` schema (`pipeline/sql/seap_schema.sql`) and the shared core's entity tables (`pipeline/sql/core_schema.sql`) from the archive, `identity.py` holds the supplier identity rules (ADR 0003), `anaf.py` is the ANAF Reference source connector and `progress.py` reports on a rebuild. `crawl/` is the crawl Connector (`pipeline crawl`, below): `client.py` (the e-licitatie client: Referer, delay, retries), `core.py` (one unit of notices and contracts), `unitdir.py` (its archive layout, manifest last, the cursor), `run.py` (which days), `progress.py` (log and status) and `records.py` (crawled days into Records at rebuild); `backfill.py` and `backfill_progress.py` are `pipeline backfill` (below), the one-off 2021-22 and 2023-today backfill on the same core.
`datagov.py` is the bulk Connector's fetch half: `python -m pipeline --archive <dir> fetch-datagov [--since-year 2021] [--delay 1]`
finds the `achizitii-publice-YYYY` datasets on data.gov.ro, archives each quarter's DA, DAN, Contracte and "fără anunț de inițiere"
file (kinds `da`, `dan`, `contracte`, `fara-anunt`) with the resource identity in the manifest, skips unchanged resources on later
runs and archives a re-upload as a new dated unit; it prints archived / unchanged / ignored / unclassified / failed.
Run it with `python -m pipeline --archive <dir> rebuild --db <url>`; Docker and the full runbook are in `../deploy/README.md`. The operator's run over the whole national archive is below.
Its tests (`tests/test_crawl.py` for the crawl with HTTP stubbed and a fake clock, `tests/test_crawl_records.py` on `tests/fixtures/archive-crawl/` rebuilt by `tests/fixtures/build_crawl_archive.py`, `tests/test_pipeline_archive.py`, `tests/test_pipeline_datagov.py`, `tests/test_bulk_loader.py` on `tests/fixtures/archive-bulk/`, rebuilt by `tests/fixtures/build_bulk_archive.py`, with the miniature archive in `tests/fixtures/archive/`) need no database; the
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

Loads the whole raw archive (DA, DAN, Contracte, "fără anunț" and the crawled days) into the `seap` schema. A rebuild is **rerun from scratch, never resumed** (ADR 0004: the graph is derived from the archive): it drops and recreates schema `seap` and the core's entity tables (`core.entity`, `core.alias`, `core.anaf_company`: identities from the archived ANAF answers, see "Supplier identity") and loads everything in one transaction, committed only at the end. If it is killed, loses its connection or fails, the transaction rolls back: the database keeps the previous `seap` schema (or none, on a first run) and nothing is half-loaded. Rerunning the same command starts over and gives the same graph. The one effect that survives a kill is on the archive: a unit that failed validation has already been moved to `<archive>/quarantine/...` (with its `reason.json`), and a rerun does not look at the quarantine. Units are read and loaded one at a time, so memory is about one quarter (the biggest known file, 280 MB of CSV, peaks at about 250 MB; DA quarters of 770k rows about 1.5 GB). While it runs, the transaction holds locks on schema `seap`: the API cannot read `seap` until the commit, so stop the `api` service (or accept that it waits) during a multi-hour run.

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

## Crawled Records: identity, precedence, provenance

`pipeline crawl` (below) archives e-licitatie award notices (CAN, SCNA and the other notice types the award-notice list returns) and their contracts, one directory per crawl day: `<archive>/seap/crawl/award-notices/<day>/<fetch day>/{notices-<from>_<to>-p0000.json, contracts-<caNoticeId>-s00000.json, manifest.json}`. `pipeline rebuild` reads the complete days (ADR 0004) and loads Records:

- **Kind and identity** (the same as the bulk's, so the two meet): a notice with an initiation procedure (`procedureId` set) becomes one CONTRACT Record per contract number, `<notice code>~<contract number>`, value from `defaultCurrencyContractValue` (RON, exact decimals, integer bani; distinct contracts sharing a number add and are flagged `value:contracts_share_number`); a notice without one (`procedureId` null: negociere fara publicare, norme proprii, procedura simplificata proprie) becomes one AWARD_NOTICE Record, `CAN...`, its value the sum of its contracts, as the "fara anunt de initiere" files do, so no money is counted twice. A notice with no contracts yields nothing. Direct purchases are not crawled.
- **Dates:** the notice's publication date (`noticeStateDate`) assigns the quarter; the contract date is the award date (earliest of the notice's contracts for an award notice), falling back to the publication date.
- **Provenance:** `via` crawl (`Provenance.kind = CRAWL`, `via` null: no file title), `fetchedAt` from the day's manifest, `sysNoticeTypeId` / `sysNoticeVersionId` and the internal id (`caNoticeId`) from the list row (columns of `seap.record`), and the public e-licitatie URL built at load time from the type and version (`pipeline/crawl/records.py::notice_url`; a type without a known route has no URL).
- **Bulk vs crawl:** a bulk Record always supersedes a crawled Record of the same identity, whatever the dates and the order the files were fetched in; a crawled Record never replaces a bulk one. Among crawled versions (a re-crawled day) the later publication wins, a tie going to the later fetch. A crawled Record the bulk does not have stays and counts, and is tagged: `CRAWLED_PROVISIONAL` when no bulk file of its kind (Contracte for CONTRACT, "fara anunt" for AWARD_NOTICE) and quarter is loaded, `CRAWL_ONLY` when one is. Both are RecordBadges.
- **Data-through (`sources`, `pipeline status`):** per Record kind, the latest publication date of the bulk Records (crawled Records' own dates do not count); for CONTRACT and AWARD_NOTICE at least the end of the unbroken run of complete crawl days that starts the day after the kind's last bulk quarter (Contracte for CONTRACT, "fara anunt" for AWARD_NOTICE; with no bulk file, at the first complete crawl day). A crawled day that brought nothing new still means "looked through that day"; a hole after that start stops the date before it, while a day the bulk covers is never a hole. Derived from the archive at every rebuild.

## Operator: crawl e-licitatie for real

Fetch only, nothing is loaded; unattended, resumable. Needs the raw archive directory (the same as `fetch-datagov`) and network access to e-licitatie.ro, no database. **Tests never run it against the real service**; this section is for the operator.

```bash
# once, from a worktree of the integration branch
cd watchdog
uv venv --python 3.12 .venv && uv pip install -r requirements.txt
# optional: PIPELINE_CRAWL_START=2025-07-01 (where a first run with no cursor starts), PIPELINE_CRAWL_DELAY=0.35 (seconds between requests)

# explicit venv python and --archive, so the command (and a later `status`) works from any shell
nohup .venv/bin/python -m pipeline --archive ~/grivei-data/raw crawl >> ~/grivei-data/crawl.log 2>&1 &
.venv/bin/python -m pipeline --archive ~/grivei-data/raw status
```

- **What it crawls.** With no range: the days from the **cursor** (the last day with a complete manifest, derived from the archive) minus a trailing re-crawl of the 3 days ending at the cursor (late publications and edited notices appear days later) up to yesterday. A trailing day already re-crawled today is skipped, so one run a day re-crawls once. With **no cursor yet** it starts at `--start` / `PIPELINE_CRAWL_START`, else at the first day after the latest quarter whose Contracte bulk file is archived (the quarters the bulk has not reached; with no such file at all it stops and asks for `--start`). `--from YYYY-MM-DD --to YYYY-MM-DD` crawls an explicit range instead (the core #78's backfill calls): days already complete are skipped, `--force` fetches them again. `--delay S` sets the pause between requests (default 0.35 s). A re-crawl of a complete day is a new dated fetch directory beside the old one (the archive is never edited in place); the load upserts by Record identity, the later version winning.
- **Cost.** About 220 notices per weekday nationally: one list request per day, then one contracts request per notice. A quarter is roughly 14,000 requests, about 2 to 3 hours at the default delay; the five quarters after 2025 Q2 are a run of the order of 10 hours. It goes day by day, so the log and `status` show how far it is.
- **Log:** `~/grivei-data/crawl.log`, one timestamped line per page or batch, flushed at once (`tail -f` it): `... crawl start from=2025-07-01 to=2026-11-11 days=500 (cursor none) archive=... pid=...`, `... crawl day 2026-10-03 notices page 1 window=2026-10-03..2026-10-03 rows=812/812`, `... crawl day 2026-10-03 contracts 25/812 notices`, `... crawl retry 1/3 <what>: <error>` (a transient error, 5 s then 10 s then 15 s back-off), `... crawl day 2026-10-03 notices=812 pages=1 contracts=1290 archived=<path> in 368.0s`, `... crawl day 2026-10-04 skipped (complete)`, and at the end `... crawl done days=500 crawled=498 skipped=2 notices=... contracts=... cursor=2026-11-11 in H:MM:SS`. On failure the last line is `... crawl FAILED day 2026-10-31: <reason>; cursor stays at 2026-10-30, rerun to resume` and the exit code is 1 (2 when it could not even start, e.g. no start day).
- **Progress:** `python -m pipeline status` (in Compose: `docker compose run --rm --no-deps pipeline status`) prints the rebuild's status and then the crawl's: `crawl cursor: 2026-11-10 (the last day with a complete manifest; N complete day(s) in the archive)`, `crawled through (archive, not yet rebuilt): CONTRACT ..., AWARD_NOTICE ...` (per kind, the end of the unbroken run of complete days; the cursor may be further), `missing day(s) below the cursor (<kind>): ...` when there are holes (per kind, days the bulk covers are not listed), and the last run from `<archive>/crawl-progress.json` (`--progress-file` or `PIPELINE_CRAWL_PROGRESS_FILE` to move it; rewritten through a temporary file and a rename): state `running` / `finished` / `failed` / `interrupted` (the file says running but the process is gone), days done, notices and contracts so far, the day in progress and the last log line. Quickest check without the CLI: `tail -n 2 ~/grivei-data/crawl.log`. After a rebuild, `status` also prints the data-through date per Record kind as `sources` serves it.
- **After a kill or a failure:** nothing to clean up; run the same `nohup ...` command again. Every file is written under a `.part` name and renamed, and a day's manifest is written last, so a killed day has no manifest: it is not complete, the cursor does not move past it, and a rebuild ignores it (it is listed as "skipped, incomplete"). The rerun skips the complete days and resumes the interrupted day from the files already in its directory (only the missing requests are sent); a leftover directory from an earlier day is not resumed into a re-crawl. The run stops at the first day that fails (it never completes a later day past a hole), so fix the cause (the log says which request) and rerun. The exception is the trailing re-crawl of a day that is already complete: if it fails the log says `re-crawl FAILED ... the earlier fetch stands`, the run goes on to the new days and still exits 1. A failed re-crawl leaves an incomplete directory beside the complete one; it is never resumed later and every rebuild lists it as "skipped, incomplete" (harmless). Stop it on purpose with `pkill -f 'pipeline crawl'` (SIGTERM becomes a normal failure line).
- **A day over the cap.** The list is capped at 3,000 rows per query; a wider window is split in halves automatically, but a single day over the cap fails the day (never a silent truncation). Nobody has seen one: about 220 notices per weekday.
- **With rebuild.** The crawl only writes the raw archive. `python -m pipeline rebuild` (see above) then loads the crawled days together with the bulk files, from the archive alone: run it after a crawl to see the crawled Records, and again whenever bulk files arrive; the result does not depend on the order the files were fetched in. The rebuild never calls the network.
- **Unreadable days.** A crawled day that fails validation at rebuild (not JSON, a row without its id) is quarantined whole like a bulk unit, with its `reason.json`; the data-through date stops before it, `status` lists it under `missing day(s)`, and the nightly catch-up does not go back for a hole in the middle: re-crawl it with `--from D --to D`. `--to` must be before today (a day still being published is never marked complete).
- **In Compose:** `docker compose run --rm -T --no-deps pipeline crawl` (archive from `GRIVEI_ARCHIVE_DIR`; the 2 GB `mem_limit` is plenty: a day is a few MB). Use `nohup ... &` as above.

## Operator: backfill 2021-22 and the 2023-today leftovers

`pipeline backfill` (spec #30) is a **one-off**, resumable job on the same crawl core, politeness and archive writing as the nightly crawl (above). Fetch only, nothing is loaded; no database. **Tests never run it against the real service**; this section is for the operator. It fills what neither the bulk files nor the nightly crawl hold:

- **Pass `2021-22`** (2021-01-01 .. 2022-12-31, 105 weeks): the national award-notice list, one query per week (a week over the 3,000-row cap is split in halves by the core), keeping **only rows with `procedureId` null** (negociere fara publicare prealabila, norme proprii (Anexa 2), procedura simplificata proprie: contracts awarded without a prior call), then one contracts call per kept notice. Every list response is archived as it came, the contracts responses of the kept notices only.
- **Pass `2023-today`** (2023-01-01 ..., whole weeks that are over): the notices the 2023+ bulk files should hold but do not (notices re-dated after an edit, about 0.3%): rows whose **award notice code** (`noticeNo`) is in neither the 2021-22 backfill nor any 2023+ `contracte` / `fara-anunt` bulk file of the raw archive; their contracts are then fetched. Matching is decided against the raw archive (ADR 0004), never the database: the bulk files are read the way a rebuild reads them (a file that fails validation counts as absent). A Record's identity is the notice code (award notice) or `<notice code>~<contract number>` (contract), and both begin with the notice code, so a notice is "in the bulk" when its code is. **A week is only listed when the bulk can answer for it**: both bulk kinds (`contracte` and `fara-anunt`) must be archived for the quarters of its first and last day. Other weeks are logged as `waiting (no bulk archived for contracte 2023Q2, ...)` and cost no request: weeks beyond the last archived bulk quarter belong to the nightly crawl (#77), which this job does not duplicate; weeks in a quarter whose bulk is not archived yet are done by a later run once `fetch-datagov` has brought the file. (Matching is against the 2023+ files only, as the spec says; a re-dated notice that is already in a 2021-22 bulk file is crawled once more and the bulk wins at load.)

```bash
# once, from a worktree of the integration branch (venv as for the crawl)
cd watchdog
uv venv --python 3.12 .venv && uv pip install -r requirements.txt
# optional: PIPELINE_CRAWL_DELAY=0.35 (seconds between requests, shared with the crawl), PIPELINE_BACKFILL_PROGRESS_FILE (status file)

# explicit venv python and --archive, so the command (and a later status) works from any shell
nohup .venv/bin/python -m pipeline --archive ~/grivei-data/raw backfill >> ~/grivei-data/backfill.log 2>&1 &
.venv/bin/python -m pipeline --archive ~/grivei-data/raw backfill --status
```

`--pass 2021-22` or `--pass 2023-today` runs one pass (default: both, in that order; the 2023-today pass first reads the 2023+ bulk files, a few minutes). The archive path is the existing `PIPELINE_ARCHIVE` / `--archive`, outside the repo.

- **Cost.** 2021-22: about 210 list requests plus about 30,000 contracts requests (~1,100 notices per week, a part of them without a procedure). One request at a time with at least 0.35 s between starts, so 3 hours is the floor; with the service's own latency plan for **6 to 10 hours**. 2023-today: about 2 list requests per eligible week (about 40 eligible weeks with the quarters archived now, up to ~260 with every quarter) and a few hundred to a thousand contracts requests: under an hour.
- **Log:** `~/grivei-data/backfill.log`, timestamped lines flushed at once (`tail -f` it, no progress bars): `... backfill start passes=2021-22,2023-today weeks=222 to_do=222 archive=... pid=...`, `... backfill pass 2021-22 weeks=105 (complete 0, waiting for bulk 0, to do 105)`, per page and batch `... backfill unit 2021-04-05 notices page 1 window=2021-04-05..2021-04-11 rows=812/812`, `... backfill unit 2021-04-05 contracts 25/37 notices`, `... backfill retry 1/3 <what>: <error>` (a transient error: 5xx, 429, timeout, connection error; back-off 5 s, 10 s, 15 s), per week `... backfill week 2021-W14 2021-04-05..2021-04-11 listed=812 kept=37 contracts=41 pages=1 requests=78 in 187.0s (pass 2021-22 week 14/105, eta 5:23:10)` (the eta is the average pace of this run times the weeks left), `... skipped (complete)`, `... waiting (...)`, `... week ... FAILED: <reason>; the week stays incomplete (archived files are kept), rerun to resume`, and a closing `... backfill done weeks=.../... crawled=... skipped=... waiting=... failed=... listed=... kept=... contracts=... requests=... in H:MM:SS`. Exit code 0 when no week failed, 1 otherwise.
- **Progress:** `backfill --status` (no request is sent; also a section of `pipeline status`) prints per pass the weeks complete out of the total, notices kept of listed, contracts fetched and the last complete week (all from the archive's manifests, so true after a kill), then the last run from `<archive>/backfill-progress.json` (rewritten through a temporary file and a rename): state `running` / `finished` / `failed` / `aborted` / `interrupted` (the file says running but the process is gone), per-pass weeks done, crawled, already complete, waiting, failed, kept, contracts, requests, the week in progress with the eta, recent failures, and the last log line. Quickest check: `tail -n 2 ~/grivei-data/backfill.log`.
- **After a kill or a failure:** nothing to clean up; run the same `nohup ...` command again. A week is one archive unit of its own kind (`seap/crawl/award-notices-backfill/<first day>/<fetch day>/`), every file is written under a `.part` name and renamed, and the week's manifest is written last, so a killed week has no manifest: it is not complete and a rebuild ignores it (listed as "skipped, incomplete"). The rerun skips complete weeks and resumes the interrupted one from the files already in its directory: the list pages and the contracts of notices already archived are not asked again, only what is missing is sent (a `.part` file never counts). A failing week (a request still failing after its retries) is logged and the run goes on with the next week; after 5 weeks failing in a row the service looks down and the run **pauses** (`... backfill paused: ... retrying at <ts>`, 10, then 20, then 40 minutes) and carries on; the first week that succeeds resets this. Only if it is still down after the three pauses (about 70 minutes plus the failing tries) does it stop (`ABORTED`): rerun later, the failed weeks are retried.
- **Stop on purpose:** `pkill -f -- '-m pipeline .*backfill'` (matches `python -m pipeline --archive ~/grivei-data/raw backfill`; SIGTERM becomes a normal failure line in the log and the status file; complete weeks are kept).
- **With rebuild and the nightly crawl.** The backfill only writes the raw archive, in its own kind directory: **it never moves the nightly crawl's cursor** and its weeks are not crawl days (`pipeline status` lists them apart). `python -m pipeline rebuild` loads the backfilled weeks with everything else, from the archive alone: a backfilled Record is a Record like a crawled one (provenance `crawl` with the crawl date as `fetchedAt`, the notice's `sysNoticeTypeId` / `sysNoticeVersionId`, internal id and URL built at load, the manifest says `via: backfill`; badge crawl-only). A notice without a procedure is one `AWARD_NOTICE` Record carrying its procedure type (what the `no-publication` Signal selects on), a notice with a procedure is `CONTRACT` Records per contract number. **The bulk wins by Record identity** (from 2023: a backfilled Record is replaced by the bulk file's Record of the same code, whichever was fetched first). **`fetchedAt` is the manifest's time** (a week resumed on a later day has its earlier list pages dated with that later day). **Values are as crawled** ("as of crawl": the list returns a modified notice's current value, not strictly the value at award). Backfilled 2021-22 Records count in the totals; they do not move any data-through date.
- **In Compose:** `docker compose run --rm -T --no-deps pipeline backfill` (archive from `GRIVEI_ARCHIVE_DIR`). Use `nohup ... &` as above.
## Supplier identity (ADR 0003) and the ANAF Reference source

`pipeline rebuild` turns each Record's contracting authority and winners into **entities** of the shared core (`core.entity`, `core.alias`, `core.anaf_company`, recreated by every rebuild; SEAP's own tables hold only entity keys). The rules (`pipeline/identity.py`, tested in `tests/test_identity.py` and, through a real rebuild, `tests/test_identity_db.py`):

- **Tax id as published** is classified: a Romanian CUI (`RO`, whitespace, punctuation, leading zeros stripped, must pass the check digit), a 13-digit CNP, a foreign VAT id with an EU country prefix (`BG103029862`, `ATU 18379608`), or something else (fails the check digit, 11-12 digits, `-`). A scientific-notation id (`1.00761E+12`) has lost its digits: no id.
- **Key:** a CUI counts only if it passes the check digit **and** ANAF found it (an archived `found` answer). Entity keys: the CUI; `vat-<id>` for a foreign VAT id; `name-<slug>` otherwise (case, diacritics, punctuation, spacing folded; legal forms kept: `S.R.L.` -> `srl`; a name over 80 characters is cut and given a hash); a key pinned by the override file. A contracting authority is keyed by its CUI when it passes the check digit (ANAF adds its name and status), else by its name.
- **Display name:** ANAF's current name with the cedilla letters Ş ş Ţ ţ fixed to comma-below Ș ș Ț ț, no re-casing (the raw name stays in `core.anaf_company`). Only when ANAF has no entry, the entity's most frequent SEAP spelling (a tie: the alphabetically first).
- **Aliases:** every spelling SEAP published, with the number of Records and the first and last award date. They never merge entities. `differsFromAnaf` (and the Record badge `NAME_DIFFERS_FROM_ANAF`) is set when a SEAP spelling under a confirmed CUI is unlike ANAF's name, where "unlike" means: after folding case and diacritics, deleting dots, replacing other punctuation by spaces and dropping the legal-form words (`sc srl sa snc scs sca pfa ii ltd gmbh spa sas sarl ...`, see `_LEGAL_FORMS`), the two names differ. So `S.C. ALFA S.R.L. SRL` equals `ALFA SRL`, and `RCS & RDS` differs from `DIGI ROMANIA` (a rename). The supplier stays attached to the CUI.
- **A CNP** is recognised first and nothing of the winner is stored: no id, no name, no key (in the Record's `winners` jsonb, load notes, search rows, aliases). The winner is a natural-person supplier (`Party.naturalPerson`, `entity` null); the Record still counts for its authority. The raw archive keeps the file unchanged.
- **Supplier CUI equal to the Record's authority CUI:** unresolved (a name-only supplier) and the Record carries `CUI_MISMATCH`.
- **ANAF status** (`stare_inregistrare` read as one word: ACTIV, INACTIV, RADIERE, FUZIUNE, DIVIZARE, DIZOLVARE, SUSPENDARE ..., see `status_of`) is stored with the company and served as `anafStatus`. Branches, groups and merged companies are separate entities.
- **Override file** `pipeline/identity_overrides.toml` (versioned, reviewed, a `reason` per entry; override with `--identity-overrides` / `PIPELINE_IDENTITY_OVERRIDES`). An entry maps a name (a supplier published without a usable CUI) or a wrong published id to an entity key (a CUI, or a pinned `[a-z][a-z0-9-]*` key for a name-only entity, optionally with a `display_name`). It matches a whole name, so it never splits a joint venture. The entities it touches are `identityCurated`, and the Records it applied to carry `IDENTITY_CURATED`. A 13-digit id in the file is refused. The shipped file has no entries (see its header for the format); the test fixture's is `tests/fixtures/identity-overrides.toml`.
- **Fixtures** (invented): `tests/fixtures/archive-identity/`, rebuilt by `tests/fixtures/build_identity_archive.py` (SEAP DA and Contracte files plus archived ANAF answers written through the connector's own `archive_batch`).

### ANAF connector (`pipeline/anaf.py`)

`python -m pipeline anaf-lookup` asks ANAF about every CUI of the archive's SEAP files and crawled days (authorities and winners, normalised, passing the check digit; foreign ids, CNPs and failing numbers are never sent) that no archived ANAF response answers yet. The service (checked on 2026-11-12): `POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva` (the old `/PlatitorTvaRest/api/v9/ro/tva` path now answers 404), body `[{"cui": 54760, "data": "2026-11-12"}, ...]`, answered synchronously with `{"found": [{"date_generale": {"cui", "denumire", "adresa", "codPostal", "stare_inregistrare", ...}, "stare_inactiv": {...}, "adresa_sediu_social": {"sdenumire_Localitate", "scod_Localitate", "scod_Judet", "scod_JudetAuto", "scod_Postal", ...}, "adresa_domiciliu_fiscal": {...}}], "notFound": [1000001]}`. At most 100 CUIs per request, at most one request per second (the clock and sleeper are injectable in tests), 6 retries with a doubling backoff (2 s ... 32 s) on HTTP 5xx and 429, timeouts, connection errors, an HTML error page or a throttling answer (`cod` other than 200); a refused request (other 4xx) stops the run.
Every response is archived unchanged before anything uses it, at `<archive>/anaf/vat/v9/<first cui>-<count>/<fetch day>/{request.json, response.json, manifest.json}`: `request.json` keeps the endpoint, the day and the CUI list (kept for audit; a CUI asked but in neither list of the response counts as not found), the files are written under a temporary name and renamed, the manifest last. The rebuild reads these files and never calls ANAF; the latest answer for a CUI wins (a later `notFound` removes an earlier `found`). The address fields #67 needs are stored raw in `core.anaf_company.seat` / `fiscal_domicile`.
`--recheck-after-days N` also asks again about answers older than N days (the 365-day schedule is #81's); `--max-batches N` is a trial run.

## Operator: ANAF lookup and the identity rebuild for real

Seeds the ANAF answers for every national CUI (tens of thousands of CUIs, hundreds of requests, about one request per second: well under an hour), then rebuilds the graph with identities. Only this command talks to ANAF; run it once, unattended. The order:

1. `fetch-datagov` (above) fills the raw archive with the SEAP files.
2. `anaf-lookup` reads the archive (a scan of every SEAP file and crawled day, a few minutes; it quarantines nothing), then asks ANAF.
3. `rebuild` (above), which now also reads the archived ANAF answers. Run it again after any later `anaf-lookup`.

```bash
# once, from a worktree of the integration branch (same setup as the rebuild)
cd watchdog
uv venv --python 3.12 .venv && . .venv/bin/activate && uv pip install -r requirements.txt
export PIPELINE_ARCHIVE=~/grivei-data/raw        # the same raw archive; the answers go to $PIPELINE_ARCHIVE/anaf/

nohup python -m pipeline anaf-lookup >> ~/grivei-data/anaf.log 2>&1 &
```

With Docker Compose (outbound internet needed): `nohup docker compose run --rm -T pipeline anaf-lookup >> ~/grivei-data/anaf.log 2>&1 &` with `GRIVEI_ARCHIVE_DIR=~/grivei-data/raw`.

- **Environment:** `PIPELINE_ARCHIVE` (the archive, default `/archive`); optional `PIPELINE_ANAF_PROGRESS_FILE` (status file, default `<archive>/anaf-progress.json`) and `PIPELINE_ANAF_URL` (only for a stub). No database is needed. The pace (1 request/s) is not configurable.
- **Log:** `~/grivei-data/anaf.log`, timestamped lines flushed at once, no progress bar: `anaf scan unit 3/41 kind=da unit=2021Q3 records=... new_cuis=...` while it reads the archive, `anaf scan done: 61234 distinct CUIs in the archive`, `anaf start cuis=61234 batches=613 already_archived=0 archive=... pid=...`, then one line per request `anaf batch 37/613 cuis=100 found=97 notfound=3 archived=<unit directory>`, last `anaf done batches=613 cuis=61234 found=... notfound=... in H:MM:SS`. Retries are logged to the same file as `WARNING anaf attempt 2/7 failed (HTTP 503)`. On failure: `anaf FAILED after 37/613 batches: <error>; every finished batch is archived, rerun the same command to resume`.
- **Progress:** `python -m pipeline status` prints, after the rebuild section if there is one, `anaf lookup state: running|scanning|finished|failed|interrupted`, `batches: 37/613 done; cuis: 3700/61234 (3590 found, 110 not found); N were archived before this run`, start, last update, last line (same atomic status-file mechanism and host/pid rules as the rebuild's). Quick check without the CLI: `tail -n 2 ~/grivei-data/anaf.log`; `ls $PIPELINE_ARCHIVE/anaf/vat/v9 | wc -l` counts the batches archived.
- **After a kill or a failure:** nothing to clean up and nothing is lost: finished batches are archived, a batch cut short has no manifest and is ignored. Run the same `nohup ...` command again (`>>` appends to the log): the CUIs already answered, found or not found, are skipped and the run asks only for the rest (the scan repeats first). Stop on purpose with `pkill -f 'pipeline anaf-lookup'` (SIGTERM ends it like a failure).
- **Later:** a rerun after the next `fetch-datagov` asks only for CUIs that are new; add `--recheck-after-days 365` to refresh old answers.

## The data model, in brief

| Layer | Tables | Role |
|---|---|---|
| Provenance | `source`, `document`, `import_batch` | what we received, from where, when; `document.raw` is the untouched payload |
| Graph | `entity`, `entity_alias`, `relation_type`, `edge` | the nodes and links; `edge.document_id` is mandatory |
| Typed SEAP | `seap_award_notice`, `seap_contract`, `seap_contract_winner`, `seap_direct_acquisition` | the domain data, with all fields, for precise queries |
| Investigation | `v_*`, `neighbours()` | a watchdog's standard questions |

Entity resolution of this legacy loader: companies are identified by CUI (`norm_cui`: digits only, `RO` and punctuation stripped;
a foreign VAT id or a 13-digit CNP is no CUI and gives NULL), then by `seap_entity_id`. A row with neither is a new entity: names never
merge entities (ADR 0003). The pipeline's identity rules (check digit, ANAF confirmation, name-only keys) are in
`pipeline/identity.py` and the section "Supplier identity" below. People (from ONRC/ANI) will need separate rules: there is
no public identifier, so matching is on name + context.

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
