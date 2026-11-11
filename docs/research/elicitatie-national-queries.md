# e-licitatie.ro `api-pub`: national queries and resolving public codes

Research for [#12](https://github.com/george-vrancianu/grivei.ai/issues/12), a child of the wayfinder map [#2](https://github.com/george-vrancianu/grivei.ai/issues/2). Follows [#5](https://github.com/george-vrancianu/grivei.ai/issues/5) ([SEAP bulk sources](https://github.com/george-vrancianu/grivei.ai/blob/research/seap-bulk-sources/docs/research/seap-bulk-sources.md)) and the `Referer` finding from [#6](https://github.com/george-vrancianu/grivei.ai/blob/research/authority-county-mapping/docs/research/authority-county-mapping.md).

Investigated 2026-11-11 against the public SPA bundle and about 20 live requests (≥1.5 s apart, generic User-Agent). The API is undocumented, so everything below is observed behaviour and could change without notice.

## Answer in brief

0. **The SEAP Connector is broken today.** Every `api-pub` call we use now returns `403 {"message":"Access Denied: Referrer cannot be null."}` without a `Referer` header. With `Referer: https://e-licitatie.ro/pub` the same calls succeed. The Brașov crawl worked on 2026-10-25, so the check is recent. `watchdog/connectors/seap_harvest.py` needs that header in `HDR`.
1. **Yes, each public code resolves to its internal id in one call.** No authority or date filter is needed:
   - `DA…` (direct purchase): `GetDirectAcquisitionList` with `uniqueIdentificationCode` → `directAcquisitionId`.
   - `CAN…` and `SCNA…` (award notices): `GetCANoticeList` with `number` → `caNoticeId`, `sysNoticeTypeId` and `sysNoticeVersionId`.
   - `DAN…` (offline DA notification): `GetDaAwardNoticeList` with `noticeNo` → `daAwardNoticeId`.

   Each call took 0.2–0.9 s.
2. **National queries are accepted, but every list has a hard result cap, and deep paging does not get past it.**
   - **Direct purchases are capped at 2,000 rows.** The date filters work only to the day, and one weekday of *accepted* DAs nationally is already over 2,000. So DAs **cannot be enumerated nationally by date**. They still need a per-authority partition, which is what the Connector does today.
   - **Award notices are capped at 3,000 rows.** A national one-day query returns about 200 rows, well under the cap, so award notices **can** be crawled nationally day by day.
   - The response includes `searchTooLong: true` when a result is truncated.
   - `pageSize: 1000` is accepted.
3. **A national current-quarter top-up costs about 30 k requests,** roughly 3–4 h at the Connector's pace, plus a one-off ~15 k lookups to map authorities to SEAP ids. Most of it is about 15 k per-authority DA calls and about 14 k contract calls, one per award notice. The award-notice lists themselves are about 100 calls.
4. **Recommendation.**
   - **Provenance:** store the public code and resolve the e-licitatie URL lazily, through a cached redirect endpoint in the explorer.
   - **Current quarter:** run award notices (and probably DAN) as a national daily crawl. Refresh DAs per authority, monthly or on demand, rather than weekly.

   Also fix the view-URL choice for non-type-3 notices, and the missing `Referer`.

## 1. Resolving a public code to an internal id

The public SPA (`/app-pub?v=…`) exposes these list filters:

- `DirectAcquisitionCommon.getDirectAcquisitionList` filters on `uniqueIdentificationCode`. The UI's `validateFilterData` drops the finalisation-date requirement when a code is given.
- The public award-notice list (`NoticeCommon.getCaNoticeList`) sends a `number` field.
- `DaAwardNoticeCommon.getDaAwardNoticeList` sends `noticeNo`.

Live checks, all `POST` with `Referer: https://e-licitatie.ro/pub`:

| Code (from the #5 bulk files) | Call | Result |
|---|---|---|
| `DA40735307` | `/api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/` `{"uniqueIdentificationCode":"DA40735307", …all other filters null, "pageSize":5,"pageIndex":0}` | `total 1`, `directAcquisitionId 122525706`, full row (state, CPV, supplier, values) |
| `CAN1170618` | `/api-pub/NoticeCommon/GetCANoticeList/` `{"sysNoticeTypeIds":[],"sortProperties":[],"pageIndex":0,"pageSize":5,"number":"CAN1170618"}` | `total 1`, `caNoticeId 100639191`, `sysNoticeTypeId 3`, `sysNoticeVersionId 2` |
| `SCNA1134543` | same, `"number":"SCNA1134543"` | `total 1`, `caNoticeId 100639197`, `sysNoticeTypeId 18`, `sysNoticeVersionId 2` |
| `DAN2794060` | `/api-pub/DaAwardNoticeCommon/GetDaAwardNoticeList/` `{"pageIndex":0,"pageSize":5,"noticeNo":"DAN2794060"}` | `total 1`, `daAwardNoticeId 101877899` |
| `CAN1149678` | `GetCANoticeList` with `number` | `caNoticeId 100637104` |

**Contracts.** A bulk contract row (notice code + contract number) needs a second call to get its `caNoticeContractId`: `GetCANoticeContracts` with that `caNoticeId` and the `contractNo` filter. The SPA exposes that filter, but I did not test it live. The notice-level link is usually enough for provenance.

### The view URL depends on the notice type

The public SPA builds award-notice view routes in `navigateToView`, as `pathWithParam(route, n.caNoticeId)`. The route depends on `sysNoticeTypeId` and on `sysNoticeVersionId` (1 = legacy form):

| `sysNoticeTypeId` | Version ≠ 1 (current) | Version 1 |
|---|---|---|
| 3 (CAN) | `/pub/notices/ca-notices/view-c/:id` | `/pub/notices/ca-notices/view-c/v1/:id` |
| 18 (SCNA, subsequent contract) | `/pub/notices/ca-notices/view-rfq/:id` (sic, per the bundle) | `/pub/notices/ca-notices/view-scn/v1/:id` |
| 13, 20 | `/pub/notices/ca-notices/view-rfq/:id` | `/pub/notices/ca-notices/view-rfq/v1/:id` |
| 16 | `/pub/notices/ca-notices-pc/view/:id` | `/pub/notices/ca-notices/view-pc/v1/:id` |
| 8 | `/pub/notices/ca-notices-dc/view/:id` | `/pub/notices/ca-notices/view-dc/v1/:id` |

Other routes:

- DA: `/pub/direct-acquisition/view/:id` (`directAcquisitionId`).
- DAN: `/pub/direct-acquisition/award-notice/view/:id` (`daAwardNoticeId`).

`watchdog/sql/002_load_seap.sql` uses `view-c/<caNoticeId>` for every notice. That is wrong for every notice that is not type 3:

- Brașov's raw batch has 76 type-18 notices out of 212.
- Timișoara's has 72 type-18, 2 type-16 and 1 type-8 notices out of 168.

The Connector also doesn't keep `sysNoticeVersionId`. I did not check in a browser whether `view-c` still renders a type-18 notice.

## 2. National queries and paging caps

The page config embedded in `https://e-licitatie.ro/pub` sets these caps:

- `DirectAcquisition_MaxListItems: 2000`
- `DaAwardNotice_MaxListItems: 2000`
- `CaNotice_MaxListItems: 3000`
- `MaxExportItems_NoticeList: 10000`

The SPA shows a "search result too long" message, `SearchResultTooLongPart1`, filled in with `{CacheCount}`. Live checks with `contractingAuthorityId` null or omitted:

| Query | Result |
|---|---|
| DA, finalisation 2026-10-01…11-10, page 0 × 100 | `total 2000`, `searchTooLong: true`. Row order is not sorted by date |
| same, `pageIndex 20` | `items: []`, `total 2000`: the cap is a hard cutoff, not a paging limit |
| DA, finalisation 2026-11-10 10:00–10:59 | `total 2000`, `searchTooLong: true`, rows from 06:58 to 17:00: **the time part of the filter is ignored** |
| DA, state 7 (accepted), finalisation 2026-11-08 (Sunday) | `total 38` |
| DA, state 7, finalisation 2026-11-10 (Tuesday) | `total 2000`, `searchTooLong: true`: one weekday is over the cap |
| same, `pageSize 1000` | 1,000 items returned (0.7 s, 770 kB) |
| Award notices, publication 2026-10-01…11-10 | `total 3000`, `searchTooLong: true` |
| Award notices, publication 2026-11-10 | `total 217`, `searchTooLong: false` |
| `GetCANoticeContracts` for `CAN1149678`, `skip 1000, take 200` | `total 1016`, 18 items: `skip` paging works |

What this means:

- **Award notices: a national daily crawl works.** About 220 notices per weekday comes to about 14 k per quarter. That is one request per day at `pageSize 1000`.
- **DAs: a national crawl is not possible by date.** National volume is about 9 k accepted DAs per weekday, against the 2,000 cap at one-day granularity. The other filters (`cpvCategoryId`, which has 3 values, and `cpvCodeId`, an exact code) don't split it cleanly. **Per authority stays the only verified partition.** A crawler should check `searchTooLong` and split the date range when it is set.
- **The Connector doesn't check the cap.** It requests a whole multi-year range per authority. The API doesn't enforce the UI's same-calendar-year rule. Brașov has 1,667 DAs for 2024–2026, so a slightly larger authority would be **truncated silently at 2,000**. The `contracts_for()` `take: 200` bug from #5 is confirmed fixable with `skip`. (`CAN1149678` has 1,016 contracts. The bulk file's 4,053 rows are per lot and per winner.)
- **DAN (offline DA notifications):** about 0.3 M a year, roughly 1,200 per weekday. That is likely under the 2,000 cap per day, but I did not test it.
- `api-pub/PUBContracts/getAll` (the `/pub/contracts` page) is not a national contract list. It returns 44 rows in total.

## 3. Cost of a national current-quarter top-up

Assumptions:

- About 14 k award notices per quarter (217 per weekday × about 63 weekdays).
- About 575 k DAs per quarter (#5: about 2.3 M a year).
- About 12–15 k active authorities.
- `pageSize 1000`.

| Step | Requests |
|---|---|
| Award notices, national, one query per day | ~90–100 |
| Contracts, one call per notice (`take 1000`, `skip` for the rare larger ones) | ~14 k |
| DAN, national, one query per day (unverified) | ~90–100 |
| DAs, one query per authority for the quarter (split when `searchTooLong`) | ~15 k |
| **Total per full quarter pass** | **~30 k ≈ 3–4 h at 2–3 req/s** |
| One-off: authority SEAP id per CUI (`searchContractingAuthorities`), cached | ~15 k |

Incremental refreshes:

- **Award notices and DAN are cheap.** A week is about 10 list calls plus about 1 k contract calls.
- **DAs are not.** Every refresh is another sweep of about 15 k authorities, because the DA list can't be filtered by "changed since". DA list rows also carry no authority id, only the `"CUI name"` string, so a national sample can't drive the sweep either.

## 4. Recommendation

**Provenance links.**
- Keep the public code (`DA…`, `CAN…`, `SCNA…`, `DAN…`) as `document.external_id`. It is stable and it is what the bulk files carry.
- For bulk-seeded rows, set `document.url` to the data.gov.ro resource (as #5 proposed) and resolve the e-licitatie link **lazily**: the explorer (a served app, ADR 0001) gets a small endpoint such as `/source/seap/{code}` that makes the one-call lookup from §1, caches the internal id and type, and redirects. Upfront resolution would cost one request per row (≈2.5 M a year) and is not worth it.
- Rows from the crawl already carry internal ids, so their URLs can be built at load time.
- **Build the URL from `sysNoticeTypeId` and `sysNoticeVersionId` using the table in §1**, not `view-c` for every notice. Store both fields in the raw document.

**Current quarter (until the ADR bulk file lands).**
- **Award notices and SCNA:** crawl nationally by publication day, then fetch contracts per notice. About 15 k requests for a full quarter, about 1 k a week after that. This also gives winner address and county (#6) for free.
- **DAN:** do the same by day, once a test confirms that a weekday stays under 2,000.
- **DAs:** do a per-authority pass, run monthly or less often, for the authorities in the latest bulk year (mapped CUI → SEAP id once). Alternatively, crawl per authority **on demand** when an explorer user opens one. Accept that national DA totals for the current quarter lag until the bulk file arrives, and label that in the UI.
- **Harden the Connector first:**
  - send `Referer: https://e-licitatie.ro/pub`;
  - check `searchTooLong` and split the date range when it is set;
  - page `GetCANoticeContracts` with `skip`;
  - use `pageSize 1000`;
  - keep the pause at ≥0.35 s.

## Open questions

- Is the new `Referer` check the first step towards blocking scraping? The site states no terms or licence for `api-pub` reuse (#5, #6). Should this feed the deferred legal-posture decision?
- Does `view-c/<id>` actually render type-18 (SCNA) notices, or are the current links broken? Check in a browser before fixing.
- Is DAN under the 2,000 cap per day nationally? Does `GetCANoticeContracts` with a `contractNo` filter resolve a single contract?
- Does `searchContractingAuthorities` match on CUI, so that bulk CUIs can be mapped to SEAP ids? The DA rows have no authority id.
- Is a current-quarter DA lag (up to about 5 months, per #5) acceptable for the explorer's first Release, with DAs crawled only on demand?

## Sources

- e-licitatie.ro public SPA:
  - `https://e-licitatie.ro/pub` (embedded `config`: `*_MaxListItems`, `performanceMinify`);
  - `https://e-licitatie.ro/app-pub?v=KEofz3XYcPN18N6ksFkq2x81KaIcnF96CAXAvkV4EBs1`: `DirectAcquisitionCommon`, `NoticeCommon`, `DaAwardNoticeCommon` APIs, list `search`/`validateFilterData`, `navigateToView` route switch, `sys.pub.routes`;
  - `https://e-licitatie.ro/views/pub/contracts/service.min.js` and `…/list/list.min.js` (`api-pub/PUBContracts`).

  All fetched 2026-11-11.
- Live `api-pub` responses on 2026-11-11, as tabulated in §1–2 (about 20 requests in total).
- Repo: `watchdog/connectors/seap_harvest.py`, `watchdog/sql/002_load_seap.sql`, `watchdog/data/raw/seap_{brasov,timisoara}_2024_2026.json`.
