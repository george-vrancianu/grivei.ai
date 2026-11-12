# @grivei/contract

The explorer's GraphQL contract. The API, the UI library and the app all build against it, so the frontend and backend tracks can run in parallel.

| Path | What it is |
| --- | --- |
| `schema/schema.graphql` | The SDL (Release 1: SEAP). No prose: slugs, enums, numbers and Romanian source data only. |
| `operations/*.graphql` | One named query per screen, plus shared fragments. **These are the persisted-query allowlist.** |
| `src/generated/operations.ts` | Operation result and variable types, enums and inputs, for the app. Generated. |
| `src/generated/schema.ts` | Schema types and resolver types, for the API. Generated. |
| `generated/persisted-queries.json` | The allowlist: per operation its name, `sha256` and self-contained document (fragments inlined). Generated. |
| `src/fixtures/` | Mock responses, several per operation (typical, empty, extreme). Hand-written, except the main screen, zoomed-county, full-results, entity Overview, Relationships and side-panel Records operations, which are recorded from seam 1 runs (`recorded/`). |
| `src/fixtures/recorded/` | The API's own answers to `MainScreen`, `ZoomedCounty`, `FullResults{Authorities,Suppliers,Records}` (after a real rebuild of `archive-moneymap`), `EntityOverview` (`entity.ts`; several archives), `EntityRelationships` and the side-panel `EntityRecords` (`relationships.ts`) (JSON, typed by `index.ts`). Never edit by hand. |
| `src/filter-keys.ts` | `RecordFilter` field to URL key table, for the codec (#42). |
| `src/value-buckets.ts` | The `ValueBucket` edges in bani, and `valueBucketOf`. |
| `src/validate-response.ts` | Checks a response against an operation: exact keys, nullability, enums, custom scalars, unions. |

## Commands (from `explorer/packages/contract`, or `explorer/`)

```sh
npm run codegen        # regenerate src/generated/* and generated/persisted-queries.json
npm run check          # codegen:check + typecheck + tests: what CI runs
npm test               # tests only
```

Generated files are committed. `npm run codegen:check` (part of `check`) fails when they are stale, and so does a test on the allowlist. After editing the schema or an operation, run `npm run codegen` and commit the result.

## Using it

```ts
import type { MainScreenQuery, MainScreenQueryVariables, RecordFilter } from "@grivei/contract";
import { fixtures } from "@grivei/contract/fixtures";          // mock responses, for stories and tests
import type { Resolvers } from "@grivei/contract/schema-types"; // for the API
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
```

The package exports TypeScript source (no build step); consumers compile it with their own toolchain. Custom scalars are plain strings in TypeScript: `Bani` (integer bani as a decimal string, so sums never lose precision), `Date` (`YYYY-MM-DD`), `DateTime` (ISO, UTC), `MapArea`, `AreaKey`, `CountyCode`, `Siruta`.

## Adding or changing an operation

1. Edit `operations/*.graphql` (name it, keep it a query) and run `npm run codegen`.
2. Add or update its fixtures in `src/fixtures/` (the tests fail if an operation has none, or a fixture does not match its operation exactly).
3. Fixtures are invented data (fictional CUIs and codes); SEAP's own vocabulary (procedure names, CPV) is real. Between them they must show every state listed in `src/observed-states.ts`, which is read off the data, not declared.

## Recorded fixtures (main screen, full results, entity Overview)

`MainScreen`, `ZoomedCounty`, `FullResultsAuthorities`, `FullResultsSuppliers` and `FullResultsRecords` are answered from `src/fixtures/recorded/<Operation>.json`: each entry is `{ name, kind, description, variables, data }` as the real API produced it (fixture archive `watchdog/tests/fixtures/archive-moneymap` -> `pipeline rebuild` into a throwaway ParadeDB -> the persisted query). The app's seam 3 tests render against them, so what the UI is tested with is what the API says. A few hand-written fixtures stay beside them for states a small archive cannot produce (pagination past 100 Records, HyperLogLog estimates, every Record state at once); they use variables no recorded case uses.

The cases (which request, on which archive) are listed in `packages/api/test/recordedCases.ts` (MainScreen and full results) and `recordedZoomCases.ts` (ZoomedCounty, #84). The seam 1 blocks "recorded fixtures (#83)" and "recorded fixtures (#84)" ask each of them and fail when an answer differs from the committed JSON, so the two seams cannot drift apart. To re-record after a change to the API, the pipeline or a fixture archive (needs Docker and `watchdog/.venv`; the test starts a `pp37-seam1-*` container capped at 3 GB and removes it):

```sh
cd explorer/packages/api
RECORD_FIXTURES=1 SEAM1_REQUIRED=1 npx vitest run --pool=forks --maxWorkers=2 test/seam1.test.ts -t "recorded fixtures"
git diff ../contract/src/fixtures/recorded   # review what changed, then run the app and ui tests
```

The entity Overview (#86): `recorded/EntityOverview.json`, loaded by `recorded/entity.ts`; cases in `api/test/recordedEntityCases.ts`, block "recorded fixtures (#86)". Hand-written fixtures stay beside the recorded ones only for states a small archive cannot cheaply produce (220 counterparties, eight spellings of one name, a deregistered ANAF status, a curated identity; `supplier-typical` stays until the other tabs are recorded). Its cases (on the archives `archive-roles` + `archive-roles-names`, `archive-signals`, `archive-moneymap`) are in `api/test/recordedEntityCases.ts`; the same command re-records both blocks.

The Relationships tab (#88): `recorded/EntityRelationships.json` and `recorded/EntityRecordsSidePanel.json`, loaded by `recorded/relationships.ts`; cases in `api/test/recordedRelationshipsCases.ts`, block "recorded fixtures (#88)". The hand Relationships fixtures (4000001/30000001) stay for the ui stories' extreme states.

The Record page (#85): `recorded/RecordPage.json`, loaded by `recorded/record.ts`; 29 cases (one Record per kind and state: DA, DAN, contract, award notice, suspect values, no value, framework and subsequent, consortia, natural person, identity badges, crawled, Signals, not found) in `api/test/recordedRecordCases.ts`, block "recorded fixtures (#85)", on seven small archives (counting, contracts, bulk, identity, crawl, signals, splitting; each code is asked in one archive only, because the fixture client answers by variables). Two hand fixtures stay in `record-page.ts` (a framework overrun with its Signal, #76; a Record with no public page); the first goes when #76 is recorded. The block also follows every bulk Record's `provenance.url` (the `/source/seap/<code>` redirect) through the real server against a fake upstream.

To add a case, add a line to `RECORDED_CASES` (or `RECORDED_ENTITY_CASES`, `RECORDED_ZOOM_CASES`) and re-record. The zoom sends the page's filter without `uat` plus `county`, so a UAT click is a MainScreen case (`county-with-uat`, `bucharest-with-sector`) and needs no ZoomedCounty one. There are no hand-written ZoomedCounty fixtures left: the archive's Bucharest has money in one sector only, the ui samples (`samples/uatMaps.ts`) keep the all-sectors-coloured picture for the map's own stories. Every answer is validated against its operation before it is written.

## `RecordFilter` and the URL

`RecordFilter` is the URL's search state, field for field. `RECORD_FILTER_URL` lists each field's query-string key and encoding (enum values are lower-cased with hyphens in URLs: `DIRECT_PURCHASE` is `direct-purchase`, `FRAMEWORK_OVERRUN` is `framework-overrun`). `tab`, `page`, the sort orders (`order`, `signalOrder`) and the main screen's map `lens` (`money` is the default and left out) are URL state outside the filter (`URL_ONLY_KEYS`). A test fails if a field has no key or a key has no field.

## `ValueBucket` edges

Preset buckets, so the rollup (a cube by year, channel, value bucket, has-Signals and county) can serve chips-only states. Each bucket is (previous edge, edge], upper edge inclusive, so a purchase exactly at a statutory cap is "at or under the cap". Records with no value match no bucket.

| Bucket | Up to (RON) | Source |
| --- | --- | --- |
| `UP_TO_10K` | 10,000 | round floor for small purchases (not statutory) |
| `UP_TO_135K` | 135,060 | direct-purchase cap, supplies and services, before 10 Sep 2022 |
| `UP_TO_270K` | 270,120 | the same cap from 10 Sep 2022 |
| `UP_TO_900K` | 900,400 | direct-purchase cap for works from 10 Sep 2022 |
| `UP_TO_9M` | 9,004,000 | 10x the works cap, top of the over-cap Signal band |
| `UP_TO_1B` | 1,000,000,000 | where contract values start being checked for suspect values |
| `OVER_1B` | no limit | |

The caps and 10x rule come from the counting rule (#23) in the Release 1 spec. The pre-2022 works cap (450,200) and the 10x of the supplies cap (2,701,200) are not edges: the caps change with date and type, so fixed edges can only approximate them, and every bucket edge added multiplies the rollup.

## Decisions taken settling the draft SDL

| Marker | Question | Decision | Why |
| --- | --- | --- | --- |
| Q1 | One search surface per Source, or a shared one? | Keep `seap { search, record }` and `entity.seap { ... }` | ADR 0005: search is per Source; ONRC etc. add siblings, joined only through entity keys. |
| Q2 | What goes in `RecordFilter`? | The 15 fields of the draft, nothing else; `tab`, `page`, `order`, `limit`, `offset` are arguments or URL-only state | The filter is the matching set; paging and ordering do not change it. Keeps the 1:1 URL mapping honest. |
| Q3 | How are bani serialised? | Decimal string (`Bani`), typed `string` in TypeScript | JSON numbers lose precision above 2^53; the fixtures include a sum above it. |
| Q4 | Paging for the result tabs | Offset/limit with `count`; ranked by matched awarded value, ties by key; limit capped at 200 server-side | Spec: "offset/limit with a count everywhere"; the full-results view pages through every Record. |
| Q5 | Where does the "estimated" flag live? | `Total.estimated` (kept from the spec, false in every fixture: Record counts are exact today) and a new `EntityResultPage.countEstimated` (the HyperLogLog distinct count) | The estimate is on distinct entity counts, which a `Total` does not carry; each count says for itself. |
| Q6 | Geography roots | Keep `counties` and `uats(county)` as keys and names; geometry stays static TopoJSON. Bucharest's UATs are its six sectors | Geometry is not data the API serves (ADR 0001, county-geometry prototype). |
| Q7 | `caveatAnchors` (Romanian copy for "why this badge") | Removed. Added `SeapRecord.suspect { rule threshold }` with a `SuspectRule` enum | "No copy in the API": the catalogue maps each badge and rule to its methodology anchor. The Record page still needs to know which suspect rule fired and its numbers. |

Changes the screens needed beyond the markers:

- `SeapEntity` exposes `roles` and `role(role: Role!)` instead of `asAuthority` / `asSupplier`, so one operation per tab serves both roles of the same entity.
- `Record` interface renamed `SourceRecord`: `Record` collides with TypeScript's built-in in generated resolver types.
- `MoneyMap.unplaced` is an `UnplacedTile { authorities, total }` (the tile shows an authority count); `Coverage.unplacedAuthorities` likewise.
- `uatMap` returns `UatMap { uats, unknownUat }`: the "known county, unknown UAT" row. `AreaTotal.entities` feeds the optional circle per UAT.
- `ValueBucket` is the preset list above.
- `GapCell` carries `rule: GapRule` (a slug the catalogue words) and `note` (the gap file's own text, source data, only for `HAND_ENTERED`), not a prose `reason`.
- The Money lens side is the filter's `countySide` only: `MoneyMap` and `UatMap` take no `side` argument and the operations no `$side` variable. The zoomed county is authority-side only (UATs place authorities; the search table carries a supplier's county, never its UAT), so `RecordFilter.uat` and `uatMap` are too. A supplier's Flow lens is drawn on the authority side, an authority's on the supplier side.
- `Entity.provenance` (ANAF, or SEAP when ANAF has no answer) and `Provenance.kind` (`BULK`, `CRAWL`, `API`); `via` is the file title as the Source publishes it, null when there is none.
- `AreaTotal.area` is an `AreaKey` (county, off-map tile or SIRUTA), so a SIRUTA is never a valid `RecordFilter.county`.
- Entity Overview Signals take `signalOrder` and `signalOffset`.
- Shared fragments `EntityResultPageFields` and `RecordResultFields`; the Entity Records tab also selects `matchedField`.
- Three full-results operations (one per tab) rather than one with `@include` flags.
