# Release 1 runbook: the real national rebuild, the latency gate and the unattended week

For the operator (a human, on the real machine). It proves the Definition of done of the [release recipe](release-recipe.md) section 11 for
Release 1 (SEAP) on real data: ticket #91 of spec #37. Nothing here runs in CI and no agent can do it: it needs the real services, hours of
wall clock and a week of waiting.

Every command exists on this branch (`python -m pipeline <verb> --help` for each). Verb details live in `watchdog/README.md`; this page is the
order, the costs and the checks. **Durations marked "estimate" were never measured end to end**: the tickets measured pieces, nobody has run the
whole sequence. Write the real numbers into the closing comment (template at the end).

## Conventions

```bash
cd <repo root>                          # a stable checkout of the integration branch, not a throwaway worktree
(umask 077; printf 'GRIVEI_ARCHIVE_DIR=%s/grivei-data/raw\nGRIVEI_DB_PASSWORD=<a password>\n' "$HOME" > .env)   # ONE file, not `export`: compose reads `.env` beside compose.yaml in every shell and in the timer's run (WorkingDirectory); the archive is outside the repo; `.env` is gitignored
docker compose --profile pipeline config | grep -E 'DATABASE_URL|grivei-data'   # from a fresh shell: the password you chose in both URLs and `source: .../grivei-data/raw` must show; the `pipeline` profile is needed or the pipeline service is left out
mkdir -p ~/grivei-data/raw ~/grivei-data/bench geo   # `geo` (GRIVEI_GEO_DIR, default ./geo) must exist and be yours before `docker compose up`: Docker would create it as root and the pipeline (uid 1000) could not write the TopoJSON
P="docker compose run --rm -T pipeline"  # the pipeline container: 2 CPUs, 2 GB, archive at /archive, DATABASE_URL set to the compose db
```

**Everything the pipeline needs goes into that `.env`** (mode 600): later `GRIVEI_HEALTHCHECK_URL`, `RESTIC_REPOSITORY`, `RESTIC_PASSWORD` and the backend keys (step 9), and `GRIVEI_GEO_DIR` if it is not `./geo`. An `export` lives in one terminal only: the timer's unit never sees it
(it reads only `~/grivei-data/refresh.env`), so nightly runs would connect with the default password and skip the backups; a new terminal would read `./archive`. Do not set these twice in two places.

Long steps run detached, with a log (`nohup docker compose run --rm -T pipeline <verb> >> ~/grivei-data/<verb>.log 2>&1 &`; `$P` below is the same command, for the short ones).
Stop one with `docker stop` of its run container (or `pkill -f 'pipeline <verb>'` from a venv). **Memory:** WSL has crashed near 30 GB; the compose stack caps `db` at 12 GB and 8 CPUs, `api` and `web` at 2 GB,
`pipeline` at 2 GB. Check `free -g` before the load; do not run two heavy steps at once. **Do not run `crawl --from/--to`, `anaf-lookup`, `backfill`,
`fetch-datagov` or `requeue` beside a `seed` or `refresh`** (they do not take the lock).

Without Docker the same verbs run from `watchdog/` with `uv venv --python 3.12 .venv && uv pip install -r requirements.txt`,
`PIPELINE_ARCHIVE=~/grivei-data/raw` and a `DATABASE_URL` you can reach (the compose db is not published to the host). Step 3's `geo-table` is the one verb that must run that way.

## Steps

### 1. Bring up the database and build the images

```bash
docker compose up -d db                      # db only: the API starts after the first rebuild (step 6), which creates the rollup tables it reads
docker compose build api web                 # minutes the first time
docker compose ps                            # db healthy
```

There is no separate migration: the schema is derived. The first `rebuild` creates `seap`, `core` and the search index in a new database beside
the live one and swaps it in; until then the explorer says the data could not be loaded.
`docker compose build pipeline` comes in step 3, **after** `geo-table` has written the placement tables: the image copies `watchdog/pipeline`, CSVs included.
Expected: 5 to 15 minutes (image builds), little CPU, under 3 GB. Resume: rerun the command. Progress: `docker compose ps`, `docker compose logs db --tail 20`.

