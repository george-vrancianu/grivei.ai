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

## The MF list of public entities and the Coverage statuses (#80)

The Ministry of Finance's monthly "Lista entităților publice" (dataset `listaentitatipublice` on data.gov.ro, one `.xls` of about 4 MB and 13,500 rows per month) is a Reference source and the Coverage denominator M.

**Operator: fetch it.** Fetch only, nothing is loaded; the same archive as `fetch-datagov`. Run it with the weekly data.gov.ro check (a new monthly file is picked up, the same one is skipped without a download):

```bash
cd watchdog && . .venv/bin/activate && export PIPELINE_ARCHIVE=~/grivei-data/raw
nohup python -m pipeline fetch-mf >> ~/grivei-data/fetch-mf.log 2>&1 &
```

- It asks CKAN for the dataset, reads each resource's snapshot date (`... actualizată la data de 01.11.2026` in the name, else `lista_ep_portal_01112026.xls` in the file name) and fetches only the newest, unchanged, to `<archive>/mf/list/entities/<snapshot date>/<fetched on>/<file>` with a manifest (resource id, URL, last-modified, size). Older snapshots are logged `superseded`; a resource with no readable date is `unclassified` and never archived.
- Log (`tail -f`): one timestamped line per outcome (`archived` with its size, `unchanged`, `superseded`, `unclassified`, `failed` with the reason), then the summary. Exit code 1 means a failure. Resume = run the same command again: a file already archived with the same marker is skipped; a re-upload is a new dated unit (`<day>.2` on the same day); a download that dies or is not a spreadsheet (an HTML error page) leaves only a `.mf-download-*` scratch file (removed at the next start; a prefix of its own, so a `fetch-datagov` running at the same time never deletes it), never a unit.
- `rebuild` loads the newest snapshot that parses into `core.mf_entity` (CUI, name, UAT as MF writes them; the county from MF's `Judet`; `national` by the national-authority rule: award notice, then the reviewed file, so a ministry MF files under Bucuresti counts in National) and `core.mf_snapshot` (the date the API serves as `referenceSnapshot`). A newer unit that does not parse is named in the rebuild summary (`mf list: ... skipped ...`) and the older one is used. **Until `national_authorities.csv` (shipped empty) is seeded from the MF list, Bucharest's M and N (RO-B) are inflated**: ministries and national agencies that have no award notice are filed by MF under Bucuresti and count there, not in National (seeding is a follow-up: `national-propose` covers only SEAP authorities). MF writes county names in plain ASCII (`Dambovita`, `Valcea`); the gazetteer reads both that and the accented spelling, and the rebuild line names every `Judet` that is no county with its row count (`mf list: ... 7 without a county (Strainatate: 1, ...)`), so a new spelling shows up there instead of silently emptying a county. Without any unit the denominator is empty (`M = 0`) and the snapshot is null. Tests: `tests/test_mf.py` (HTTP stubbed) and seam 1 "(#80)" on `tests/fixtures/archive-mf/` (rebuilt by `tests/fixtures/build_mf_archive.py`) laid over `archive-placement/`.

**`coverage(source, window)`** (API, `explorer/packages/api/src/{coverage,store,resolvers}.ts`), per county plus National, for the date window (Records by award date; grid quarters that overlap it):

- **N** = MF entities of the area with at least one SEAP Record in the window, **M** = MF entities of the area; both by MF's county, except national authorities, who are in National. **Other authorities** = authorities with a Record in the window that are not on the MF list, by our placement (a national authority is National, a county-placed one is in its county). **Unplaced** = authorities with a Record in the window that `core.placement` has no row for (whether MF lists them or not): their count and the `Total` of their Records.
- **Status** (never a ratio; N and M do not enter it, so "bought nothing" never reads as "not harvested"): the grid cells overlapping the window are good (`LOADED`), flagged (`KNOWN_GAP`, `POSSIBLY_INCOMPLETE`, `NOT_IN_SOURCE`, `CRAWLED_PROVISIONAL`, and `NOT_YET_LOADED` with rule `AWAITING_BULK_FILE`, the expected lag: the current quarter's bulk file is never published yet, so counting it as a hole would make every county partial in the default window) or missing (`NOT_YET_LOADED` with no rule: a bulk file of that quarter was quarantined). No cell, or every cell `NOT_YET_LOADED`: not harvested. Some cell missing: partial. Else some cell flagged: harvested with known gaps. Else harvested. SEAP is harvested nationally, so all counties and National share the window's status; N of M is what differs.

## Contracts and award notices: identity, precedence, value

Archived kinds `contracte` (Record kind `CONTRACT`) and `fara-anunt` (`AWARD_NOTICE`), loaded like DA and DAN (header eras in `headers.py`, all or nothing per unit, a failing unit is quarantined, exact duplicate rows dropped). ADR 0002 as amended:

- **Code (the public key `seap.record(code)` takes):** a contract is `<award notice code>~<contract number>`, e.g. `CAN1069731~54202` or `CAN1073017~1398514/1` (the number is kept as published, only runs of blanks collapse; `~` never occurs in a notice code, so the first `~` splits it; a number holding `/` or spaces must be percent-encoded in a URL). In the 2025 XLSX files Excel turned many typed numbers into dates, times and floats; they are read with the cell's number format and turned back (`mmm-yy` -> `m/yyyy`, `mm-dd-yy` -> `m/d/yyyy`, `d-mmm` -> `m/d`, `h:mm` -> `h:mm`; note `contract_number:excel_typed`), so a contract recurring from a CSV quarter keeps its code. Known gaps: a float loses trailing zeros (`222.10` reads `222.1`), a two-digit year or zero-padded day typed into a date cannot be told from the full form, and a float of 1e15 or more (scientific `#,##0` cells, `contract_number:excel_mangled`) has lost its digits and may merge distinct contracts of one notice. On the 2025 Q1 Contracte file that is 2,651 float, 1,460 date and 10 time cells out of about 123,000. An award notice from a "fără anunț" file is its notice code alone, `CAN1139746`. DA and DAN keep their public code.
- **One Record per identity, across all quarters:** the rows repeated per lot and per winner collapse into it. Its lots (`lot_count`) and winners are attributes. Winners are stored in the order of their first row in the file (`seap.record.winners`, `Party` list in GraphQL).
- **Precedence:** the version from the most recent notice publication wins (`published_on` is the award notice's publication date). Loading an older file after a newer one changes nothing, so the result does not depend on the order files arrive in. On the same publication date with different content the later file (archive fetch order) wins; identical content changes nothing. A replacement replaces the whole version (its lots and winners, not a merge); Records absent from a re-uploaded file are kept.
- **Value:** counted once when all lots carry the same value (it is repeated on every lot and winner row), summed over lots when the lot values differ; a row without a lot number is a lot of its own; no value on any row is "no value in SEAP". Within one lot the first value is kept and `value:lot_rows_disagree` goes into `load_notes` (about 0.1 % of contracts in 2025 and 2022). An award notice's value is the sum of its contracts' values. Money is integer bani.
- **Kept for the counting rule (#65, see "The counting rule" below):** `concluded_by` (`Incheiat prin`: `Cu acord cadru` / `Cu acord cadru subsecvent` / `Fara acord cadru`), `notice_code`, `initiation_code`, `procedure`.
- **Dates:** publication (the award notice's) assigns the quarter; the contract date (`Data contract`, earliest among the version's rows) is the award date, falling back to the publication date.
- Header names were checked on the real 2021 T3 and T4 (CSV), 2022 T1 (pipe CSV) and 2025 T1/T2 (XLSX) files, and the fără-anunț 2025 XLSX. Legacy `.xls` files (2021 T1/T2, 2022 T2 to 2023 T1, and the 2023 T1 DA, DAN and fără-anunț files) are read with `xlrd` (every sheet is one file: an export past 65 536 rows spills onto more sheets that repeat the header; a lone title row above the header is skipped; typed cells are rendered back as for the XLSX, see above), and their header names were checked on the real files. `.ods` is still unsupported.

## The counting rule (#65): what each Record adds to a sum

Decided **once per Record, while the rebuild loads it** (`pipeline/counting.py`), and stored: `seap.record.counted_bani` (null = not summed), `badges`, `framework_role`, `suspect` (flag), `ceiling_bani` (a non-suspect framework ceiling's value), `suspect_rule` / `suspect_threshold_bani`, the per-winner shares in `winners` and `seap.search.share_bani`, and the table `seap.framework`. The API sums and counts stored columns and nothing else (`counted_bani`, `suspect`, `ceiling_bani`, `value_bani IS NULL`), with no rule predicate; the two flag columns are on `seap.search` too, so a Total over it (authority side: once per Record, `winner_position = 1`) needs no join. Every `Total` (`awarded`, `records`, `suspectLeftOut`, `noValue`, `frameworkCeilings`) is one `SELECT` over what was stored. Awarded value is the only measure summed; the source value is never edited.

- **No value in SEAP:** a blank or zero value. `value` is null (a zero is read as blank, note `value:zero`), badge `NO_VALUE`, the Record counts in `records` and `noValue`, adds nothing to a sum.
- **Frameworks (`Incheiat prin`):** "Cu acord cadru" is a *framework ceiling*: shown with its value, badge `FRAMEWORK_CEILING`, `counted` null, never summed, its value reported in `frameworkCeilings`. "Cu acord cadru subsecvent" is a *subsequent contract*: badge `SUBSEQUENT_CONTRACT`, summed. Anything else ("Fara acord cadru", blank, or a Record from the crawl, which has no `Incheiat prin`) is summed as it is.
- **The link to the framework is the award notice number.** In the real Contracte files (checked on 2022 T1, 2023 T1 and 2025 T2) the subsequent contracts of a framework agreement are published under the *same* `Numar anunt atribuire` as the agreement's own contract(s): every notice that holds a subsequent contract also holds at least one "Cu acord cadru" contract, and the subsequent contract carries the same initiation notice too. So a subsequent contract is linked to its framework by `notice_code`, across all quarters (the link is built after the whole archive is loaded: `seap.framework`, one row per such notice). A notice can hold several framework contracts (one per supplier or lot, as in `CAN1048024`): the agreement is the notice, its ceiling the sum of its framework contracts' ceilings that have a value and are not suspect, and the Record shown as "the agreement" the one with the lowest code. A framework Record's `framework` shows that ceiling, the subsequent contracts reported so far (the sum of their counted values) and the ratio (null when the ceiling is blank, which a third of real framework contracts are); its `subsequent` lists them, largest first. A subsequent contract's `framework` shows the same and its `agreement`. **A subsequent contract whose notice has no framework Record loaded** (the agreement predates 2021, or a quarter is missing) still counts and still carries the badge; its `framework` is set with no agreement, no ceiling and no ratio.
- **Consortia:** a Record with several winners is counted once, at its full value, on the authority side (the Total, `seap.record.counted_bani`) and shows the badge `CONSORTIUM_SHARE`. On the supplier side every winner gets an equal share in integer bani: `value // n`, and the remainder bani (fewer than `n`) go one each to the first winners in the published order, so 100 bani over three winners is 34, 33, 33 and the shares always sum back exactly. A natural person (#66) takes a slot like any winner (and is still never named). The Record shows the full value and every member with their share (`winners[].share`, from the value, also on a suspect Record); `seap.search.share_bani` is the share of the *counted* value, null when nothing is counted, and is what supplier-side totals, rankings and the Money lens supplier side sum. For every Record, `sum(search.share_bani) = counted_bani`.
- **On the map's supplier side (#71)** a Record is counted once in each county its winners touch: the county `records` counts can add up to more than the set's total (the awarded shares are exact), and a framework agreement shows its whole ceiling in every county its winners touch (ceilings are shown, never summed). The authority side counts each Record once.
- **Suspect values** (badge `SUSPECT_VALUE`, `counted` null, counted in `suspectLeftOut`, never in a sum; the Record stays shown and searchable; `suspect` says which rule and its threshold):
  - *Direct purchases (DA, DAN) at 10 times the statutory cap or more* (`DIRECT_PURCHASE_10X_CAP`, threshold = the cap in force). The caps are a small dated table, `counting.CAPS` (the same one #79's `over-cap` and `splitting` Signals use): 135,060 RON for supplies and services and 450,200 for works before 10 September 2022, 270,120 and 900,400 from then on. **The boundary day belongs to the new era** (10 September 2022 uses 270,120), and the date is the Record's award date (ADR 0002; the publication date when there is none). **The caps are taken without VAT and the Record's value is compared as published**, with no VAT adjustment. Works are told by `Tip contract` (Lucrari) or CPV division 45; CPV division 70 (rents) and anything else in `EXEMPT_CPV_DIVISIONS` is never flagged. "10 times or more" is `>=`.
  - *Contracts and award notices of 1 bn RON or more* are checked against the notice's **estimated value, fetched from e-licitatie and archived** (below): 100 times the estimate or more (`>=`) is suspect (`CONTRACT_100X_ESTIMATE`, threshold = the estimate); with no estimate, **above** 50 bn RON is suspect (`CONTRACT_OVER_50BN`, no threshold). "No estimate" is a lookup that was made and found a blank or zero estimate, an estimate not in RON, or no such notice. **A Record of 1 bn RON or more whose notice was never looked up is not the same thing:** the rule cannot be applied without its input, so the Record is counted for now and noted `estimate:not_fetched`; the rebuild's summary says how many notices are in that state and `pipeline estimates` fills them in. (This includes a never-looked-up Record above 50 bn RON: it stays counted until its lookup is archived.)
  - A framework ceiling can be suspect too (it is then left out of `frameworkCeilings` and of the framework's ceiling sum, and counted in `suspectLeftOut`).

## Signals (#74): `over-cap` and `no-publication`

Computed **in the load transaction**, by `pipeline/signals/` (one module per rule: `SLUG`, `KINDS`, `WHERE`, `detect(rows)`; the registry is `RULES` in `signals/__init__.py`), after the Records, the search rows and the entities and **before** the rollup and the search index, so the has-Signals chip, the rollup and the scan agree. A Signal is a set of Records with no public id; it is stored per load in `seap.signal` (ordinal `id`, dates, authority, suppliers, `numbers`, `reproduce`), `seap.signal_member`, `seap.signal_rule` (window, base rate) and the search rows' `signals` / `has_signals`.

- **`over-cap`:** a DA or DAN whose value is **strictly above** the statutory cap for its award date and type (`counting.CAPS`, works by `Tip contract` or CPV 45; the 10 September 2022 boundary day is in the new era) and **below 10 times** it. Exactly the cap is no Signal; 10 times or more is a suspect value (counting rule) and never triggers; CPV 70 and the other `EXEMPT_CPV_DIVISIONS` are exempt. Numbers: `value`, `cap`, `multiple`.
- **`no-publication`:** a Contract or award notice (bulk, crawled current quarter, backfilled 2021-22) whose `procedure` folds (case, accents, spacing) to a prefix `negociere fara publicare`. Other procedures without a prior call (Norme proprii, Procedura simplificata proprie) and plain "Negociere" are not this rule's. Numbers: `procedure` as published.
- **Left out:** a Record with no authority key is in no Signal (a Signal's `authority` is required by the contract).
- **Suspect values** never trigger and are left out of a Signal altogether (a suspect Record of the same day is not one of its Records).
- **Grouping:** one Signal per (rule, authority, award day), holding every matching Record of that authority and day. Its reproducing filter is `authority + signal + from = to = day`, which returns exactly its Records whatever the winners are (two Records the same day, a natural person, a consortium). The Signal's suppliers are every winner entity of its Records, consortium members included, natural persons left out. Its date is its latest Record's award date (ADR 0002).
- **Window and base rate** (per rule, recomputed each load): the window starts on 1 January of the first year the rule has Records for (2021 once the backfill is loaded, 2023 otherwise for no-publication) and is open at the end; `dataThrough` is the earliest data-through date of the Record kinds the rule reads. The base rate is the fraction of authorities with a Record of the rule's kinds in `baseRateYear` that have a Signal of the rule dated in it; `baseRateYear` is the latest calendar year before the data-through year (a complete year), else the latest year there is.

## Operator: estimated values for the counting rule (`pipeline estimates`)

Fetches, from e-licitatie, the estimated value of every notice that has a Record of 1 bn RON or more (a few dozen to a few hundred requests nationally), archives each answer unchanged, and lets the next rebuild apply the 1 bn rule. It needs the list of candidates, which only a loaded graph has, so the order is:

1. `rebuild`: loads every Record. The mega-contracts are counted for now and noted `estimate:not_fetched`; the summary says `estimates: 0 archived answers read; N notice(s) of 1 bn RON or more have none yet`.
2. `estimates`: reads the candidate notices from the graph (`SELECT DISTINCT notice_code ... WHERE value_bani >= 1 bn`), skips those already archived, asks e-licitatie about the rest.
3. `rebuild` again: reads the archived answers (never the network) and applies the rule. Run steps 2 and 3 again after a later load brings new mega-contracts (step 2 asks only for the new notices).

```bash
cd watchdog && . .venv/bin/activate
export PIPELINE_ARCHIVE=~/grivei-data/raw DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME   # the graph the last rebuild wrote
nohup python -m pipeline estimates >> ~/grivei-data/estimates.log 2>&1 &
```

- **The request** (`pipeline/estimates.py`): `POST https://e-licitatie.ro/api-pub/NoticeCommon/GetCANoticeList/` with `{"number": "<notice code>", "pageSize": 10, ...}`: the public notice list filtered by the notice number, the same call the public search makes (checked with two smoke requests: the filter is `number`; `noticeNo` is silently ignored and returns an unfiltered page). The row whose `noticeNo` is the code carries `estimatedValueExport` (`"18625192,67 RON"`: Romanian decimal comma, currency after the number) and `currencyCode`. It goes through the crawl's client (`cli.make_client`): the `Referer: https://e-licitatie.ro/pub` header, 0.35 s between requests (`--delay` / `PIPELINE_CRAWL_DELAY`), retries with back-off on a transient error.
- **Archive:** `<archive>/seap/estimates/notice-value/<notice code>/<fetch day>/{request.json, response.json, manifest.json}`; the response is e-licitatie's bytes, unchanged; files are written under a temporary name and renamed, the manifest last (a directory without one is ignored). A second answer for a notice goes beside the first (`<day>.2`); the latest answer wins at rebuild.
- **Resumable:** a notice with an archived answer is skipped, so a killed run is rerun with the same command (`>>` appends to the log); SIGTERM ends it like a failure.
- **Log:** one timestamped line per notice, flushed: `2026-11-12T10:15:02+0200 estimates notice 3/12 CAN1069746 estimate=18625192.67 RON archived=seap/estimates/notice-value/CAN1069746/2026-11-12`, plus `estimates candidates: N ...`, `estimates start ...`, `estimates done ...`; on failure `estimates FAILED: <error>; every finished notice is archived, rerun the same command to resume` (exit 1). `--max-notices N` is a trial run. There is no status file.
- **Environment:** `DATABASE_URL` (or `--db`), `PIPELINE_ARCHIVE`; optional `PIPELINE_CRAWL_DELAY`. With Docker Compose: `docker compose run --rm -T pipeline estimates` (outbound internet needed).

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

## The Coverage grid (#79)

`pipeline rebuild` ends by computing the SEAP Coverage grid from what it just loaded and from the archive, and stores it in `seap.coverage_cell` (one row per quarter and record kind: `2021-Q1` to the quarter of the rebuild's day, DA, DAN, CONTRACT, AWARD_NOTICE). The API serves it as `coverage(source: SEAP, window).grid`; the window keeps the quarters that overlap it. Code: `pipeline/coverage/` (`grid.py` holds the rules and is pure; `build.py` gathers the facts). Flagged cells (possibly incomplete, not yet loaded because a file was set aside, hand-entered gaps) are logged as `coverage: ...` lines at the end of the rebuild output, never with the quarantine's reason.

State precedence, first match wins:

| # | Condition | State | Rule | Note |
|---|---|---|---|---|
| 1 | the cell is in the known-gaps file | `KNOWN_GAP` | `HAND_ENTERED` | the file's reason, verbatim |
| 2 | a bulk file of the quarter and kind is loaded, and its row count is below 60% of the median of its neighbours | `POSSIBLY_INCOMPLETE` | `COUNT_BELOW_NEIGHBOURS` | |
| 2 | a bulk file of the quarter and kind is loaded | `LOADED` | | |
| 3 | AWARD_NOTICE, 2021-22: the backfill's pass 1 has every planned week overlapping the quarter complete | `LOADED` ("covered via e-licitatie") | | |
| 3 | AWARD_NOTICE, 2021-22, a bulk unit of it was quarantined | `NOT_YET_LOADED` | | |
| 3 | AWARD_NOTICE, 2021-22, otherwise (contracts awarded without a prior call: in no bulk file) | `NOT_IN_SOURCE` | `NO_PRIOR_CALL_BEFORE_BACKFILL` | |
| 4 | no bulk file loaded, but provisional crawled Records of the kind exist in the quarter | `CRAWLED_PROVISIONAL` | `AWAITING_BULK_FILE` | |
| 5 | a bulk unit of it was quarantined | `NOT_YET_LOADED` | none | none: the quarantine and its reason are never shown |
| 6 | nothing (e.g. DA and DAN of the current quarter) | `NOT_YET_LOADED` | `AWAITING_BULK_FILE` | |

Provisional means crawled and not backfilled: a backfilled Record is crawl-only from the start, so a quarter holding only backfilled Records (a hole between bulk files, e.g. 2023-Q2 to 2024-Q4 of CONTRACT) is `NOT_YET_LOADED` with `AWAITING_BULK_FILE` (or no rule when a file was quarantined), with its Record count. A quarantined file counts as if it did not exist (step 4 applies to a quarantined quarter that has crawled Records). A loaded bulk file always wins over a quarantined re-fetch of the same quarter.

- **The possibly-incomplete rule** (`grid.below_neighbours`, published): a quarter's row count is strictly below 60% of the median row count of its neighbours. The count is the data rows read from the loaded bulk file (the largest one when a quarter was fetched more than once). Neighbours: the up to 2 nearest quarters before and the up to 2 after that have a loaded bulk file of the same kind (quarters without one, and hand-entered gaps, are skipped over; the quarter itself is left out); fewer than 2 neighbours and the rule is not evaluated. The rule runs at every rebuild.
- **Records** per cell: Records of the kind published in the quarter, bulk and crawled (crawl-only ones included: the spec counts them in the quarter's cell).
- **Data-through** per cell: loaded, covered and known-gap cells: the latest publication date among the cell's Records (null when none); crawled provisional: the kind's crawl data-through (`seap.crawl_state`, the end of the unbroken run of complete crawl days) but never past the quarter's end, and only when that run starts no later than the quarter's end (else the latest Record date: the crawl never covered the quarter); not yet loaded and not in the source: null.
- **Known gaps** (`pipeline/coverage/known_gaps.csv`, hand-edited, checked in): `quarter,kind,reason`; quarter `2025-Q2`, kind one of DA, DAN, CONTRACT, AWARD_NOTICE; `#` comments; the reason is shown verbatim (source data, not translated). Seeded with the Q2 2025 DAN mis-upload. `rebuild --known-gaps FILE` or env `PIPELINE_KNOWN_GAPS` points elsewhere (tests); `rebuild --today YYYY-MM-DD` or env `PIPELINE_TODAY` fixes the day that ends the grid (tests; default: today, UTC).
- **Fixture:** `tests/fixtures/archive-coverage/` (`build_coverage_archive.py`) + `coverage-known-gaps.csv`, rebuilt as of 2025-09-20: a miniature archive with one cell of every state. Tests: `tests/test_coverage_grid.py` (pure), `tests/test_coverage_db.py` (Docker), seam 1 "(#79)" tests.

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

## Placement (#67): counties, UATs, villages, national authorities

Where an authority sits (and any ANAF-known entity): a county (ISO 3166-2:RO, Bucharest `B`), a UAT (SIRUTA; Bucharest's UATs are its six sectors), a village (stored, not plotted) and a `national` flag. All of it is derived at `rebuild` from the archive and from checked-in tables, never from the network (ADR 0004). `core.county`, `core.uat` and `core.placement` hold it; the API serves `counties`, `uats(county)` and `entity.placement`.

**How an entity is placed** (`pipeline/placement/`, rules in `matching.py`):

1. ANAF's seat (`core.anaf_company.seat`): the county from `scod_JudetAuto`, else `scod_Judet` (SIRUTA's JUD); `sdenumire_Localitate` parsed (`Sat X Com. Y`, `Loc. X Mun. Y`, `Mun. Y`, `Orş. Y`, `Com. Y`, `Sector n Mun. Bucureşti`). The UAT is resolved first, by `(county, folded bare name)`, then the village inside it (ANAF's postal code breaks a tie). Folding: cedilla, comma-below and ASCII are one key; `Â` and `Î` both fold to `I`; dots and the spaces around initials go (`I.L. Caragiale` = `I. L. CARAGIALE`); kind words (`Mun.`/`Orş.`/`Com.`/`Sat`/`Loc.`, SIRUTA's `MUNICIPIUL`/`ORAŞ`) are stripped. Typos go through `pipeline/placement/data/locality_aliases.csv` (reviewed, one line each, ships empty).
2. No UAT match: the county stays, the UAT is empty, and the rebuild logs `placement: <cui> '<name>' placed in BV only: no UAT 'X' in BV` to stderr. Nothing is guessed. With no county either, the authority is unplaced (a tile of its own on the map, Glossary).
3. A CUI ANAF does not know (authorities only): the archived SEAP entity view (`pipeline seap-entities`, below): `(county, folded city)`, the postal code from `address` (`Cod postal: 507190`) against SIRUTA's CODP when the name is ambiguous, `Sector: n` for Bucharest. SEAP's list is ASCII, so a SIRUTA `Râşnov` is `Rasnov` there: SEAP matching tries that spelling too. `placed_by` is `ANAF` or `SEAP`.
4. Foreign suppliers have no CUI and no placement (the supplier side's unknown bucket).

**National authorities** (`placement/scope.py`): `scope = national` comes from SEAP's `legalBuyerType` / `caType` on an award notice of the authority (one notice per authority), else from the reviewed file `pipeline/placement/data/national_authorities.csv` (`cui,national,override,name,reason`). The notice is read by an explicit mapping (`_verdict`), not by substrings: **national** = `legalBuyerType` "Autoritate guvernamentala centrala" (`cga`) or `caType` "Minister sau orice alta autoritate nationala sau federala" / "Agentie/birou national"; **not national** = a text naming a deconcentrated service ("Serviciul public deconcentrat"), or a regional or local authority (this wins over "central"); **unknown, the file decides** = bodies governed by public law or public undertakings "controlled by" a central authority (`body-pl-cga`: universities, hospitals, institutes), even when the caType names a ministry; a central legal type with a public-law caType is unknown too; and any text not listed. The texts are unverified against real notices: check the mapping on a handful before the first national run (`authority-scope`, then read the `legalBuyerType` / `caType` in the archived `notice.json` files). The notice flag wins over the file unless the line says `override=true` (use it for an authority the notice gets wrong). With neither, an authority is not national. A national authority keeps its seat in `core.placement` but the API serves no county, UAT or locality for it, so it is never piled onto Bucharest. `python -m pipeline national-propose --db URL` prints CSV lines for authorities with no flag and no line whose name looks national (`MINISTERUL ...`, `AGENTIA NATIONALA ...`): a proposal to review, never applied by itself.

**Operator order** (once, then after each new load; the lookups need a rebuilt graph, like `estimates`):

```bash
cd watchdog && . .venv/bin/activate                        # uv pip install -r requirements.txt (shapely is new)
export PIPELINE_ARCHIVE=~/grivei-data/raw
# 1. the geography Reference sources, unchanged and dated (a few MB; ANCPI is ~16 pages of 200 UATs, 1 s apart)
python -m pipeline geo-fetch                               # INS SIRUTA (data.gov.ro siruta_s1-2026), Wikidata P843/P625, ANCPI UAT polygons
python -m pipeline geo-fetch --only siruta --siruta-dataset siruta_s2-2026   # a new SIRUTA semester is a new dataset id
# 2. the checked-in tables, generated from those snapshots; review the diff and commit pipeline/placement/data/{uats,villages}.csv, table-sources.json
python -m pipeline geo-table
# 3. rebuild, then the two small lookups (each archives every answer; resumable; ~3 requests/s), then rebuild again
python -m pipeline rebuild --db "$DATABASE_URL"
python -m pipeline authority-scope --db "$DATABASE_URL"   # one award notice per authority: legalBuyerType / caType
python -m pipeline seap-entities --db "$DATABASE_URL"     # authority CUIs ANAF did not answer
python -m pipeline rebuild --db "$DATABASE_URL"
```

`geo-table` needs the three snapshots and `shapely`, and writes into the checkout's `pipeline/placement/data` by default: run it from the checkout's venv as above, not with `docker compose run` (that directory is in the image and is lost when the container exits). It writes `uats.csv` (one row per UAT and per sector: siruta, county ISO, JUD, TIP, display name, folded name, lon, lat, point source), `villages.csv` (NIV=3 rows: siruta, parent UAT, name, folded name, CODP) and `table-sources.json` (snapshot paths and sha256, attribution). A Wikidata point is accepted only inside the ANCPI polygon with the same SIRUTA; otherwise the polygon's point on surface (`ancpi_pos`). It stops if `counties.csv` disagrees with SIRUTA's county rows. Without `uats.csv` a rebuild places by county only and says so (`no UAT table`); with it, the UATs of `core.uat` come from it. Attribution (CC BY 4.0): "SIRUTA: INS", "Limite UAT: ANCPI"; Wikidata is CC0.

**TopoJSON.** `rebuild` (or `python -m pipeline geo-topojson`) dissolves the archived ANCPI polygons per county and writes static files to `--geo-dir` / `PIPELINE_GEO_DIR` (default `<archive>/derived/geo`; in Compose `GRIVEI_GEO_DIR`, default `./geo`, served by Caddy at `/geo/`): `counties.topo.json` (object `counties`, `properties.code` = `RO-BV` ..., `RO-B`), `uats/RO-BV.topo.json` (object `uats`, `properties.code` = SIRUTA) and `uats/RO-B.topo.json` (object `sectors`, the six sectors), `index.json`. The shape is the one `BaseMap` / `ZoomedCountyMap` read. A failure here prints `geo: TopoJSON failed` and never undoes the load.

Tests: `pytest tests/test_placement.py` (rules, generator, TopoJSON, fetch and lookups with HTTP stubbed; no database) and `tests/test_placement_db.py` (Docker); the fixture world is `tests/fixtures/build_placement_archive.py` (run it to regenerate `archive-placement/` and `placement-data/`).

## The refresh run (#81): `pipeline refresh`, `seed`, the ledger and the alerts

`pipeline refresh` is the one nightly run (`docker compose run --rm -T pipeline refresh`, scheduled by the systemd timer in `deploy/README.md`, "Schedule the refresh"). It takes a lock (`<archive>/refresh.lock`, shared with `seed`), then runs its steps in this order, each one **only when due from its own last success** (a calendar day is a UTC day):

| Step | What | Due when |
| --- | --- | --- |
| `crawl` | e-licitatie catch-up from the cursor plus the 3-day trailing re-crawl (`pipeline crawl`) | no success today |
| `datagov` | data.gov.ro bulk files (`fetch-datagov`) and the MF list (`fetch-mf`) | 7 days since its last success |
| `anaf` | ANAF for new CUIs, plus the 365-day re-check (`anaf-lookup --recheck-after-days 365`) | the archive gained units (other than ANAF answers) since its last success, or 7 days passed |
| `load` | `rebuild` (new or re-uploaded files, requeued units; evaluates the possibly-incomplete rule into the Coverage grid) | the archive's units changed since its last load, or it never ran |

A second trigger the same day (the on-boot one after the 03:00 one) finds nothing due and exits 0 after a success ping; a trigger while a run holds the lock logs it and exits 0 (no ping, no ledger entry). A step that failed has no success, so it is due again at the next trigger. **Deviation from the spec's step order:** ANAF runs before the load (the spec lists load, then ANAF), because the load reads the archived ANAF answers: placement and identity are right on the first load after new CUIs arrive instead of one night later. Step 5 of the spec (restic of the archive, `pg_dump` weekly) is #82's: it is one more `Step` appended in `pipeline/refresh/engine.py::refresh_steps`.

**Ledger.** `<archive>/refresh-ledger.json` (rewritten whole through a temp name and a rename): every run (id, kind `refresh` or `seed`, trigger, start, end, status `ok|failed|interrupted`, the alert it raised) and every step (start, end, status, attempts, failure class, counts, the archive unit directories it created, warnings, error). A run still `running` when the next takes the lock was killed and is closed `interrupted`.

**Failure classes** (`pipeline/refresh/engine.py::classify`; network and database-unreachable errors, `CrawlError` and an ANAF outage that outlasted its retries are transient; everything else, including an unknown exception, a refused ANAF request (HTTP 4xx) and a full disk, deterministic; an error in the engine itself pings `/fail` at once):

- *transient*: the step is retried inside the run after 60 s and 300 s; if it still fails the other steps still run, the run is `failed` (exit 1), and nothing is pinged until **more than 2 runs in a row** failed, then a `/fail` ping with a one-line reason. The dead-man's switch covers a longer silence.
- *deterministic* (a bug, no database configured, a crawl with no cursor and nothing to start after): no retry, `/fail` ping with the reason at once.
- *suspicious success* (the load quarantined a file, a quarter is possibly incomplete, data.gov.ro showed a resource it could not classify): the data loads, the run is `ok`, and the warnings go in the success ping's body (only the ones not already reported by that step's previous success, so a flag that recurs every night does not make every ping suspicious; the full list stays in the log and `allWarnings` of the ledger), `pipeline status` and the ledger. The quarantined quarter shows publicly as "not yet loaded" in the Coverage grid (no reason, no through-date); the quarantine itself stays private.

**Pings.** `PIPELINE_HEALTHCHECK_URL` (compose: `GRIVEI_HEALTHCHECK_URL`): the healthchecks.io check URL. A success ping after every run that did not fail (nothing due included), `<url>/fail` with the reason otherwise. Unset = no pings, logged. A ping that cannot be sent is logged and never fails the run. Tests stub it; never ping a real URL from a test.

**`pipeline status`** prints, after the rebuild, ANAF, crawl and backfill sections (crawl cursor, crawled-through and data-through dates), the refresh section: the last 5 runs newest first with each step's outcome, alerts, errors and warnings, each step's last success, what is due now, and the open quarantines (path and reason).

**Re-run verbs** (all work from the archive, none re-downloads): `pipeline load-quarter 2023Q2 --db URL` (requeues that quarter's quarantined files, then rebuilds: the graph is derived whole from the archive, so there is no partial load; exits 1 if the quarter is still quarantined), `pipeline crawl --from D --to D`, `pipeline backfill`, `pipeline rebuild`, `pipeline requeue` (see the lock note below).

### Operator: seed everything from scratch, then schedule the nightly run

`pipeline seed` runs, in one locked, resumable run with one timestamped log: `datagov` (fetch-datagov and the MF list), `anaf` (ANAF for every CUI in the archive, crawled ones included), `load` (rebuild) and, with `--backfill`, the 2021-22 backfill crawl (`pipeline backfill`, many hours). **Order:** ANAF before the load, so placement is correct on the first load. A step that succeeded in an earlier seed is skipped; the steps themselves skip what is already archived, so a kill loses at most the unit in flight (files are written under a temp name and renamed, a manifest last). Add `crawl` separately (`pipeline crawl`, see above) if you want the crawled quarters in the first load; the nightly `refresh` catches up whatever is missing.

```bash
# once, from a worktree of the integration branch
cd watchdog && uv venv --python 3.12 .venv && uv pip install -r requirements.txt
export PIPELINE_ARCHIVE=~/grivei-data/raw DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
# optional: PIPELINE_CRAWL_START=2025-07-01 (the nightly crawl's first start day), PIPELINE_CRAWL_DELAY=0.35

nohup .venv/bin/python -m pipeline seed --backfill >> ~/grivei-data/seed.log 2>&1 &      # start (omit --backfill to leave it for later)
tail -f ~/grivei-data/seed.log                                                         # one timestamped line per step event and per unit
.venv/bin/python -m pipeline status                                                    # rebuild / ANAF / crawl / backfill state, last runs, quarantines
pkill -f 'pipeline seed'                                                               # stop (SIGTERM ends it like a failure; the ledger says interrupted)
nohup .venv/bin/python -m pipeline seed --backfill >> ~/grivei-data/seed.log 2>&1 &      # resume: the same command; finished steps are skipped
```

Expected cost, from the earlier tickets' real runs and estimates: `fetch-datagov` tens of minutes to hours (several GB, about 1 s between requests, low CPU and memory); `anaf-lookup` a few minutes of scanning (one file at a time) plus about 600 requests at 1 per second, under an hour, light; `rebuild` hours (about 860 records/s; about 250 MB for the biggest CSV, about 1.5 GB for a 770k-row DA quarter, so keep 2 GB or more for it); the backfill crawl many hours at 0.35 s per request. The seed holds the single lock, so a `refresh` timer firing meanwhile logs "another run holds the lock" and does nothing.

**The rebuild holds an exclusive lock on schema `seap` for its whole transaction (hours on a national archive):** the API cannot read `seap` until the commit. Stop the `api` service during a seed's load, or accept the wait. A rebuild into a fresh database beside the live one, checked and then switched over, is #82's (backups and rebuild switchover); this ticket leaves it alone. **The nightly `refresh` will do this every night.** The crawl adds a new day unit and re-crawls the trailing 3 days as new dated directories, so the archive changes every night, `load` is due every night, and each load is a full rebuild: hours (the national archive at about 860 records/s) with the exclusive `seap` lock held, so the public API stalls for those hours until #82's switchover lands. Choose one until then: (a) accept the nightly window (the 03:00 timer makes it a night-time stall), or (b) stop `api` around the timer, for example `ExecStartPre=/usr/bin/docker compose stop api` and `ExecStopPost=/usr/bin/docker compose start api` as a drop-in of `grivei-refresh.service`. Plan the first scheduled night after the seed finishes.

**Stops at the first failure.** A seed that fails a step (after that step's retries) stops there; the steps after it did not run, and the same command resumes at the failed step. A `refresh` keeps going after a failed step (its due rules compare fingerprints, so the next run repairs it).

**Do not run these beside a refresh or a seed.** `rebuild` and `load-quarter` take the same lock and exit 1 if another run holds it. `crawl --from/--to`, `anaf-lookup`, `backfill`, `fetch-datagov` and `requeue` do not: running one of them while the timer's run is going writes the same units from two processes. Stop the timer (`systemctl --user stop grivei-refresh.timer`) or wait for the run (`pipeline status`) first.

**Deviation: the ledger is a file, not tables.** The spec places the operational ledger (`pipeline_run` / `pipeline_step`) in the core database; it is `<archive>/refresh-ledger.json` here (atomic writes, one lock). It works without a database and survives a rebuild, which does not touch it. A corrupt ledger is moved aside as `refresh-ledger.json.corrupt-<time>`, not overwritten. Moving it into the core database is a later choice, not needed by anything yet.

Then enable the nightly schedule: `deploy/README.md`, "Schedule the refresh" (systemd user timer at 03:00 and on boot with `Persistent=true`, and the Windows logon task that keeps WSL up).

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
