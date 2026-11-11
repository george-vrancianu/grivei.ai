# SEAP bulk sources for national coverage

Research for [#5](https://github.com/george-vrancianu/grivei.ai/issues/5), part of the Release 1 map [#2](https://github.com/george-vrancianu/grivei.ai/issues/2).
Researched 2026-11-11.

**Question.** The SEAP Connector (`watchdog/connectors/seap_harvest.py`) crawls e-licitatie.ro one contracting authority at a time. What bulk alternatives exist for national coverage, and how do they compare to the crawl?

## Answer in brief

- **The bulk source to use is the quarterly SEAP export from ADR on data.gov.ro.** It is official, free and national, and it carries authority CUI, supplier CUI, CPV, procedure type, RON values and the public notice/DA codes. From 2021 it is licensed CC BY 4.0. It runs from 2007 to Q3 2026, with no gap years.
- **Completeness.** In the Brașov test quarter (Q3 2026) it matched the crawl almost exactly:
  - all 152 accepted direct purchases;
  - every award notice that had contracts;
  - 45 of 46 contracts.
- **Lag.** Files appear one week to two months after the quarter ends, so the newest bulk data can be up to about 5 months old.
- **What the bulk lacks:**
  - the internal ids that our provenance URLs use;
  - contract and notice titles in the main contracts file;
  - winner address, county and SME flag;
  - rejected or cancelled direct purchases.
- **Data defects to clean.** Duplicate rows (38% in one DA file). Consortium and lot rows that repeat the full contract value. Header names and formats that change between quarters. One mis-uploaded resource.
- **Volume.** About **2.2–2.5 M direct purchases**, **~0.35–0.45 M contracts** (0.6–0.9 M winner rows) and **~0.3 M offline DA notifications** per year.
- **Crawl cost for the same volume.** Crawling one year nationally would take about 80–110 k requests: roughly 10–15 h at the current pace, or more if the server pushes back. That is feasible, but the crawl still needs an authority list and has a pagination bug (see §6).
- **Recommendation.** Seed national history from the ADR bulk files and keep the crawl for two jobs:
  1. the current, not-yet-exported quarter;
  2. lazy, per-item enrichment (internal id → provenance URL, winner address and county) of what the explorer actually shows.

  OpenTender (OCDS) and TED are not better seeds. OpenTender is derived from the same files and is non-commercial only. TED covers only above-threshold notices.

## 1. Candidate sources

| Source | What it is | Coverage | Licence | Verdict |
|---|---|---|---|---|
| **data.gov.ro, organisation "Agenția pentru Agenda Digitală a României" (ADR, the SEAP operator)**, datasets `achizitii-publice-YYYY` | Quarterly SEAP exports: direct purchases, DA award notifications, contracts, award notices without prior notice, initiation notices, DPS invitations, contract modifications | 2007–Q3 2026, national | CC BY 4.0 (2021+); OGL-ROU-1.0 (≤2020) | **Use as the seed** |
| OpenTender Romania (Government Transparency Institute), OCDS | Derived from TED (above threshold) plus the same data.gov.ro files (below threshold) | 2007–2024 | **CC BY-NC-SA 4.0** | Not a seed: secondary, older, non-commercial and share-alike |
| TED (EU Official Journal), search API | EU-threshold notices only, eForms/XML | National, above-threshold only | EU reuse (the TED docs don't state the licence) | Optional later cross-check, not a seed |
| e-licitatie.ro `api-pub` (current crawl) | Live, undocumented JSON | Everything public, near real time | None stated | Keep for top-up and enrichment |

I found no official OCDS feed from SEAP/SICAP. The OGP review of Romania's commitment RO0046 records that SICAP was meant to follow OCDS and that its bulk export was broken at launch in 2018. The ADR datasets show the export resumed: the 2018 dataset has Q1 data uploaded in July 2018 and Q2–Q4 data uploaded in February 2019.

## 2. The ADR datasets on data.gov.ro

Sources: CKAN API `https://data.gov.ro/api/3/action/package_show?id=<name>` for each dataset below (read 2026-11-11), and the files themselves.

| Dataset | Years | Format | Licence |
|---|---|---|---|
| [`achizitii-publice-2007-2016-contracte6`](https://data.gov.ro/dataset/achizitii-publice-2007-2016-contracte6) | 2007–2016 (contracts by year/half; "cumpărări directe" by quarter) | CSV | OGL-ROU-1.0 |
| [`achizitii-publice-2016`](https://data.gov.ro/dataset/achizitii-publice-2016), [`-2017`](https://data.gov.ro/dataset/achizitii-publice-2017), [`-2018`](https://data.gov.ro/dataset/achizitii-publice-2018), [`achiziti-publice-2019`](https://data.gov.ro/dataset/achiziti-publice-2019), [`-2020`](https://data.gov.ro/dataset/achizitii-publice-2020) | 2016–2020 | CSV → XLSX (from 2018) | OGL-ROU-1.0 |
| [`achizitii-publice-2021`](https://data.gov.ro/dataset/achizitii-publice-2021) … [`-2026`](https://data.gov.ro/dataset/achizitii-publice-2026) | 2021–Q3 2026 | XLS/CSV to mid-2024, then XLSX | **CC BY 4.0** |

Since 2023 every quarter has seven resources:

1. **Achiziții directe:** online direct purchases from the SEAP catalogue (`DA…` codes).
2. **Notificări de atribuire la cumpărarea directă:** offline direct purchases notified afterwards (`DAN…` codes). The current crawl does **not** collect these.
3. **Contracte:** contracts (including subsequent contracts under framework agreements) from award notices for open, restricted and simplified procedures and similar (`CAN…`, `SCNA…`).
4. **Anunțuri de atribuire la proceduri fără anunț de inițiere:** negotiation without prior publication, Annex 2 "norme proprii" and "procedură simplificată proprie" (`CAN…`).
5. Anunțuri de inițiere publicate (contract notices).
6. Invitații SAD (dynamic purchasing system invitations).
7. Date din modificare contract (contract modifications).

Resources 3 and 4 together cover what the crawl gets from `GetCANoticeList` plus `GetCANoticeContracts`.

### Lag

Upload dates of the last few quarters (CKAN `created`):

| Quarter | Uploaded | Lag after quarter end |
|---|---|---|
| Q4 2024 | 2025-03-04 | ~2 months |
| Q1 2025 | 2025-04-23 | 3 weeks |
| Q2 2025 | 2025-07-03 | 3 days |
| Q3 2025 | 2025-10-16 | 2 weeks |
| Q4 2025 | 2026-01-22 | 3 weeks |
| Q1 2026 | 2026-04-06 | 6 days |
| Q2 2026 | 2026-07-13 | 2 weeks |
| Q3 2026 | 2026-10-06 | 6 days |

The newest bulk row is therefore 1–5 months old. The crawl is live.

### Fields (from the downloaded Q3 2026 and Q4 2025 files)

**Achiziții directe:**
- Autoritate contractanta, CUI
- Numar achizitie directa (`DA…`)
- Data publicare
- Denumire achizitie
- Cod CPV, Denumire CPV
- Tip contract
- Cu fonduri europene?, Denumire program
- Data atribuire / finalizare
- Valoare achizitie (RON)
- Ofertant, CUI

**Notificări DA:** the same kind of fields, keyed by `DAN…`.

**Contracte** (21 columns):
- Autoritate contractanta, CUI autoritate contractanta
- Tip anunt, Tip procedura
- Numar anunt initiere, Data publicare (of the initiation notice)
- Tip legislatie
- Tip incheiere contract, Tip contract, Tip criterii de atribuire
- Cod/Denumire CPV
- Numar lot
- Numar anunt atribuire, Data publicare (of the award notice)
- Data contract, Numar contract
- Incheiat prin ("Fara acord cadru" / "Cu acord cadru" / "Cu acord cadru subsecvent")
- Valoare contract (RON)
- Ofertant castigator, CUI ofertant castigator

The sheet-2 legend in the file defines the two "Data publicare" columns and "Data contract".

**Fără anunț de inițiere** (18 columns): like Contracte, plus `Denumire contract` and `Criteriu de atribuire`.

### Comparison with what we load today (`001_schema.sql`, `002_load_seap.sql`)

| Field | Crawl | Bulk |
|---|---|---|
| Authority CUI | yes | yes, on every row |
| Supplier/winner CUI | yes | yes (mixed formats: `RO 3596251`, `RO18328125`, `ro…`, foreign VAT ids `BG…`, `AT…`) |
| Consortium winners | `winners[]` per contract | **one row per winner, full contract value repeated on each row** (17,539 multi-winner contracts in Q3 2026). This matches our `n_winners` model, but rows must be deduplicated before summing |
| CPV | yes | yes, code and label |
| Procedure type | yes | yes, plus legislation and award criterion |
| Values | RON value, original currency, estimated value | RON only; no estimated value |
| Contract / notice title | yes | **no** in Contracte; yes in "fără anunț" and DA files |
| Winner address, county, SME, SEAP entityId | yes | **no**. Matters for the map and for home-county Signals |
| DA state (accepted / refused / …) | all states | only awarded DAs, so no refused or cancelled ones |
| Ids for provenance URLs | internal `directAcquisitionId`, `caNoticeId` → `e-licitatie.ro/pub/...view/<id>` | **public codes only** (`DA40735307`, `CAN1170618`, `SCNA1134543`, `DAN2794060`). These are the same values we already store as `document.external_id` for DAs and as `notice_no`, but the view URL needs the internal id |
| Offline DA notifications (`DAN`) | **not collected** | yes |

### Completeness test against the crawl (Brașov, CUI 4384206, Q3 2026)

I compared `watchdog/data/raw/seap_brasov_2024_2026.json` (crawled 2026-10-25) with the Q3 2026 files.

**Direct purchases.** All 152 DAs that the crawl shows as "Oferta acceptata" and published in the quarter are in the bulk file, and their values match exactly (153/153 codes).
- The bulk file has no DAs the crawl lacks.
- One bulk DA is "Oferta refuzata" in the crawl. Its state changed after the export, so bulk states are a snapshot.
- The bulk window is keyed on *publication* date. The crawl window is keyed on *finalisation* date, so the edges of the two windows differ.

**Award notices.** Every crawl notice from the quarter that has contracts is in either Contracte (21 notices) or "fără anunț" (8 notices: 4 negotiations without publication, 4 "procedură simplificată proprie"). The remaining 4 crawl notices have no contracts and a value of 0, which looks like unsuccessful or cancelled procedures.

**Contracts.**
- 45 of the 46 bulk contracts (by notice + contract no.) are in the crawl.
- One subsequent contract (`CAN1145000` / `27030`) is in the bulk but missing from the crawl.
- Consortium membership matched. For example, CAN1145000 contract 23 lists the same 6 winners in both.

**DA notifications.** The bulk has 4 `DAN` notifications for Brașov in the quarter. The crawl has none, because it doesn't call that endpoint.

### Data defects found

- **Exact duplicate rows.** The Q3 2026 DA file has 905,500 rows but only 541,471 distinct DA codes: 347,551 rows (38%) are exact duplicates. Q4 2025 has none (603,526 rows, all distinct).
- **Repeated contract rows.** Contracte repeats rows per lot and per winner. Q3 2026 has 226,861 distinct rows for 114,041 distinct (award notice, contract no.) pairs. Values must not be summed per row.
- **Extra and stray rows.** Sheet 2 of each file is a legend, and one file has a stray header row (`DATA_ANUNT_ATRIBUIRE`) inside the data.
- **Unstable headers.** Header names drift between quarters (`CUI` vs `CUI autoritate contractanta`, `Data atribuire` vs `Data finalizare`, `Ofertant` vs `Ofertant castigator`).
- **Misleading formats.** Resources labelled `.xls` are really XLSX. Before mid-2024 both CSV and XLS were published. One resource (Q1 2024 DA CSV) has no URL.
- **Mis-uploaded resource.** For Q2 2025, the "Notificări de atribuire la cumpărarea directă" resource points to the "fără anunț de inițiere" file, so the Q2 2025 DAN data is missing.
- **Excel serial dates.** Dates are stored as Excel serial numbers.

## 3. National row counts per year

These are measured on two quarters and extrapolated using the quarterly file sizes, so treat them as order-of-magnitude figures.

| Kind | Q4 2025 (measured) | Q3 2026 (measured) | Per year (est.) |
|---|---|---|---|
| Direct purchases (distinct `DA`) | 603,526 | 541,471 | **2.2–2.5 M** |
| Contracts: distinct (award notice, contract no.) | 81,505 | 114,041 | **0.35–0.45 M** |
| Contracts: winner rows (deduplicated) | 152,313 | 226,861 | 0.6–0.9 M |
| DA notifications (`DAN`) | n/a | 75,519 | ~0.3 M |
| Award notices without prior notice | n/a | 2,527 rows / 2,528 notices | ~10 k |
| Award notices with contracts in Contracte | n/a | 8,756 | ~25–35 k (new notices; old framework notices recur every quarter) |
| Authorities with a DA in the quarter | n/a | 13,241 | ~15 k active authorities per year |

Quarterly DA file sizes have been stable since 2020 (60–210 MB per quarter, 0.5–0.9 M rows), so 2020–2026 should each be of the same order.

For comparison, OpenTender's all-time OCDS dataset (2007–2024) contains 1.0 M awards and 1.04 M supplier entries. It evidently excludes the direct purchases, which are the bulk of the rows.

## 4. Crawl cost for the same volume

Request counts for one year of national data, with the current Connector's logic (pages of 100, one contracts call per notice):

| Step | Requests |
|---|---|
| Authority lookup (`searchContractingAuthorities`) | ~15 k (needs an authority list, which the bulk CUIs could provide) |
| DA list (100 per page) | 2.3 M / 100 ≈ 23 k, plus about 1 per authority ≈ **~35 k** |
| Award notice list | ~15 k (mostly one page per authority) |
| Contracts per notice | ~25–35 k |
| DA notifications (not implemented yet) | ~0.3 M / 100 ≈ 3 k, plus about 1 per authority |
| **Total** | **~80–110 k requests per year** |

At the Connector's pace (0.35 s pause plus response time, ≈ 2–3 req/s) that is **about 10–15 hours per year of history**: roughly 3–4 days for 2018–2026, if the undocumented endpoint tolerates it. The bulk files are about 0.4 GB per year to download.

The crawl's real costs are not the request count:

- It needs a complete authority list (≈15 k active), which the bulk provides.
- It runs on an undocumented API with no licence.
- It has a pagination bug (§6).

## 5. Recommendation

1. **Seed national history from the ADR quarterly files** with a new bulk SEAP Connector. Load 2021–present first (CC BY 4.0, current XLSX layout), then 2018–2020 (SICAP era, OGL-ROU-1.0) if wanted. Load into the same typed tables:
   - DAs → `seap_direct_acquisition`;
   - Contracte + fără anunț → `seap_award_notice` / `seap_contract` / `seap_contract_winner`;
   - DAN → a new kind.

   Deduplicate on the public codes (DA code; award notice + contract no. + winner CUI) and normalise CUIs.
2. **Provenance.** Store the data.gov.ro resource URL as the document URL and the public code as `external_id`. Resolve the e-licitatie view URL (internal id) lazily, through one `api-pub` lookup when an item is shown, and cache it. Do not crawl 2.5 M ids up front.
3. **Keep the crawl as a top-up** for the current quarter, which the bulk files won't contain for up to 5 months. Also use it for **enrichment** of the companies and authorities that surface in Signals or on the map (winner address/county, SME, entityId).
4. **Skip OpenTender** as a seed (secondary, ends 2024, NC-SA licence). Consider **TED** only as an optional cross-check for above-threshold notices.

## 6. Open questions surfaced

- **Crawl truncation bug.** `contracts_for()` calls `GetCANoticeContracts` with `take: 200, skip: 0` and never pages. National framework agreements carry thousands of subsequent contracts (CAN1149678 has 4,053 rows in one quarter), so the crawl silently truncates them. This does not affect Brașov/Timișoara (their maximum is 45 per notice), but it matters for national coverage and for any top-up crawl.
- **Map county.** The bulk files don't give authority or supplier county. The map needs another way to get county: an authority list from `api-pub`, ANAF CUI lookup, or lazy enrichment.
- **Lazy id lookup.** It is unverified whether `api-pub` can resolve a public code (`CAN…`, `DAN…`) to its internal id in one call. `uniqueIdentificationCode` exists as a DA filter, but the notice-number filter is untested.
- **National crawl queries.** It is untested whether `api-pub` list endpoints accept `contractingAuthorityId: null` for national queries and whether deep paging is capped.
- **Licences on old data.** OGL-ROU-1.0 (≤2020) vs CC BY 4.0 (2021+) attribution wording needs to be settled as part of the deferred legal posture.
- **Window definitions.** Bulk and crawl windows differ (DA publication vs finalisation date; contract files keyed on the award-notice publication date, with subsequent contracts reappearing under old notices). The seeding spec must pick one canonical date per kind.

## Sources

- data.gov.ro CKAN API, ADR datasets: `package_search?q=achizitii`, `package_show` for `achizitii-publice-2007-2016-contracte6`, `-2016` … `-2026`, `achiziti-publice-2019` (read 2026-11-11). Licence page: https://data.gov.ro/pages/licence
- Downloaded and inspected files (Q3 2026 and Q4 2025 resources of `achizitii-publice-2026` / `-2025`): Achiziții directe, Notificări de atribuire la cumpărarea directă, Contracte, Anunțuri de atribuire la proceduri fără anunț de inițiere.
- Crawl data: `watchdog/data/raw/seap_brasov_2024_2026.json`; Connector: `watchdog/connectors/seap_harvest.py`; schema: `watchdog/sql/001_schema.sql`, `002_load_seap.sql`.
- OpenTender Romania on the Open Contracting data registry: https://data.open-contracting.org/en/publication/75
- OGP, Romania commitment RO0046 (SICAP bulk export, OCDS intent): https://www.opengovpartnership.org/members/romania/commitments/RO0046/
- TED API documentation: https://docs.ted.europa.eu/api/latest/index.html
