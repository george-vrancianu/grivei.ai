# Search engine: can Postgres meet the search model at 20M Records?

Research for [Search engine: can Postgres meet the search model at 20M Records?](https://github.com/george-vrancianu/grivei.ai/issues/19), against the search model decided in [Search model: what a query matches, how it filters the map, how hits rank](https://github.com/george-vrancianu/grivei.ai/issues/10) and the architecture in ADR 0001 (React + MUI, GraphQL over Postgres) and ADR 0002 (bulk-first SEAP seeding).
Researched 2026-11-11.

**Question.** Can Postgres (FTS and/or pg_trgm, with `unaccent`) return, on every keystroke and in under about 500 ms over about 20M Records, the text-filtered set's per-county RON (with consortium equal shares), the top 50 per tab ranked by matched RON, the tab counts and the matched field? If it can't, which engine should Release 1 use, how does it stay in sync with the nightly crawl and the quarterly bulk loads, and what does it cost a small team to run?

## Answer in brief

- **Plain Postgres can't meet the target. It does the text matching correctly, but not the aggregation.** Built-in FTS with an `unaccent` fold handles every matching rule: AND, last-token prefix, ş/ș and ţ/ț, legal-form stop-words, CPV prefix, CUI with or without `RO`. But each keystroke has to sum money over every matching row, and a row-store GIN plus heap path can't do that fast enough once a query matches more than about 50k rows. In the indicative benchmark (§4), a whole keystroke took 88 ms at 50k matches and 1.2 s at 150k. A single 2.2M-row match took 3.5 s just to count. pg_trgm doesn't help: it is a substring index with no prefix-of-word semantics, and a pattern of under 3 characters yields no trigram to look up (§2).
- **The dedicated search servers don't fit either.** Meilisearch facets return counts only, and its numeric `facetStats` are min/max only. Typesense returns sum/avg for a numeric facet over the whole result, not per county or per entity, and sorts groups by size, not by sum. Neither can rank suppliers by matched RON or colour the map, so Postgres would still do the hard part. OpenSearch can do it all, with terms plus sum sub-aggregations ordered by sum. But it is a second datastore with a JVM, a sync pipeline and a security setup, which is heavy for a small team (§3).
- **Recommendation: ParadeDB `pg_search`, a Postgres extension (AGPL-3.0 Community edition), on the same Postgres.** It adds a Tantivy-based index with columnar "fast fields" and Elasticsearch-style aggregations (`pdb.agg`), so filtering, the county sums, the top-50 entities by RON and the tab counts all run inside the index. Records stay in Postgres. The index updates in the same transaction as each load, so there is **no sync pipeline**.
- **Measured on the same 20M rows, it takes 19–480 ms per keystroke for every text query on 8 cores (§4).** That covers everything from 3 matches up to a 2-character prefix matching 7.5M rows. Only the empty query, which aggregates all 19.5M Records, exceeds the target (≈800 ms). That case is static between loads, so a rollup serves it. On 4 cores, anything matching more than ~2M rows misses the target, so Release 1 needs **8 dedicated vCPUs**, plus a result cache for 2-character prefixes.
- **Strategy:**
  1. one denormalised search table, one row per Record × winner, with the share precomputed and money in integer bani;
  2. a ParadeDB index over the folded text and every filter and aggregation column;
  3. one `SELECT` with six `pdb.agg` calls, plus a Top-K query and a count, run in parallel per keystroke;
  4. a precomputed rollup for the empty and chips-only states;
  5. a result cache keyed by the normalised URL state, invalidated after each load and warmed for 2-character prefixes;
  6. matched-field detection only for the 50 rows on screen.
- **Main risks:**
  - The benchmark is synthetic. The real token distribution is unknown, so the broadest real queries could match more rows.
  - Latency is CPU-bound, and concurrent broad queries compete for the same cores.
  - ParadeDB is young, and its SQL API has changed between minor versions.
  - Community has no physical replication of the index, so no HA or read replicas.
  - The AGPL licence needs a check.
  - Distinct-supplier tab counts above 65k groups are HyperLogLog estimates (about 0.1% off), not exact.

## 1. What each keystroke has to compute

From the search model's resolution (points 2–4, 6–8, 11, 13, 16):

| Piece | Shape | Why it is hard at 20M |
|---|---|---|
| Text filter | AND of tokens, last token as prefix, folded, stop-worded, CPV prefix, CUI ± `RO` | A 2-char prefix can match a third of all rows |
| Map | Σ RON per county, by authority county or by supplier county; consortium winners get equal shares | A full aggregation over every matching row |
| Tabs | Top 50 authorities and top 50 suppliers by Σ matched RON; top 50 Records by value | Supplier cardinality is ~300k, so you must aggregate before you can rank |
| Tab counts | Records, distinct authorities, distinct suppliers | `COUNT(DISTINCT)` over millions |
| Highlight | Which field matched, with the matched text | Needed only for the 50 visible rows |
| Budget | < ~500 ms from 2 characters, debounced 250 ms | Applies to every one of the above, together |

**A data shape that makes consortium shares cheap.** Store one search row per Record × winner (≈15M direct purchases with one winner each, plus ≈5M contract-winner rows ≈ 20M). Precompute `share = value / n_winners` and keep `wpos` (the winner's position, 0 for the first). Then:
- authority totals and authority-county totals are `Σ share`, which adds back up to the full value;
- supplier totals and supplier-county totals are `Σ share`, so nothing is counted twice (point 8);
- Records and their full value are the rows with `wpos = 0`.

The text document is per Record, so every winner row of a consortium carries all the winners' names, and a match on any winner matches the Record. A county click on supplier county keeps Records where any winner is in that county (point 7). With this layout, that is a filter on `supp_county` followed by a distinct on the record id, and only the Records tab needs the distinct.

## 2. Postgres text matching: fit to the rules

| Rule | Postgres mechanism | Source |
|---|---|---|
| Diacritics, incl. ş/ș and ţ/ț | `unaccent` filtering dictionary or `unaccent()` function. The shipped `unaccent.rules` maps ş (U+015F) and ș (U+0219) to `s`, and ţ (U+0163) and ț (U+021B) to `t` (checked in the PG 18 rules file, lines 174/178/320/322) | [unaccent docs](https://www.postgresql.org/docs/current/unaccent.html) |
| Case, punctuation | `simple` parser and dictionary lower-case and split | [Text search controls](https://www.postgresql.org/docs/current/textsearch-controls.html) |
| AND, last token as prefix | `to_tsquery('simple', 'a & b & c:*')`: "`*` can be attached to a lexeme to specify prefix matching" | [Text search controls](https://www.postgresql.org/docs/current/textsearch-controls.html) |
| Legal-form stop-words | A stop-word file on a `simple`-template dictionary (`$SHAREDIR/tsearch_data`, which needs root), or an IMMUTABLE `fold()` that strips `sc srl sa pfa ii snc` after joining dotted forms (`S.R.L.` → `srl`). The repo's `norm_company_name()` already does the latter | [unaccent docs](https://www.postgresql.org/docs/current/unaccent.html), `watchdog/sql/001_schema.sql` |
| CPV code prefix | Numeric tokens are lexemes, so `45:*` matches `45233140` | as above |
| CUI with/without `RO` | `fold()` rewrites `RO123…` → `123…` in both document and query; matches existing `norm_cui()` | `watchdog/sql/001_schema.sql` |
| Matched field | `ts_headline` "uses the original document … so it can be slow and should be used with care". Run it, or a per-field re-match, only on the 50 rows shown | [Text search controls](https://www.postgresql.org/docs/current/textsearch-controls.html) |

**pg_trgm is the wrong tool for the filter.** It matches substrings, not word prefixes: "Unlike B-tree based searches, the search string need not be left-anchored". So `co` would match inside `deco`. Each word is padded with "two spaces prefixed and one space suffixed", and "a pattern with no extractable trigrams will degenerate to a full-index scan" ([pg_trgm docs](https://www.postgresql.org/docs/current/pgtrgm.html)). It stays useful for fuzzy entity resolution, which is what `001_schema.sql` uses it for.

**Parallelism limits.** Postgres parallel aggregation "is not supported if any aggregate function call contains `DISTINCT` … or when the query involves `GROUPING SETS`" ([Parallel plans](https://www.postgresql.org/docs/current/parallel-plans.html)). Tab counts and a one-pass multi-grouping therefore run single-threaded. The keystroke's six aggregations become six separate scans that the API has to fan out over a connection pool.

**Folding gotchas.**
- Folding `să` gives `sa`, which collides with the `SA` legal-form stop-word. That is harmless for search, because `să` is a conjunction.
- A query made only of stop-words (e.g. `SRL`) folds to nothing. Treat it as the empty query.

## 3. Engine candidates against the model

| Requirement | Postgres FTS | ParadeDB `pg_search` 0.26 | Meilisearch | Typesense | OpenSearch |
|---|---|---|---|---|---|
| AND + last-token prefix | `a & b:*` | `doc &&& 'a'` + `pdb.regex('b.*')` (or `pdb.phrase_prefix`) | `matchingStrategy: all`, prefix search | `prefix` on the last word, default on; but `drop_tokens_threshold` drops words when results are few, so set it to 0 | `match_bool_prefix` with `operator: and` |
| Fold ş/ș ţ/ț, stop-words | `unaccent` + `fold()` | `ascii_folding=true` token filter, or index pre-folded text | built in | built in | `asciifolding` + stop filter |
| Σ RON per county | 2 scans | `terms` + `sum` sub-agg, in-index | **no**: `facetDistribution` is counts only, `facetStats` is min/max | **no**: numeric facet stats are sum/avg over the whole result, not per facet value | `terms` + `sum` |
| Top 50 entities by Σ RON | scan + sort | `terms` ordered by the `sum` sub-agg | **no** | **no**: groups sort by `_group_found` (size) | `terms` ordered by sub-agg; error unbounded across shards (`doc_count_error_upper_bound = -1`) |
| Distinct counts | `COUNT(DISTINCT)`, serial | HLL `cardinality`; exact `GROUP BY` up to 65k groups | facet counts | facet counts | HLL `cardinality` |
| Highlight | `ts_headline` | `pdb.snippet` | `_formatted` | `highlights[]` | highlighting |
| Sync with loads | n/a | **same transaction** | separate pipeline | separate pipeline | separate pipeline |
| New moving parts | none | an extension (`shared_preload_libraries`) | a service | a service | JVM cluster, TLS, security plugin |

Sources:
- [Meilisearch facet filters](https://www.meilisearch.com/docs/learn/filtering_and_sorting/search_with_facet_filters): facet distribution counts, `facetStats` min/max only, exhaustive counts slower.
- [Meilisearch settings](https://www.meilisearch.com/docs/reference/api/settings): `maxValuesPerFacet` 100, `maxTotalHits` 1000, matching strategies `last`/`all`/`frequency`.
- [Typesense search API](https://typesense.org/docs/latest/api/search.html): "For integer fields, Typesense will also return min, max, sum and average values"; `group_by` needs a facet field; sort groups with `_group_found`; `max_facet_values` defaults to 10; `prefix`; `drop_tokens_threshold`.
- [OpenSearch terms aggregation](https://docs.opensearch.org/latest/aggregations/bucket/terms/): ordering by a sub-aggregation, `shard_size` default `size * 1.5 + 10`, error not calculable when sorted by sub-aggregation.
- [OpenSearch match_bool_prefix](https://docs.opensearch.org/latest/query-dsl/full-text/match-bool-prefix/): last term as a prefix, `operator: and`.
- [OpenSearch Debian install](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/debian/): `vm.max_map_count`, replacing the demo TLS certificates, the security plugin.
- [ParadeDB aggregates](https://www.paradedb.com/docs/documentation/aggregates/overview) and [aggregate limitations](https://www.paradedb.com/docs/reference/aggregates/limitations.md).
- ParadeDB [match](https://www.paradedb.com/docs/reference/full-text/match.md), [phrase prefix](https://www.paradedb.com/docs/reference/full-text/phrase-prefix.md), [columnar](https://www.paradedb.com/docs/reference/indexing/columnar.md), [token filters](https://www.paradedb.com/docs/reference/token-filters/overview.md) and [highlight](https://www.paradedb.com/docs/reference/full-text/highlight.md).

**Meilisearch and Typesense are out.** They can filter, but the map and the RON ranking would still need Postgres to aggregate millions of matching ids, which is the very thing that is slow.

**OpenSearch is the fallback.** It can do everything here, but it brings:
- a second store to keep in sync with ADR 0002's quarter-wholesale replacements;
- JVM memory tuning;
- `vm.max_map_count`;
- certificates and the security plugin.

All of that falls on a small team, for a capability that ParadeDB brings into the existing Postgres.

**ParadeDB facts that matter here** (current docs):
- **Licence and editions.** Community is AGPL-3.0. "Aggregates and facets" are in Community; only high availability and read replicas are Enterprise ([editions](https://www.paradedb.com/docs/operate/deploy/enterprise.md)). An older docs page called faceting an enterprise feature; the current comparison table doesn't.
- **Transactions.** "All reads and writes go through Postgres' transaction engine" and respect isolation levels ([guarantees](https://www.paradedb.com/docs/concepts/guarantees.md)).
- **Replication.** Community "does not physically replicate the ParadeDB index", so the index exists only on the primary.
- **Aggregate pushdown limits.** Pushdown needs a ParadeDB predicate, or `pdb.all()` for no text. `GROUPING SETS`, `COUNT(DISTINCT)` on one table and wrapped aggregates (`COALESCE(SUM())`) fall back to Postgres.
- **Bucket cap.** `paradedb.max_term_agg_buckets` is capped at 65,000. Beyond that, the extension errors rather than silently dropping groups (observed).
- **Visibility.** `pdb.agg` defaults to `visibility => 'transaction'`. `'raw'` skips visibility checks, which is faster but can be stale.
- **MVCC cost.** The vendor's faceting benchmark puts the MVCC-off speed-up at roughly 3×. It reports 46M Hacker News rows, 159 ms at 1.77M matches and 1,054 ms over all 45.9M rows with MVCC on. That benchmark is vendor-run and its hardware isn't stated ([ParadeDB faceting blog, 2025-12-10](https://www.paradedb.com/blog/faceting)).

## 4. Indicative benchmark (synthetic data, local machine)

> **Indicative only.** These are synthetic rows on a 32-core WSL2 desktop, not production hardware. Each engine ran alone, and the container was CPU-capped where stated. Treat the numbers as orders of magnitude and use them to compare engines, not as a latency promise.

**Data.** 20,020,861 search rows for 19.5M Records: 15.5M direct purchases, and 4M contracts, 10% of them consortia of 2–4 winners.
- Titles are 3–8 words, drawn Zipf-like from about 190 real procurement words (with mixed ş/ș, ţ/ț and diacritic-free spellings) and 30k pseudo-words.
- There are 16k authorities (300 national) and 320k suppliers, the suppliers named with legal forms in every spelling.
- Each document also holds 9k CPV codes with descriptions, public codes `DA…`/`CAN…`, and CUIs, half of them with `RO`.
- Values are log-normal. 3% of Records carry Signals. Every entity has a county, and 1% of suppliers are unknown-county.

**Engines.**
- Postgres 18.6 with `unaccent` + `fold()` + a GIN index on `to_tsvector('simple', fold(doc))`. The heap is 6.9 GB and the GIN 2.3 GB.
- ParadeDB `pg_search` 0.26.6 on Postgres 18.6 (Docker image `paradedb/paradedb:latest`), indexing the same folded text with `pdb.simple('ascii_folding=true')` and every numeric column. The heap is 4.6 GB and the index 2.8 GB; the build took 2 min 11 s.
- Both ran with `shared_buffers` 6 GB, 8 parallel workers per query and warm caches. Both returned identical match counts for every query.

**One keystroke** = county Σ share by authority county and by supplier county, top 50 authorities and top 50 suppliers by Σ share, top 50 Records by value, the Record count, and distinct authority and supplier counts. Timed from a Python client: median and max of 5 runs (3 for Postgres), with statements fanned out over pooled connections.

| Query (chips) | Records matched | Postgres FTS, 7 stmts fanned out | ParadeDB, 6 SQL stmts | **ParadeDB, one-pass `pdb.agg`, 8 cores** | ParadeDB one-pass, 4 cores |
|---|---:|---:|---:|---:|---:|
| `faza noru` (supplier name) | 3 | 5 ms | 23 ms | **21 ms** | 20 ms |
| `10000504` (CUI) | 21,266 | 30 ms | 55 ms | **66 ms** | 115 ms |
| `45` (CPV prefix) | 49,668 | 88 ms | 78 ms | **79 ms** | 135 ms |
| `spital ur` | 149,049 | 1,216 ms | 121 ms | **102 ms** | 201 ms |
| `servicii cu` | 194,941 | 1,504 ms | 246 ms | **162 ms** | 293 ms |
| `furnizare` | 686,859 | 1,993 ms | 250 ms | **139 ms** | 266 ms |
| `primaria co` | 1,776,385 | 4,476 ms | 726 ms | **275 ms** | 502 ms |
| `deszapezire` | 2,159,200 | 6,035 ms | 563 ms | **191 ms** | 355 ms |
| `ma` (2-char prefix) | 3,623,493 | 6,803 ms | 1,029 ms | **301 ms** | 567 ms |
| `re` (2-char prefix) | 7,462,099 | 9,184 ms | 2,110 ms | **478 ms** (max 494) | 872 ms |
| *(empty)*, all Records | 19,500,000 | 11,099 ms | 5,000 ms | **834 ms** | 1,497 ms |
| `deszapezire` (2024–2026, contracts) | 221,535 | 4,574 ms | 93 ms | **77 ms** | 114 ms |
| `ma` (2025, one county) | 6,193 | 6,059 ms | 134 ms | **118 ms** | 289 ms |
| *(empty)* (2025, has Signals) | 97,593 | 3,408 ms | 90 ms | **93 ms** | 192 ms |

The ParadeDB one-pass column is from the 8-CPU-capped run. The uncapped run was within ±10%, except for `re`, which came in at 407 ms.

**What the numbers say.**
1. **Postgres FTS is fine up to about 50k matching rows and fails from about 150k.** The cost is the heap: a bitmap heap scan visits every matching row to read its amounts, and so does the `tsvector` recheck. A plain count of `deszapezire` (2.2M) took 3.5 s via the bitmap and 1.3 s via a parallel seq scan, before any aggregation. Chips don't rescue it. `ma` narrowed to one year and one county still took 6 s for 6k Records, because the broad text predicate is evaluated before the chips. Even the empty query with only chips took 3.4 s.
2. **ParadeDB's six SQL statements already push down GROUP BY, SUM and Top-K into DataFusion over the columnar index.** That made it 5–10× faster than Postgres. Only `COUNT(DISTINCT)` fell back, taking 9 s on 2.2M rows, so we use the HLL `cardinality` aggregation instead.
3. **The one-pass form is what makes it fit.** It is one `SELECT` with six `pdb.agg` calls (2 county `terms`+`sum`, 2 entity `terms` ordered by `sum`, 2 `cardinality`), plus a Top-K Records query and a count. Every text query fits on 8 cores. It returned **exactly the same top 50 suppliers and sums** as an exact SQL `GROUP BY` for `deszapezire`, `ma` and `re`.
4. **The empty query does not fit (~0.8 s), and on 4 cores nor does anything over ~2M matches.** The empty state and chips-only states change only when data loads, so they belong in a rollup.
5. **Tab counts.** HLL `cardinality` gave 222,890 suppliers vs 223,074 exact (−0.08%) and 16,023 authorities vs 16,000 exact (+0.14%). An exact count via `GROUP BY` is capped at 65,000 groups. A window `count(*) OVER ()` on the pushed-down `GROUP BY` is exact but took 470 ms at 2.2M matches.

**Sync costs measured on the ParadeDB table (8 cores).**

| Operation | Rows | Time |
|---|---:|---:|
| Nightly crawl-sized insert | 5,000 | 1.9 s |
| Quarter replacement, one transaction: `DELETE` | 835,256 | 6.0 s |
| … then `INSERT` | 834,592 | 17.9 s |
| `VACUUM` afterwards | — | 4.0 s |
| `ma` top-50 suppliers right after the replacement (dead rows not yet vacuumed) | 3.6M matched | 1,129 ms cold, 373 ms warm |
| … after `VACUUM` | | 121 ms |
| Full index rebuild (`CREATE INDEX`) | 20M | 2 min 11 s |

## 5. Recommended design

1. **Engine:** ParadeDB `pg_search` Community in the explorer's Postgres, with the version pinned. Its SQL changed across 0.20 → 0.26: `USING bm25` became `USING paradedb`, `key_field` was deprecated, and new operators were added. Self-host it, because the install docs offer Docker, a curl script and Postgres.app, and name no managed provider. The current docker image is Postgres 18.6.
2. **Search table** (`search_record_share`), rebuilt from the typed SEAP tables by the loader, in the loader's transaction:
   - ids: `rid`, `wpos`, `n_win`;
   - chip columns: `channel`, `award_year` (by award date, per point 4), `value_bani`, `has_signal`;
   - money: `share_bani`;
   - entities: `auth_id`, `auth_county`, `supp_id`, `supp_county`;
   - `doc`, the folded concatenation of title, authority name, supplier names, CPV code and description, public code and CUIs.

   Store money as **integer bani**: `pdb.agg` refuses `sum` on `NUMERIC` ("does not support aggregate pushdown (NUMERIC)"). Sums come back as f64, which is exact for integers up to 2⁵³ bani (≈ 90 trillion RON).
3. **Query translation:** fold the query with the same `fold()`. All tokens except the last go to `doc &&& '…'`; the last becomes `doc @@@ pdb.regex('<tok>.*')` with the token regex-escaped. Chips and the county become plain `WHERE` filters, which are pushed down to columnar fields. Over GraphQL, each keystroke runs three statements in parallel: the one-pass `pdb.agg`, the Top-K Records, and the Record count.
4. **County click on supplier county** keeps Records where *any* winner is in the county: filter rows on `supp_county`. The Records tab then needs a distinct on `rid`; use `wpos = 0` only when no supplier-county filter is set.
5. **Rollup for the empty and chips-only states:** a cube by year × channel × value bucket × has-Signals × authority county × supplier county, plus per-entity rows, refreshed after each load. This needs the **value-range chip to use preset buckets**, not a free range.
6. **Result cache** keyed by the normalised URL state (point 15). Invalidate it after each load and warm it nightly for every 2-character prefix with no chips (≈1.3k states at ≤ 0.5 s each, a few minutes). Cancel in-flight statements when a newer keystroke arrives, so a fast typist doesn't stack broad queries.
7. **Tab counts:** exact for Records. For entities, show the HLL estimate rounded ("≈223k suppliers"), and an exact count when below 65k groups. This is a small departure from "counts always agree" that the parent decision should accept or reject.
8. **Matched field and highlight:** for the 50 rows on screen only, re-test each raw field against the folded tokens, in SQL or in the API, and highlight there. Alternatively, index the fields separately and use `pdb.snippet`. That needs a test, because the AND-across-fields query then becomes an AND of per-field ORs.
9. **Sync with ADR 0002:**
   - The nightly crawl inserts and updates rows in its own transaction, and the index sees them on commit.
   - The quarterly bulk replaces a quarter wholesale in one transaction, as ADR 0002 already requires (all or nothing). Follow it with `VACUUM ANALYZE` of the search table, then rebuild the rollup and flush the cache.
   - If the index ever drifts or bloats, `REINDEX`/`CREATE INDEX` takes minutes, not hours.
10. **Sizing:** 8 dedicated vCPUs and 32 GB RAM, so heap, index and typed tables stay cached. Each broad query uses every core, so concurrency is the limit: cache, debounce, cancel. Only a primary: Community gives no HA or read replicas for the index. Backups and PITR are standard Postgres.

## 6. Open risks

- **Synthetic data.** The real Zipf tail and title vocabulary are unknown. Real "servicii"/"furnizare"/"lucrari" may match a larger share of rows than here. Re-run this benchmark on the first real national load before committing; the bench scripts are described in the appendix.
- **CPU-bound latency.** On 4 cores, 2-char prefixes take 0.5–0.9 s. Several concurrent broad queries on 8 cores will queue. The cache, debounce and cancellation are part of the design, not extras.
- **Young dependency.** API churn between minor versions. A single-vendor AGPL extension: running it unmodified as a server is the normal case, but confirm the licence fit. No managed-Postgres support listed. Community has no physical replication of the index.
- **Exactness.** Tantivy `terms` ordered by a sub-aggregation is computed per segment and merged, the same class of caveat as OpenSearch's per-shard error. The results were exact here, and keeping few segments (VACUUM after loads) helps, but it is not guaranteed in general. Entity tab counts above 65k are approximate.
- **Prefix semantics for numbers.** `45` also matches CUIs and codes that start with 45, not only CPV codes. If that is noisy, index the CPV code, CUI and public code as separate fields and route numeric tokens to them.
- **`visibility => 'raw'`** would roughly halve broad-query latency (vendor: ~3×). But between a bulk replacement and its VACUUM it could count dead rows, which is wrong for money totals. Don't use it.

## Appendix: reproduction

Generator: Python, deterministic seeds, 16 parallel writers piped into `COPY`, 20 s for 20M rows. Postgres side:

```sql
CREATE FUNCTION fold(t text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT regexp_replace(regexp_replace(regexp_replace(
           lower(public.unaccent('public.unaccent'::regdictionary, t)),
           '(\w)\.(?=\w)', '\1', 'g'),                    -- s.r.l. -> srl.
         '\m(sc|srl|sa|pfa|ii|snc|scs)\M', ' ', 'g'),     -- legal forms
       '\mro(\d{2,10})\M', '\1', 'g')                     -- RO123 -> 123
$$;
CREATE INDEX srow_tsv ON srow USING gin (to_tsvector('simple', fold(doc)));  -- stored as a column in the bench
```

ParadeDB side:

```sql
CREATE INDEX srow2_pdb ON srow2 USING paradedb (id, (doc::pdb.simple('ascii_folding=true')),
  rid, wpos, channel, yr, value_bani, share_bani, has_signal, auth_id, auth_county, supp_id, supp_county);

-- one keystroke, statement 1 of 3 (the other two: Top-K Records by value_bani, and count(*) with wpos = 0)
SELECT pdb.agg('{"terms":{"field":"auth_county","size":50},"aggs":{"s":{"sum":{"field":"share_bani"}}}}'),
       pdb.agg('{"terms":{"field":"supp_county","size":50},"aggs":{"s":{"sum":{"field":"share_bani"}}}}'),
       pdb.agg('{"terms":{"field":"auth_id","size":50,"order":{"s":"desc"}},"aggs":{"s":{"sum":{"field":"share_bani"}}}}'),
       pdb.agg('{"terms":{"field":"supp_id","size":50,"order":{"s":"desc"}},"aggs":{"s":{"sum":{"field":"share_bani"}}}}'),
       pdb.agg('{"cardinality":{"field":"auth_id"}}'),
       pdb.agg('{"cardinality":{"field":"supp_id"}}')
FROM srow2
WHERE doc &&& 'spital' AND doc @@@ pdb.regex('ur.*') AND yr BETWEEN 2024 AND 2026;
```

A single `pdb.agg` holding several named aggregations is rejected ("expected map with a single key"). Each aggregation needs its own call.
