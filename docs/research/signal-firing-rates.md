# Candidate Signal firing rates on the national SEAP graph

Task for [#127](https://github.com/george-vrancianu/grivei.ai/issues/127) on the Source-roadmap map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Measured 2026-11-13. No methodology wording: these are sizing numbers for the Release-order decision.

## Method

- **Graph:** the local national load (Postgres `seap.*`, `core.*`), exported read-only into a scratch DuckDB. Records awarded 2021-01-01 to 2026-11-12: 13,944,099 records, **1,098.29 bn RON counted** (suspect values and framework ceilings excluded, per the counting rule), 178,336 supplier CUIs.
- **Per rule:** records matched, distinct suppliers, distinct authorities, value = counted value of the distinct matched records (each record once), share = value / 1,098.29 bn RON.
- The winners' `share` field in the graph is not used: it is zero on direct purchases and doesn't add up on contracts.
- **External files:** ONRC snapshot 04.11.2026; ANAF answers archived 2026-11-12; MF financial statements FY2020–FY2025; MIPE PNRR snapshot 15.10.2026; RegAS pulls 12.11.2026; POCU 2014–2020 list; BaniPartide (Expert Forum, CC BY 4.0); AEP 2020 and 2024 local-election minutes.
- Scripts are in [`signal-firing-rates/`](signal-firing-rates/). They read scratch files under `/tmp` and never write to the production schemas.

## Summary

The table shows, for each Source, the sharpest variant measured and the overlap that is context rather than a Signal.

| Source | Sharpest candidate (variant) | Suppliers | Share of value | Too broad to be a Signal (context) |
|---|---|---:|---:|---|
| ONRC | Contract/award notice within 90 days of registration; record ≥ 1M RON within 180 days | 82; 51 | 0.01%; 0.03% | Any record within 90 days: 4,224 firms, mostly small direct purchases |
| ONRC | Works (CPV 45) ≥ 1M RON to a firm with no construction CAEN | 615 | 2.83% | |
| ONRC | Record after the ANAF strike-off date | 822 | 0.01% | |
| ONRC (status, in place of BPI) | Now in insolvency/reorganisation, records in the last 6 months | 335 | 0.10% | Same firms, all records since 2021: 2.75% (status undated) |
| Financial statements | Awards ≥ 5M RON in Y, ≤ 1 employee in FY Y | 278 | 1.06% | Awards > 100% of turnover: 14,446 firms, 38% |
| Financial statements | SRL/SA with awards ≥ 1M RON and no statement for Y-1 or Y | 212 | 1.20% | |
| AEP / BaniPartide + AEP results | Donor to the leader's party, donation within 1 year of the award | 24 | 0.08% | Firm donors as suppliers: 655 firms, 7.5% |
| PNRR | Direct payee with no project wins from the ministry that paid it | 60 | 0.05% | PNRR company recipients as suppliers: 2,920 firms, 9.3% |
| State aid (RegAS) | Public body receiving aid wins SEAP as a supplier | 51 | 0.07% | Aid beneficiaries as suppliers: 13,045 firms, 39.5% |
| EU funds (POCU only) | — (founded-shortly-before never fires) | | | POCU beneficiaries as suppliers: 701 firms, 1.25% |

Rules that turned out to be near-zero: PNRR beneficiary registered shortly before its commitment (1 SEAP supplier at ≤ 12 months), POCU beneficiary registered shortly before the project (0 at ≤ 12 months), aid and contracts from the same authority (15 firms on exact names, 25 with the earlier hand matching).

Not measurable on the current graph: anything needing SEAP's EU-funded columns (PNRR rule 1, EU funds rule 2b), and the EU-funds rules that need name-to-CUI matching (ADR 0013) beyond POCU.

## ONRC (and insolvency status, in place of BPI)

Inputs: ONRC open data snapshot of 04.11.2026 (`od_firme`, `od_stare_firma`, `od_caen_autorizat`); ANAF answers archived 2026-11-12 (192,907 CUIs: main CAEN and dated strike-off). 163,184 of 178,336 supplier CUIs (91.5%) are found in ONRC.

| Rule (variant) | Records | Suppliers | Authorities | Value (bn RON) | Share of national value |
|---|---:|---:|---:|---:|---:|
| Founded shortly before winning: any record within 30 days of registration (firms registered 2021+) | 4,024 | 1,743 | 2,262 | 0.15 | 0.01% |
| … within 90 days | 16,061 | 4,224 | 5,614 | 0.49 | 0.04% |
| … contract or award notice (not a direct purchase) within 90 days | 106 | 82 | 66 | 0.10 | 0.01% |
| … record ≥ 1M RON within 180 days | 57 | 51 | 53 | 0.29 | 0.03% |
| Record awarded after the ANAF strike-off date | 1,793 | 822 | 653 | 0.14 | 0.01% |
| … more than 90 days after strike-off | 1,639 | 748 | 594 | 0.14 | 0.01% |
| Supplier now in faliment: records in the last 6 months | 137 | 35 | 74 | 0.004 | <0.01% |
| … all records since 2021 (upper bound, status undated) | 39,399 | 1,338 | 5,096 | 5.34 | 0.49% |
| Supplier now in insolvență or judicial reorganisation: records in the last 6 months | 2,728 | 335 | 882 | 1.10 | 0.10% |
| … all records since 2021 (upper bound) | 136,845 | 2,606 | 7,831 | 30.24 | 2.75% |
| Supplier now in dissolution or liquidation: records in the last 6 months | 218 | 75 | 124 | 0.004 | <0.01% |
| … all records since 2021 (upper bound) | 38,541 | 1,279 | 4,376 | 1.62 | 0.15% |
| Works (CPV 45) won by a firm with no construction CAEN (41–43) in ONRC or as ANAF main CAEN | 25,757 | 5,894 | 5,909 | 31.82 | 2.90% |
| … records ≥ 1M RON | 2,271 | 615 | 969 | 31.12 | 2.83% |

- Of 23,784 suppliers registered since 2021, 1,742 (7.3%) win within 30 days and 4,223 (17.8%) within 90 days. Almost all of it is small direct purchases. The narrower variants (a contract, or ≥ 1M RON) fire for 50–80 firms.
- ONRC states have no dates, so "in insolvency while winning" is only bounded: recent records by firms in that state now (lower bound on timing) against all records since 2021 (upper bound). Judicial reorganisation may legally keep trading (Law 98/2016 art. 167(2)). A dated rule needs monthly snapshot diffs or a paid BPI extract.
- The works rule's value is concentrated: 615 firms with records ≥ 1M RON carry 98% of it. Consortium leads and subcontracting explain part of it.
- Strike-off firings are probably partly late-published records or reused ids; they need a sample review.

## Financial statements (MF annual bulk)

Inputs: MF company files `WEB_UU_AN<y>` + `WEB_BL_BS_SL_AN<y>` for FY2020–FY2025 from data.gov.ro (FY2020 and FY2021 from the 2022-06-22 re-release, FY2022 2023-08-28, FY2023 and FY2024 `actualizat` 2025-07-27 / 2026-06-24, FY2025 first release 2026-06-11). Rows per year: 815,779 / 781,470 / 862,564 / 944,547 / 968,594 / 918,232. Joined to SEAP since 2021-01-01 (178,336 supplier CUIs, 1,098.29 bn RON counted). Supplier awards per year = sum of counted value split equally across winners; matched records = the supplier's records in the firing year; value = those records counted once.

| Rule (thresholds) | Records | Suppliers | Authorities | Value bn RON | % national |
|---|---:|---:|---:|---:|---:|
| Base: supplier CUI present in any FY2020–25 statement | 13,324,994 | 144,464 (81%) | 17,302 | 817.71 | 74.45 |
| 1a Awards in Y ≥ 1M RON, FY Y-1 employees ≤ 1 | 180,185 | 2,379 | 9,595 | 23.56 | 2.15 |
| 1a same, ≥ 5M RON | 11,848 | 406 | 3,147 | 16.18 | 1.47 |
| 1b Awards in Y ≥ 1M, FY Y employees ≤ 1 | 142,683 | 1,807 | 8,874 | 17.40 | 1.58 |
| 1b same, ≥ 5M | 8,455 | 278 | 2,151 | 11.60 | 1.06 |
| 1c Awards in Y ≥ 1M, FY Y-1 employees empty | 46,077 | 819 | 5,993 | 13.56 | 1.23 |
| 1c same, ≥ 5M | 8,157 | 187 | 1,940 | 11.61 | 1.06 |
| 1d Awards in Y ≥ 1M, FY Y-1 turnover < 10% of them | 34,897 | 1,756 | 6,068 | 117.78 | 10.72 |
| 1d same, ≥ 5M | 17,333 | 908 | 4,394 | 114.63 | 10.44 |
| 2 Awards in Y ≥ 100k and > 100% of FY Y turnover | 434,268 | 14,446 | 12,757 | 416.03 | 37.88 |
| 2 same, > 50% | 2,470,918 | 28,070 | 15,730 | 523.72 | 47.69 |
| 3 Wins in Y (2022–25), no FY Y-1 or Y row, any CUI | 455,447 | 30,282 | 13,697 | 18.26 | 1.66 |
| 3 same, SRL/SA names only | 196,861 | 5,035 | 10,065 | 13.77 | 1.25 |
| 3 same, SRL/SA, awards in Y ≥ 1M | 130,047 | 212 | 7,273 | 13.17 | 1.20 |
| 4a Awards in Y ≥ 1M, FY Y-1 equity < 0 | 102,440 | 1,188 | 6,928 | 32.25 | 2.94 |
| 4b Awards in Y ≥ 1M, FY Y-1 net loss | 322,512 | 2,281 | 10,983 | 74.93 | 6.82 |

- Rules 2 and 1d compare multi-year contract award values with one year's turnover, so big works and framework contracts dominate them (2 fires for 14k suppliers and 38% of value). As worded they're context, not Signals. Rule 1a/1b at ≥ 5M is the sharpest: of its 406 suppliers, 198 still report ≤ 1 employee in the award year, and 132 reach turnover ≥ 50% of the award that year. So about a third look like real activity booked with almost no staff, which could be subcontracting or a holding structure.
- Sanity sample (1a, ≥ 5M): 5 suppliers checked by hand all report 1 employee against 5–12.5M RON of awards in the year; two of them have FY turnover of 0.2–0.3M RON against a single award of 5–7M RON.
- Rule 3 is noisy. Only SRL/SA-named CUIs are meaningful, because public bodies, NGOs, PFAs and foreign firms never appear in these files. Of the 212 firms with ≥ 1M, 113 did file in another year (a gap, or a late filer missing from the first release); 42 are insurers, banks, leasing firms or IFNs that file specialised statements not loaded here. FY2025 is a first release, so 2025–26 gaps are overstated.
- Employees (I20) are empty for about 37% of filers. 1c is the "unknown headcount" bucket, not a firing. Awards in 2026 are compared with FY2025 for the Y-1 variants; 2026 has no FY Y statement yet.

## AEP firm donors and party of the elected leader

Inputs: SEAP graph export (records awarded 2021-01-01 → 2026-11-12, 1,098.29 bn RON counted); BaniPartide firm donors/lenders (3,571 rows with a valid CUI, 2,148 CUIs, 2006–2024, year only) and subsidy contracts (1,405 of 2,389 rows with a valid CUI, 177 CUIs, 2020–21); AEP final minutes 2020 and 2024 (mayors by SIRUTA, county council presidents by county). Mandate cutover fixed at 2024-10-25. Town halls and county councils classified by name with the #131 classifier, placed by the graph's placement (3,262 town halls, 43 county councils).

| Rule | Records | Suppliers | Authorities | Value bn RON | Share of national |
|---|---|---|---|---|---|
| Denominator: awards by town halls and county councils with an attributed leader | 2,114,444 | – | 3,277 | 285.70 | 26.01% |
| 1. Firm donor/lender is a SEAP supplier, award in or after a donation year (all years) | 382,122 | 655 | 9,936 | 82.44 | 7.51% |
| 1b. Same, donations since 2020 | 68,209 | 40 | 5,511 | 7.41 | 0.67% |
| 2a. Donor to the controlling party, donation year before the award year | 17,361 | 189 | 1,170 | 6.66 | 0.61% |
| 2a′. Same, donation year ≤ award year | 17,648 | 190 | 1,180 | 6.72 | 0.61% |
| 2b. Donor to the controlling party, donation year within ±1 of the award year | 713 | 24 | 119 | 0.89 | 0.08% |
| 2d. Donor to the controlling party, donation in the award year or the 4 before | 969 | 28 | 161 | 0.93 | 0.08% |
| 2c. Reference: donor (any party, any earlier year) wins from an attributed-leader authority | 50,157 | 475 | 2,583 | 33.83 | 3.08% |
| 3. Subsidy-paid supplier is a SEAP supplier | 471,020 | 119 | 10,319 | 18.50 | 1.68% |

Base rate for rule 1: donor-suppliers (658) have a median SEAP value of 1.28 m RON and a mean of 134 m RON, against 75 k and 8.4 m RON for all 178,336 CUI suppliers (donors since 2020: 43, median 3.65 m RON). Donors are large winners anyway.

Party split (distinct suppliers): 2a PNL 82, UDMR 71, PSD 44, USR 1; 2b PNL 12, UDMR 10, PSD 2.

- Donations carry only a year, so "before the award" is year-level; 2a is dominated by 2006–2012 donations (PNL, UDMR), which explains the gap between 2a (189 firms) and the ±1-year window (24 firms).
- Party matched on the exact donee label; alliance tickets (PSD-PNL 2024, USR PLUS, PSD-PRO…) count for each member party. Donations to predecessor parties (PDL, PC, PD, USL) never match, which undercounts long-run 2a.
- The 26.0% denominator is lower than #131's 30.5%: authorities without a SIRUTA/county placement or with an unmatched label drop out.
- Subsidy contracts: 41% of rows have no valid CUI; three parties, 2020–21 only. Mostly media, advertising and utilities, so rule 3 is noisy.

## PNRR, state aid, EU cohesion funds × SEAP graph

SEAP side: the local graph, records awarded 2021-01-01 to 2026-11-12. The national total is 1,098.29 bn RON counted (13.94 M records, 178,336 supplier CUIs). Value is the counted value of distinct matched records, so a record is counted once whatever its number of winners. Suppliers are matched on exact CUI. "Company" means a CUI in the ONRC 04.11.2026 snapshot whose legal form is not PF/II/IF. Scripts: `/tmp/sig127-scripts/pn_sa_eu.py`; scratch DB: `/tmp/sig127-pnrr/work.duckdb`.

### PNRR

Inputs: MIPE dashboard snapshot of 15.10.2026, with 24,891 project rows and 70,980 payment rows. There are 13,726 recipient CUIs, and 5,781 of them are companies (2,920 of those are SEAP suppliers). 6,690 project-beneficiary CUIs are SEAP authorities.

| Rule | Records | Suppliers | Authorities | Value (bn RON) | Share of national |
|---|---:|---:|---:|---:|---:|
| 1. Concentrated EU-funded awards in a PNRR UAT | – | – | – | – | not measurable: SEAP's EU-funded columns aren't loaded |
| 2a. PNRR company recipient wins any SEAP award | 725,347 | 2,920 | 13,342 | 102.2 | 9.31% |
| 2b. … from an authority that is itself a PNRR beneficiary | 316,822 | 2,514 | 6,104 | 61.3 | 5.58% |
| 2c. … as 2b, awarded 2022 or later | 261,518 | 2,438 | 5,989 | 56.2 | 5.12% |
| 3a. Direct-payment non-beneficiary (282 CUIs, 2.62 bn RON) wins any SEAP award | 180,444 | 160 | 8,165 | 18.5 | 1.68% |
| 3b. … from the ministry that paid it | 515 | 60 | 9 | 0.55 | 0.05% |
| 4. Company beneficiary registered ≤6 months before commitment | 0 of 5,870 company projects | 0 | – | – | – |
| 4. … ≤12 months | 8 projects (8 CUIs, 0.02 bn contracted); SEAP: 10 records | 1 | 7 | 0.002 | 0.00% |
| 4. … ≤24 months | 46 projects (44 CUIs, 0.65 bn contracted); SEAP: 30 records | 6 | 17 | 0.003 | 0.00% |

- Rule 2 is exposure, not proximity: half of PNRR company recipients are SEAP suppliers, and they hold 9% of national value.
- Rule 3b: 13 of the 15 paying ministry codes matched a SEAP authority by exact name. MIPE-RID and MMFTSS did not, so 3b is a lower bound.
- Rule 4 barely fires because the company schemes (IMM, C9) required firms with trading history. The newly founded firm in the press case was a *contractor* of beneficiaries, and PNRR doesn't publish contractors. A "young supplier" rule on SEAP×ONRC catches that case instead.
- Commitment dates come from `data_angajament`, converted from UTC timestamps to local dates. A firm's registration date is its earliest ONRC registration.

### State aid (RegAS)

Inputs: the two RegAS pulls of 12.11.2026, de-duplicated to 83,211 distinct rows. That gives 25,260 beneficiary CUIs and 132.0 bn RON of aid, from 2016 to now. 13,045 beneficiaries are SEAP suppliers. 2,553 received at least 10M RON, and 1,612 of those are SEAP suppliers. 122 beneficiaries have public-body names: 51 are SEAP suppliers and 107 are SEAP authorities.

| Rule | Records | Suppliers | Authorities | Value (bn RON) | Share of national |
|---|---:|---:|---:|---:|---:|
| Base. Aid beneficiary wins any SEAP award | 3,839,504 | 13,045 | 15,805 | 433.7 | 39.49% |
| 2. Aid ≥10M RON firm wins SEAP | 958,855 | 1,612 | 12,862 | 220.0 | 20.04% |
| 3a. Public-body aid beneficiary wins SEAP as supplier | 2,714 | 51 | 460 | 0.80 | 0.07% |
| 3b. Public-body aid beneficiary awards SEAP as authority (value it awards) | 225,092 | – | 107 | 71.6 | 6.52% |
| 1. Aid and SEAP award from the same authority (exact names only) | 52 | 15 | 6 | 0.001 | 0.00% |

- The base and rule 2 are context, not Signals: aid recipients hold 39% of national SEAP value, mostly large utilities and industry.
- Public bodies are picked out with a name regex (municipality, town, commune, county, council, regie, national company or society, university, hospital, airport, administration). It is rough and needs a hand check. Rule 3a, public bodies as suppliers, is the small, countable one.
- Rule 1 matched only 11 of 46 granting-authority names exactly, so it is a lower bound. The earlier research hand-matched more and reached 25 firms.
- Aid dates aren't windowed against award dates: aid runs from 2016, SEAP from 2021.

### EU cohesion funds (POCU 2014–2020 only)

Inputs: the POCU contracted-projects list on data.gov.ro (cut-off 31.08.2025), the only list with beneficiary CUIs (in free text). It covers 2,941 projects with a parsable leader CUI, and 1,999 beneficiary CUIs once leaders and partners are combined. 452 of those are companies. 701 are SEAP suppliers, 283 of them companies.

| Rule | Records | Suppliers | Authorities | Value (bn RON) | Share of national |
|---|---:|---:|---:|---:|---:|
| 2a. POCU beneficiary (leader or partner) wins any SEAP award | 213,585 | 701 | 11,356 | 13.7 | 1.25% |
| 2a. … company beneficiaries only | 199,783 | 283 | 10,822 | 13.4 | 1.22% |
| 1. Company beneficiary registered ≤6 / ≤12 months before project start | 0 / 0 of 1,069 projects | 0 | – | – | – |
| 1. … ≤24 months | 3 projects, 3 CUIs | 2 | – | – | – |
| 2b, 3, 4 (one contractor across many beneficiaries, circular beneficiary/contractor, concentration) | – | – | – | – | not measured: need name-to-CUI (ADR 0013) or SEAP's EU-funded columns |

- POCU is about 1 in 6 of 2014–2020 operations. The other programmes name beneficiaries without a CUI, so every figure here is a POCU-only lower bound.
- 2a is exposure (training providers, universities, NGOs that also sell to the state), not a narrow Signal.
- Partner CUIs come from regex parsing of the free-text leader/partner cell, so a few may be missed.

