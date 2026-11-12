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
export GRIVEI_ARCHIVE_DIR=~/grivei-data/raw GRIVEI_DB_PASSWORD=<a password>   # compose reads both; the archive is outside the repo
mkdir -p ~/grivei-data/raw ~/grivei-data/bench
P="docker compose run --rm -T pipeline"  # the pipeline container: 2 CPUs, 2 GB, archive at /archive, DATABASE_URL set to the compose db
```

Long steps run detached, with a log (`nohup docker compose run --rm -T pipeline <verb> >> ~/grivei-data/<verb>.log 2>&1 &`; `$P` below is the same command, for the short ones).
Stop one with `docker stop` of its run container (or `pkill -f 'pipeline <verb>'` from a venv). **Memory:** WSL has crashed near 30 GB; the compose stack caps `db` at 12 GB and 8 CPUs, `api` and `web` at 2 GB,
`pipeline` at 2 GB. Check `free -g` before the load; do not run two heavy steps at once. **Do not run `crawl --from/--to`, `anaf-lookup`, `backfill`,
`fetch-datagov` or `requeue` beside a `seed` or `refresh`** (they do not take the lock).

Without Docker the same verbs run from `watchdog/` with `uv venv --python 3.12 .venv && uv pip install -r requirements.txt`,
`PIPELINE_ARCHIVE=~/grivei-data/raw` and a `DATABASE_URL` you can reach (the compose db is not published to the host).

## Steps

### 1. Bring up the stack and migrate

```bash
docker compose up -d --build db api web      # builds api and web: minutes the first time
docker compose build pipeline                # installs restic and the PostgreSQL 18 client: never built before this run
docker compose ps                            # db healthy
```

There is no separate migration: the schema is derived. The first `rebuild` creates `seap`, `core` and the search index in a new database beside
the live one and swaps it in; until then the explorer says the data could not be loaded.
Expected: 5 to 15 minutes (image builds), little CPU, under 3 GB. Resume: rerun the command. Progress: `docker compose ps`, `docker compose logs db --tail 20`.

### 2. Fetch ADR's 2021+ quarterly exports into the raw archive

```bash
nohup docker compose run --rm -T pipeline fetch-datagov >> ~/grivei-data/fetch.log 2>&1 &
nohup docker compose run --rm -T pipeline fetch-mf >> ~/grivei-data/fetch-mf.log 2>&1 &   # the Ministry of Finance list of public entities (the Coverage grid's N of M); after the first finishes
```

Expected (estimate): tens of minutes to a few hours, several GB (`du -sh ~/grivei-data/raw`), about 1 s between requests, low CPU and memory. Exit 1 means at least
one resource failed. Resume: rerun the same command; everything archived is skipped, a cut download leaves only a scratch file. Progress: `tail -f ~/grivei-data/fetch.log`
(one line per resource). Look at every `unclassified` and `conflict` line: the Q2 2025 DAN file is a known mis-upload (a hand-entered known gap).

### 3. Validate the archive read-only (ticket #64c)

```bash
docker run --rm -v ~/grivei-data/raw:/archive:ro --entrypoint python grivei-pipeline -m pipeline --archive /archive validate   # CLI as built by #64c: check --help
```

**On the branch this page was written on, `pipeline validate` (ticket #64c) is not merged yet** (`python -m pipeline validate` is an unknown verb). The operator's header scan
found 2023Q2 to 2024Q3 Contracte files whose headers do not match (they would be quarantined by a load). When #64c is merged, run its verb first (mount the archive read-only: a
rebuild moves a failing unit into `<archive>/quarantine/`), fix every unit it rejects without a stated reason, and only then continue. Without it, step 5's rebuild does the same
validation and quarantines (that is reversible: `pipeline requeue --match TEXT`, then rebuild again). The image name above is Compose's default (`<project>-pipeline`); check `docker images`.
Expected: minutes, one file in memory at a time (xls files whole: up to a few hundred MB). Resume: it changes nothing, rerun.

### 4. (Optional, before the seed) crawl the quarters the bulk has not reached

```bash
export PIPELINE_CRAWL_START=2025-07-01            # where a first crawl starts when the archive has no crawl yet (default: after the last archived Contracte quarter)
nohup docker compose run --rm -T --no-deps pipeline crawl >> ~/grivei-data/crawl.log 2>&1 &
```

Expected: about 220 notices a weekday nationally, a quarter is 2 to 3 hours at the 0.35 s default delay, the five quarters after 2025 Q2 of the order of 10 hours; a day is a few MB.
Resume: rerun (complete days are skipped, a killed day resumes). Progress: `docker compose run --rm -T --no-deps pipeline status`, `tail -n 2 ~/grivei-data/crawl.log`.
The seed does not crawl; skip this step and the first nightly refresh catches up instead.

### 5. ANAF lookups and the load (full rebuild): `seed`

`seed` runs, in one locked, resumable run, `datagov` (steps 2 again, a no-op if done), `anaf` (about 600 requests at 1/s, under an hour plus a scan of the archive) and `load`
(the full rebuild). ANAF runs before the load, so identities and placement are right on the first load.

```bash
nohup docker compose run --rm -T pipeline seed >> ~/grivei-data/seed.log 2>&1 &     # add --backfill to also run step 6 as its last step
tail -f ~/grivei-data/seed.log
docker compose run --rm -T pipeline status                                         # rebuild, ANAF, crawl, backfill state; last runs; quarantines
```

By hand instead (the same steps): `$P anaf-lookup` then `$P rebuild`. Rebuild: hours (about 860 Records/s; 20M search rows is of the order of 6+ hours, estimate), 1.5 GB for the biggest DA
quarter in the pipeline container, 3 copies of the graph on disk during the build (live, `<db>_prev`, `<db>_next`; check `df -h` and the Docker volume's disk first), the db container busy on
up to 8 CPUs. It is one transaction: not resumable, a kill rolls back and the live graph is untouched; rerun the same command. The seed resumes at the failed step. Progress:
`tail -n 2 ~/grivei-data/seed.log` (one line per unit: `rebuild unit i/N ...`), `python -m pipeline status`. After it: read `status` for quarantines
(`<archive>/quarantine/**/reason.json`), fix the header alias or reader, `requeue --match TEXT`, rebuild again (`load-quarter 2023Q2` does both for one quarter).

**Acceptance A (full rebuild succeeds):** the log ends `rebuild done units=... quarantined=0 ...` and `seed run <id> ok`; `verify` passes on the live graph:

```bash
docker compose run --rm -T pipeline verify --db postgresql://grivei:$GRIVEI_DB_PASSWORD@db:5432/grivei
docker compose exec db psql -U grivei -d grivei -c "SELECT count(*) FROM seap.record" -c "SELECT count(*) FROM seap.search" -c "SELECT quarter, kind, state, records FROM seap.coverage_cell ORDER BY 1,2"
```

Expected on the real national load: of the order of 20M search rows (the benchmark's size). Record the real counts, duration and peak memory (`docker stats --no-stream`) in the closing comment.

### 6. The one-off 2021-22 backfill crawl

```bash
nohup docker compose run --rm -T --no-deps pipeline backfill >> ~/grivei-data/backfill.log 2>&1 &
docker compose run --rm -T --no-deps pipeline backfill --status                    # weeks complete per pass, no request sent
```

Expected: 6 to 10 hours (105 weeks, about 30,000 contract requests at 0.35 s minimum gap; estimate from the ticket), light CPU and memory. Resume: rerun the same command (complete weeks are skipped,
the interrupted week resumes); after 5 weeks failing in a row it pauses 10/20/40 minutes, then aborts: rerun later. It only writes the archive, so **run a `rebuild` after it** (`$P rebuild`, or the next
nightly refresh does it): the 2021-22 Records, the `no-publication` Signal and the Coverage cells need that load. The 2023-today pass only lists weeks whose bulk quarters are archived (it logs `waiting`
otherwise): run it again after the next `fetch-datagov`.

### 7. Enable the nightly schedule, backups and the dead-man's switch

1. healthchecks.io: a check with period 1 day, grace 3 days; its ping URL goes in `GRIVEI_HEALTHCHECK_URL`.
2. Backups (refresh steps `backup`, `pgdump`; restic, one encrypted repository on object storage): `RESTIC_REPOSITORY`, `RESTIC_PASSWORD` and the backend credentials in the systemd environment file.
   Unset = both steps skip with a warning and **the week would not be a backed-up week**. Try once: `$P backup all`, then rehearse a restore into a scratch directory
   (from a venv, with the same `RESTIC_*` variables: `.venv/bin/python -m pipeline restore archive ~/grivei-data/raw-restored`, then `diff -r ~/grivei-data/raw ~/grivei-data/raw-restored`; see `watchdog/README.md` "Backups and restore").
3. The timer: `deploy/README.md` "Schedule the refresh" (`systemctl --user enable --now grivei-refresh.timer`, `loginctl enable-linger`, the Windows logon task `deploy/windows/keep-wsl-up.ps1`; WSL needs `systemd=true`).
4. Try one run by hand first: `docker compose run --rm -T pipeline refresh` (then `pipeline status`: the last runs, what is due, quarantines).

Day 0 of the unattended week is the first night a timer-triggered run succeeds with the whole chain (crawl, datagov, anaf, load, backup) configured. Rollback of a bad switchover:
`pipeline rollback` (before the next nightly switchover replaces `<db>_prev`); `pipeline cleanup` drops the fallback.

## Acceptance

Run B right after step 5 (and again after step 6's rebuild), C after step 5, D and E at any time, F after seven days. Save every output under `~/grivei-data/bench/` and paste the findings into the closing comment.

### B. Latency: the keystroke benchmark (`pipeline bench`)

The spec's gate: every text query under about 500 ms on 8 vCPU, the empty and chips-only states served by the rollup, 2-character prefixes from the warmed cache. The harness
(`watchdog/pipeline/bench.py`, queries in `watchdog/pipeline/bench_queries.json`, 35 of them: 2-character prefixes, single and multi-token Romanian procurement terms, CUI, CPV, chips, the empty state) issues
the statements the API issues for one keystroke (total, both Money-lens sides, both entity tabs, the Records tab), in parallel on six connections, and reports per query the cold run and the warm median / p95 / max, per statement
and per task, as JSON and a table. Exit 1 when any query is over the threshold.

```bash
# 1. SQL mode inside the capped stack (the db container has cpus: 8): the first run of every query is "cold", the next five warm
docker compose restart db && sleep 30                  # a cold buffer cache (skip for a warm-only run)
docker compose run --rm -T -v ~/grivei-data/bench:/out pipeline bench --db-cpus 8 --repetitions 5 --json /out/bench-sql-$(date +%F).json
# 2. API mode: the persisted MainScreen operation over HTTP: the first request is the cache miss (unless warmed), the repeats are cache hits
OPID=$(python3 -c "import json;print([o['sha256'] for o in json.load(open('explorer/packages/contract/generated/persisted-queries.json'))['operations'] if o['name']=='MainScreen'][0])")
docker compose run --rm -T -v ~/grivei-data/bench:/out pipeline bench --api-url http://api:4000/graphql --operation-id $OPID --json /out/bench-api-$(date +%F).json
# a subset or your own list: --only "(empty)" --only ma ; --queries FILE.json ([{"label": ..., "filter": {RecordFilter fields}}] or bare strings)
```

How to read it. **Text queries** are judged on the whole keystroke (the slowest task), cold and warm p95, against `--threshold-ms` (default 500). **Empty and chips-only states** are judged on the rollup-served tasks
(total, entity tabs, Records count) and the report also checks with `EXPLAIN` that those read `seap.rollup_cube` / `seap.rollup_entity` and never `seap.search`. **Finding to confirm:** the Money lens map
(`searchMap`) has no rollup path in the API: for the empty and chips-only states it scans `seap.search` (about 0.8 s at 20M rows in the research); the API's result cache answers the empty state and the 2-character
prefixes from the warmed cache (`cache.ts` warms them after each load), but a chips-only state (a year, a channel) pays that scan on its first request. The SQL mode reports those scans apart (`--strict-maps` judges them); the
API mode (always judged whole) shows what a user sees. A chips-only state that the cube cannot serve (a badge, a partial date range) is reported as `chips-scan` and judged like a text query.
The harness prints the usable CPUs of the client container (2: the Compose cap) and the database's declared vCPUs (`--db-cpus`): the 8 vCPU target belongs to the database container.
Result "fail" is a finding, not a bug: compare with research section 4 (`origin/research/search-engine`), tune `shared_buffers`, parallel workers and the API pool, and decide on the fallback (OpenSearch) only with the numbers.

### C. Validation fixture: Brasov and Timisoara against the bulk-loaded graph (`pipeline check-fixture`)

```bash
docker compose run --rm -T -v $PWD/watchdog/data/raw:/batches:ro pipeline check-fixture --batch /batches/seap_brasov_2024_2026.json --batch /batches/seap_timisoara_2024_2026.json
```

The batches are the first harvest (`watchdog/data/raw/seap_*_2024_2026.json`, kept as the validation fixture by ADR 0002; they are not in the pipeline image, hence the mount). Each DA in state "Oferta acceptata" and each
contract (or, for a notice with no initiation procedure, its award notice) is compared with the graph **only when the graph holds a bulk file of that kind and quarter**: the Record must exist with the same code and value.
Output: matched/total per kind, the missing and differing codes, the quarters left out. #5 measured 152/152 DAs and 45/46 contracts, but where that scope came from is not recorded anywhere in the repo, so the check fails above 0
missing DAs and 1 missing contract (`--allow-missing-da`, `--allow-missing-contracts`) and prints the #5 numbers for comparison. If your totals differ from 152 and 46, say so in the closing comment and say which quarters were in scope.

### D. Coverage, methodology and all copy in both languages

- Copy parity (cheap, automated): `cd explorer && npm ci && npx vitest run --pool=forks --maxWorkers=4 packages/app/src/copy packages/app/src/signals/signalCopy.test.ts` (same keys in EN and RO, Romanian really Romanian, comma-below diacritics,
  the Signal wording without the forbidden words, the methodology copy quoting the Romanian labels). It checks the catalogue, not that every screen uses it.
- By eye (the explorer is served at `http://localhost:8080`): `/explore/coverage` and `/ro/explore/coverage` (the grid, the map, the status wording), `/explore/methodology` and `/ro/explore/methodology` (About the numbers / Despre cifre),
  the main screen, an entity page, a Record page and a Signal card in each language; no English on a Romanian page except source data (institution names, SEAP fields, document titles stay as published).
