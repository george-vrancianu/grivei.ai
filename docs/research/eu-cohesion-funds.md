# EU cohesion funds (SMIS / MySMIS): bulk access, volume and Signals

Research for [#110](https://github.com/george-vrancianu/grivei.ai/issues/110) on the map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Checked on 2026-11-12. Answers the map's 11-point Source checklist.

**Bottom line:** the data is open and downloadable, but Grivei can't join it to its graph by key. The 2014–2020 and 2021–2027 project lists give beneficiary **names but no CUI**, except POCU, where the CUI sits inside free text. The 2007–2013 open archive is the only file with **contractor CUIs** for procurement done inside projects, but it was frozen in 2016. The procurement that public beneficiaries run inside projects is already in SEAP, which flags it as EU-funded.

Method: data.gov.ro CKAN API metadata; files downloaded to a scratch directory and profiled (row counts, columns, key coverage); the Kohesio public JSON API; the consolidated text of Regulation (EU) 2021/1060. Anything marked **(unverified)** was not checked against a primary source in this session.

## The landscape: what exists, by programming period

| Period | Managing system | What's published in bulk | Where |
|---|---|---|---|
| 2007–2013 | SMIS (CSNR) | Financing contracts, reimbursements, **procurement contracts inside projects**: SQL*Plus exports, monthly 2013–2016, then frozen | data.gov.ro [`informatii-derulare-fonduri-europene-smis`](https://data.gov.ro/dataset/informatii-derulare-fonduri-europene-smis), [`transparentizare_smis`](https://data.gov.ro/dataset/transparentizare_smis) |
| 2014–2020 | SMIS2014+ | Quarterly "lista proiectelor contractate" per programme (POIM, POR, POCU, POC, POCA, POAT, POAD), XLSX, 2018 → cut-off 31 Aug 2025 | data.gov.ro [`proiecte-contractate`](https://data.gov.ro/dataset/proiecte-contractate) (119 files); mirror at [mfe.gov.ro/contracte-in-implementare](https://mfe.gov.ro/contracte-in-implementare/) |
| 2021–2027 | MySMIS2021 / SMIS2021+ | The art. 49 "list of operations", published **per managing authority** (MIPE programmes plus 8 regional ADRs), often as PDF; no national bulk file found | e.g. [ADR SV Oltenia PDF](https://pr2021-2027.adroltenia.ro/wp-content/uploads/2024/09/Situatie-analitica-proiecte-contractate-in-cadrul-PR-SV-Oltenia-06-SEPTEMBRIE-2024-P.pdf); aggregated in [Kohesio](https://kohesio.ec.europa.eu) |
| 2021–2027 | (aggregate) | Monthly absorption status per programme (allocations, payments, EC reimbursements), no project rows | data.gov.ro [`stadiul-absorbtiei-fonduri-europene-politica-de-coeziune-2021-2027`](https://data.gov.ro/dataset/stadiul-absorbtiei-fonduri-europene-politica-de-coeziune-2021-2027) |

The MIPE "Date deschise" page points only to the two data.gov.ro datasets ([mfe.gov.ro/informatii-de-interes-public/date-deschise](https://mfe.gov.ro/informatii-de-interes-public/date-deschise/)). On [mfe.gov.ro/contracte-in-implementare](https://mfe.gov.ro/contracte-in-implementare/), the "Contracte în implementare" lists are all 2014–2020; that page has no 2021–2027 file.

## 1. Access

- **data.gov.ro (CKAN API, bulk):** the best path. `package_show` returns every resource URL with its creation date and size, e.g. [`/api/3/action/package_show?id=proiecte-contractate`](https://data.gov.ro/api/3/action/package_show?id=proiecte-contractate). Plain HTTP downloads, no auth.
- **mfe.gov.ro:** the same XLSX files under `wp-content/uploads/…`, listed at [contracte-in-implementare](https://mfe.gov.ro/contracte-in-implementare/). Non-browser HTTP clients get **HTTP 403** (checked with curl on the homepage), so a Connector should use the data.gov.ro copies.
- **2021–2027 list of operations:** no national bulk file. Each managing authority publishes its own list on its programme site (art. 49(3) CPR allows "the website" of the programme). Example: ADR Sud-Vest Oltenia publishes a **PDF** (29 pages at 06.09.2024) ([link](https://pr2021-2027.adroltenia.ro/wp-content/uploads/2024/09/Situatie-analitica-proiecte-contractate-in-cadrul-PR-SV-Oltenia-06-SEPTEMBRIE-2024-P.pdf)). Harvesting those would mean scraping about 16 sites and parsing PDFs.
- **MySMIS2021:** an application and management portal for applicants. MIPE runs it operationally and STS runs it technically ([startupcafe.ro](https://startupcafe.ro/fonduri-europene-cereri-finantare-sistem-electronic-mysmis2021-htm-23432)). No public data export or API was found **(unverified that none exists)**.
- **Kohesio (EU, alternative path):** a public JSON API behind [kohesio.ec.europa.eu](https://kohesio.ec.europa.eu). The endpoints were found in the site's JS bundle; there are no published docs:
  - `GET https://kohesio.ec.europa.eu/api/projects?country=https://linkedopendata.eu/entity/Q28&program=<entity>&limit=&offset=` (Romania is `Q28`);
  - `GET https://kohesio.ec.europa.eu/api/projects/<Q-id>?id=https://linkedopendata.eu/entity/<Q-id>` returns the detail, with beneficiaries;
  - `GET https://kohesio.ec.europa.eu/api/projects/download/csv?<same filters>` returns a CSV with **no beneficiary column**. Columns: ID, project name, total budget, EU amount, dates, country, summary;
  - `GET https://kohesio.ec.europa.eu/api/queries/programs?country=…` lists programmes.
  The data.europa.eu data story says all Kohesio datasets can be downloaded in CSV/XLSX and RDF ([link](https://data.europa.eu/en/publications/datastories/linking-data-kohesio-platform)). The per-country bulk-file URLs could not be found: the guessed `/data/projects/RO-latest.csv` redirects to the homepage. The SPARQL endpoint (`query.linkedopendata.eu`) returned HTTP 403.
- **Procurement inside projects:**
  - *Public* beneficiaries are contracting authorities and buy through **SEAP**. SEAP's own bulk exports carry `Fonduri comunitare?` / `Finantare prin fonduri comunitare?` / `Denumire program/ proiect` / `Fond european`. Grivei's loader currently **ignores** these columns ([`watchdog/pipeline/bulk/headers.py`](../../watchdog/pipeline/bulk/headers.py), e.g. lines 158, 197, 217, 407).
  - *Private* beneficiaries follow the competitive procedure of Ordin MFE 1284/2016 and publish on `beneficiar.fonduri-ue.ro` ([rubinian.com summary](https://www.rubinian.com/ordinul-1284-2016-procedura-competitiva-beneficiari-privati-fonduri-europene); [ADR Centru PDDTJ seminar](https://ptj.adrcentru.ro/wp-content/uploads/2026/06/1.Seminar-tehnic-beneficiari_Achizitii_PDDTJ.pdf)). That site sits behind a Cloudflare JavaScript challenge (HTTP 403 to curl), so it is scrape-only and hostile to scraping.
  - 2007–2013 only: SMIS published every procurement contract inside projects, with **contractor tax id**, in [`transparentizare_smis`](https://data.gov.ro/dataset/transparentizare_smis).

## 2. Licence and reuse

- data.gov.ro `proiecte-contractate`, `transparentizare_smis` and `informatii-derulare-fonduri-europene-smis` are under **OGL-ROU-1.0**. `stadiul-absorbtiei…2021-2027` is under **CC-BY-4.0**. Both come from the CKAN `license_id` / `license_title` fields of the `package_show` responses above.
- Kohesio: "available for download and free reuse" ([data.europa.eu data story](https://data.europa.eu/en/publications/datastories/linking-data-kohesio-platform)). The licence that applies to Kohesio specifically was not confirmed. The Commission's general reuse policy (Decision 2011/833/EU, CC BY 4.0) presumably applies **(unverified)**.
- Art. 49(4) CPR requires the 2021–2027 list to be published "in open, machine-readable formats … allowing data to be sorted, searched, extracted, compared and reused". The Oltenia PDF does not meet that ([Regulation 2021/1060, consolidated, art. 49](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02021R1060-20251025); the text was read from the 25.10.2025 consolidated FR version, [mirror](https://europe.wallonie.be/files/R%c3%a9glements/Reglement%202021%201060.pdf)).
- Art. 49(5): beneficiaries are told before publication that their data will be published. This is the legal basis for the names being public.

## 3. Join key into the graph

| File | Beneficiary key | Contractor key | Place |
|---|---|---|---|
| 2014–2020 lists (POR, POIM, POC, POAT) | **name only** (`Denumire beneficiar`) | none | region, county, locality (text) |
| 2014–2020 POCU | name, plus **CUI inside free text** (`L: <name> CUI 20806019 ; PARTENERI: …`); 1,273 distinct CUIs extracted from 2,947 projects | none | region, county, locality |
| 2021–2027 art. 49 lists (Oltenia sample) | name only | **contractor name** (`DENUMIRE CONTRACTANT*`), no CUI | address text |
| Kohesio | name, plus a `linkedopendata.eu` entity id; `website`/`wikidata` usually empty | none | coordinates, NUTS3 |
| 2007–2013 financing contracts | name, plus `BENEFICIARY_CODE`, an **internal SMIS id** (9,099 distinct; values like `1514`, `212050009`), **not a CUI** | n/a | county, locality, `TAU_CODE` |
| 2007–2013 procurement contracts | name, plus internal `Benef Code` | **`CNP` column holds the contractor's tax id**: 109,625 of 151,348 rows CUI-shaped (27,356 distinct), 32,944 zeroed (natural persons or unknown) | county and locality of the beneficiary |

So:
- **Contracting authorities and public beneficiaries** (UATs, ministries, hospitals) can be matched by name and place against the institutions Grivei already has from SEAP and the MF list of public entities.
- **Private beneficiaries** need a name-to-CUI step, for example against ONRC's open company list. Because aliases never merge entities and a CUI is required (ADR 0003), this needs its own identity ADR and a measured false-link rate.
- **The SMIS code** is the stable operation key across periods and files. Art. 49(3) requires "a unique code" for each operation.

## 4. People

- Art. 49(3)(b): where the beneficiary is a **natural person**, the list carries **first name and surname**, which must be deleted two years after first publication ([CPR art. 49(3)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02021R1060-20251025)). Natural persons may also appear as contractors, by name (art. 49(3)(a)).
- 2007–2013 financing contracts carry `LEGAL_REPR`, `LEGAL_REPR_POS`, `ADDRESS`, `PHONE`, `FAX` and `EMAIL`. `LEGAL_REPR` is filled on all 16,058 rows. These are people's names and contact data, which falls under the people gate (`docs/release-recipe.md` §3); a Connector should drop them at load.
- 2007–2013 procurement: natural-person contractors look zeroed (the file name is `contracteanonimizate.csv`; 32,944 rows with id `0…`).
- PFA and II beneficiaries in 2014–2020 appear by name in `Denumire beneficiar` **(count not measured)**. They map onto the existing **Natural-person supplier** convention ("Persoană fizică", never named).

## 5. Money measure

Yes, and richer than SEAP's:
- 2014–2020 lists: eligible value split into EU funds, national budget, own contribution and private contribution; non-eligible costs; **total project value**; and **payments to beneficiaries (lei)**, split EU / national. That is money actually paid, which SEAP does not have.
- 2007–2013 financing: `BUG_TOTAL`, `BUG_CHELT_ELIG`, `BUG_NERAM_UE/NAT`, `PREFINANTARE`, `RAMBURSAT`, `LAST_PAYMENT`.
- 2007–2013 procurement: `Contr value` per contract version. Summing all rows gives RON 132.2 bn, but modifications are separate rows ("Initial", "Modification no 5"), so a naive sum double-counts.
- 2021–2027 art. 49: total cost of the operation and the EU co-financing rate are mandatory (art. 49(3)(h), (k)). Oltenia also gives the ERDF / state budget / beneficiary split.
- Lens: the Money lens works by beneficiary place (county or locality is present). The measure would be "contracted value" or "paid to beneficiary", a **new money measure** separate from SEAP's Awarded value, and it must never be added to it.

## 6. Volume

Measured from the files and the API:

| Set | Rows | One snapshot | History |
|---|---|---|---|
| 2014–2020 projects (31 Aug 2025) | POR 8,040 · POC 3,399 · POCU 2,947 · POIM 2,387 · POAT 160 · POCA ~872 (Kohesio count) → **about 17.8k operations** | about 12 MB XLSX (POIM 5.2 MB, POR 3.4 MB, POCU 1.7 MB, POC 0.9 MB, POCA 0.8 MB, POAT 0.14 MB, from CKAN `size`) | 119 resources, quarterly 2018 → 2025; roughly 300 MB if all are archived **(estimate)** |
| 2014–2020 in Kohesio | 16,619 (Human Capital 2,818, Admin Capacity 872, LIOP 2,378, Competitiveness 3,084, ROP 7,329, TA 138) | via API | n/a |
| 2021–2027 in Kohesio | **4,733 operations** across 17 RO programmes (e.g. PR Nord-Est 669, PEO 1,050, Just Transition 371, Transport 75) | via API | n/a |
| Kohesio EU-wide | 2,277,418 projects, 825,181 beneficiaries ([`/api/queries/statistics`](https://kohesio.ec.europa.eu/api/queries/statistics)) | n/a | n/a |
| 2007–2013 financing contracts (30 Nov 2016) | **16,058** projects, 48 columns | 58 MB (HTML table named `.xls`) | monthly 2013–2016, frozen |
| 2007–2013 procurement contracts (30 Sep 2016) | **151,348** rows; 15,841 projects; 8,964 beneficiaries; 27,356 contractor CUIs | 42 MB CSV | frozen |
| 2007–2013 reimbursements | not counted | about 22 MB XLS (Mar 2015, CKAN `size`) | frozen |

Postgres: well under 1 GB for everything above, with the 2007–2013 procurement table (about 150k rows) the largest. Raw archive: under 0.5 GB, even keeping every quarterly 2014–2020 snapshot **(estimate)**.

## 7. History depth and update cadence

- 2007–2013: monthly exports from Oct 2013 to Dec 2016, then nothing (dataset `metadata_modified` 2016-12-06).
- 2014–2020: quarterly lists from 30 Jun 2018. The latest is the 31 Aug 2025 cut-off, uploaded to data.gov.ro on 2026-07-09, which is **about 10 months late**. The 2024 files are labelled "31 decembrie 2024" but were uploaded 2024-09-16, so the labels are unreliable. The period has closed, so a few more final lists at most.
- 2021–2027: art. 49(3) requires an update **at least every four months**, but per managing authority and in formats that vary. Kohesio picks them up on its own schedule **(cadence unverified)**. The absorption aggregate is monthly (latest 30 Sep 2026, uploaded 2026-10-13).

## 8. Data quality

- No beneficiary CUI outside POCU's free text, so identity rests on name matching.
- Headers span several rows (three header rows plus an English row), with merged cells and county subtotal rows (e.g. a row that only says `BACAU`). Column order differs between programmes and between quarters (POCU has a duplicated `CodSMIS`). A parser needs an "era" table like `headers.py` for SEAP.
- POCU's `Denumire beneficiar` packs the leader and all partners into one cell (`L: … CUI … ; PARTENERI: …`).
- The POR workbook carries a second, unlabeled pivot sheet (`Sheet2`: SMIS code → ERDF/state budget paid).
- 2007–2013 files are SQL*Plus HTML saved as `.xls`, ASCII/latin-1. Contract modifications are separate rows. The `CNP` column header is wrong (it holds CUIs). Some contractor names are placeholders (`Furnizor`, `Furnizor servicii`) with id `000000`.
- 2021–2027 lists are PDFs at some managing authorities, so they need table extraction.
- Kohesio translates labels and summaries automatically (`originalLabel` keeps the source), and some fields come back with a mix of languages (a Romanian project's specific-objective text came back in Bulgarian).

## 9. Candidate Signal rules

Candidates only, with rough sizing where this session's data allowed.

1. **Beneficiary founded shortly before the grant.** Needs this Source plus ONRC (registration date) and a beneficiary CUI. Today that is measurable only for POCU (1,273 CUIs), or after a name-to-CUI match. **Firing rate not measured.**
2. **Same firm wins SEAP contracts and EU grants through the same authority.** As worded in the ticket, this is weak: grants are awarded by managing authorities (MIPE, the ADRs), which rarely buy from grantees in SEAP. Stronger variants:
   - (a) a firm that is an **EU-grant beneficiary and also a SEAP supplier to a public beneficiary in the same county or period**. Needs SEAP plus this Source plus name-to-CUI.
   - (b) a firm that **wins the EU-funded SEAP contracts of many beneficiaries in one call** (SEAP's `Fonduri comunitare?` / `Denumire program` columns plus this Source's SMIS project list). Sizing proxy from 2007–2013 procurement: **386 contractors served 20 or more distinct beneficiaries**.
3. **Circular grant/contractor.** A firm that is a beneficiary in one project and a contractor in others. On the 2007–2013 data, a normalised-name proxy (not CUI-confirmed) gives **3,112 of 27,078 contractor names (about 11%)** also appearing as beneficiaries.
4. **One contractor takes most of a project's procurement.** 2007–2013: in **6,159 of 12,620 projects** (49%) with more than one CUI-identified contractor, one contractor holds more than 80% of the project's procurement value. A rate this high suggests the rule needs a value floor or a ratio to be useful.
5. **Contracted but not paid, or paid past the end date.** Within this Source alone, from the payments column versus status and end date. **Not measured.**

All of these except rule 5 cross Sources. Under the recipe they belong to the later of the Releases they need.

## 10. Who already uses it

- **Kohesio** (European Commission) republishes the managing authorities' lists of operations, Romania included ([kohesio.ec.europa.eu](https://kohesio.ec.europa.eu); [data story](https://data.europa.eu/en/publications/datastories/linking-data-kohesio-platform)).
- **EPPO**: Romania is among its most active member states for EU-funds fraud, with cases on irrigation, industrial projects and the Danube Delta ([EPPO, €20m industrial projects](https://www.eppo.europa.eu/en/media/news/romania-eppo-probes-eu20-million-fraud-involving-projects-industrial-production); [EPPO, €100m case](https://www.eppo.europa.eu/en/media/news/romania-eppo-indicts-key-suspects-eu100-million-mafia-linked-fraud-case)). These cases come from investigations, not open data.
- **The Black Sea** (2018) examined about €3.5 bn of 2007–2013 human-resources (POSDRU) money and found that on-the-spot checks lagged ([link](https://theblacksea.eu/stories/what-happened-eu-funds-romania/)).
- **Expert Forum, OpenTender:** no open-data analysis of SMIS beneficiaries by either was found in this session **(unverified; worth a direct check on expertforum.ro)**.

## 11. Recommendation

**Keep, as an explorable Source in a later Release, not Release 2.** Scope it to the 2014–2020 and 2021–2027 project lists, and treat the 2007–2013 procurement archive as a one-off historical load.

Why keep:
- It has a real, distinct money measure (contracted value and **paid to beneficiary**).
- It is open-licensed and cheap in volume, with a stable operation key (the SMIS code).
- It is the only public view of who receives EU grants, and it feeds several cross-Source Signal candidates with SEAP and ONRC.

Why not first:
- **There is no CUI.** Every non-POCU beneficiary needs a name-to-CUI identity step, with an ADR and a measured false-link rate, before it can join the graph under ADR 0003.
- The 2021–2027 data is fragmented across about 16 managing-authority sites, sometimes as PDF. Kohesio is the practical aggregator but has no bulk beneficiary export, so the Connector would be per-project API calls (about 21k for Romania) or a scrape.
- Natural-person beneficiaries (art. 49(3)(b)) and the 2007–2013 legal-representative fields fall under the people gate.

A cheaper step comes first and isn't a new Source: SEAP's bulk exports already flag EU-funded records (`Fonduri comunitare?`, `Denumire program/ proiect`, `Fond european`), and Grivei's loader drops these columns today. Keeping them would let a later EU-funds Release link SEAP records to SMIS projects by programme or project name, at no extra harvesting cost. Whether to keep them now is a Release 1 data-caveats decision, not a new Signal rule.

Reference sources it drags in: ONRC (name-to-CUI, registration date) and possibly NUTS/SIRUTA matching for place text.
