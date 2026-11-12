# State aid register (RegAS / TAM): access, volume and Signals

Research for [#120](https://github.com/george-vrancianu/grivei.ai/issues/120) on the [Source roadmap map (#108)](https://github.com/george-vrancianu/grivei.ai/issues/108). Answers the map's 11-point Source checklist. Checked on 2026-11-12.

Figures marked **measured** come from two full pulls of the public RegAS transparency API that day (one unsorted, one sorted by CUI and date; 28 requests of 5,000 rows each, 5 s apart), joined against the local SEAP Raw archive (bulk Contracte, Fără anunț, DAN and DA files, 2021 Q1 to 2026 Q3, read with `watchdog/pipeline/bulk`). Anything not measured and not read in a primary source is marked **unverified**.

## Summary

- **Romania does not publish award-level state aid on the EU Transparency Award Module (TAM).** TAM's public search lists Romania among the Member States that publish elsewhere and links to RegAS; a TAM search for Romania returns "No results found" (**measured**). The Source is therefore **RegAS**, run by Consiliul Concurenței.
- RegAS's public transparency page is backed by an unauthenticated JSON API that returns every published award with the **beneficiary CUI**, amount in RON, date of granting, aid measure (SA number), granting authority (by name only), development region, CAEN codes, instrument and enterprise size. A full pull works with paging, but there is no bulk file, no documented API and no licence.
- **About 83,000 distinct award rows** (the count endpoint says 135,174, but about 52,000 of those rows are exact repeats), for **25,201 distinct beneficiary CUIs** and **131 billion RON** of aid, granted 2016 to 2026. Most of it is 2020 to 2024 (COVID schemes and the IMM Invest guarantees).
- **No people:** every row has a CUI-shaped identifier; none is CNP-shaped. **Half the beneficiaries (12,916, 51%) are also SEAP suppliers.**
- The ticket's candidate Signal (state aid and SEAP contracts from the same authority) **barely fires: 25 firms**, because 83% of rows have the Ministry of Finance as granting authority and local authorities do not grant on this register's public part.
- **Recommendation: keep, as an explorable Source with a Money lens, late in the order** (Release 3 or later), not as a Reference source. Details in §11.

## 1. Access

- **TAM (EU):** the public search at <https://webgate.ec.europa.eu/competition/transparency/public/search/home?lang=en> says "The aid awards granted by the Member States not using the European Commission website can be found at the following addresses: … Romania: https://regas.consiliulconcurentei.ro/transparenta/index.html". A search with country = Romania (form POST to `/competition/transparency/public/search/results`) returned **No results found**, while the same search for Estonia returned awards with "Export CSV / Export XLSX" links (**measured**). TAM is not a route to Romanian data today.
- **RegAS public transparency page:** <https://regas.consiliulconcurentei.ro/transparenta/index.html>, an AngularJS app whose logic is in <https://regas.consiliulconcurentei.ro/transparenta/js/public_transparenta.js>. It calls JSON endpoints that need no login (**measured**):
  - `POST /apitransparenta/countTransparenta` with a filter object returns the number of matching rows. With an empty filter: **135,174**.
  - `POST /apitransparenta/cautareTransparenta` with `{model: <filter>, page, size, sort}` returns rows. `size=5000` works: about 4.3 MB of JSON per page, 15 s to 3 min per request.
  - Both need the Spring `XSRF-TOKEN` cookie (set by a GET of the page) echoed back as an `X-XSRF-TOKEN` header; without it they return 403.
  - The filter accepts `cui`, beneficiary name, measure, region, CAEN, category, instrument, enterprise size and granting authority. The UI has date fields in the model (`startDate`, `stopDate`) but never sets them.
  - Lookup endpoints (GET, no token): `proceduraList` (notified / exempted / de minimis), `instrumenteAcordareList`, `nivelOrganizareList`, `furnizorList?idNivelOrg=` (granting authorities: **42 central, 8 regional, 273 local**, names only, no CUI), `getCodCAENDTOTree`.
  - The grid's "export all" asks for every row in one request (`size = totalItems`). Doing that returned **HTTP 504 after 150 s** (**measured**), so a Connector has to page.
  - The measure's legal text is a PDF at `/apitransparenta/downloadPdfMasura/{idMasura}`.
- **Paging must be sorted.** With `sort: null`, the 28 pages overlapped heavily and yielded only 43,145 distinct rows. Sorted by `cui` then `dataAcordare`, the same 28 pages yielded 82,683, and the two pulls together 83,211 (**measured**). A Connector should page with an explicit sort, or better, slice by a filter (for example by measure or granting authority) so that each slice fits one page and can be checked against `countTransparenta`.
- **TLS:** `regas.consiliulconcurentei.ro` serves its certificate without the Sectigo intermediate ("Sectigo Public Server Authentication CA DV R36"), so default clients fail with "unable to verify the first certificate". The fix is to ship the intermediate (from the certificate's AIA URL, <http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt>), not to turn verification off (**measured**).
- **No bulk file:** data.gov.ro has no state aid dataset, and Consiliul Concurenței is not a publishing organisation there. CKAN `package_search` for "ajutor de stat", "ajutoare de stat", "regas" and "consiliul concurentei" finds none (**measured**, for example <https://data.gov.ro/api/3/action/package_search?q=regas>).
- **The register behind the public page is login-only.** Contracts, payments, recoveries and the full de minimis records need a digital certificate (the API's error page says so). Beneficiaries see only their own aid (Order 437/2016, art. 17; <https://legeaz.net/monitorul-oficial-539-2016/ordin-cc-437-2016-regulament-regas>).
- **RegAS 2 is being built.** The financing contract was signed on 6 March 2025, for 43.4 million lei and 30 months of work, so the end date is roughly late 2027 (**unverified**). Its scope includes "integration with the Commission's Transparency Award Module (TAM)" and migration of RegAS 1 data (<https://agerpres.ro/economic/2025/03/06/consiliul-concurentei-incepe-dezvoltarea-unui-nou-registru-al-ajutoarelor-de-stat---regas-2--1428454>). Expect the endpoints above to change, and Romanian awards possibly to move to TAM, within the life of a Release built on them.

## 2. Licence and reuse terms

- The transparency page and its API carry no licence, terms of use or reuse statement (**measured**: none in the page HTML or JS).
- Publication is an EU legal duty. Individual awards above EUR 100,000 (other thresholds in some legal bases) must be published within six months of granting, on TAM or on "a comprehensive State aid website, at national or regional level" (<https://competition-policy.ec.europa.eu/state-aid/aid-beneficiaries_en>). TAM's home page gives the purpose: "allowing citizens and companies to access easily relevant information about awarded aid, such as name of the beneficiary, amount, location, sector and objective".
- Romania's general reuse regime is Legea 179/2022 on open data and the reuse of public sector information, which transposes Directive 2019/1024 (<https://legislatie.just.ro/Public/DetaliiDocument/256414>, as cited by <https://www.opengovpartnership.org/members/romania/commitments/RO0084/>). Whether it covers this dataset without a request is **unverified**. Before a Release, send Consiliul Concurenței a short reuse notice or request, as for other unlicensed Sources.

## 3. Join key into the graph

- **Beneficiary: CUI.** 82,668 of 82,683 distinct rows have a numeric `cui`; 15 are empty; none is non-numeric (**measured**). It joins directly to the ANAF-confirmed CUI of ADR 0003. Each CUI has a single name spelling in all but one case (**measured**).
- **Granting authority (`finanțator`): name only**, with no CUI, from a closed list of 323 providers (`furnizorList`). The published rows use only **46 of them**. 17 of 45 normalised names exactly match a SEAP contracting-authority name (the 8 regional development agencies and several ministries); the rest need matching by hand (**measured**). A 46-row crosswalk to authority CUIs fits ADR 0003's identity override file.
- **Place:** `regiune` is a development region (NUTS 2), or "Toate regiunile" on 4,964 rows; it is never a county or UAT (**measured**). County placement would come from the beneficiary's registered seat via ANAF, already a Reference source, not from RegAS.
- **Measure:** `referintaMasura` holds an SA number (for example `SA.104966/2022`) that links to the Commission's case register (<https://competition-cases.ec.europa.eu/search>). There are 270 distinct measures (**measured**).

## 4. People

No people as subjects. Beneficiaries are undertakings: 42,970 small, 20,869 medium, 16,338 micro and 2,100 large enterprises, plus 406 "IMM" or other (**measured**). There are no CNP-shaped (13-digit) identifiers (**measured**). The schema also has `raf` (a farm registration code; 49 rows) and `altCod` (another code; 15 rows) for beneficiaries without a CUI. These may include sole traders or farmers, which is **unverified**. RegAS does not trip the people gate in `docs/release-recipe.md` §3. The loader should still drop any CNP-shaped value, per ADR 0003.

## 5. Money measure

Yes. Each row has `ajutorAcordatSubcategorie` (aid granted, RON), plus `ajutorAcordatCategorie` and `intensitate` (aid intensity, %). Distinct rows sum to **131.25 billion RON**, and only 8 rows have a zero or empty amount (**measured**).

Caveats for a Money lens:

- 36,176 rows are **subsidised guarantees** (`garanții subvenționate`, mostly IMM Invest). For these the amount is probably the guaranteed loan, not the aid element (**unverified** per scheme), so summing them with grants (45,049 `fonduri nerambursabile` rows) overstates aid. The lens needs an instrument filter, or a default to grants only.
- A row is a grant decision, not a payment. Payments are in the login-only part of RegAS.

## 6. Volume

- **Rows:** the count endpoint says 135,174; about 83,200 are distinct (**measured**, see §1 and §8).
- **Download:** 28 requests, **112 MB of JSON** per full pull, **4.9 MB gzipped** (**measured**). A full pull takes about 30 to 60 minutes at 5 s between requests.
- **Raw archive:** about 5 MB per dated pull compressed, about 250 MB a year at one pull a week (estimate).
- **Postgres:** about 83,000 award rows of some 20 columns, roughly 50 to 100 MB with indexes and a search table (estimate, not loaded).
- For comparison, the SEAP archive yields 16.97 million rows with a supplier CUI and 246,860 distinct suppliers (**measured**), so RegAS is a small Source.

## 7. History depth and update cadence

- **History:** grants are dated from 13 January 2016 to 12 November 2026, the day of the pull (**measured**).
- **Rows by year of granting** (distinct rows): 2016: 122, 2017: 118, 2018: 366, 2019: 225, 2020: 12,353, 2021: 17,839, 2022: 21,137, 2023: 15,224, 2024: 11,741, 2025: 1,323, 2026: 2,235. Before 2020 there are only a few hundred a year (**measured**). The drop after 2024 is probably the end of the COVID-era IMM Invest volume combined with the six-month publication lag (**unverified**).
- **Cadence:** granting authorities must record grant acts and payments within 7 working days of signing (Order 437/2016, art. 29; <https://legeaz.net/monitorul-oficial-539-2016/ordin-cc-437-2016-regulament-regas>). EU rules allow transparency publication up to six months after granting (<https://competition-policy.ec.europa.eu/state-aid/aid-beneficiaries_en>).
- There is no change feed or last-modified field, so a weekly full re-pull, kept as a dated Raw archive unit (ADR 0004), is the simplest Connector.

## 8. Data quality

- **Exact duplicate rows from the server.** Asking for a single CUI (`27502629` or `6206892`) gives a count of 2 and returns the same row twice (**measured**). About 52,000 of the 135,174 rows are such repeats. The loader must deduplicate, and Coverage must not use the count endpoint as its denominator.
- **Unstable unsorted paging** (§1). This trap silently loses half the rows.
- **Granting authority is free text from a list**, with name drift across reorganisations. For example, "Ministerul Economiei, Antreprenoriatului şi Turismului" and "Ministerul Economiei, Digitalizării, Antreprenoriatului şi Turismului" both appear, and diacritics vary (ş/ș) (**measured**).
- **One authority dominates.** "MINISTERUL FINANȚELOR PUBLICE" is the granting authority on **69,129 of 82,683 rows (84%)**, for 18,755 beneficiary CUIs (**measured**). These are mostly the IMM Invest-type guarantee schemes run through a guarantee fund, so the "granting authority" says little about who really decided.
- **Region, not place:** see §3. `executanti` and `intermediariFinanciari` are empty on every row (**measured**).
- **Scope is partial.** The public page holds transparency-threshold awards plus 1,846 de minimis rows (**measured**). It does not hold the rest of the 280,000+ contracts that RegAS 1 reports (§10), nor payments or recoveries.

## 9. Candidate Signal rules

All counts are on distinct RegAS rows against the SEAP bulk archive, 2021 Q1 to 2026 Q3, matched by normalised CUI (**measured**).

1. **Aid and SEAP contracts from the same authority** (the ticket's candidate). A firm has a RegAS award whose granting authority is also a SEAP contracting authority that awarded it a contract or direct purchase. It fires for **25 firms (224 SEAP records)** on exact name matches. Hand matching the other 28 granting-authority names would raise this only a little, since those are mostly central bodies that buy little. Needs RegAS, SEAP and the 46-row authority crosswalk. **Too rare to be worth a Signal rule on its own**, though it could be a section on the entity page.
2. **Large aid recipient that is also a large SEAP supplier.** A firm with at least 10 million RON of aid that also wins SEAP contracts: **1,586 of the 2,527 firms with at least 10 million RON of aid**. Of all beneficiaries, **12,916 of 25,201 (51%)** are SEAP suppliers. This is too common to be a Signal; it is context for the entity page's Overview, not a rule.
3. **Public body as aid beneficiary.** 108 beneficiaries have public-body names (municipalities, autonomous regies, national companies, airports, ports). For example, "MUNICIPIU REŞEDINŢĂ DE JUDEŢ CONSTANŢA" received a 430.7 million RON energy-aid award (SA.101723/2022). Of these, 46 are also SEAP suppliers. Worth a closer look as a candidate, since aid to a contracting authority's own companies is a known risk pattern. The firing rate is small and countable.
4. **Not checked here:** aid to a firm registered shortly before the grant (needs ONRC incorporation dates), and aid above a de minimis or measure ceiling per single undertaking (needs the login-only cumulation data).

SEAP value sums for these overlaps are left out on purpose. A quick parse of the raw value columns gave implausible totals (thousands-separator handling), so reading money from the archive belongs to the loader, not this note.

## 10. Who already uses it

- We found no published analysis built on RegAS award rows by Expert Forum, OpenTender or Romanian investigative outlets (web searches for the RegAS URL and organisation names, 2026-11-12). That none exists is **unverified**.
- Consiliul Concurenței reports RegAS 1 at about 180,000 users (105,000 from beneficiary companies), more than 280,000 signed contracts, more than 650 measures and more than 400 providers (<https://agerpres.ro/economic/2025/03/06/consiliul-concurentei-incepe-dezvoltarea-unui-nou-registru-al-ajutoarelor-de-stat---regas-2--1428454>). The gap between those 280,000 contracts and about 83,000 public rows is the de minimis and sub-threshold aid the public page does not show.
- Press coverage of who gets state aid, such as the EY Romania analysis reported as "Romania issued EUR 1.3 bln in state aid between 2019-2023, most to foreign companies" (<https://romania-insider.com/romania-state-aid-between-2019-2023-analysis>), appears to work from the Ministry of Finance's large-investment schemes, not RegAS rows. This is **unverified**: the article returned HTTP 429 when fetched.

## 11. Recommendation

**Keep, as an explorable Source with a Money lens, late in the Release order (Release 3 or later); not a Reference source.**

- **For:**
  - The join is by CUI, with no people.
  - A clean money measure.
  - National scope, 2016 to date.
  - Small enough to pull weekly in full.
  - Half its beneficiaries are already SEAP suppliers, so it adds a second money flow to entities the explorer already has.
- **Against, and why not earlier:**
  - No licence, so a reuse notice is needed first.
  - No bulk file, and the API is undocumented, with server-side duplicates and paging traps.
  - The TLS chain is broken.
  - RegAS 2 (due around 2027) will likely replace the endpoints and may move publication to TAM. That is a reason to wait, since TAM would give a stable, exportable, EU-wide schema.
  - Placement is weak (NUTS 2 only), so Coverage depends on ANAF seats.
  - Its best Signal candidate (rule 1) fires too rarely to justify a cross-Source rule. The value is in the entity page and the Money lens, not in Signals.
- **Reference sources it drags in:** none new. It needs ANAF (already present) for placement and identity, and a small hand-made crosswalk of 46 granting authorities to their CUIs.
