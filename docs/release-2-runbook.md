# Release 2 runbook: ONRC and its Reference sources, the national rebuild, the latency gates and the unattended week

For the operator (a human, on the real machine). It proves the Definition of done of the [release recipe](release-recipe.md) section 11 for
Release 2 (ONRC, with annual financial statements, AEP's local elections, BaniPartide's firm donations and AMEPIP's public enterprises, and the First reuse) on real data: ticket #187 of spec #173. Nothing here runs in CI and no agent can do it: it needs the real services, the national ONRC download, hours of wall clock and a week of waiting.
It is the second Release, so it follows the shape of the [Release 1 runbook](release-1-runbook.md) and does not repeat what is unchanged there (the SEAP fetch, the geography, `validate`, the crawl, the lookups, the backfill, the timer and the backups): **Release 1's steps 1 to 9 are assumed done and its stack is running**. This page is what Release 2 adds.

Every command exists on this branch (`python -m pipeline <verb> --help` for each; each was checked against `watchdog/pipeline/cli.py`, `acceptance_cli.py` and `compose.yaml`). Verb details live in `watchdog/README.md` and `deploy/README.md`; this page is the
order, the costs and the checks. **Nothing in it was measured end to end**: the tickets #174 to #186 ran on fixture archives only (`bench-onrc` on fixtures answered in 3 to 16 ms; that proves the path, not the national register). Write the real numbers into the closing comment (template at the end).

## Conventions

**Placeholders.** Every figure that only a real run can give is marked **`[TO MEASURE]`** (with what to measure after a colon), so `grep -n 'TO MEASURE' docs/release-2-runbook.md` lists every number still owed; a number marked "estimate" comes from a ticket or from arithmetic and was never measured. Replace each marker in the closing comment, never leave one in a methodology section. A section that waits on a merge is marked **`[TO FILL when #185 merges]`**.

Shell setup is Release 1's (`.env` beside `compose.yaml`, `geo`, `P`). Release 2 adds two things to the `.env` and one to the API:

```bash
cd <repo root>                          # a stable checkout of the integration branch, not a throwaway worktree
P="docker compose run --rm -T pipeline"
# the secret of the keyed hash behind person ids (ADR 0011): 16 characters or more, from a password manager, NEVER in the repo; once chosen it never changes (the ids, and the identity overrides that cite them, would change with it)
(umask 077; printf 'GRIVEI_PERSON_ID_SECRET=%s\n' '<the production secret>' >> .env)
# the length check of step 3 proves the secret reached the pipeline without printing it; GRIVEI_RESTRICTED stays unset (acceptance F)
```

| Variable | Where | Release 2 value |
| --- | --- | --- |
| `GRIVEI_PERSON_ID_SECRET` | `.env`, passed to the `pipeline` service only | required: a rebuild that holds ONRC's people files and has no secret fails (there is no default) |
| `GRIVEI_RESTRICTED` | the `api` service (`compose.yaml` passes `${GRIVEI_RESTRICTED:-}`) | **unset, or absent from `.env`, on the machine that is proven here**: only the exact value `show` reveals Restricted content (ADR 0015). Do not set it for this run, except for the one comparison in acceptance F |
| `GRIVEI_DB_PASSWORD`, `GRIVEI_ARCHIVE_DIR`, `GRIVEI_GEO_DIR`, `GRIVEI_HEALTHCHECK_URL`, `RESTIC_*` | `.env` | as in Release 1; no other `GRIVEI_*` or `PIPELINE_*` variable was added by tickets #174 to #186 (grepped in `compose.yaml`, `deploy/`, `watchdog/pipeline` and `explorer/packages/api/src`) |

The ONRC fetch is detached and chunked (each snapshot is over a gigabyte): `nohup docker compose run --rm -T pipeline fetch-onrc --limit 10 >> ~/grivei-data/fetch-onrc.log 2>&1 &`. The memory, lock and "do not run beside a seed or refresh" rules of Release 1's Conventions apply to every verb below: **`fetch-onrc`, `fetch-aep`, `fetch-banipartide`, `fetch-financials`, `fetch-amepip` and `fetch-mf` do not take the lock**, so none of them may run beside a `seed`, a `refresh` or a `rebuild`. Stop the timer first (`systemctl --user stop grivei-refresh.timer`) and start it again at the end of step 4.

## What changes for the deploy: schemas that need a rebuild before the API

There are no migration files: the DDL lives in `watchdog/pipeline/sql/*_schema.sql` and is applied by the rebuild, into a new database beside the live one, which is then switched over (ADR 0004). **The API that reads these tables must be deployed only after a rebuild has created them** (the API degrades to empty or null on a missing `financials`, `aep` or donations table, but ONRC search, the Party filter, `core.source` and the entity overview's AMEPIP lookup (`store.publicEnterprise`, no guard: it errors on a missing `amepip` table) have none). New in Release 2:

| Where | Tables | Ticket |
| --- | --- | --- |
| `core` | `core.source` (the `sources` registry the API reads); `core.mf_principal` (principal credit holders of every held MF snapshot); `core.placement.placed_by` allows `ONRC`; `core.entity.provenance_source` allows `ONRC` | #174, #175, #180 |
| `onrc` (`onrc_schema.sql`) | `snapshot`, `registration`, `caen`, `status_name`, `status_span`, `name_span`, `search` (with the `onrc.search_bm25` pg_search index), `coverage_cell`, `role`, `person`, `possible_match`, `person_override` | #175, #176, #177 |
| `amepip` | `snapshot`, `enterprise` | #183 |
| `financials` | `source_file`, `statement` (also an additive index on `seap.rollup_entity`) | #179 |
| `donations` | `source_file`, `donation` | #182 |
| `aep` | `snapshot`, `mandate`, `gap`, `authority`, `subordinate`, `record_party` | #180 |
| `seap.search` | columns `party` and `party_basis`, both in the BM25 index; filled at the end of the `aep` step | #181 |

The rebuild's steps for them, in order, are `onrc`, `entities`, `placement`, `mf`, `amepip`, `aep`, `financials`, `donations`, `coverage`, `signals`, `record-indexes`, `rollup`, `search-index`, `analyze-search`, `onrc-search`, `commit`, `check` (`watchdog/pipeline/rebuild.py`). Per spec rule, **the user merges the schema PRs** (#175, #179, #180, #181, #182, #183): this runbook starts after they are merged into the branch that is checked out.

## Steps

### 1. Update the stack, check the disk, stop the timer

```bash
git fetch && git status --short            # the integration branch of #173, merged, clean
systemctl --user stop grivei-refresh.timer # nothing may write the archive from here to the end of step 4
docker compose build pipeline api web      # the pipeline image carries the new connectors and the new SQL
docker compose --profile pipeline config | grep -E 'RESTIC_REPOSITORY'
df -h ~/grivei-data/raw /var/lib/docker; free -g
docker compose exec db psql -U grivei -d grivei -c "SELECT pg_size_pretty(pg_database_size('grivei'))"   # the live Release 1 graph: the build needs three copies of the graph on disk at once (live, <db>_prev, <db>_next), now larger with ONRC
```

Do **not** `docker compose up -d` the API yet: the running API is Release 1's and still reads the Release 1 graph, which is right until the switchover. Expected (estimate, not measured): 5 to 15 minutes for the image builds, under 3 GB. Disk needed before step 2: the ONRC archive (**`[TO MEASURE]`**: disk used by `~/grivei-data/raw/onrc`; ticket #175 estimates about 72 GB for about 60 snapshots) plus the three graph copies (**`[TO MEASURE]`**: size of the national graph with ONRC).

### 2. Fetch the Release 2 Sources into the Raw archive

The first `seed` runs `datagov`, `amepip`, `financials`, `anaf`, `load` and **`onrc` last, after the load**, and the seed fetches neither AEP nor BaniPartide: **a seed's load would not contain ONRC, AEP or donations**. So fetch all of them first, then load with `rebuild` (step 4); do not use `seed` for Release 2 (a seed that finished in Release 1 skips its `load`, too). Every verb skips what it already archived and a kill loses at most the unit in flight.

```bash
# detached, one chain, stops at the first failure; each is resumable by rerunning the same command
nohup sh -c '
  docker compose run --rm -T pipeline fetch-mf &&
  docker compose run --rm -T pipeline fetch-amepip &&
  docker compose run --rm -T pipeline fetch-financials &&
  docker compose run --rm -T pipeline fetch-aep &&
  docker compose run --rm -T pipeline fetch-banipartide
' >> ~/grivei-data/fetch-ref.log 2>&1 &
tail -f ~/grivei-data/fetch-ref.log
```

What each takes (from the READMEs; **none measured nationally**): `fetch-mf` the newest monthly MF snapshot (about 4 MB; **it archives only the newest one, so `core.mf_principal` holds as many snapshots as you have fetched over time: the "contradicted tie" check needs more than one**); `fetch-amepip` one table of the newest release; `fetch-financials` every MF file from fiscal year 2021, about 100 MB per fiscal year (about 0.8 GB in all, **`[TO MEASURE]`** duration and size); `fetch-aep` about 400 MB (2020 and 2024 final minutes, the October 2020 repeat round, the December 2025 partial elections; **`[TO MEASURE]`** duration); `fetch-banipartide` under 0.5 MB, one-off.

Then ONRC, the big one, in chunks (a seed would run this step last; here it runs on its own, detached, and you may stop and rerun at any time):

```bash
nohup docker compose run --rm -T pipeline fetch-onrc --limit 10 >> ~/grivei-data/fetch-onrc.log 2>&1 &    # rerun the same command until a run says nothing is left to fetch
tail -f ~/grivei-data/fetch-onrc.log
du -sh ~/grivei-data/raw/onrc ; ls ~/grivei-data/raw/onrc/snapshot/firme | wc -l     # snapshots held (about 60 wanted: every monthly one from March 2026 and the last of each quarter back to 2021)
$P status                                                                           # the ONRC section: snapshots held, newest registrations, data-through, months with no snapshot
```

**`[TO MEASURE]`**: the first ONRC download: wall time, total size (estimate 72 GB), snapshots held, any `unclassified`, `conflict` or failed line; the real header variants of the 2021-2022 `legacy` layout (ticket #175 asks for this confirmation). A month between March 2026 and today with no snapshot is a known gap on the Coverage grid (acceptance D): note which. A snapshot archived before #177 has no people files until it is fetched again (an empty archive has none of this; a partial one may). Exit 1 means a resource failed: rerun.
The Raw archive is now the largest it has been; run the backup (`$P backup all`, Release 1 step 9) once this step is done so the new units are in the restic repository before anything is rebuilt.

### 3. Dry checks before the long rebuild

```bash
$P status        # per Source: counts, cursor, data-through. Expect ONRC, AMEPIP, AEP (rounds held, the 2025 one-off's data-through), financials (fiscal years held) and BaniPartide (copy, rows, data-through year) to show
docker compose --profile pipeline run --rm -T --entrypoint python pipeline -c "import os; print(len(os.environ.get('GRIVEI_PERSON_ID_SECRET','').strip()) >= 16)"   # True, or the rebuild stops at its first ONRC people file
```

There is **no tooling** for a trial rebuild of a subset: the graph is derived whole from the archive. The first `rebuild` is the trial.

### 4. The one national rebuild with ONRC, and the switchover

```bash
nohup docker compose run --rm -T pipeline rebuild >> ~/grivei-data/rebuild-r2.log 2>&1 &     # beside the live graph, checked against it, then switched over; one transaction, a kill rolls back and the live graph is untouched
tail -n 2 ~/grivei-data/rebuild-r2.log        # one line per step and per unit
$P status                                     # the rebuild's progress file
```

**`[TO MEASURE]`**: rebuild wall time overall and per step (`onrc`, `aep`, `onrc-search`, `signals` are the new ones; the `onrc` step compares ~60 consecutive snapshots in SQL, and ticket #175 notes a `status_span` index or partition as a follow-up if it is slow at national volume); peak memory of the pipeline container and of `db` (`docker stats --no-stream` every few minutes; the pipeline container is capped at 2 GB and ONRC files are over 1 GB each, so an out-of-memory kill is possible: if it happens, raise the cap with a compose override file and record it); peak disk (`df -h`); counts: `onrc.registration`, `onrc.search` (the step line reads `onrc search: N registrations indexed; M sole traders (PFA, II, IF) left out`), `onrc.role`, `onrc.person`, `financials.statement`, `donations.donation` (loaded vs dropped), `amepip.enterprise`, `aep.mandate`, `aep.gap`, `seap.record`, `seap.search`, `seap.signal`, entities with provenance ONRC.
It needs three copies of the graph on disk during the build; the db container is busy on up to 8 CPUs. Resume: not resumable, rerun the same command. Rollback of a bad switchover: `$P rollback` (before the next switchover replaces `<db>_prev`); `$P cleanup` drops the fallback.
If the rebuild stops on a vacancy (`aep/mandates.py` raises "vacancy date ... is before the 2024 mandates start" or "... is on or after the partial election"; ticket #180), fix `watchdog/pipeline/aep/data/vacancies.csv` (a human decision, see "Open human decisions"), rebuild the image and rerun.

**Acceptance A (full rebuild with ONRC and the four Reference sources succeeds and switches over):** the log has `rebuild done units=... quarantined=N ...`, **every quarantined unit has a stated reason you accept and is named in the closing comment**, the summary names no ONRC, AEP, MF, financials or donations file that "did not read" without a reason you accept, and:

```bash
$P verify                                       # the switchover's checks on the live graph; exit 1 if any fails
docker compose exec db psql -U grivei -d grivei <<'SQL'
SELECT id, name, schema_name, record_kinds, lenses FROM core.source ORDER BY position;   -- the registry rows: SEAP and ONRC
SELECT count(*) FROM onrc.snapshot; SELECT count(*) FROM onrc.registration; SELECT count(*) FROM onrc.search;
SELECT count(*) FROM financials.statement; SELECT count(*) FROM donations.donation;
SELECT count(*) FROM amepip.enterprise; SELECT count(*) FROM aep.mandate; SELECT count(*) FROM core.mf_principal;
SELECT count(*) FROM seap.record; SELECT count(*) FROM seap.search;
SQL
```

Record the real counts in the closing comment. Also read two lines of the rebuild log, which the reports ask a human to judge on real data: the `aep:` line (`N attributed authorities, M subordinate bodies, Party on K Records`) and the `amepip list:` line (`... X of them entities of the graph`). **`[TO MEASURE]`**: attributed authorities against the roughly 3,200 UATs and 41 county councils (ticket #180 follow-up 1: list the unmatched UATs and, if the matching misses real ones, build a reviewed `watchdog/pipeline/aep/data/authority_overrides.csv`); the AMEPIP public enterprises and how many matched an entity (ticket #183 follow-up 8: look at a sample of the matches by eye).

**Before the timer starts again: its first night rebuilds everything.** `fetch-*` and `rebuild` write nothing to the refresh ledger, so the ledger's last `load` marker is still Release 1's, and the first timer-triggered refresh finds "the archive changed since the last load" and runs `load`: a second full national rebuild and switchover (three graph copies on disk again, and it replaces `<db>_prev`, which closes the `$P rollback` window of this step). Every new refresh step (`onrc`, `amepip`, `aep`, `financials`, `banipartide`) has no success in the ledger either, so each runs that first night. **`[TO MEASURE]`**: that night's `load` duration and peak disk. Do any rollback of this step **before** the timer starts, and make sure the disk has room for the second rebuild (a follow-up could record a `load` marker at the end of a hand `rebuild`).

Only now:

```bash
docker compose up -d --build api web             # the API reads the new graph; then open http://localhost:8080/explore ; wait for `docker compose logs api | grep 'cache warmed'` before any API-mode benchmark
systemctl --user start grivei-refresh.timer      # the timer again (read the warning below first: night 1 is a full rebuild); day 0 of the week is in acceptance G
```

### 5. Review the Party coverage and the placement of ONRC

The Party chip states its own coverage (direct versus subordinate, and the share of value left unattributed). ADR 0012 quotes about 30.5% of awarded value from earlier research; ticket #127 measured **26.0% on the local national graph**; the Release build gets its own figure. Measure it on the live graph, by the same grouping the API uses (`searchPartyCoverage`, copied in `pipeline/bench.py`):

```bash
docker compose exec db psql -U grivei -d grivei -c "
SELECT coalesce(party_basis, 'NONE') AS basis, (party IS NULL AND party_basis IS NOT NULL) AS independent,
       round(100.0 * sum(sh) / sum(sum(sh)) OVER (), 1) AS pct_of_value, count(*) AS records
FROM (SELECT party, party_basis, record_code, sum(share_bani) AS sh FROM seap.search GROUP BY party, party_basis, record_code) g
GROUP BY 1, 2 ORDER BY 1, 2"
```

`DIRECT` is the authority's own Mandate, `SUBORDINATE` the inherited one through the principal credit holder, `NONE` (null) no Mandate; an Independent leader has a basis and no party, which the `independent` column splits out (the API counts it apart too), so read "together" with or without them. **`[TO MEASURE]`**: Party coverage as a share of awarded value: DIRECT ___%, SUBORDINATE ___%, together ___% (vs 26.0% local, 30.5% earlier research); the same per year 2021 to today if you want the trend. Say in the closing comment which one the methodology text should use, and fix every place that quotes a figure (below, acceptance C).
Check also: `ls geo/counties.topo.json` still present; the Unplaced tile of the ONRC count lens holds the registrations with no county; **`[TO MEASURE]`** how many.

## Acceptance

Run B right after step 4, C and D after B, E at any time, F with `GRIVEI_RESTRICTED` unset, G after seven days. Save every output under `~/grivei-data/bench/` and paste the findings into the closing comment.

### B. Latency: ONRC search and the Party-filtered SEAP search

The targets: **ONRC search under about 500 ms** (the spec: "the same as SEAP"), and the **Party-filtered SEAP search under the same threshold**, which is the benchmark's default (`--threshold-ms`, 500; every query judged on cold and warm p95). Two harnesses, both exit 1 on any query over the threshold; a failing query is a result to report, not a bug (ticket #181 suggests precomputing Party coverage into the rollup, #176 caching ONRC search, if the numbers need it).

```bash
# 1. ONRC: 17 queries (2-character prefixes, a CUI, a registration number, a CAEN code, every chip alone and all together; the statements of one keystroke: the match count, the Organisations page, the count lens)
docker compose restart db && sleep 30
docker compose run --rm -T -v ~/grivei-data/bench:/out pipeline bench-onrc --db-cpus 8 --repetitions 5 --json /out/bench-onrc-$(date +%F).json
# 2. SEAP with the Party filter: the shipped list holds three party queries (labels contain "party"), judged like text queries; the whole list reruns Release 1's gate too (SEAP's gate must still hold with the new party columns in the index)
docker compose run --rm -T -v ~/grivei-data/bench:/out pipeline bench --db-cpus 8 --repetitions 5 --only party --json /out/bench-party-$(date +%F).json
docker compose run --rm -T -v ~/grivei-data/bench:/out pipeline bench --db-cpus 8 --repetitions 5 --json /out/bench-sql-$(date +%F).json
# 3. API mode for SEAP (Release 1's step: wait for `cache warmed`, then OPID as in release-1-runbook acceptance B)
```

**`[TO MEASURE]`** (copy from the JSON): ONRC slowest query (label, cold ms, warm p95 ms), queries over 500 ms (none or the list); **ONRC count lens** time; Party-filtered queries: the three labels with cold and p95, and the `party_coverage` task apart (one grouped scan of `seap.search` per Party-filtered request, which ticket #181 asks to be timed alone); the time of the `aep` step's `UPDATE seap.search` (from the rebuild log, step 4); whole-list SEAP result. The fixture figures (3 to 25 ms) prove nothing about the national graph. The ONRC search benchmark excludes sole traders, as the search does.
The Source picker's two counts (SEAP and ONRC for one query) come from the same statements as the two searches: if either search is fast, the picker is. Open it once by eye on a 2-character prefix and on a CUI and note the time (manual: there is no harness for the picker).

### C. Firing rates re-measured, and the methodology sections

The rates are not typed anywhere by the code: the rebuild stores them per rule in `seap.signal_rule` (`base_rate`, `base_rate_year`, `authorities`, `with_signal`) and the methodology page serves them, recomputed at every load. Read them from the Release build:

```bash
docker compose exec db psql -U grivei -d grivei -c "SELECT slug, base_rate_year, authorities, with_signal, round(100*base_rate::numeric, 2) AS pct, window_from, data_through FROM seap.signal_rule ORDER BY slug"
docker compose exec db psql -U grivei -d grivei -c "SELECT rule, count(*) FROM seap.signal GROUP BY 1 ORDER BY 1"    # Signals per rule
```

The rules (`explorer/packages/app/src/copy/methodologyEn.ts`, `rules`): the four of Release 1 (`OVER_CAP`, `SPLITTING`, `FRAMEWORK_OVERRUN`, `NO_PUBLICATION`) and six of Release 2 from #184 (`YOUNG_FIRM`, `NO_CONSTRUCTION_CAEN`, `AFTER_STRIKE_OFF`, `INSOLVENCY`, `FEW_EMPLOYEES`, `NO_FINANCIAL_STATEMENT`), then the two of #185 (below). Note `INSOLVENCY` is measured over the six months to ONRC's newest snapshot, the others over a calendar year (the newest fiscal year held for `FEW_EMPLOYEES`).
**`[TO MEASURE]`**, one line per rule: firing rate (share of authorities with a Signal), authorities, with_signal, window; compare each with the rate ticket #127 measured on the local graph (in the #127 issue or its closing comment; if a rate is not there, say so and record the new one without a comparison) and say which differs by more than a few points.
**The no-turnover share** (methodology section `financialStatements`, written as "about a quarter of the rows (24%) report no turnover", a **placeholder from the ticket text, never measured**, marked `#187` in a comment in `methodologyEn.ts` and `methodologyRo.ts` and asserted in `methodology.test.ts` line 66): **`[TO MEASURE]`**:

```bash
docker compose exec db psql -U grivei -d grivei -c "SELECT fiscal_year, count(*) AS rows, round(100.0*count(*) FILTER (WHERE turnover_bani IS NULL)/count(*), 1) AS pct_no_turnover FROM financials.statement GROUP BY 1 ORDER BY 1"
```

Then write the measured figure into the methodology copy in **both languages and the test** (the three places above), and write the Party coverage figure of step 5 wherever a section quotes one (`partyAndLeadership` in both copy files; ADR 0012 says "about 30.5%": add a dated note there if the Release build differs, do not rewrite history). **Methodology sections that must exist and be re-read against the national build** (`sections` in the same files): `partyAndLeadership`, `financialStatements`, `firmDonations`, `publicEnterprises`, `onrcRegister`, plus the ten rule sections above (the four of Release 1 and the six of #184; twelve once #185 is in); each states its data-through date (financials: the newest fiscal year held; AEP: the elections loaded; BaniPartide: the last year; AMEPIP: the publication day; ONRC: the newest snapshot). Check each date on `/explore/methodology` against `$P status`.
Check the registry's methodology anchor for ONRC: `watchdog/pipeline/sources.py` still points ONRC at `supplier-identity` ("until the methodology page has an ONRC section"), and `onrcRegister` now exists: point it at that section's anchor (the page's anchor for a section is `onrc-register`, from `explorer/packages/ui/src/domain/utils/methodologyAnchors.ts`), a one-line change checked by `watchdog/tests/test_sources_registry.py`.

#### C2. Cross-Source Signal rules of #185 (donor to Party; SOE board member, Restricted): **[TO FILL when #185 merges]**

#185 was not merged when this runbook was written. When it merges, fill in here, in the same form as C: the rates from `seap.signal_rule` for the donor-to-Party rule and (Restricted) the SOE-board rule; the `firmDonations` section's rewritten last paragraph (#185 and #186 conflict there: #185's paragraph, then #186's BaniPartide paragraph, then `onrcRegister`); the party-name equivalence table (versioned, a reason per entry: a human reviews it against the real BaniPartide party names, **`[TO MEASURE]`**: how many donations matched a Mandate's list or an alliance member, how many parties are unmatched, how many matched only through a derived Party); and that the SOE rule's counts, its Records and its **firing rate are absent unless `GRIVEI_RESTRICTED=show`** (acceptance F must include the SOE Signal once #185 is in: no Signal, no count, no methodology rate). Also add its row to the closing comment's rate list.

### D. Coverage, the Source selector, and all copy in both languages

- ONRC on the Coverage lens and on the Coverage page. The lens is the ONRC screen's map lens: open `/explore/?source=onrc&lens=coverage` and `/ro/explore/?source=onrc&lens=coverage` (the same cells as below, on the map). The page: `/explore/coverage?source=onrc` and `/ro/explore/coverage?source=onrc` (SEAP's page is the one without the parameter; the selector switches between them). Expected: one cell per snapshot read (`LOADED`, its date, the registrations it lists), one `KNOWN_GAP` cell per calendar month since March 2026 with no snapshot, the data-through date of the newest snapshot, and "no denominator" stated as such (`denominator: NONE`; the grid has 42 counties and no National row). Check it against the database:

```bash
docker compose exec db psql -U grivei -d grivei -c "SELECT kind, state, count(*), min(period), max(period) FROM onrc.coverage_cell GROUP BY 1,2 ORDER BY 1,2"
```

  **`[TO MEASURE]`**: snapshots read, gaps (which months). Then the SEAP grid as in Release 1 (`SELECT state, rule, count(*) FROM seap.coverage_cell GROUP BY 1,2`): the Release 1 known issues are unchanged.
- Copy parity (automated; from `explorer`): `npm ci && npm test --workspace @grivei/app -- src/copy src/signals/signalCopy.test.ts` (same keys in EN and RO, the Signal wording without forbidden words, the methodology copy quoting the labels the pages show). It checks the catalogue, not that every screen uses it.
- By eye, both languages, `http://localhost:8080` and `/ro/`: the Source picker with its two counts on a query; an ONRC search with every filter chip and its URL (`?source=onrc` last), the count lens map; an ONRC entity page (registration date, status with its "first seen" or "since at least" wording, CAEN, seat, administrators with birth year only, financial figures, donations); a supplier page with the awards-as-a-share-of-turnover line and the firm-donor line; a town hall page with its Leadership list, the switched-party warning and the gaps; a subordinate body with its inherited Party and basis; the Party chip with its coverage statement; the Records-tab Source switch; Coverage; Methodology. No English on a Romanian page except source data (institution names, SEAP fields, document titles).
- The wording left to a native reader (ticket #178 and #186): the missing-snapshot gap (EN "No snapshot of this month is held." / RO "Nu deținem niciun extras din această lună."; "extras" clashes with ONRC's paid "extras de registru"), the RO ONRC labels ("Radiată", "Întrerupere temporară", "Înmatriculată", "Data înmatriculării"), `ro.ts` line 323 "(curată)" (means "clean", not "curated"; only in the Private view), the "comerciant persoană fizică" wording for sole traders. See "Open human decisions".
- The landing page (`site/`, `/ro/`): ONRC's row is `wip` in `watchdog/pipeline/sources.py` (`landing_row`) and in both `site/index.html` and `site/ro/index.html`; **this is the Go-live flip**: when the user decides Release 2 is public, change it to `live` in all three (the row order `live`, `wip`, `next`, `skipped` and the bar and summary fallback in the markup must stay in step, `site/CLAUDE.md`; `watchdog/tests/test_sources_registry.py` checks the three agree). Not part of the acceptance; record the decision.

### E. Backups cover the new Sources

`$P backup all` ended without a warning after step 2, so the archive holds the Release 2 fetches; but its `pgdump` (if any) predates the rebuild and holds the Release 1 graph. After the switchover run `$P backup dump` (or `all`) and check the snapshot list (`docker compose run --rm -T --entrypoint restic pipeline snapshots`): an `archive` snapshot newer than the ONRC fetch and a `pgdump` snapshot newer than the switchover. That `pgdump` holds `withheld.natural_person_name` (ADR 0003 as amended) and `onrc.person`: treat the repository as personal data (`watchdog/README.md`, "Backups and restore"). **`[TO MEASURE]`**: archive snapshot size and the backup's duration with ONRC in it.

### F. Restricted check with the switch off, on the national build

Go-live follows ADR 0015: public except Restricted content, and the API enforces it in the resolvers (a Restricted field is `null`, a Restricted count is not served). `GRIVEI_RESTRICTED` is read once, when the API starts; only the exact value `show` reveals. Prove on the national build that the switch off serves none. There is no harness for the national build (`explorer/packages/api/test/restricted.test.ts` runs the fixtures: unset, another value and `show`); do the check by hand, against the real API through Caddy, persisted queries only (`PersonPage` and the others are in `explorer/packages/contract/generated/persisted-queries.json`; a body is `{"id": "<sha256>", "variables": {...}}`).

```bash
[ "$(docker compose exec -T api printenv GRIVEI_RESTRICTED)" != show ] && echo "switch off"   # compose passes ${GRIVEI_RESTRICTED:-}: the variable is set to an empty string, so printenv prints an empty line with rc=0. If `.env` or your shell sets it to `show`, unset it and `docker compose up -d api`
PID=$(python3 -c "import json;print([o['sha256'] for o in json.load(open('explorer/packages/contract/generated/persisted-queries.json'))['operations'] if o['name']=='PersonPage'][0])")
for id in $(docker compose exec -T db psql -U grivei -d grivei -Atc "SELECT id FROM onrc.person ORDER BY id LIMIT 5"); do
  curl -s localhost:8080/graphql -H 'content-type: application/json' -d "{\"id\":\"$PID\",\"variables\":{\"id\":\"$id\"}}"; echo
done                                                                       # every answer must be {"data":{"person":null}}
```

Also, with the switch off, by eye and by the JSON of the pages' own operations (`EntityOverview` of an organisation with administrators; the browser's network tab): no person link on an administrator row (an administrator is named, with name and birth year, on an organisation tied to public money, which is the public tier; the link to the person page is Restricted), no cross-organisation role list or role count anywhere, and **no SOE-board Signal, count or methodology rate** (once #185 is in; section C2). Two more by-hand checks of the public-tier boundary on national data (spec #173: administrators are named only on organisations that are SEAP counterparties, and `restricted.test.ts` asserts it): `EntityOverview` of an ONRC-only organisation (a registration with no SEAP role) lists no holders; and the JSON of any holder shown carries a birth year only, never a full birth date, a birthplace, a CNP or a possible match. Then, once, for the comparison: set `GRIVEI_RESTRICTED=show` in `.env`, `docker compose up -d api`, repeat the loop (answers now hold a person), remove the line, `docker compose up -d api` and repeat it again (back to null). **Leave the switch off.**
**`[TO MEASURE]`** (record: pass/fail): the loop with the switch off, N ids, all null; the comparison with `show`; the `switch off` line; the ONRC-only organisation with no holders; no full birth date or birthplace in a holder's JSON; the methodology page's rule list has no SOE rule. A name past its source's Publication window is also Restricted (ADR 0016): none in Release 2 (no fund recipients yet), nothing to check.

### G. A week unattended (`pipeline check-week`)

The new refresh steps (each isolated, due from its last success: `onrc` every 28 days, or after 7 when the current month's snapshot is not held yet, capped at 2 snapshots per run; `amepip`, `aep`, `financials` every 7 days; `banipartide` every 28 days, a check that never loads) join Release 1's. Day 0 is the first night after step 4 in which a timer-triggered run succeeds with the whole chain. After seven nights:

```bash
docker compose run --rm -T pipeline check-week --timer-only    # the 7 UTC days ending yesterday; --through YYYY-MM-DD, --days N, --strict, --ledger FILE
docker compose run --rm -T pipeline status                      # the last 5 runs with every step's outcome, warnings, what is due
journalctl --user -u grivei-refresh --since "7 days ago"
```

Passes when every one of the seven days has a `refresh` run the timer started, none raised an alert and none is still `running`; `--strict` also fails a transient failure the next run repaired. Confirm in healthchecks.io that no `/fail` ping and no missed-ping alert came in the week. **A new step that was not due in the week was not exercised**: every new step runs on night 1 (none has a success in the ledger, see step 4), but `onrc` and `banipartide` (28 days) will not run a second time within the week, and **there is no tooling to force a step due** (a step's due time is its last success in the ledger; do not edit the ledger). Read `status` for each new step's last success and say in the closing comment which ones ran in the week and which were only configured; record the gap. A suspicious-success warning (a quarantined file, a possibly-incomplete quarter, `aep` reporting a newer upstream 2025 file, `banipartide` reporting a newer database) is a note, not an alert: record each, and decide whether to act (`fetch-aep --partial-again`, `fetch-banipartide --again`, both by hand with the timer stopped).
**`[TO MEASURE]`**: the ledger log, first night to last night, runs, triggers, alerts (none), notes; each new step's last success date; the nightly `onrc` step's duration with its 2-snapshot cap; the nightly `load` duration with ONRC in it. Attach the ledger (`~/grivei-data/raw/refresh-ledger.json`) or the `check-week` output. If the week had an alert, the week restarts after the fix.

## Open human decisions

Recorded by the tickets #174 to #186; none is blocking the runbook, but each needs a person before Go-live or a close. Replace the right column with the answer in the closing comment.

| # | Decision | From |
| --- | --- | --- |
| 1 | **Confirm or reject ADR 0018's SEAP-attachment consequence** (a SEAP Record naming a CUI that ANAF does not know but ONRC lists attaches to the ONRC-keyed entity); if rejected, revert the ADR 0018 bullet, the ADR 0003 amendment wording and two GLOSSARY lines. Link ADR 0018 from #173; PR #164 has overlapping glossary text | #174 |
| 2 | **Sole-trader (PFA, II, IF) names on public pages.** Today: ONRC-only entities include PFA/II/IF registrations named after natural persons (an open ADR 0009 question); search, the count lens and record lookup leave them out (#176); the narrower option is built for people (#177: IF members and PFA/II holders not named); BaniPartide donors that are sole traders are not loaded (#182). Decide the whole line together; "keep what was built and widen nothing" is the standing instruction | #175, #176, #177, #182, #186 |
| 3 | Which **`CALITATE` values** to serve on the public tier (today all of them, liquidators and legal-person holders included) | #177 |
| 4 | Roles are stored and served **from the newest snapshot that has people files only**, not from every snapshot (past holders are a follow-up) | #177 |
| 5 | **The production `GRIVEI_PERSON_ID_SECRET`**: choose, store outside the repo, never change | #177 |
| 6 | Whether the ONRC methodology anchor (decision 2 of #175), the "harvested" Coverage rule (decision 3) and the refresh cap of 2 snapshots per run (decision 10) stand (ticket #175's report: see the decisions it lists, posted on that issue) | #175 |
| 7 | The **missing-snapshot wording** on Coverage (EN "No snapshot of this month is held.", RO "Nu deținem niciun extras din această lună."), the RO word "extras" versus ONRC's paid "extras de registru", whether the picker's two counts share one basis, and whether `GapCell.quarter` becomes `period` | #178 |
| 8 | **Financials on the authority page?** (today on a supplier's or any organisation's page as context; whether an authority's page should show them) | #179 |
| 9 | The **oath and handover dates** (a mandate starts 30 days after the election; the OUG 21/2024 deadline is unverified), the **Bucharest vacancy date 2025-05-26** in `vacancies.csv`, and `alliances.csv` (written from memory: rebuild it from the real minutes); review the Party methodology prose | #180 |
| 10 | **Single versus multi Party filter** (a single party is built); review the EN/RO Party coverage copy and the new methodology paragraph | #181 |
| 11 | Strip **mislabelled individuals** (non-CUI rows in the firm table) from the Raw archive at fetch, not only at read | #182 |
| 12 | Is **excluding sole-trader donors** right, or should a PFA donor show as an organisation (ADR 0011)? Ties to decision 2 | #182 |
| 13 | **CC BY 4.0 attribution wording** for BaniPartide (Expert Forum) | #182 |
| 14 | Whether `faliment` belongs under the INSOLVENCY rule (included today), and the live ONRC `N_STARE_FIRMA` and `FORMA_JURIDICA` strings (confirm in acceptance C on the real build) | #184 |
| 15 | The 24% no-turnover figure and the Party coverage figure in the methodology copy: replace with the measured ones (acceptance C, step 5) | #186, #187 |
| 16 | Post the **resolution comments at close**: #179 (commit ref `931278b`), #182, #183 (access, licence, cadence; commit ref `1774887`) and #186: the drafts are held by the orchestrator of spec #173 (not in the repo), so ask for them before closing | #179, #182, #183, #186 |
| 17 | Native review of the RO copy: "(curată)" at `ro.ts` 323, "Radiată", "Întrerupere temporară", "Înmatriculată", "Data înmatriculării", "comerciant persoană fizică", RO "Partid"/"partid" capitalisation in `methodologyRo.ts` | #177, #178, #186 |
| 18 | **Go-live itself**: flip ONRC's `landing_row` from `wip` to `live` (acceptance D), keep `GRIVEI_RESTRICTED` off on the public host, and the privacy notice with its contact for corrections that ADR 0015 requires | ADR 0015 |
| 19 | #185's own decisions (the party-name equivalence table's reviewer, the SOE rule's supplier exclusion): **[TO FILL when #185 merges]** | #185 |

## Checklist (mirrors the ticket's acceptance criteria)

- [ ] The rebuild and switchover log is attached: steps 2 to 4, acceptance A (ONRC and the four Reference sources fetched, `rebuild done`, no quarantine without an accepted reason, `verify` passes, counts and peak memory and disk noted, the ONRC download's time and size noted).
- [ ] Benchmark results for ONRC search and the Party-filtered SEAP search are attached: acceptance B (`bench-onrc` JSON and `bench --only party` JSON, every query under about 500 ms or the finding explained).
- [ ] Re-measured firing rates are written into the methodology sections: acceptance C (every rule's rate from `seap.signal_rule`, the 24% no-turnover placeholder replaced in both languages and the test, the Party coverage stated at its measured figure against 26.0% and 30.5%, #185's rules once merged).
- [ ] ONRC's Coverage shows on the Coverage lens (`?source=onrc&lens=coverage`) and on the Coverage page, and all copy is bilingual: acceptance D (copy parity test green, both languages checked by eye).
- [ ] A week of the pipeline ledger with no alerts: acceptance G (and which new steps were exercised in it).
- [ ] A Restricted check against the national build with the switch off passes: acceptance F.
- [ ] A runbook for Release 2, in the shape of the Release 1 runbook, is committed (this page).
- [ ] Findings, the open human decisions and any default that changed are recorded in a closing comment (template below).

## Closing comment template (ticket #187)

```markdown
## Release 2 acceptance

Run on <date range>, <commit>, <machine: CPUs, RAM, disk>, compose stack as in `compose.yaml` (db 8 CPUs / 12 GB), `GRIVEI_RESTRICTED`: unset.

### Rebuild and switchover
- fetch-mf / fetch-amepip / fetch-financials / fetch-aep / fetch-banipartide: <durations>, <sizes>
- fetch-onrc: <duration>, <size>, <snapshots held>, months with no snapshot: <...>, unclassified/conflict/failed: <...>, 2021-22 `legacy` header variants: <...>
- rebuild: <duration>, per new step (onrc, aep, onrc-search, signals): <...>, peak memory (pipeline, db) <...>, peak disk <...>, quarantined units: <none | list and reasons>
- counts: onrc.registration <n>, onrc.search <n> (sole traders left out <n>), onrc.role <n>, onrc.person <n>, financials.statement <n>, donations.donation <loaded/dropped>, amepip.enterprise <n>, aep.mandate <n> (gaps <n>), seap.record <n>, seap.search <n>
- verify: <pass>; switchover: <ok>; rollback needed: <no>

### Latency (<json files>)
- ONRC search (`bench-onrc`): slowest query <label> <cold ms> / <p95 ms>; over 500 ms: <none | list>; count lens <ms>
- Party-filtered SEAP search (`bench --only party`): <label> <cold ms> / <p95 ms> each; `party_coverage` task <ms>; the `aep` step's `UPDATE seap.search` <duration>; whole SEAP list: <pass>
- Source picker by eye: <ms>

### Firing rates (written into the methodology sections at <commit>)
- <rule>: <pct>% (<with_signal> of <authorities>, <year or window>); vs #127 local: <same | differs: ...>   (one line per rule, #185's two included)
- no turnover: <pct>% of financial-statement rows (placeholder was 24%)
- Party coverage: DIRECT <pct>%, SUBORDINATE <pct>%, total <pct>% (vs 26.0% local, 30.5% research); quoted in: <places>

### Coverage and copy
- ONRC Coverage (lens and page, EN and RO): <snapshots, gaps>; parity test green; both languages checked by eye on <pages>

### Restricted check (switch off)
- `GRIVEI_RESTRICTED` in the api container: empty (switch off); PersonPage on <n> real ids: all null; no SOE-board Signal, count or rate: <yes>; comparison with `show`: <as expected>; switch left off: <yes>

### Unattended week
- <first night> to <last night>: <7> runs, triggers: <timer only | mix>, alerts: <none>; transient failures: <...>; warnings: <...>
- new steps exercised in the week: <onrc | amepip | aep | financials | banipartide>; only configured: <...>

### Open human decisions
- <the table of this runbook with the answers>

### Follow-ups
- <...>
```