- The Coverage grid after the real load: `docker compose exec db psql -U grivei -d grivei -c "SELECT state, rule, count(*) FROM seap.coverage_cell GROUP BY 1,2 ORDER BY 1,2"`. Known data issues to show, not fix: the Q2 2025 DAN mis-upload, the 2024 Q4 Contracte file with 95k rows (flagged possibly-incomplete).

### E. Backups work

`$P backup all` ended without a warning; `restic snapshots` lists an `archive` and a `pgdump` snapshot; the restore rehearsal of step 7 matched byte for byte.

### F. A week unattended (`pipeline check-week`)

After seven nights of timer-triggered runs:

```bash
docker compose run --rm -T pipeline check-week            # the 7 UTC days ending yesterday; --through YYYY-MM-DD, --days N, --strict, --ledger FILE
```

Passes (exit 0) when every one of the seven days has at least one `refresh` run in `<archive>/refresh-ledger.json`, no run in the window raised an alert and none is still `running`. A transient failure that the next run
repaired raises no alert: it is printed as a note, and `--strict` turns it into a failure. Suspicious-success warnings (a quarantined file, a possibly-incomplete quarter) are printed as notes. Also confirm in healthchecks.io that
no `/fail` ping and no missed-ping alert came in the week (the ledger is the pipeline's own record; the check's history is the pager's). Read the unit's log: `journalctl --user -u grivei-refresh --since "7 days ago"`.

## Checklist (mirrors the ticket's acceptance criteria)

- [ ] Full rebuild from the real archive succeeds: steps 2 to 6, acceptance A (`rebuild done`, `verify` passes, record counts noted).
- [ ] Every text query in the benchmark answers under about 500 ms on 8 vCPU; empty and chips-only states come from the rollup: acceptance B (SQL mode and API mode JSON saved; `rollup_verified` true for the empty and chips states).
- [ ] Validation fixture agrees with the bulk-loaded graph: acceptance C (152/152 DAs, 45/46 contracts, or the explained difference).
- [ ] Seven consecutive days of refresh runs with no alert: acceptance F.
- [ ] Coverage, methodology and all copy present in both languages: acceptance D.
- [ ] Findings, and any defaults from the spec's Further Notes that changed, are recorded in a closing comment (template below).

## Closing comment template (ticket #91)

```markdown
## Release 1 acceptance

Run on <date range>, <commit>, <machine: CPUs, RAM, disk>, compose stack as in `compose.yaml` (db 8 CPUs / 12 GB).

### Rebuild
- fetch-datagov: <duration>, <size>; unclassified/conflict: <...>
- anaf-lookup: <duration>; rebuild: <duration>, peak memory <...>, Records <n>, search rows <n>, quarantined units: <none | list and reasons>
- backfill: <duration>, weeks failed/retried: <...>

### Latency (`pipeline bench`, <json files>)
- slowest text query: <label> <cold ms> / <p95 ms>; queries over 500 ms: <none | list>
- empty and chips-only states: rollup used <yes/no>; Money-lens map scan cold <ms> (served by the cache: <yes/no>)
- 2-character prefixes from the warmed cache (API mode): first <ms>, repeat <ms>

### Validation fixture
- DAs <m>/<n>, contracts <m>/<n> (#5: 152/152, 45/46); scope quarters: <...>; differences: <...>

### Unattended week
- <first night> to <last night>: <7> runs, alerts: <none>; transient failures: <...>; warnings: <...>

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
