# Annual financial statements per CUI (situații financiare)

Research for ticket [#113](https://github.com/george-vrancianu/grivei.ai/issues/113), map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Researched 2026-11-12.

**Short answer:** yes. Ministerul Finanțelor publishes the headline indicators of every annual financial statement filed at ANAF as yearly bulk files on data.gov.ro. There is one row per CUI and 20 numeric indicators, including net turnover, profit or loss and average number of employees. The files cover financial years 2008 to 2025 under CC BY 4.0. ANAF also serves the same indicators per CUI from a free, keyless JSON endpoint. It fits as a **Reference source** for suppliers.

Measured figures come from the FY2025 files downloaded on 2026-11-12 (`WEB_UU_AN2025.txt`, `WEB_BL_BS_SL_AN2025.txt`). Claims I did not check are marked **(unverified)**.

## 1. Access

- **Bulk download (primary).** data.gov.ro, organisation `mfp`, with one CKAN dataset per financial year: `situatii_financiare_2008` … `situatii_financiare_2022`, `situatii_financiare2023` (no underscore), `situatii_financiare_2024`, `situatii_financiare_2024_actualizat`, `situatii_financiare_2025`. Search: https://data.gov.ro/api/3/action/package_search?q=situatii+financiare . FY2025: https://data.gov.ro/dataset/situatii_financiare_2025 .
  - Each year has one `.txt` data file per filer category, plus a same-named `.csv` that maps column codes `I1..I20` to indicator labels. The dataset description says: "Fișierele cu extensia .txt conțin datele din bilanțurile operatorilor economici. Fișierele cu extensia .csv conțin specificația coloanelor" ([FY2025 metadata](https://data.gov.ro/api/3/action/package_show?id=situatii_financiare_2025)).
  - The two files that matter for companies are `WEB_UU_AN<year>.txt` (79.5 MB, 844,207 rows for FY2025) and `WEB_BL_BS_SL_AN<year>.txt` (8.6 MB, 74,025 rows). Small specialised files cover credit institutions, IFN, insurers, brokers, pension funds, SIF, VS, IR and the guarantee fund. `WEB_ONG_AN<year>.txt` (8.7 MB) covers NGOs ([FY2025 resource list](https://data.gov.ro/api/3/action/package_show?id=situatii_financiare_2025)). The meaning of the codes UU and BL/BS/SL (micro-entity versus full or abridged balance-sheet formats) is inferred from the files' size and content **(unverified)**; ANAF's form-code table is at https://static.anaf.ro/static/10/Anaf/Declaratii_R/situatiifinanciare/2025/1002_5_2025.html .
  - The data files carry no names. Names, addresses, legal status and county come from the separate MF dataset "Date de identificare plătitori" (latest: https://data.gov.ro/dataset/date_de_identificare_platitori_actualizate_iunie_2026, about 435 MB per half-file, `^`-separated, cp1250; columns `COD_FISCAL^DENUMIRE^…^STARE^JUDET^…`). The financial statements metadata points to this dataset explicitly.
- **Per-CUI API.** `GET https://webservicesp.anaf.ro/bilant?an=<year>&cui=<cui>` returns JSON with `deni` (name), `caen`, `den_caen` and `i[]` (indicator, value, label). Documentation: https://static.anaf.ro/static/10/Anaf/Informatii_R/doc_WS_Bilant_V1.txt (V1; it says 2014–2019, but that is out of date). Tested 2026-11-12: it returns data for 2019–2025 and empty `i: []` for 2008–2018 on two CUIs I tried, so in practice it covers recent years only **(range partly verified)**. It needs no key. I found no official rate limit; a third-party client documents 1 request/second for ANAF's public services ([anafpy](https://anafpy.readthedocs.io/en/latest/anaf-reference/public/api/)) **(unverified)**. Useful for spot checks and late filers; bulk is the right ingestion path.
- **MF per-CUI web lookup** (`https://mfinante.gov.ro/apps/agenticod.html`): did not respond from this environment on 2026-11-12 (connection failure). It is a human lookup page, not a bulk channel **(unverified)**.
- No paid tier is needed. Commercial resellers (Termene, ListaFirme, Risco) sell the same figures with extras ([termene.ro API](https://termene.ro/produs-api)).

## 2. Licence and reuse terms

- FY2019 onwards: **CC BY 4.0** (`license_id: CC-BY-4.0` on each dataset, e.g. [FY2025](https://data.gov.ro/api/3/action/package_show?id=situatii_financiare_2025), [FY2019](https://data.gov.ro/api/3/action/package_show?id=situatii_financiare_2019)).
- FY2008–FY2018: **OGL-ROU-1.0** (Open Government Licence Romania, `license_id: uk-ogl`), e.g. [FY2008](https://data.gov.ro/api/3/action/package_show?id=situatii_financiare_2008). Both allow commercial reuse with attribution.
- The identification dataset is CC BY 4.0 ([June 2026](https://data.gov.ro/dataset/date_de_identificare_platitori_actualizate_iunie_2026)).
- The ANAF API states no licence; its data matches the bulk files.

## 3. Join key

**CUI**, as a bare integer without the `RO` prefix: column `CUI` in the data files and `cui` in the API. In FY2025 every one of 918,232 rows has a numeric CUI with no duplicates, either within or across the two company files (measured). This is the ANAF-confirmed CUI that ADR 0003 makes the supplier identity, so the join is exact. CAEN (activity code) comes as a free second dimension.

## 4. People

No natural persons as subjects. Rows are legal entities that file balance sheets (companies, regies, NGOs, financial institutions). PFA/II and other natural-person suppliers do not file these statements, so they are absent **(unverified: based on the filing obligation in Law 82/1991, not checked against a SEAP natural-person supplier)**. No administrator or shareholder names appear in the files or in the API response. The identification dataset carries entity names, addresses and phone numbers, not persons. Nothing here touches the people gate.

## 5. Money measure

Yes, values are in whole lei: I13 net turnover, I14 total revenue, I15 total expenses, I16/I17 gross profit/loss, I18/I19 net profit/loss, plus balance-sheet items (I1–I12: assets, receivables, cash, debts, equity, capital). I20 is average employees ([FY2025 column spec](https://data.gov.ro/dataset/e2266fdc-0a6b-43b8-9c9f-7a6943d85b28/resource/c4c57682-8764-4eb1-8431-0cac3ad6d7e5/download/web_bl_bs_sl_an2025.csv)). FY2025 net turnover sums to about 2.59 trillion lei across both company files (measured). These are point-in-time attributes of a company-year, not flows between two parties. They suit an entity-card attribute and a denominator, not the Money lens.

## 6. Volume

- FY2025 company files: 918,232 rows (844,207 UU + 74,025 BL/BS/SL), 88 MB uncompressed, 38 MB gzip (measured). NGO file: 8.7 MB.
- Per year since 2015: the UU file grew from about 49 MB (FY2015) to 83 MB (FY2024 updated); the BL file is about 8–13 MB ([2020 dataset listing re-publishing 2011–2020](https://data.gov.ro/api/3/action/package_show?id=situatii_financiare_2020), [2021 listing](https://data.gov.ro/api/3/action/package_show?id=situatii_financiare_2021)). FY2011–FY2014 have the reverse split (BL about 60 MB, UU about 1 MB). FY2008–FY2010 use a single `web_<year>.txt`.
- **Raw archive:** about 1.3 GB uncompressed for 2008–2025 company and NGO files, about 0.6 GB gzip (extrapolated). Add about 0.9 GB per snapshot of the identification dataset if it is archived too (we may already have names from ANAF).
- **Postgres:** wide `(cui, year, caen, i1..i20)` at about 150 B/row ≈ 140 MB per year with indexes, about 2.5 GB for all 18 years (estimate). Keeping only SEAP supplier CUIs is a small fraction of that.

## 7. History depth and cadence

- Financial years **2008–2025** on data.gov.ro ([search](https://data.gov.ro/api/3/action/package_search?q=situatii+financiare)).
- **Yearly.** The FY2025 data was published 2026-06-11, FY2024 on 2025-06-30, FY2023 on 2024-07-12 and FY2022 on 2023-08-28 (resource `created` dates). Statements for a calendar year are filed at ANAF in the following spring under the yearly MF order (for FY2025, OMF 2036/23.12.2025: https://static.anaf.ro/static/10/Anaf/Declaratii_R/situatiifinanciare/2025/1002_5_2025.html).
- **Restatements:** MF re-publishes the previous year with late filers about a year later: `situatii_financiare_2024_actualizat` ("actualizat iunie 2026"), and "WEB_UU_AN2023 - actualizat" (2025-07-27) inside the 2023 dataset. The FY2024 UU file grew from 77.2 MB to 82.8 MB (+7%) between the first and updated releases ([2024](https://data.gov.ro/api/3/action/package_show?id=situatii_financiare_2024), [2024 actualizat](https://data.gov.ro/api/3/action/package_show?id=situatii_financiare_2024_actualizat)). A connector must therefore treat a year as revisable once, and the first release of the latest year is incomplete. Some older datasets (2020, 2021) re-upload earlier years too, so file names, not dataset names, give the year.

## 8. Data quality (FY2025, measured)

- Keys: 100% numeric CUI, no duplicates, CAEN always present.
- **Employees (I20) empty in 338,555 rows (37%)**, including 162,923 rows with positive turnover. A further 45,672 rows report 0. Empty does not mean zero, so any rule on headcount must treat an empty value as unknown.
- Turnover empty or zero in 219,098 rows (24%); 403 rows have negative turnover; 5,736 rows have every indicator empty or zero (dormant filers).
- Numeric only, comma-separated, cp1250, no free text. Rows are short when trailing indicators are empty in some older files **(seen in sample, not quantified)**.
- Column labels drift slightly between files (e.g. `Profitul brut` vs `Profit brut`), and specialised filers (insurers, banks) use a different indicator set under the same `I<n>` codes. Use the UU and BL/BS/SL files only.
- Coverage is limited to filers. Companies that never file (often the shell-like ones) are simply missing, and a missing row is itself information.

## 9. Candidate Signal rules

Candidates only. Each needs SEAP + this Source (+ ANAF identity, already in Release 1).

1. **Large award to a near-empty company.** The supplier's SEAP awards in year Y (or Y+1) are at least X lei, while its year-Y statement shows I20 ≤ 1 employee, or turnover below a fraction of the award. A national base rate from this file alone: 948 companies report turnover ≥ 10 M lei with ≤ 1 employee, and 731 more with employees empty. Among the 918k filers overall, 411,604 (45%) report 0–2 employees. The firing rate among SEAP suppliers is **not measured**: the local graph was empty during this research. It must be measured on the joined data.
2. **Dependency on public money.** SEAP award value attributed to year Y as a share of I13 net turnover for year Y. It flags suppliers above a share threshold, or above 100%. Caveat: SEAP values are contract award values, possibly multi-year, and not invoiced revenue, so ratios over 100% will be common and need a careful window. Firing rate **not measured**.
3. **Award to a supplier with no statement.** A supplier wins in year Y but has no row for Y–1 and Y, whether a non-filer or newly created. This needs the "updated" release before it can be trusted, because of late filers. Firing rate **not measured**.
4. **Negative equity or loss-making winner** (I10 ≤ 0) on large awards. This one is weaker: it is common among small companies.

## 10. Who already uses it

- Commercial company-profile sites (Termene, ListaFirme, Risco) show MF turnover, profit and employee counts per CUI. Termene sells an API for them ([termene.ro API](https://termene.ro/produs-api)). Their exact sourcing is **unverified**.
- Third-party scrapers describe pairing MF yearly datasets with the ANAF `bilant` endpoint for late filers (e.g. [Apify ro-company-financials](https://apify.com/matikitli/ro-company-financials.md)) **(secondary)**.
- OpenTender Romania (GTI) publishes procurement data 2007–2024 under CC BY-NC-SA 4.0. Its listing shows no supplier financial fields ([OCP data registry](https://data.open-contracting.org/en/publication/75)).
- Journalism: Ziarul Financiar has profiled procurement winners whose turnover grew sharply, e.g. a firm with more than 1,000 tenders whose turnover went from about 10 M to about 600 M lei ([ZF](https://www.zf.ro/companii/cine-este-best-achizitii-firma-care-a-castigat-peste-1-000-de-22480427/galerie)). ZF also analysed public contracts among the largest construction firms ([ZF](https://www.zf.ro/business-hi-tech/analiza-zf-sunt-contractele-publice-cheia-succesului-pentru-marii-21377462)). Neither describes a systematic method **(only headlines verified)**.
- I found no Expert Forum publication that joins SEAP to MF balance sheets **(search was not exhaustive)**.

## 11. Recommendation

**Keep, as a Reference source for suppliers** (the ticket's guess holds). Reasons:

- Exact CUI join, open licence (CC BY 4.0 / OGL-ROU), plain bulk files with 18 years of history, and a small footprint (under 40 MB gzip per year).
- No people as subjects, so it is free of the people gate.
- It provides supplier-size context on entity pages (turnover, employees, profit by year) and the denominators for at least two cross-Source Signal rules (rules 1 and 2 above).
- It needs no search surface of its own: these are attributes of companies already in the graph, not new records or money flows.

Connector notes: archive the yearly UU and BL/BS/SL files (and NGO files if NGO suppliers matter). Re-fetch the previous year when the `actualizat` release appears. Treat empty I20 as unknown. Load all filers, or only CUIs present in the graph (a schema decision). Measure the Signal firing rates on the joined data before writing any methodology.
