# Can we tell from our data that a competitive procedure is still open?

Research for [#320](https://github.com/george-vrancianu/grivei.ai/issues/320), on the map [#311](https://github.com/george-vrancianu/grivei.ai/issues/311). It tests the input of the candidate Signal rule "negotiation without prior publication (NFPP) awarded while a competitive procedure for the same authority + CPV (+ supplier) is still open". That rule is the structured form of the "bridge urgency" pattern in [Annex D vs. the other Signal rules](https://github.com/george-vrancianu/grivei.ai/blob/research/annex-d-other-signals/docs/research/annex-d-other-signals.md) §5, and of the stop-gap explanations in [Annex D and NO_PUBLICATION](https://github.com/george-vrancianu/grivei.ai/blob/research/annex-d-no-publication/docs/research/annex-d-no-publication.md).

Investigated 2026-11-20 against:

- the code (`watchdog/pipeline/sql/seap_schema.sql`, `watchdog/pipeline/bulk/headers.py`, `watchdog/pipeline/bulk/records.py`, `watchdog/pipeline/crawl/`);
- the raw archive's 23 Contracte bulk files, 2021Q1–2026Q3 (3.44M rows);
- the local Compose `db`, which was running.

The e-licitatie API is undocumented, so everything said about it is observed behaviour. I sent 58 requests to `e-licitatie.ro`, one at a time and at least 1.3 s apart, with the crawler's `User-Agent` and `Referer` (`watchdog/pipeline/crawl/client.py`). The endpoint names come from the public app's own script bundle (`/app-pub?v=…`).

## Answer

- **Launch date: yes, for every procedure that awarded at least one contract.** Every Contracte bulk era carries the initiation notice's publication date next to `initiation_code`, and the loader drops it:
  - `DATA_ANUNT_PARTICIPARE` / `DATA_ANUNT_INITIERE` / `DATA_PUBLICARE_AI` / `Data publicare anunt initiere`, or the first of the two `Data publicare` columns;
  - all of them are listed under `ignored=` in `headers.py`.

  It is filled on 100 % of rows in all 23 quarters.
- **Award: yes, at contract level.** `DATA_CONTRACT` of the procedure's first contract is in the bulk. The award notice's publication date is not usable: a Record keeps the latest republication, for example CAN1072419's 2021 contracts show 2024-05-29.
- **Cancellation and unawarded procedures: no.** A cancelled procedure has no contract, so it never appears in a Contracte file. In the CN/SCN day samples, **0 of 324 cancelled procedures are in our bulk.** Partly cancelled lots of an awarded procedure are invisible too. The crawl reads only award notices, whose list rows carry no CN number, so crawled contracts have no `initiation_code`.
- **e-licitatie fills the gap cheaply:**
  - `POST /api-pub/NoticeCommon/GetCNoticeList/` lists every CN/SCN with its publication date and **current** procedure state (`Atribuita`, `Anulata`, `In desfasurare`, `Suspendata`). It takes about one request per day of notices.
  - `GET /api-pub/PUBLICProcedure/GetProcedureView/?procedureId=…&procedureLotId=…` gives the cancellation date and reason. Per lot it also gives the offer deadline, winner-selection, awarding and cancellation dates.
- **Verdict: the input exists.** "Open" = CN published ≤ NFPP award date < first contract of that procedure (bulk), or < cancellation date (e-licitatie).
  - **Bulk alone covers the awarded procedures.** It needs one loader change: keep the initiation date.
  - **Cancelled and stalled procedures need the CN list:** about 2,000 requests for 2021–2026, plus procedure views for the cancelled ones only.
- **The rule's problem is precision, not input.** On bulk alone, depending on how strict the match is, 20–44 % of NFPP Records fall inside an open window of the same authority's competitive procedure (§3). On a hand-sampled set, the test agrees only loosely with the stop-gap reading of the Declared ground. As a Signal rule it needs a narrower match: lot or item level, the same eventual winner, and a cap on the window.

## 1. What our loaded data shows

| Lifecycle point | Source today | Loaded? | Note |
|---|---|---|---|
| Procedure identity | `seap.record.initiation_code` (CONTRACT kind) | Yes | CN/SCN/RFD/PC/RFQ code on 95.5–100 % of bulk rows per quarter. It is null on crawled contracts (28.5k, mostly 2024 and 2026) |
| Launch (CN publication) | Contracte bulk, initiation-date column | **No, ignored** | 100 % filled in every quarter, 2021Q1–2026Q3. It matches e-licitatie's `noticePublicationDate` on the cases checked (CN1028686 2021-02-25, CN1026226 2020-11-18) |
| Award | `award_date` = `DATA_CONTRACT` of each contract | Yes | Use the procedure's earliest contract. The award notice's `published_on` is the latest republication (Rev.2 notices republished in 2023–2025) |
| Offer deadline, evaluation, cancellation | none | n/a | Not in any bulk file |
| Unawarded or cancelled procedure | none | n/a | No contract means no row |
| Offer counts | `NUMAR_OFERTE` / `Numar oferte` | No, ignored | Present 2021Q1–2022Q4 except 2022Q1 (as ADR 0019 says) |
| CPV | `cpv_code` | Yes | **The 2022Q1 Contracte file has no CPV column** (`CONTRACTE_2022` era): 229k rows without CPV |

The NFPP side is complete enough: 49,784 NFPP AWARD_NOTICE Records from 2021 on (12,125 / 11,011 / 7,471 / 7,819 / 5,977 / 5,381 for 2021–2026), with authority, CPV, supplier and award date.

**Time from launch to first contract**, measured on the bulk (procedures by launch year):

| Launch year | Procedures | Median days | p90 |
|---|---|---|---|
| 2021 | 22,277 | 70 | 167 |
| 2022 | 24,131 | 71 | 160 |
| 2023 | 19,873 | 75 | 178 |
| 2024 | 23,577 | 83 | 195 |
| 2025 | 20,494 | 82 | 188 |
| 2026 | 7,559 | 66 | 123 (truncated) |

A competitive procedure is typically open for 2–3 months, often 6. An authority buying a CPV family through several tenders a year therefore has one open most of the time.

## 2. Coverage per year, from the e-licitatie CN list

I took 14 full days of CN/SCN notices, two or three per year (2021-02-09, 2021-06-01, 2021-10-19, 2022-03-15, 2022-09-07, 2023-05-10, 2023-11-22, 2024-04-17, 2024-10-02, 2025-02-12, 2025-06-11, 2025-11-05, 2026-03-18, 2026-10-14). For each I checked the state SEAP shows today and whether the CN number appears as an initiation code in our Contracte bulk:

| Year | CNs | Awarded: in bulk / all | Cancelled: in bulk / all | Still "In desfasurare": in bulk / all |
|---|---|---|---|---|
| 2021 | 300 | 208/208 | 0/80 (27 %) | 1/12 (4 %) |
| 2022 | 205 | 152/152 | 0/49 (24 %) | 3/4 (2 %) |
| 2023 | 236 | 136/178 | 0/46 (19 %) | 2/12 (5 %) |
| 2024 | 423 | 305/326 | 0/82 (19 %) | 4/13 (3 %) |
| 2025 | 263 | 208/211 | 0/41 (16 %) | 1/11 (4 %) |
| 2026 | 193 | 80/84 | 0/26 (13 %) | 0/77 (40 %, genuinely running); also 6 suspended |

Reading:

- **Awarded procedures are nearly all in the bulk.** The misses cluster on 2023-11-22 (39 of 42) and 2024: contracts concluded in 2024Q1, whose bulk file is thin (21k rows; the Coverage grid marks CONTRACT 2024-Q1 `POSSIBLY_INCOMPLETE`, 1,914 Records). Contracts from the newest quarter (2026-Q4, crawled, `CRAWLED_PROVISIONAL`) have no initiation code until the bulk file lands.
- **Cancelled procedures, 13–27 % of all CNs, are never in the bulk.** Such a procedure was open from its launch to its cancellation, and that is exactly the window a stop-gap NFPP sits in.
- **About 2–5 % of procedures from 2021–2025 still read "In desfasurare" years later**, with no award notice. Example: CN1028463 (Oradea, PPE, launched 2021-02-18). SEAP never closed them, and the bulk never has them. For the rule they are open-ended, so the window has to be capped. A natural cap is the offer validity deadline (`terms.offerValabilityDeadline`) in the procedure view.
- Day lists are small: 37–268 notices a day, far under the 3,000-row cap. A week fits in one or two requests.

## 3. The rule on bulk data alone

`/tmp/320/bridge.py` uses Contracte bulk only. "Open" = launch ≤ NFPP award date < first contract of the procedure, for the same authority CUI. It does not see cancelled or never-closed procedures.

| NFPP year | NFPP Records | Open procedure, same CPV group (3 digits) | … and the NFPP's supplier later won it | Same 8-digit CPV | … and same eventual winner |
|---|---|---|---|---|---|
| 2021 | 12,125 | 55 % | 27 % | 37 % | 20 % |
| 2022 | 11,011 | 62 % | 29 % | 43 % | 23 % |
| 2023 | 7,471 | 59 % | 29 % | 44 % | 23 % |
| 2024 | 7,819 | 60 % | 30 % | 41 % | 22 % |
| 2025 | 5,977 | 53 % | 26 % | 33 % | 18 % |
| 2026 | 5,381 | 29 % | 13 % | 14 % | 9 % (procedures not yet awarded are missing) |

**Agreement with the Declared ground.** Of the hand-fetched Annex D notices from #310 (373 notices, 313 matched to an NFPP Record), I split them with a stop-gap keyword regex (derulare, desfășurare, neatribuit, "până la încheierea…", expirat, stoc 0, evaluare):

| Explanation | Notices | Open procedure, same 8-digit CPV | … same eventual winner |
|---|---|---|---|
| Stop-gap text | 76 | 45 % | 28 % |
| Other text | 237 | 36 % | 13 % |

The structural test leans the right way but separates weakly. The sample is stratified, not random, and the regex is a first cut. Big hospitals run dozens of CPV-33 tenders a year, so an open procedure in the same CPV family is the normal state. The "same eventual winner" variant doubles the contrast (28 % vs 13 %). It is also the sharper story: the stop-gap supplier then wins the tender.

## 4. Worked examples

Each NFPP comes from the #310 research notes. The tender is found through the CN list filtered by `contractingAuthorityId` over the 400 days before the award, or named in the explanation. It is then checked with the procedure view.

| NFPP (award date) | Declared ground says | Tender found | Open on the NFPP date? | Bulk alone finds it? |
|---|---|---|---|---|
| **CAN1061636** (2021-05-31), ADPDU Sector 6, green-space maintenance, 1.67M RON | "incheiat in perioada de derulare a unei proceduri prin licitatie deschisa nr. CN1028686" | CN1028686, published 2021-02-25, offer deadline 2021-04-12, 6 lots. Lot 1: winner selected 2021-12-07, awarded 2022-02-05. Lot 2: cancelled 2021-11-18. First contract 2021-12-20 | **Yes**, by 6 months | Yes (CPV 77310000-6). The winner can't match: the NFPP went to a consortium with no CUI |
| **CAN1059173** (2021-06-24), SCM Cluj-Napoca, chlorine disinfectant | "LICITATIE DESCHIS IN DESFAURARE, EVALUARE PROPUNERE TEHNICA" | CN1028871, framework for disinfectants, published 2021-03-04, deadline 2021-04-06, 12 lots. Lots 1–2: winner selected 2022-01-17. First contract 2022-01-12 | **Yes**; the lots were in technical evaluation, as the text says | Yes (CPV 24455000-8) |
| **CAN1062072** (2021-04-21), Ambulanța București-Ilfov, vitamin B1 to MEDIPLUS EXIM | "…pana la incheierea procedurii de atribuire" | CN1026226, medicines framework, published 2020-11-18, deadline 2020-12-17, 121 lots. Lot 1: winner selected 2021-05-06. The Thiaminum 100mg/2ml lot went to FARMEXIM on 2021-05-12; MEDIPLUS won other lots of the same procedure | **Yes**, three weeks before the award | Only at CPV-3 level: the procedure's CPV is 33600000-6, the NFPP's 33616000-1 |
| **CAN1134154** (2024-09-27), SUU Elias, medical consumables to PRIME HEALTHCARE | "loturile 2; 8; 9; 10; 20; 21; 25 sunt incluse în procedura … CN1070310 / 24.06.2024 … în etapa de evaluarea tehnică" | CN1070310, launched 2024-06-24, first contract 2025-03-31; PRIME HEALTHCARE later won contracts under it | **Yes**, by 6 months | **Yes, with the same eventual winner** |
| **CAN1066294** (2021-10-28), SCM Oradea, sanitary materials to LUAN VISION | "procedura in derulare" | Several open 33140000-3 frameworks, e.g. CN1036161 (published 2021-10-22, winner selected 2021-12-20). CN1031984 was cancelled 2022-04-27 | **Yes**, but many candidates; the text doesn't say which | Yes (CPV 8), not with the same winner |
| **CAN1057609** (2021-06-04), SCM Oradea, PPE | "procedura in derulare" | CN1028463/64/551/552, PPE, published 2021-02-18/23, deadline March 2021, **still "In desfasurare" today**, no award notice | Yes, but they never closed | **No**: not in the bulk at all |
| **CAN1053986** (contract 2020-05-26), SJU Târgu Jiu, PPE | "LICITATIE DESCHISA NEATRIBUITA" | CN1019997, PPE framework, published 2020-03-25, **cancelled 2020-05-18** | **No**: cancelled 8 days earlier. The ground is really "failed procedure" | No (cancelled) |
| **CAN1087919** (2022-09-21), SU Petroșani, food | "nu exista contracte … valabile" | No food CN in the 400 days before; only a 2021 bread SCN | No: the expired-contract kind of stop-gap, which this rule cannot see | n/a |
| **CAN1111042** (2023-08-31), USAMV București | "nu a fost posibila initierea procedurii de Licitatie deschisa … personal insuficient" | None launched | No, by the authority's own admission | n/a |

The test confirms the text in 6 of 9 cases. Bulk alone finds 5 of those 6, one of them only at CPV-group level. The misses fall into three kinds:

- procedures that were cancelled or never closed: the e-licitatie CN list fixes these;
- CPV coded at a different depth on the procedure than on the NFPP: a CPV-group match fixes it, at a precision cost;
- stop-gaps where no procedure was running yet (expired contracts, a tender not yet launched): no procedure data can see these, and they stay a text reading of the Declared ground.

## 5. What e-licitatie adds, and what it costs

| Endpoint | What it gives | Requests for 2021–2026 |
|---|---|---|
| `POST /api-pub/NoticeCommon/GetCNoticeList/` (body as the crawl's CA list, plus optional `contractingAuthorityId`, `sysProcedureStateId`) | Each CN/SCN/PC: `noticeNo`, `procedureId`, `noticeStateDate` (publication), current `sysProcedureState`, tender deadlines, `hasLots`, CPV, estimated value, `hasAppeal` | ≈ 2,100 by day, ≈ 300–600 by week. Filtering by `noticeNo` doesn't work (ignored) |
| `GET /api-pub/PUBLICProcedure/GetProcedureView/?procedureId=…&procedureLotId=` | Procedure state, `cancellationDate`, `cancellationReason`, `suspensionDate`, the latest award notice number and date. On a single-lot procedure also `terms` (offer deadline, offer validity, winner selection, awarding, cancellation) | One per procedure. Needed only for the cancelled or never-closed ones (≈ 20–30 % of CNs, ≈ 6–8k a year) |
| `GET /api-pub/ComboPub/searchProcedureLots?pageIndex=0&pageSize=50&filter=&filterId={procedureId}` then the procedure view with `procedureLotId` | Lot list (50 per page), then per-lot state and dates as above | 1 + lots per procedure. Lot-level matching for the whole universe is expensive (CN1026226 alone has 121 lots); it is affordable only for candidate procedures |

Caveats:

- The state is a **current snapshot**; no history endpoint was found. A procedure cancelled after the NFPP shows as cancelled, so the cancellation **date** is what matters, and it needs the procedure view.
- **The award notice in the procedure view is the latest version.** CN1028871's CAN1071432 shows 2025-02-20, but the lots were awarded in January 2022.
- Per-lot views carry a `supplierList` of participants with CUIs. It was the same length on every lot of a procedure (29, 14, 21, 1), so it looks procedure-wide. `participantsInfo.noWithFiledOffer` was 0 on an awarded procedure (SCN1163869). Neither is an offer count yet; see the open questions.
- Endpoints behave the same for eForms-era notices (2025–2026 samples).

**Cheapest complete input:**

1. Keep the initiation date in the bulk load: one column in each Contracte era, no requests.
2. Crawl the CN list into the raw archive (ADR 0004): about 2,100 requests at 1.2 s, under an hour.
3. Fetch procedure views for cancelled and never-closed procedures that share an authority and CPV group with an NFPP Record: some thousands of requests, a few hours. Lot views only where a lot-level match is wanted.

## 6. Gaps

- **Expired-contract and not-yet-launched stop-gaps** are invisible to any procedure data (CAN1087919, CAN1111042). Only the Declared ground text shows them.
- **2024Q1 Contracte** is thin (`POSSIBLY_INCOMPLETE`). Procedures whose first contract fell in it look unawarded or start late, which lengthens their window.
- **2022Q1 Contracte has no CPV.** Procedures awarded only in that quarter can't be matched on CPV.
- **The newest quarter** (crawled contracts) has no `initiation_code`. The award-notice list row doesn't carry it. Whether the notice detail (`C_PUBLIC_CANotice/get`) names the CN was not checked here.
- **Stale "In desfasurare"** (2–5 % of 2021–2025 CNs) needs a cap on the window.
- **CPV granularity.** A procedure's main CPV differs from its lots' and from the NFPP's (CAN1062072). The bulk gives one CPV per contract, and lot titles are free text.
- 2020 NFPPs whose tenders were launched in 2020 have no launch date for the cancelled ones without e-licitatie. Awarded ones are in the bulk if their contracts fall in 2021+.

## 7. Verdict

The input exists:

- **for awarded procedures**, in files we already archive, after one loader change;
- **for cancelled and never-closed procedures**, in e-licitatie, for roughly 2,000 list requests plus a few thousand procedure views.

The cost is small. What is not settled is the rule: matched on authority + CPV alone it fires on a third or more of all NFPP Records. A defensible Signal rule needs at least one of:

- the **same eventual winner**: about 20 %, and twice as common among stop-gap texts;
- a **lot or item match**: lot titles from the CN, at a request cost;
- a window **capped** at offer validity.

It should be published with its firing rate and a hand-checked precision per ADR 0019. Read through the Declared ground, it gives the strongest examples: the authority itself names the open tender, and the procedure data confirms it (CAN1061636, CAN1134154).

## Sources

- Code: `watchdog/pipeline/bulk/headers.py` (Contracte eras; the initiation-date and `NUMAR_OFERTE` columns in `ignored=`); `watchdog/pipeline/sql/seap_schema.sql` (`initiation_code`, no launch date); `watchdog/pipeline/crawl/core.py` (award-notice list and contracts only); `watchdog/pipeline/crawl/client.py` (headers).
- Raw archive: `raw/seap/bulk/contracte/2021Q1 … 2026Q3`, read with `pipeline.bulk.readers.read_file`.
- Local DB: `seap.record`, `seap.coverage_cell`.
- e-licitatie (observed, undocumented): `GetCNoticeList`, `PUBLICProcedure/GetProcedureView`, `ComboPub/searchProcedureLots`; endpoint names from `/app-pub` (`apiProcedure = "api-pub/PUBLICProcedure"`, `getNoticeList → /GetCNoticeList/`).
- Annex D explanations: the #310 fetches (`C_PUBLIC_CANotice/get/{caNoticeId}`), quoted verbatim above.
- Scratch scripts and responses: `/tmp/320` (`extract.py`, `analyze.py`, `bridge.py`, `agree.py`, `cn/`).
