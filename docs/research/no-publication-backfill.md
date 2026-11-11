# Backfilling 2021–2022 awards made without a prior call for competition from e-licitatie

Research for [#30](https://github.com/george-vrancianu/grivei.ai/issues/30), a child of the wayfinder map [#2](https://github.com/george-vrancianu/grivei.ai/issues/2). Builds on [#12](https://github.com/george-vrancianu/grivei.ai/issues/12) ([write-up](https://github.com/george-vrancianu/grivei.ai/blob/research/elicitatie-national-queries/docs/research/elicitatie-national-queries.md)).

Investigated 2026-11-12. I made 79 live `api-pub` requests and fetched 2 SPA files. Requests were at least 2 s apart, sent a generic User-Agent and `Referer: https://e-licitatie.ro/pub`, and took 0.75 s on average. The API is undocumented, so everything below is observed behaviour.

## Answer in brief

1. **Yes.** The national award-notice list (`GetCANoticeList`, by publication day) returns 2021 and 2022 notices for procedures with no prior call for competition. Each one carries:
   - the procedure type (`sysProcedureType`, id 7 = `Negociere fara publicare prealabila`);
   - the authority (CUI and name);
   - the CPV code;
   - the RON value.

   `GetCANoticeContracts` adds the contract number and date, the value, and the winner: name, CUI, city, county and SME flag. All 20 sampled 2021–2022 notices had every one of these fields.
2. **The marker is `procedureId: null`.** These notices are offline (`isOnline: false`), type 3 (CAN) or type 16 (concessions, `PCA…`), with no initiation procedure in SEAP. On the sampled 2023 days that marker selects **exactly** the rows of the data.gov.ro "fără anunț de inițiere" file:
   - mostly `Negociere fara publicare prealabila`;
   - also `Norme proprii (Anexa 2)` and `Procedura simplificata proprie`.

   The 2021–2022 Contracte files contain none of these three procedure types, so the gap is the whole "fără anunț" population, not only the negotiated procedures.
3. **Match on a 2023 overlap sample (FARA T IV 2023):**
   - 293 of 294 FARA notices on 5 days came back on the same day, and the API returned no extra `procedureId: null` notices.
   - The miss (`CAN1112970`) had been modified, and the API now dates it 2024-08-06. Its value changed too.
   - For 40 random notices, the following matched 40/40: contract value (±1 RON), contract number, contract date, winner CUI, authority CUI and procedure type. The winner name matched 39/40; the miss was `FELSIN FARM S.R.L.` vs `FELSIN FARM`.
4. **Cost of a one-off 2021–2022 backfill: about 30 k requests, 4–8 h.** That is about 105 week-long list calls (about 130 with paging) plus one contract call per notice. The samples show 251–377 such notices a week, so about 13–20 k a year and about 26–40 k for both years.

## 1. What the API returns

**List call.** I made `POST /api-pub/NoticeCommon/GetCANoticeList/` calls with `startPublicationDate` and `endPublicationDate`, no authority and `pageSize 1000` (the same body as `award_notices()` in `watchdog/connectors/seap_harvest.py`, minus `contractingAuthorityId`). This is how the four sampled days broke down:

| Day | Notices | `procedureId: null` | of which `Negociere fara publicare prealabila` |
|---|---|---|---|
| 2021-03-16 | 127 | 48 | 41 |
| 2021-10-12 | 161 | 26 | 24 |
| 2022-05-17 | 151 | 48 | 44 |
| 2022-11-22 | 186 | 83 | 68 |

On every day sampled (2021, 2022 and 2023), `procedureId: null` coincides exactly with `isOnline: false` and with procedure types 7, 16 and 17. One exception: on 2023-11-28 a single type-16 notice with procedure type 20 was offline but did have a `procedureId`.

Each list row carries:
- `noticeNo`, `caNoticeId`, `sysNoticeTypeId` and `sysNoticeVersionId`;
- `sysProcedureType` (id and text);
- `contractingAuthorityNameAndFN`, given as `"<CUI> - <name>"`;
- `cpvCodeAndName`, `sysAcquisitionContractType` and `ronContractValue`;
- `noticeStateDate`.

**Contract call.** `POST /api-pub/C_PUBLIC_CANotice/GetCANoticeContracts` returned **exactly one contract** for all 60 offline notices sampled (40 from 2023, 20 from 2021–2022). That contract's `defaultCurrencyContractValue` equalled the notice's `ronContractValue` in all 20 of the 2021–2022 cases checked. The contract has `winners[]` with `name`, `fiscalNumber` and `address` (city, county, country, `isSME`), as in `contracts_for()`. It also has `hasModifiedVersions` and `modifiedCount`.

**Filters that don't help.**
- The public list UI sends no procedure-type filter. The `search()` body in the `app-pub` bundle has `sysNoticeTypeIds`, `sysContractAssigmentTypeId`, dates, CPV and so on, but no `sysProcedureTypeId`.
- Sending `sysProcedureTypeId: 7` anyway is ignored: 186 rows came back, the same as with no filter.
- Sending `isOnline: false` returned 3 unrelated rows, all with a `procedureId`.

So the crawl must fetch every award notice and select `procedureId == null` on the client side.

## 2. Overlap with the 2023 "fără anunț" file

The local file `2023_FARA.csv` is the T IV 2023 resource. It has 2,562 rows, one per notice (2,483 `CAN…` and 79 `PCA…`), published from October to December 2023. I compared it with the API on five days, chosen to include the days with the most concession notices:

| Day | FARA rows | Also in the API that day | API `procedureId: null` not in FARA |
|---|---|---|---|
| 2023-10-03 | 51 | 51 | 0 |
| 2023-10-04 | 110 | 109 | 0 |
| 2023-11-15 | 22 | 22 | 0 |
| 2023-11-28 | 52 (19 PCA) | 52 | 0 |
| 2023-12-21 | 59 (8 PCA) | 59 | 0 |

The concession notices (`PCA…`) come back in the same list as `sysNoticeTypeId` 16. The FARA label `Norme proprii (Anexa 2B)` corresponds to the API's `Norme proprii (Anexa 2)`.

**The one miss shows a caveat.** `CAN1112970` is dated 2023-10-04 in FARA, with a value of 2,732,230. Looked up by `number`, it now has `noticeStateDate` 2024-08-06 and `ronContractValue` 2,842,166.93. **The publication-date filter matches the notice's current state date, not its first publication.** So a notice modified after 2022 drops out of a 2021–2022 crawl. The rate was 1 in 294 here.

**Field check.** I picked 40 notices at random from those five days, fetched their contracts and compared them with FARA. Everything matched except one winner name:

| Field | Match |
|---|---|
| Value: `defaultCurrencyContractValue` vs `Valoare atribuita (RON)`, ±1 RON | 40/40 |
| Contract number | 40/40 |
| Contract date | 40/40 |
| Winner CUI | 40/40 |
| Authority CUI | 40/40 |
| Procedure type | 40/40 |
| One winner per contract | 40/40 |
| Winner name, normalised | 39/40 |

The one name difference was `FELSIN FARM S.R.L.` vs `FELSIN FARM`.

## 3. Cost of the backfill

**List calls.** Week-long windows stay under the 3,000-row cap:

| Week | Notices | `procedureId: null` |
|---|---|---|
| 2021-06-07…13 | 708 | 267 |
| 2021-12-06…12 | 1,040 | 259 |
| 2022-03-07…13 | 688 | 251 |
| 2022-09-05…11 | 934 | 377 |

**Volume.** That is about 290 a week, so about 15 k a year and about 30 k for 2021–2022. The T IV 2023 FARA file has 2,562, or about 200 a week, so the volume falls after 2022.

| Step | Requests |
|---|---|
| Award-notice list, national, week windows, 2021-01-01 … 2022-12-31 | ~105 windows, ~130 with page 2 |
| Contracts, one call per `procedureId: null` notice (all had one contract) | ~26–40 k |
| Optional: re-list 2023 … today to catch modified 2021–2022 notices (see below) | ~200 |
| **Total** | **~30 k (range 26–40 k)** |

At 0.35 s pause plus the observed latency (about 0.5 s for a contract call, 0.8–1.6 s for a 1,000-row list page), that is about **4–5 h**. At 1 request a second, it is about **8 h**. This is a one-off job: the 2023+ bulk files cover the later years.

**Cheaper variant.** The value, authority, CPV and procedure type are already in the list rows. If winners could be filled in later, the list calls alone (about 130) would give every notice with its value. The winners need the contract call.

## 4. Recommendation

The backfill is feasible. It would reuse `award_notices()` and `contracts_for()` with `contractingAuthorityId` left out, as a one-off national pass over 2021–2022:

1. **List the award notices.** List by week with `capped_list` (which splits a window over the cap) and keep the rows with `procedureId is None`.
2. **Fetch contracts and winners.** Do this per kept notice, with the existing retries. Store `noticeNo`, `sysNoticeTypeId` and `sysNoticeVersionId`.
3. **Handle modified notices.** Also list 2023 … today and keep the offline notices whose `noticeNo` is missing from both the 2021–2022 backfill and the 2023+ FARA files. They are the 2021–2022 notices that were modified later. Otherwise, accept a loss of about 0.3%.
4. **Record where each row came from.** These rows come from the crawl, not the bulk files, so their `document.url` can use the e-licitatie id directly (see #12).

## Open questions

- **Which value does the crawl capture?** A modified notice (`CAN1112970`) shows its current value. The bulk file showed the value at the time of the quarterly export. Should backfilled values be labelled "as of crawl date"? `hasModifiedVersions` and `modifiedCount` on the contract would show which ones changed.
- **Should the 2021–2022 contract fields be mapped the same way as FARA 2023+?** The field correspondence is in §2. That mapping belongs in the loader design.
- **Is a 30 k-request crawl acceptable while the `Referer` check is new?** This depends on the deferred legal-posture question from #12.
- **Do the 2021–2022 Contracte files lack these notices in every quarter?** The local copies cover only 2021 Jul–Sep (`2021_CON.csv`) and 2022 Jan–Mar (`2022_CON.csv`). Neither has a `Negociere fara publicare prealabila`, `Norme proprii` or `Procedura simplificata proprie` row. The `.xls` quarters were not checked.

## Sources

- **e-licitatie.ro public SPA:**
  - `https://e-licitatie.ro/pub` (page config, `*_MaxListItems`);
  - `https://e-licitatie.ro/app-pub?v=KEofz3XYcPN18N6ksFkq2x81KaIcnF96CAXAvkV4EBs1`: the `NoticeCommon.getCaNoticeList` call and the CA-notice list `search()` filter body.

  Both fetched 2026-11-12.
- **Live `api-pub` responses**, 2026-11-12 (79 requests): `GetCANoticeList` (9 days, 4 weeks, 2 filter tests, 2 lookups by `number`) and `GetCANoticeContracts` (60 notices).
- **data.gov.ro SEAP packages**, via the local copies in `/tmp/supplier-identity-data`:
  - `pkg-2021.json`, `pkg-2022.json` and `pkg-2023.json` for the resource lists (the first "fără anunț de inițiere" resource is T1 2023);
  - `2023_FARA.csv` (the T IV 2023 resource);
  - `2021_CON.csv` and `2022_CON.csv`.
- **Repo:** `watchdog/connectors/seap_harvest.py`.