### 2. Fetch ADR's 2021+ quarterly exports into the raw archive

```bash
nohup sh -c 'docker compose run --rm -T pipeline fetch-datagov && docker compose run --rm -T pipeline fetch-mf' >> ~/grivei-data/fetch.log 2>&1 &
# fetch-mf: the Ministry of Finance list of public entities (the Coverage grid's N of M); it starts when fetch-datagov has finished OK. The first run builds the pipeline image (step 3 builds it again).
```

Expected (estimate): tens of minutes to a few hours, several GB (`du -sh ~/grivei-data/raw`), about 1 s between requests, low CPU and memory. Exit 1 means at least
one resource failed. Resume: rerun the same command; everything archived is skipped, a cut download leaves only a scratch file. Progress: `tail -f ~/grivei-data/fetch.log`
(one line per resource). Look at every `unclassified` and `conflict` line: the Q2 2025 DAN file is a known mis-upload (a hand-entered known gap).
**Wait for it before step 4 or 6:** the log shows the `fetch-mf` summary and `pgrep -f 'pipeline fetch'` prints nothing (or the `fetch-datagov` summary with `failed:` lines and an empty `pgrep`: fetch-mf never ran; rerun step 2). A fetch still running would be validated half done, and beside a `seed` it is the forbidden `fetch-datagov` beside a seed.
**If a seed is already under way** (an earlier attempt with the venv: `seed --backfill`, stopped at ANAF), step 2 and the ANAF part may be done already: do steps 3 and 4 first (the geography and #64c are what that run lacked); step 6's command then resumes the same ledger, and so does the venv form of it.

### 3. The geography: SIRUTA, ANCPI polygons, the placement tables

Without these a rebuild "places by county only" (`no UAT table`), writes no TopoJSON (`/geo/counties.topo.json` is a 404 and the explorer's county and zoomed maps cannot load) and has no national flag, so national authorities pile onto Bucharest. Details: `watchdog/README.md`, "Operator order" of the placement section.

```bash
$P geo-fetch                                       # INS SIRUTA, Wikidata P843/P625, ANCPI UAT polygons into the raw archive; archive only
cd watchdog && uv venv --python 3.12 .venv && uv pip install -r requirements.txt   # once; geo-table needs shapely and must write into the checkout
PIPELINE_ARCHIVE=~/grivei-data/raw .venv/bin/python -m pipeline geo-table          # writes pipeline/placement/data/{uats,villages}.csv and table-sources.json
cd .. && git status --short watchdog/pipeline/placement/data                        # review the diff and commit the three files
docker compose build pipeline                      # AFTER geo-table: installs restic and the PostgreSQL 18 client too (never built before this run)
```

Expected (estimate): `geo-fetch` a few minutes (a few MB; ANCPI is about 16 pages of 200 UATs, 1 s apart), `geo-table` under a minute, the image build 5 minutes. Resume: rerun (archived snapshots are kept; a new SIRUTA semester is `geo-fetch --only siruta --siruta-dataset <id>`).
The national flag comes after the first load (step 7). Check: `uats.csv` and `villages.csv` exist and the image contains them (`docker compose run --rm --entrypoint ls pipeline pipeline/placement/data`).

### 4. Validate the archive read-only (ticket #64c): required before the seed

**Step 6 must not run before this passes.** On the real archive #64c measured 40 of 73 bulk files passing *before* its reader changes (cp1250, pipe-delimited CSV, `.ods`, day-first DA 2021 dates, the 2023-2026 header eras) and 72 of 73 after.
Without them a seed quarantines about 33 files and still ends "successfully": the first build has no live graph, so the switchover's floor (95% of the live graph) does not apply. The explorer would then be missing about 45% of the files.
`python -m pipeline validate` is the read-only verb of #64c (`pipeline validate [--kind K] [--match TEXT]`). **It needs `docker compose build pipeline` run again from a checkout that has it.**

```bash
# read-only by construction (it lists the archive and parses; it never quarantines), and mounted read-only too
docker run --rm --memory=3g -v ~/grivei-data/raw:/archive:ro --entrypoint python grivei-pipeline -m pipeline --archive /archive validate
docker run --rm --memory=3g -v ~/grivei-data/raw:/archive:ro --entrypoint python grivei-pipeline -m pipeline --archive /archive validate --kind da    # split it by kind: da, dan, contracte, fara-anunt
# #64c's own form, from its checkout's README (no image needed):
docker run --rm -v ~/grivei-data/raw:/archive:ro -v "$PWD/watchdog":/app:ro python:3.12-slim sh -c 'pip install -q --user -r /app/requirements.txt && cd /app && python -m pipeline --archive /archive validate'
```

It prints `PASS` or `FAIL <kind>/<quarter>` per file (with the reason) and `N passed, M failed of T file(s) (da a/b, ...)`, and exits 1 on any failure. The image name is Compose's (`docker compose --profile pipeline config --images`).
Expected: about 15 minutes for 4.7 GB (use `--kind` to split it), one file in memory at a time (xls files whole: up to a few hundred MB). Resume: it changes nothing, rerun.
**Expected result on the real archive: 72 of 73 passed.** The one FAIL is the DA 2022 Q2 file: it mixes a pasted Contracte export and is rejected for that stated reason; it stays quarantined (note it in the closing comment). Fix, or accept in writing, every other FAIL before step 6.

**Steps 5 and 6 in one detached chain:** `setsid nohup deploy/first-load.sh >> ~/grivei-data/seed.log 2>&1 &` runs the crawl, then the three lookups of step 6 (`anaf-lookup`, `authority-scope`, `seap-entities`), then the seed, so the lookups and the one full load include the crawled days (add `--backfill` for step 8; see the script's header). The steps below are the same commands by hand.

### 5. (Optional, before the seed) crawl the quarters the bulk has not reached

```bash
nohup docker compose run --rm -T --no-deps pipeline crawl --start 2025-07-01 >> ~/grivei-data/crawl.log 2>&1 &   # --start: where a first crawl with no cursor begins (default: the day after the last archived Contracte quarter). An env var set in your shell would not reach the container.
```

Expected: about 220 notices a weekday nationally, a quarter is 2 to 3 hours at the 0.35 s default delay, the five quarters after 2025 Q2 of the order of 10 hours; a day is a few MB.
Resume: rerun (complete days are skipped, a killed day resumes). Progress: `docker compose run --rm -T --no-deps pipeline status`, `tail -n 2 ~/grivei-data/crawl.log`.
The seed does not crawl; skip this step and the first nightly refresh catches up instead. **Wait for `crawl done` in `crawl.log` before step 6** (`pgrep -f 'pipeline crawl'` empty): the crawl takes no lock and must not run beside the seed.

### 6. ANAF lookups and the load (full rebuild): `seed`

`seed` runs, in one locked, resumable run, `datagov` (step 2 again, a no-op if done), `anaf` (about 600 requests at 1/s, under an hour plus a scan of the archive) and `load`
(the full rebuild). ANAF runs before the load, so identities and placement are right on the first load.

```bash
nohup docker compose run --rm -T pipeline seed >> ~/grivei-data/seed.log 2>&1 &     # add --backfill to also run step 8's crawl as its last step
tail -f ~/grivei-data/seed.log
docker compose run --rm -T pipeline status                                         # rebuild, ANAF, crawl, backfill state; last runs; quarantines
```

Only when `seed run <id> ok` is in the log (the rollup tables exist; started earlier, the API would warm its cache against a database still being loaded):

```bash
docker compose up -d --build api web                                                # then open http://localhost:8080/explore
```

By hand instead (the same steps): `$P anaf-lookup` then `$P rebuild`. Rebuild: hours (about 860 Records/s; 20M search rows is of the order of 6+ hours, estimate), 1.5 GB for the biggest DA
quarter in the pipeline container, 3 copies of the graph on disk during the build (live, `<db>_prev`, `<db>_next`; check `df -h` and the Docker volume's disk first), the db container busy on
up to 8 CPUs. It is one transaction: not resumable, a kill rolls back and the live graph is untouched; rerun the same command. The seed resumes at the failed step. Progress:
`tail -n 2 ~/grivei-data/seed.log` (one line per unit: `rebuild unit i/N ...`), `$P status`. After it: read `status` for quarantines
(`<archive>/quarantine/**/reason.json`), fix the header alias or reader, `requeue --match TEXT`, rebuild again (`load-quarter 2023Q2` does both for one quarter).

**Acceptance A (full rebuild succeeds):** the log ends `rebuild done units=... quarantined=N ...` and `seed run <id> ok`, where **every quarantined unit has a stated reason you accept** (after step 4 expect `quarantined=1`: the DA 2022 Q2 file;
the Q2 2025 DAN mis-upload may be a second) and is named in the closing comment; `verify` passes on the live graph:

```bash
$P verify                                          # the container's DATABASE_URL is the live graph; the checks of a switchover, exit 1 if any fails
docker compose exec db psql -U grivei -d grivei -c "SELECT count(*) FROM seap.record" -c "SELECT count(*) FROM seap.search" -c "SELECT quarter, kind, state, records FROM seap.coverage_cell ORDER BY 1,2"
```

Expected on the real national load: of the order of 20M search rows (the benchmark's size). Record the real counts, duration and peak memory (`docker stats --no-stream`) in the closing comment.

### 7. Placement lookups and the national flag, then the second rebuild

Both lookups read the graph the load just built, archive every answer and are resumable. The names that come out go into the next rebuild.

```bash
# the two lookups send one request per authority (about 16,000 authorities at the 0.35 s default delay: an hour or more each, estimate): detached, one after the other
nohup sh -c 'docker compose run --rm -T pipeline authority-scope && docker compose run --rm -T pipeline seap-entities' >> ~/grivei-data/placement.log 2>&1 &
#   authority-scope: one award notice per authority: legalBuyerType / caType (national or not)
#   seap-entities:   SEAP's entity view for the authority CUIs ANAF did not answer: the placement fallback; same pace
tail -f ~/grivei-data/placement.log      # `status` does not show these two; wait until the log ends with the seap-entities summary and `pgrep -f 'pipeline (authority-scope|seap-entities)'` is empty
# resume after a stop or a failure: rerun the same command; every answer is archived and skipped
$P national-propose         # prints CSV lines for authorities with no flag whose name looks national (MINISTERUL ..., AGENTIA NATIONALA ...): a proposal, never applied by itself
# review the proposal: add the lines that are right to watchdog/pipeline/placement/data/national_authorities.csv, commit, then rebuild the image so it carries the file
docker compose build pipeline && $P rebuild
```

The notice flag wins over the file; check the `legalBuyerType` / `caType` mapping on a handful of real `notice.json` files before trusting it (`watchdog/README.md`, "National authorities").
Expected: the lookups tens of minutes to a couple of hours (estimate), the rebuild as in step 6. Check: `ls geo/counties.topo.json geo/uats | head`, `$P status`, and the `rebuild` log has **no** `no UAT table` line and no `geo: TopoJSON failed`; the explorer's county map and a zoomed county load.
(`seed` is not needed again: this is `rebuild` beside the live graph, checked and switched over like the first one; the API's cache notices the new load by itself.)

### 8. The one-off 2021-22 backfill crawl

```bash
nohup docker compose run --rm -T --no-deps pipeline backfill >> ~/grivei-data/backfill.log 2>&1 &
docker compose run --rm -T --no-deps pipeline backfill --status                    # weeks complete per pass, no request sent
# when it has finished:
$P anaf-lookup && $P rebuild                                                        # the backfilled units bring new CUIs; ANAF first (it reads the archive's units), then the load
```

Expected: 6 to 10 hours (105 weeks, about 30,000 contract requests at 0.35 s minimum gap; estimate from the ticket), light CPU and memory. Resume: rerun the same command (complete weeks are skipped,
the interrupted week resumes); after 5 weeks failing in a row it pauses 10/20/40 minutes, then aborts: rerun later. It only writes the archive, so **run the lookup and a rebuild after it** (the next nightly refresh does both: ANAF is due when the archive gained units, then the load):
the 2021-22 Records, the `no-publication` Signal and the Coverage cells need that load. The 2023-today pass only lists weeks whose bulk quarters are archived (it logs `waiting`
otherwise): run it again after the next `fetch-datagov`.

### 9. Enable the nightly schedule, backups and the dead-man's switch

1. healthchecks.io: a check with period 1 day, grace 3 days; its ping URL goes in `GRIVEI_HEALTHCHECK_URL` (in `.env`).
2. Backups (refresh steps `backup`, `pgdump`; restic, one encrypted repository on object storage): `RESTIC_REPOSITORY`, `RESTIC_PASSWORD` and the backend credentials (`AWS_*` or `B2_*`) in the `.env` of the Conventions: compose passes them to the container for every run, by hand or by the timer. `~/grivei-data/refresh.env` (deploy/README.md) may stay as it is or be left out: the unit's `docker compose run` reads `.env` from its `WorkingDirectory`; if you keep both, the same keys must not differ (`GRIVEI_DB_PASSWORD` belongs in `.env`, never only in a shell). Check from a fresh shell (a non-empty `RESTIC_REPOSITORY` must show): `docker compose --profile pipeline config | grep -E 'DATABASE_URL|grivei-data|RESTIC_REPOSITORY'`.
   Unset = both steps skip with a warning and **the week would not be a backed-up week**. Try once: `$P backup all`, then rehearse a restore into a scratch directory with the container
   (it has restic >= 0.17; make the directory first: `mkdir -p ~/grivei-data/raw-restored`): `docker compose run --rm -T -v ~/grivei-data/raw-restored:/restore pipeline restore archive /restore/r`, then `diff -r ~/grivei-data/raw ~/grivei-data/raw-restored/r`
   (expect differences for what was written after the backup: the ledger, progress files, a newer crawl day; run the rehearsal right after `$P backup all`, before the timer is enabled, to keep them few)
   (from a venv instead you need a host `restic` >= 0.17 and the same `RESTIC_*` variables; see `watchdog/README.md` "Backups and restore").
3. The timer: `deploy/README.md` "Schedule the refresh" (`systemctl --user enable --now grivei-refresh.timer`, `loginctl enable-linger`, the Windows logon task `deploy/windows/keep-wsl-up.ps1`; WSL needs `systemd=true`).
4. Try one run by hand first: `docker compose run --rm -T pipeline refresh` (then `pipeline status`: the last runs, what is due, quarantines).

Day 0 of the unattended week is the first night a timer-triggered run succeeds with the whole chain (crawl, datagov, anaf, load, backup) configured. Rollback of a bad switchover:
`pipeline rollback` (before the next nightly switchover replaces `<db>_prev`); `pipeline cleanup` drops the fallback.

## Acceptance

Run B right after step 7 (and again after step 8's rebuild), C after step 7, D and E at any time, F after seven days. Save every output under `~/grivei-data/bench/` and paste the findings into the closing comment.

### B. Latency: the keystroke benchmark (`pipeline bench`)

The spec's gate: every text query under about 500 ms on 8 vCPU, the empty and chips-only states served by the rollup, 2-character prefixes from the warmed cache. The harness
(`watchdog/pipeline/bench.py`, queries in `watchdog/pipeline/bench_queries.json`, 37 of them (the research row for a CUI used `10000504`, the list has `4384206`: compare that line only loosely): 2-character prefixes, single and multi-token Romanian procurement terms, a supplier name, CUI, CPV, chips, the empty state) issues
the statements the API issues for one keystroke, in parallel on the API's 8 connections: the total, **one** Money-lens map (the side the filter's `countySide` names, default authority: that is what the main screen asks for), both entity tabs
(rank, then the page's entities and placement), the Records tab (the Top-K page and its entities and source files; the empty state's page reads `seap.record`) and, for a text query, the Go-to lookup. It reports per query the cold run and the warm median / p95 / max, per statement
and per task, as JSON and a table. Exit 1 when any query is over the threshold. `dataThrough` rides on every request too (it is **not** a small read: the API runs it uncached as a scan of `seap.record`) and is judged as the task `data_through`. Left out (small keyed reads): the page's Signal badges, facets, `counties()`.
The filter-to-SQL mapping is a Python copy of `buildWhere` / `rollupPlan`; `watchdog/tests/test_bench_parity.py` and `explorer/packages/api/test/benchParity.test.ts` keep it equal to the API's over every query of the list.

```bash
# 1. SQL mode inside the capped stack (the db container has cpus: 8): the first run of every query is "cold", the next five warm
docker compose restart db && sleep 30
docker compose run --rm -T -v ~/grivei-data/bench:/out pipeline bench --db-cpus 8 --repetitions 5 --json /out/bench-sql-$(date +%F).json
# 2. API mode: the persisted MainScreen operation over HTTP. First wait for the cache warming (see below), then:
docker compose logs api | grep 'cache warmed'         # a line newer than the last switchover; no line yet = still warming: wait, repeat
OPID=$(python3 -c "import json;print([o['sha256'] for o in json.load(open('explorer/packages/contract/generated/persisted-queries.json'))['operations'] if o['name']=='MainScreen'][0])")
docker compose run --rm -T -v ~/grivei-data/bench:/out pipeline bench --api-url http://api:4000/graphql --operation-id $OPID --cached-ms 50 --json /out/bench-api-$(date +%F).json
# a subset or your own list: --only "(empty)" --only ma ; --queries FILE.json ([{"label": ..., "filter": {RecordFilter fields}}] or bare strings)
```

"Cold" in SQL mode means the first run of a query after `docker compose restart db`: the database's caches are empty only for the first query; every later query's cold run is cold only for its own statements, and the operating system's page cache survives the restart.
The cache warming (`cache.ts`) runs after each new load generation, about 1,400 prefixes with 6 to 7 statements each, one after the other: nationally it may take tens of minutes. A benchmark started before it finishes measures misses.

How to read it. **Text queries** are judged on the whole keystroke (the slowest task), cold and warm p95, against `--threshold-ms` (default 500). **Empty and chips-only states** are judged on the rollup-served tasks
(total, entity tabs, Records, `data_through`), and the report checks with `EXPLAIN`, on the **exact statements that ran** (the total and each entity tab's rank), that they read `seap.rollup_cube` / `seap.rollup_entity` and never `seap.search` (`rollup_verified`).
**Finding to confirm:** the Money lens map (`searchMap`) has no rollup path in the API: for the empty and chips-only states it scans `seap.search` (about 0.8 s at 20M rows in the research); the API's result cache answers the empty state and the 2-character
prefixes from the warmed cache, but a chips-only state (a year, a channel) pays that scan on its first request. The chips-only Records page is an index Top-K by design (task serving `mixed`: the count comes from the rollup, the page from `seap.search`). The SQL mode reports the map apart (`--strict-maps` judges it); the
API mode (always judged whole) shows what a user sees. A chips-only state that the cube cannot serve (a badge, a partial date range) is reported as `chips-scan` and judged like a text query.
**API mode also checks** (1) that the empty state and the 2-character prefixes answer their *first* request within `--cached-ms` (default 50): the table says `warmed cache: yes/no`, and a `no` fails the query. **A `no` with a fast repeat means an uncached part of the request**, not a cold cache: today that is `dataThrough` (a scan of `seap.record` on every request; follow-up: memoize it per load generation in `cache.ts`); look at `data_through` in the SQL-mode JSON. (2) with the database reachable (the container's `DATABASE_URL`; `--no-scan-check` turns it off),
that the first request of an empty or chips-only state moves the scan counters of `seap.search` (`pg_stat_user_tables`) by no more than the **measured** cost of that state's map and Top-K page (the harness runs them in SQL mode first: the counters count scan nodes, not statements) and, for a request that must miss the cache (chips-only), that the rollup tables were read (`scans` in the JSON). It waits 12 s per such query for PostgreSQL to publish the counters.
**Only the first API-mode run after a cache flush measures misses**: a second run times cache hits for every text query. To repeat it: `docker compose restart api`, wait for `cache warmed` again.
The harness prints the usable CPUs of the client container (2: the Compose cap) and the database's declared vCPUs (`--db-cpus`): the 8 vCPU target belongs to the database container.
Result "fail" is a finding, not a bug: compare with research section 4 (`origin/research/search-engine`), tune `shared_buffers`, parallel workers and the API pool, and decide on the fallback (OpenSearch) only with the numbers.

### C. Validation fixture: #5's measurement again (`pipeline check-fixture`)

```bash
docker compose run --rm -T -v $PWD/watchdog/data/raw:/batches:ro pipeline check-fixture --batch /batches/seap_brasov_2024_2026.json --batch /batches/seap_timisoara_2024_2026.json
```

The batches are the first harvest (`watchdog/data/raw/seap_*_2024_2026.json`, kept as the validation fixture by ADR 0002; they are not in the pipeline image, hence the mount). #5 is recorded in `docs/research/seap-bulk-sources.md` on the branch
`research/seap-bulk-sources` ("Completeness test against the crawl"): **Brasov (CUI 4384206) and Q3 2026 only**. The check repeats exactly that (`--authority 4384206 --quarter 2026Q3` are its defaults):
- **DAs, crawl -> graph:** the crawl's "Oferta acceptata" DAs published in the quarter (152) must each be a Record with the same value. Result `da (crawl -> graph): 152/152`.
- **Contracts, bulk -> crawl:** the graph's CONTRACT Records from the quarter's bulk file for that authority (46) are looked up in the crawl batch; one, `CAN1145000~27030`, is missing from the crawl. Expected `contracts (bulk -> crawl): 45/46`; it fails above `--allow-missing-contracts` (default 1).
- A wider line (`also (wider, ...)`) compares every crawl item of both batches with the graph, in every quarter the graph has a bulk file for: informational, it does not decide the result. A graph without the 2026 Q3 bulk files (not loaded, or quarantined) fails with "nothing to compare".

If your totals differ from 152 and 46, say so in the closing comment. `--quarter all --authority all` removes the scope.

### D. Coverage, methodology and all copy in both languages

- Copy parity (cheap, automated): `cd explorer && npm ci && npm test --workspace @grivei/app -- src/copy src/signals/signalCopy.test.ts` (same keys in EN and RO, Romanian really Romanian, comma-below diacritics,
  the Signal wording without the forbidden words, the methodology copy quoting the Romanian labels; 22 tests). It checks the catalogue, not that every screen uses it.
- By eye (the explorer is served at `http://localhost:8080`): `/explore/coverage` and `/ro/explore/coverage` (the grid, the map, the status wording), `/explore/methodology` and `/ro/explore/methodology` (About the numbers / Despre cifre),
  the main screen, an entity page, a Record page and a Signal card in each language; no English on a Romanian page except source data (institution names, SEAP fields, document titles stay as published).
- The Coverage grid after the real load: `docker compose exec db psql -U grivei -d grivei -c "SELECT state, rule, count(*) FROM seap.coverage_cell GROUP BY 1,2 ORDER BY 1,2"`. Known data issues to show, not fix: the Q2 2025 DAN mis-upload, the 2024 Q4 Contracte file with 95k rows (flagged possibly-incomplete).

### E. Backups work

`$P backup all` ended without a warning; the snapshots list (`docker compose run --rm -T --entrypoint restic pipeline snapshots`, or `restic snapshots` from a host with restic >= 0.17 and the `RESTIC_*` variables) shows an `archive` and a `pgdump` snapshot; the restore rehearsal of step 9 matched byte for byte.

### F. A week unattended (`pipeline check-week`)

After seven nights of timer-triggered runs:

```bash
docker compose run --rm -T pipeline check-week --timer-only   # the 7 UTC days ending yesterday; --through YYYY-MM-DD, --days N, --strict, --ledger FILE
```

Passes (exit 0) when every one of the seven days has at least one `refresh` run in `<archive>/refresh-ledger.json` (with `--timer-only`, one the timer started: a hand-started run does not count; without it the first line prints the mix of triggers), no run in the window raised an alert and none is still `running`. A transient failure that the next run
repaired raises no alert: it is printed as a note, and `--strict` turns it into a failure. Suspicious-success warnings (a quarantined file, a possibly-incomplete quarter) are printed as notes. Also confirm in healthchecks.io that
no `/fail` ping and no missed-ping alert came in the week (the ledger is the pipeline's own record; the check's history is the pager's). Read the unit's log: `journalctl --user -u grivei-refresh --since "7 days ago"`.

## Checklist (mirrors the ticket's acceptance criteria)

- [ ] Full rebuild from the real archive succeeds: steps 2 to 8, acceptance A (`rebuild done`, no quarantine without a stated, accepted reason, `verify` passes, record counts noted). Geography done: `counties.topo.json` present and the `rebuild` log has no `no UAT table` line.
- [ ] Every text query in the benchmark answers under about 500 ms on 8 vCPU; empty and chips-only states come from the rollup: acceptance B (SQL mode and API mode JSON saved; `rollup_verified` true for the empty and chips states; the 2-character prefixes and the empty state `warmed cache: yes`).
- [ ] Validation fixture agrees with the bulk-loaded graph: acceptance C (152/152 DAs crawl -> graph, 45/46 contracts bulk -> crawl for Brasov 2026 Q3, or the explained difference).
- [ ] Seven consecutive days of refresh runs with no alert: acceptance F.
- [ ] Coverage, methodology and all copy present in both languages: acceptance D.
- [ ] Findings, and any defaults from the spec's Further Notes that changed, are recorded in a closing comment (template below).

## Closing comment template (ticket #91)

```markdown
## Release 1 acceptance

Run on <date range>, <commit>, <machine: CPUs, RAM, disk>, compose stack as in `compose.yaml` (db 8 CPUs / 12 GB).

### Rebuild
- fetch-datagov: <duration>, <size>; unclassified/conflict: <...>
- geo-fetch / geo-table: <duration>; placement tables committed: <commit>
- validate (#64c): <passed>/<total>; failures and their reasons: <...>
- anaf-lookup: <duration>; rebuild: <duration>, peak memory <...>, Records <n>, search rows <n>, quarantined units: <none | list and reasons>
- authority-scope / seap-entities: <durations>; national authorities added: <n>; second rebuild: <duration>; `counties.topo.json` served: <yes/no>
- backfill: <duration>, weeks failed/retried: <...>; anaf-lookup and rebuild after it: <duration>

### Latency (`pipeline bench`, <json files>)
- slowest text query: <label> <cold ms> / <p95 ms>; queries over 500 ms: <none | list>
- empty and chips-only states: rollup used <yes/no> (EXPLAIN of the statements that ran); Money-lens map scan cold <ms> (served by the cache: <yes/no>)
- 2-character prefixes from the warmed cache (API mode): first <ms>, repeat <ms>, `warmed cache: yes/no`; `cache warmed` log line at <time>

### Validation fixture
- DAs <m>/<n> (crawl -> graph), contracts <m>/<n> (bulk -> crawl), Brasov 2026 Q3 (#5: 152/152, 45/46); the wider line: <...>; differences: <...>

### Unattended week
- <first night> to <last night>: <7> runs, triggers: <timer only | mix>, alerts: <none>; transient failures: <...>; warnings: <...>

### Copy and Coverage
- parity test green; both languages checked by eye on <pages>; Coverage grid: <states counts>

### Spec Further Notes defaults
1. National-authority flag (a reviewed classification file): <kept | changed: ...>
2. Backfilled 2021-22 values as crawled: <kept | changed: ...>
3. ADR 0002 amendment wins over "replace a quarter wholesale": <kept | changed: ...>
Connector checks still open: <VAT in direct-purchase values; DAN under 2,000 a day; 2021-22 Contracte quarters without "fara anunt" procedures>

### Follow-ups
- <...>
```
