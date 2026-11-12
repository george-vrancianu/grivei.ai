# OpenTender Romania: coverage, red flags and use for Grivei

Research for [#119](https://github.com/george-vrancianu/grivei.ai/issues/119) on the [Source roadmap map (#108)](https://github.com/george-vrancianu/grivei.ai/issues/108). Researched 2026-11-12.

**Bottom line:** OpenTender (run by the Government Transparency Institute, GTI) is a repackaging of TED and SEAP. It adds history from 2007 and a set of red-flag indicators. It adds no new subjects to the graph. Its licence is non-commercial share-alike, its data stops at December 2024, and it has no direct purchases. **Recommendation: ideas only, plus an optional one-off cross-check. Not a Source, not a Reference source.**

## How this was checked

- **opentender.eu could not be read.** Every page, including `/ro/download` and the methodology page, returns a Cloudflare challenge (HTTP 403, `cf-mitigated: challenge`) to scripted clients. Wayback copies exist ([download page, 2023-04-25](http://web.archive.org/web/20230425103552/https://opentender.eu/ro/download), [methodology, 2022-11-10](http://web.archive.org/web/20221110124124/https://opentender.eu/all/about/how-opentender-works)), but they timed out from here. Claims about opentender.eu's own downloads and its live indicator scores are therefore **unverified**.
- **Indicator definitions** come from the OpenTender frontend source. The repo is a 2017 fork of the DIGIWHIST frontend: [`indicators.json`](https://github.com/arnese/opentender-frontend/blob/master/src/app/model/indicators.json). The live set may have changed since (**unverified**).
- **The data** was measured from the OCDS republication on the Open Contracting Data Registry, [publication 75](https://data.open-contracting.org/en/publication/75). I downloaded `2024.jsonl.gz` (42,677,280 bytes; 262.6 MB unpacked) and `2009.jsonl.gz` (1,816,258 bytes) and parsed every line. "Measured" below means counted in these files.

## Checklist

### 1. Access

- **OCDS registry (usable):** bulk files per year from 2007 to 2024, plus all-time `full.jsonl.gz` and `full.csv.tar.gz`. Excel is also offered per year. Files download anonymously from `https://data.open-contracting.org/en/publication/75/download?name=<year>.jsonl.gz` ([publication 75](https://data.open-contracting.org/en/publication/75)). The registry re-retrieves the data monthly; the last retrieval was 27 Jun 2026 (same page).
- **opentender.eu:** the site has a download page ([opentender.eu/ro/download](https://opentender.eu/ro/download)) and a search UI, but both sit behind a Cloudflare bot challenge. Format, size and whether the indicator scores are included are **unverified**. No documented public API was found.
- No paid tier was found.

### 2. Licence and reuse terms

- **CC BY-NC-SA 4.0** (Attribution, NonCommercial, ShareAlike), as stated on [publication 75](https://data.open-contracting.org/en/publication/75). The registry's publication-policy field is blank.
- For Grivei, NonCommercial and ShareAlike rule out mixing OpenTender data into the served graph unless Grivei stays strictly non-commercial and republishes derived data under the same licence. Our own SEAP bulk from data.gov.ro has no such restriction. Reusing the indicator *ideas* (methods published in papers) carries no licence issue.

### 3. Join key into the graph

- **CUI on both sides.** Parties carry `additionalIdentifiers[].id` with scheme `ORGANIZATION_ID`, written as a CUI with or without the `RO` prefix (measured; for example buyer `RO30267310`, supplier `37556227` in a 2024 record).
  - 2024 buyers: 32,271 of 32,664 processes (98.8%) have a CUI-shaped buyer id.
  - 2024 suppliers: almost all have a CUI-shaped id. 406 identifiers are other shapes (foreign ids), 10 suppliers have none, and 11 ids are 13 digits (CNP-shaped).
  - 2009 is much weaker: only 1,619 of 5,122 processes have a CUI-shaped buyer id, and 2,335 of 5,716 award suppliers have no id at all (measured).
- **No UAT.** Buyers have a free-text `address.region` (a county name, present on 79% of 2024 processes, measured), a street and sometimes a postal code. There is no SIRUTA code.
- **No SEAP public codes, only links.** `tender.id` looks like the SEAP notice number (`CN1074651`). Award documents link to `e-licitatie.ro/api-pub/RFQ_PUBLIC_CANotice/get/<id>`, so records could be matched to ours by notice code (measured, one example; match rate **unverified**). OpenTender's own party ids are UUIDs.

### 4. People

- **No people as subjects** in the OCDS export.
- **Buyer contact persons are present.** `parties[].contactPoint` holds the name, email and telephone of the authority's contact (measured, for example a named person at Complexul Energetic Oltenia). These are personal data we would not show, by the same reasoning as ADR 0003.
- **A few CNP-shaped supplier ids** (11 in 2024, 8 in 2009; measured). Under ADR 0003 these must never be stored or shown. Any ingest would have to drop them.
- The GTI "political connections of suppliers" indicator is marked `notused` in the frontend model ([indicators.json](https://github.com/arnese/opentender-frontend/blob/master/src/app/model/indicators.json)). No people data appears to be published for Romania (**unverified** on the live site).

### 5. Money measure

- `awards[].value.amount` with currency, mostly RON. In 2024, 60,325 of 72,077 award objects have a value, 59,900 of them in RON, and about 366 are in EUR (measured). The RON award values in the 2024 file sum to 436.5 bn RON. That figure is not deduplicated and not checked for outliers, so treat it as an upper bound with known double counting. Lot and tender estimated values are also given.
- **There is no contract object and no amendments** (`Contracts 0`, `Amendments 0`, `Transactions 0`: [publication 75](https://data.open-contracting.org/en/publication/75)). So the measure would be award value, like our Awarded value, and nothing on payments or modifications.
- **The estimated value at tender level looks wrong by a factor of 100 in many records.** Among 2024 processes with a single award, 6,526 of 13,852 (47%) have an award value under 2% of `tender.value`. The example record has `tender.value` 28,821,613 RON against a lot value of 288,487.93 RON and an award of 288,216.13 RON. This is consistent with tender value being stored in bani. The cause is **unverified**, but the field is unusable without a fix.

### 6. Volume

- **Registry counts, all years** ([publication 75](https://data.open-contracting.org/en/publication/75)): 448,018 tenders, 1,006,432 awards, 1,039,620 award suppliers, 1,111,258 parties, 1,606,821 tender items, 1,586,258 documents.
- **Bulk sizes:** all-time `full.jsonl.gz` is 414 MB and `full.csv.tar.gz` is 576 MB. Per year (jsonl.gz): 31–43 MB for each of 2018–2024, and 2–14 MB for 2007–2017 (same page).
- **2024 measured:** 32,664 processes, 72,077 award objects, 23,881 processes with at least one award.
- **Rough storage (estimate):** a Raw archive of about 0.4 GB (the gz as fetched). Unpacked JSON is about 2.5 GB, extrapolating the 2024 ratio of 6.2× to the full file. Typed Postgres tables would be about 1–2 GB with indexes (**unverified**).

### 7. History depth and update cadence

- **Coverage:** January 2007 to December 2024. The registry says "updated weekly" for the source and retrieves it monthly ([publication 75](https://data.open-contracting.org/en/publication/75)). Yet the June 2026 retrieval still ends in December 2024, so the effective data lag is 18 months or more.
- **Sources by period** (measured from document URLs):
  - 2009: TED CSV dumps from `data.europa.eu` and `istoric.e-licitatie.ro` award notices. That year is thin: 5,122 processes, 4,131 of them dated January.
  - 2024: 21,517 processes link to e-licitatie.ro and 10,474 to TED. Matching by supplier CUI plus award value finds only 165 keys present in both, so the two feeds are mostly disjoint, not duplicated.
- **Thin early years.** Per-year file sizes jump from 13 MB (2017) to 31 MB (2018) ([publication 75](https://data.open-contracting.org/en/publication/75)). Coverage before 2018 is therefore much thinner. A likely cause is that data.gov.ro bulk exports were used only from about 2018 (**unverified**).

### 8. Data quality

- **No direct purchases.** None of the 2024 document URLs point to a direct-purchase page. All are TED, `RFQ_PUBLIC_CANotice` (award notices) or `getNoticeStickyData` (contract notices) (measured). The registry describes the national feed as "contracts below EU thresholds" from data.gov.ro ([publication 75](https://data.open-contracting.org/en/publication/75)), but in practice that means simplified procedures, not DAs. Direct purchases are most of our SEAP records and are what our Over cap and Splitting rules run on.
- **Award dates almost absent:** 237 of 72,077 awards in 2024 have `awards[].date` (measured), and there is no `contractPeriod`. Decision period cannot be computed from the OCDS export.
- **Tender period:** `tenderPeriod.endDate` is present on 23,096 of 32,664 records. `startDate` is never present. The advertisement period has to be computed from the tender notice's `datePublished`, which gives a negative result for 149 records (measured).
- **Bid counts:** `bids.statistics` carries only `electronicBids`, `smeBids` and `foreignBidsFromEU` per lot. The generic `bids` count appears 5 times in 2024 (measured). Single bidding has to be read from `electronicBids`, which is reasonable for SEAP (all-electronic), but that is an inference.
- **Values:** the ×100 tender estimates (point 5), currency mixing (EUR, BGN, USD, PLN; measured), and no amendments.
- **Procedure labels are mixed:** Romanian SEAP labels ("Procedura simplificata", "Negociere fara publicare prealabila") sit beside TED codes (`open`, `neg-wo-call`, `pt_award_contract_without_call`) (measured). They would need mapping before any rule could use them.
- The registry has "not yet prepared a data quality summary" for this dataset ([publication 75](https://data.open-contracting.org/en/publication/75)).

### 9. Candidate Signal rules (red-flag indicators compared with ours)

GTI's integrity indicators (names and definitions from [indicators.json](https://github.com/arnese/opentender-frontend/blob/master/src/app/model/indicators.json); method in [Fazekas & Kocsis 2020, BJPolS 50(1)](https://cambridge.org/core/journals/british-journal-of-political-science/article/uncovering-highlevel-corruption-crossnational-objective-corruption-risk-indicators-using-public-procurement-data/8A1742693965AA92BE4D2BA53EADFDF0); the same seven-flag set in [IMF WP/22/94](https://www.imf.org/-/media/files/publications/wp/2022/english/wpiea2022094-print-pdf.pdf.md)), set against our four Signal rules (`explorer/packages/app/src/copy/methodologyEn.ts`):

| GTI indicator | Our nearest Signal rule | Data it needs | Rough Romanian rate |
|---|---|---|---|
| Single bidder contract | none | Bid count per lot. Our SEAP bulk contract files carry `NUMAR_OFERTE` / `Numar oferte`, which the loader currently ignores (`watchdog/pipeline/bulk/headers.py` lines 335, 406) | **36%** of 2024 lots in open or simplified procedures had exactly one electronic bid (14,808 of 40,860; measured, OCDS). [IMF WP/22/94](https://www.imf.org/-/media/files/publications/wp/2022/english/wpiea2022094-print-pdf.pdf.md): 31% of contracts, 2007–2020. [Single Market Scoreboard](https://single-market-scoreboard.ec.europa.eu/node/612_ro): 44% in 2024 (TED scope) |
| Call for tenders not published | **No publication** (partial: ours is only "Negociere fără publicare prealabilă") | Procedure type | Not measured |
| Procedure type (non-open) | **No publication** (partial) | Procedure type | In 2024, 2,610 processes are labelled "Negociere fara publicare prealabila" and 449 "Norme proprii" (measured) |
| Advertisement period (too short or too long) | none | Contract-notice date and deadline. Our bulk has `DATA_ANUNT_PARTICIPARE`, also ignored; the deadline is **unverified** in our files | 795 of 23,096 records with both dates (3.4%) had 10 days or fewer from notice to deadline (measured, OCDS 2024; thresholds are GTI's, not checked) |
| Decision period (too short or too long) | none | Deadline and award or contract date | Not computable from OCDS (no award dates). Possibly computable from our bulk (`DATA_CONTRACT`) once a deadline column exists (**unverified**) |
| Description length (overly long) | none | Free text | Not measured |
| New company (under 1 year at award) | none | **ONRC** registration date (cross-Source) | Not measured |
| Tax haven supplier | none | Supplier country (Financial Secrecy Index list) | Not measured. Our bulk carries `CASTIGATOR_TARA` / `Tara ofertant castigator`, also ignored |
| Winner contract share, political connections, eligibility and evaluation criteria | none | Marked `notused` by OpenTender | n/a |
| (none in GTI) | **Over cap**, **Splitting** | Direct purchases | OpenTender cannot reproduce these: it has no DAs |
| (none in GTI) | **Framework overrun** | Framework ceilings and subsequent contracts | OpenTender has no contract objects and no framework link |

What this means for the map:

- **Cross-Source candidate.** Only "new company" is a candidate rule that needs another Source: SEAP plus ONRC. It belongs to whichever Release brings ONRC.
- **SEAP-only ideas, outside this map.** Single bidding, advertisement period, decision period and tax haven all need only SEAP, from columns our bulk already holds. Per #108 they are out of scope here and should be noted for a later SEAP Signal-rules effort.
- **GTI's composite CRI score** contradicts our glossary: Signals are "counted, never scored". Only the individual flags are usable ideas.

### 10. Who already uses it

- **GTI / OpenTender** publishes per-country dashboards and the indicator scores ([opentender.eu/ro](https://opentender.eu/ro); content **unverified**, blocked by Cloudflare).
- **[IMF Working Paper 22/94](https://www.imf.org/-/media/files/publications/wp/2022/english/wpiea2022094-print-pdf.pdf.md)**, "Assessing Vulnerabilities to Corruption in Public Procurement and Their Price Impact", uses Romanian portal data for 2007–2020 (620,261 observations) and reports a 31% single-bidder share.
- **[BridgeGap datahub](https://dh.gov2.ro/dataset/OpenTender)** (dh.gov2.ro) mirrors OpenTender's single-bid rate as indicator `OT_singlebid`.
- No published use by Expert Forum, Funky Citizens or Recorder citing OpenTender was found in a web search. That is **unverified**; a missing search result does not prove nobody uses it.

### 11. Recommendation

**Ideas only, with an optional one-off cross-check. Do not adopt it as a Source or a Reference source.**

Reasons:

- **Licence.** CC BY-NC-SA 4.0 is incompatible with mixing it into our graph and serving it freely.
- **Nothing new to join.** It is TED plus SEAP, the same subjects keyed by the same CUI. TED-only above-threshold awards should already be in SEAP. A Reference source must enrich the graph, and this one adds no new identity, place or denominator.
- **Thinner and older than our load.** It has no direct purchases, no contract or framework link, no amendments, a broken tender-value field, and data that stops in December 2024, while ours runs to the current quarter.
- **Its one unique asset is 2007–2020 history.** That is before our window (ADR 0002 seeds from 2021). Even for backfill, the primary is the data.gov.ro bulk, not a non-commercial repackaging.

Worth taking:

1. **The indicator list**, as Signal rule candidates for a future SEAP-rules effort: single bidding, advertisement period, decision period and tax haven. Most of them are computable from columns we already ignore. New company is the cross-Source candidate with ONRC.
2. **An optional cross-check.** Compare OpenTender's 2021–2024 award-notice counts and RON totals per county against our graph as a coverage sanity check (the join is CUI plus the notice code in `tender.id`), then throw the copy away.
