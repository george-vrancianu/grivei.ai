# ONRC open data: access, people fields, volume and Signals

Research for [#109](https://github.com/george-vrancianu/grivei.ai/issues/109) on the map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). It answers the map's 11-point Source checklist for ONRC (Oficiul Național al Registrului Comerțului). Vocabulary follows `GLOSSARY.md`.

**Method.** Dataset metadata comes from the data.gov.ro CKAN API (`package_search?fq=organization:onrc`, `package_show`), fetched on 2026-11-12. The latest snapshot ([`firme-04-11-2026`](https://data.gov.ro/dataset/firme-04-11-2026), data as of 04.11.2026, published 06.11.2026) was downloaded in full (about 1.6 GB, six CSVs) and profiled locally. The [February 2026 snapshot](https://data.gov.ro/dataset/firme-03-02-2026)'s representatives file was downloaded too, for comparison. Signal rates join that snapshot to the SEAP Raw archive (2021Q1–2026Q3 bulk files, parsed with `watchdog/pipeline/bulk`) and to the archived ANAF answers. Counts marked *measured* come from those files. Anything else is cited, and *unverified* marks claims I could not confirm against a primary text.

## Summary

- **Access:** free bulk CSVs on data.gov.ro, CC BY 4.0, roughly monthly, no API. Everything richer (shareholders, capital, history, beneficial owners) is paid, on request or by subscription.
- **Volume:** 4,233,074 registrations (4,041,402 distinct CUIs), including about 2.2 M struck off; 19.8 M authorised-CAEN rows; 3.69 M representative rows. About 1.6 GB of CSV per snapshot (about 0.42 GB gzipped).
- **People:** since the 02.03.2026 snapshot, the representatives file names about 3.1 M company **administrators**, with **full date of birth and place of birth**. Shareholders (asociați) are **not** published openly. PFA/II names are also the firm names in the main file.
- **Signals (measured, §9):** of the suppliers registered since 2021, 21% win their first SEAP record within 90 days of registration (6,246 firms); 2,023 winner rows (874 suppliers) are dated after the supplier's fiscal strike-off; 5.9% of works (CPV 45) winner rows go to firms with no construction CAEN. Each needs care before it is a rule.
- **Recommendation:** keep ONRC, as a **Reference source now** (company status, founding date, authorised CAEN, seat), joining through the CUI. Becoming an **explorable Source** is a later Release, behind the people gate, because its distinctive content is people.

## 1. Access

| What | Channel | Cost | Source |
|---|---|---|---|
| Bulk snapshot of every registered professional: firms, status, authorised CAEN, legal representatives, family-business members, branches in other member states | CSV files on data.gov.ro, organisation `onrc` | free | [data.gov.ro/organization/onrc](https://data.gov.ro/organization/onrc), [latest snapshot](https://data.gov.ro/dataset/firme-04-11-2026) |
| Code lists (status codes, CAEN nomenclature, CAEN versions), published as a separate dataset with each snapshot | CSV on data.gov.ro | free | [nomenclatoare-04-11-2026](https://data.gov.ro/dataset/nomenclatoare-04-11-2026) |
| Aggregate statistics (active professionals per county, registrations, dissolutions, insolvencies, strike-offs) | XLS/XLSX on onrc.ro | free | [onrc.ro/statistici](https://www.onrc.ro/index.php/ro/statistici) |
| RECOM online, free tier: per-company lookup by name, number, CUI or county | web portal | free | [e-Justice: business registers in Romania](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro) |
| RECOM online, subscription tier: capital, shareholders, administrators, financial indicators | web portal, contract | paid | same e-Justice page |
| Historical report (every entry for a company); grouped company lists | on request, NTRO portal, email or counter | 250 lei per company; 9 lei per company with volume discounts (30–80%), under Order 380/C/2024 | [onrc.ro: information from the trade register](https://www.onrc.ro/index.php/en/informatii-2/informatii-rc) |
| InfoCert (signed certificates) | online, card payment | paid | e-Justice page above |
| Register of beneficial owners (RBR) | online, after registration | free for authorities and reporting entities, paid for anyone else | e-Justice page above; [ONRC RBR access guide](https://www.onrc.ro/documente/ghidAccesFIRBR.pdf) |

- **No API.** ONRC's own site links "DATE DESCHISE (OPEN DATA)" straight to the data.gov.ro organisation page ([onrc.ro home](https://www.onrc.ro/index.php/ro/)). The CKAN API exposes the metadata only (`https://data.gov.ro/api/3/action/package_show?id=firme-04-11-2026`).
- **Each snapshot is a new dataset with new resource URLs** (`firme-DD-MM-YYYY`), so a Connector must discover the newest one through `package_search`, the same way SEAP's quarterly files are found.
- **Files:** caret-separated (`^`), UTF-8 with BOM, CRLF line ends. The server ignored HTTP `Range` requests and sent whole files (measured).
- The beneficial-owner register is closed to the public. After the CJEU's judgment in joined cases C-37/20 and C-601/20 (22 Nov 2022, [curia](https://curia.europa.eu/juris/liste.jsf?num=C-37/20)), access is "legitimate interest" or paid, as above. *Unverified*: the current RBR tariff amounts (the 2020 order, [Ordinul MJ 7323/C/2020](https://www.onpcsb.ro/pdf/Ordinul%20MJ%207323%20din%202020.pdf), sets them; I did not read its annex).

### The files in a snapshot (04.11.2026, sizes from CKAN, rows measured)

| File | Bytes | Rows | Columns |
|---|---:|---:|---|
| `OD_FIRME.CSV` | 696,515,538 | 4,233,074 | `DENUMIRE, CUI, COD_INMATRICULARE, DATA_INMATRICULARE, EUID, FORMA_JURIDICA, ADR_TARA, ADR_JUDET, ADR_LOCALITATE, ADR_DEN_STRADA, ADR_NR_STRADA, ADR_BLOC, ADR_SCARA, ADR_ETAJ, ADR_APARTAMENT, ADR_COD_POSTAL, ADR_SECTOR, ADR_COMPLETARE, WEB, TARA_FIRMA_MAMA` |
| `OD_STARE_FIRMA.CSV` | 92,345,418 | 4,676,946 | `COD_INMATRICULARE, COD` (status code, **no date**) |
| `OD_CAEN_AUTORIZAT.CSV` | 439,362,305 | 19,817,263 | `COD_INMATRICULARE, COD_CAEN_AUTORIZAT, VER_CAEN_AUTORIZAT` (**no "main activity" flag**) |
| `OD_REPREZENTANTI_LEGALI.CSV` | 336,805,750 | 3,691,589 | `COD_INMATRICULARE, PERSOANA_IMPUTERNICITA, CALITATE, DATA_NASTERE, LOCALITATE_NASTERE, JUDET_NASTERE, TARA_NASTERE, LOCALITATE, JUDET, TARA` |
| `OD_REPREZENTANTI_IF.CSV` | 13,302,182 | 123,405 | `COD_INMATRICULARE, NUME, DATA_NASTERE, LOCALITATE_NASTERE, JUDET_NASTERE, TARA_NASTERE, CALITATE` |
| `OD_SUCURSALE_ALTE_STATE_MEMBRE.CSV` | 19,165 | 233 | `COD_INMATRICULARE, TIP_UNITATE, DENUMIRE_SUCURSALA, EUID, COD_FISCAL, TARA` |
| `N_STARE_FIRMA.CSV`, `N_CAEN.CSV`, `N_VERSIUNE_CAEN.CSV` | 12,740 / 276,396 / 90 | 227 status codes; 3,740 CAEN rows; 4 versions | code lists |

The dataset description lists the contents as: professionals, the registered seat, the member state of the parent for branches, status, branches in other member states, authorised activities, "reprezentanții legali ai persoanelor juridice și reprezentanții întreprinderii familiale" ([firme-04-11-2026](https://data.gov.ro/dataset/firme-04-11-2026)).

## 2. Licence and reuse terms

- Every snapshot since August 2020 is tagged **CC-BY-4.0** in CKAN (`license_id`). Older ones (2013 to May 2020) are tagged `uk-ogl`, data.gov.ro's label for its national open licence ([CKAN search, organisation onrc](https://data.gov.ro/api/3/action/package_search?fq=organization:onrc&rows=100)). Attribution to ONRC is enough for reuse.
- Company registers are a **high-value dataset** category ("Companies and company ownership") under Commission Implementing Regulation (EU) 2023/138, which requires free reuse under CC BY 4.0 or more permissive terms, with bulk download and APIs ([EUR-Lex 2023/138](https://eur-lex.europa.eu/eli/reg_impl/2023/138/oj/eng); [data.europa.eu HVD news](https://data.europa.eu/en/news-events/news/high-value-datasets-what-has-changed-and-what-will-come-next)). *Unverified* against the Annex text, which did not render for me: whether the Annex mandates representatives, and the 9 June 2024 application date. The richer 2025–2026 files look like ONRC's response to it, but that is an inference.
- **The licence is not the whole posture.** The representatives file carries personal data (names, dates and places of birth). CC BY covers ONRC's database rights, but our republication is still processing under GDPR, so the people gate (`docs/release-recipe.md` §3) applies whatever the licence says. I did not find ONRC's stated legal basis for publishing birth data openly. The trade register is public under Legea 265/2022 ([ONRC press note on Legea 265](https://www.onrc.ro/documente/Comunicat%20_Legea%20265.doc)), but the article that authorises open publication of birth data is *unverified*.

## 3. Join key into the graph

- **CUI.** `OD_FIRME.CUI` is present on 4,146,647 rows (98.0%). It is `0` or blank on 86,427 rows (mostly AF 30,558, SRL 29,345 and PF 21,102, the oldest registrations) (measured). Every other ONRC file keys on `COD_INMATRICULARE` (the registration number, e.g. `J40/1116/1991`, or the new 2024-format `J2023001161055`), so the CUI reaches them only through `OD_FIRME`.
- **One CUI, several rows:** 95,158 CUIs appear on 2–6 rows (200,403 rows, 85% of them SRLs) (measured). This is probably a firm's old and new registration after a move between counties (status `1053`, "schimbare sediu în alt județ"; `1097`, "transferat la ORC Ilfov"), but that is *unverified*. Under ADR 0003 this is one entity: pick the row that isn't struck off, and keep the others as history.
- **Match to SEAP (measured):** 162,798 of the 186,961 distinct all-digit winner ids in SEAP 2021–2026 (87.1%) are a CUI in `OD_FIRME`. The rest are mostly public institutions (not registered at ONRC), CNPs and malformed ids. ONRC therefore covers the companies, but not the institutions, among SEAP suppliers.
- **EUID** (`ROONRC.J40/1116/1991`) is the BRIS European identifier: a free second key, useful against EU sources.
- **Place: seat to SIRUTA.** There is **no SIRUTA code**. The seat is free text: county name (`ADR_JUDET`, 43 values incl. Bucharest) and a locality string in ONRC's own pattern, such as `Municipiul Cluj-Napoca`, `Bucureşti Sectorul 3`, `Comuna Fârdea`, or `Sat Blănoiu, Comuna Racoviţa`. That is 15,705 distinct (county, locality) pairs (measured). The `Sat X, Comuna Y` form names the UAT, so placing a seat in a UAT is a name match against SIRUTA within the county (cedilla vs comma-below diacritics need folding, as for ANAF). ANAF's answer for a CUI already carries `scod_Localitate` (measured in our archived ANAF responses), which is the cheaper route for the CUIs we already ask ANAF about.

## 4. People

ONRC has people in two places: as subjects of the representatives files, and inside firm names.

**`OD_REPREZENTANTI_LEGALI` (04.11.2026, measured):**

| Field | Filled |
|---|---|
| `PERSOANA_IMPUTERNICITA` (full name, or a firm such as an insolvency practitioner `… IPURL`) | 100% |
| `CALITATE` (role) | 100% |
| `DATA_NASTERE` (full date of birth, `dd/mm/yyyy`, sometimes with a `hh:mm:ss` suffix) | 87.1% |
| `LOCALITATE_NASTERE` | 87.3% |
| `JUDET_NASTERE` / `TARA_NASTERE` | 47.8% / 52.4% |
| `LOCALITATE` / `JUDET` / `TARA` (seat of a legal-person representative) | about 8.5% |

- **Roles** (top): administrator 3,090,239; reprezentant al persoanei juridice 209,859; lichidator judiciar 192,418; lichidator 122,753; lichidator provizoriu 20,315; administrator și reprezentant 18,175; administrator judiciar 15,795; then directors, supervisory and management board members. There are 20 role values in all.
- **Coverage:** the file covers 2,765,798 registrations, with 2,113,058 distinct names and 2,877,484 distinct (name, date of birth) pairs. Name plus date of birth is close to a unique person key: the same name splits into about 1.36 people on average. That is exactly the entity-linking capability the people gate is about.
- **Administrators are new.** In the 03.02.2026 snapshot the same file had 602,906 rows, no `administrator` role, and dates of birth on only 27.8% of rows (measured from [firme-03-02-2026](https://data.gov.ro/dataset/firme-03-02-2026)). The file grew from 56 MB to 332 MB in the [02.03.2026 snapshot](https://data.gov.ro/dataset/firme-02-03-2026) (CKAN sizes). Before March 2026 it held mostly liquidators and representatives of legal persons.
- **No CNP**, no ID card numbers, no home addresses for natural persons (measured: there is no such column).
- **Shareholders (asociați/acționari) are not in the open files**, and neither is their share or the capital. They come only with RECOM's subscription tier or paid extracts ([e-Justice](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro)). ONRC publishes only aggregates about them (age and sex of shareholders of active legal persons, [statistici id=243, 246](https://www.onrc.ro/index.php/ro/statistici)).
- **Beneficial owners:** not open (§1).

**`OD_REPREZENTANTI_IF`:** 123,405 members and representatives of family businesses (întreprinderi familiale), with name, date of birth (99.99%) and birthplace (measured).

**Firm names are people's names.** PFA (739,964), II (250,976), PF (190,681) and IF (56,760) registrations in `OD_FIRME` (measured) are named after their holder (`<NUME PRENUME> PFA`), with the home-based seat address. In SEAP these are the **natural-person suppliers** of ADR 0003, so a Connector must not create named entity pages from them. The person-shape rule applies.

## 5. Money measure

None. The open files have no capital, turnover or profit (measured: no such column). Financial statements are a separate Source (Ministerul Finanțelor, bilanțuri). An ONRC Release would declare a **count lens** (registrations, or active firms per county), not Money.

## 6. Volume

- **Rows (04.11.2026, measured):** 4,233,074 firms (4,041,402 distinct CUIs, which matches the "about 4.1 M entities" in the ticket); 4,676,946 status rows; 19,817,263 authorised CAEN rows (2,864,883 firms; median 3 codes, 208,363 firms with 20 or more); 3,691,589 representatives; 123,405 family-business members; 233 foreign branches.
- **State of the register:** 2,195,760 registrations carry `1084 radiată` and 1,574,422 carry only `1048 funcțiune` (measured). ONRC's own count of legally active professionals at 30.09.2026 is **1,782,220** (1,306,882 legal persons + 475,338 PFA/II/IF) ([ONRC statistic, Sept 2026](https://www.onrc.ro/statistici/2026/septembrie/Profesioni%C8%99ti%20activi%20din%20punct%20de%20vedere%20juridic.xls)). It defines "active" as not suspended and not in any state that can lead to the loss of legal personality.
- **Legal forms (measured):** SRL 2,797,303; PFA 739,964; II 250,976; PF 190,681; AF 120,893; IF 56,760; SA 33,761; SNC 28,409; others under 4,000 each.
- **Download size per snapshot:** 1,578,350,348 bytes of CSV (CKAN sizes summed), about 415 MB gzipped (measured with `gzip -6`: firme 232 MB, CAEN 63 MB, representatives 91 MB, status 25 MB).
- **Raw archive:** about 0.42 GB per snapshot gzipped. Monthly snapshots come to about 5 GB a year. Keeping only the snapshots we load is a Connector decision.
- **Postgres (estimate, not measured):** firms about 1 GB with indexes, CAEN rows about 1–1.5 GB (19.8 M narrow rows), representatives about 0.6 GB, status about 0.3 GB, so **about 3–3.5 GB for one full snapshot**. That is several times SEAP's footprint, mostly for firms that never touch public money. A Reference-source load restricted to SEAP suppliers (about 190 k CUIs) would be a few hundred MB.

## 7. History depth and update cadence

- **Cadence: roughly monthly.** Snapshots in 2026 have data dates 09.01, 03.02, 02.03, 03.04, 06.05, 03.06, 08.07, 02.09, 19.10 and 04.11, with no August snapshot. Each appears on data.gov.ro 1–3 days after its data date (CKAN `metadata_created`). Before 2025 the cadence was quarterly (January, April, July, October), back to **October 2013** ([CKAN search](https://data.gov.ro/api/3/action/package_search?fq=organization:onrc&rows=100)).
- **Format eras** (CKAN resource names and sizes): 2013–March 2025 used four files split by struck-off / not struck-off × with / without seat, plus a status code list; May 2025 brought the current `OD_*` layout with authorised CAEN; November 2025 added representatives, family-business members and foreign branches; March 2026 added administrators with birth data (§4). A Connector needs one reader per era if it wants history.
- **Each snapshot is complete, not a delta.** It includes struck-off firms back to 1990: registration years run from 1990 (79) and 1991 (95,021) to 2026 (108,513) (measured). So founding dates have full depth in any single snapshot.
- **Status has no dates.** `OD_STARE_FIRMA` gives the current code(s) only, and 15% of registrations carry 2–8 codes at once (measured). When a firm became insolvent or was struck off can only be bracketed by diffing consecutive snapshots: to within a month going forward from 2025, and to within a quarter for 2013–2025, if the old files are still downloadable. Many pre-2020 resources show `size: None` in CKAN, so whether they still download is *unverified*. ANAF's answer gives a dated fiscal status instead (`stare_inregistrare: "RADIERE din data dd.mm.yyyy"`, `stare_inactiv.dataRadiere`; measured in our ANAF archive).
- **Data-through date:** the date in the dataset title (`04.11.2026`).

## 8. Data quality

- **Keys:** CUI is 0 or blank on 2.0% of rows, and duplicated across 95 k CUIs (§3). `COD_INMATRICULARE` is missing on 65 rows (measured). All six files parse with a constant column count: zero malformed lines in 4.2 M + 4.7 M + 19.8 M + 3.7 M rows (measured).
- **No main CAEN.** `OD_CAEN_AUTORIZAT` lists every *authorised* activity, without marking the main one. ANAF's `cod_CAEN` is the main activity, and it is present for 176,244 of the 192,818 SEAP-supplier CUIs we hold ANAF answers for (measured).
- **Mixed CAEN versions:** rows use version 2 (CAEN Rev.2, 2008) 11.1 M, version 3 (CAEN Rev.3, 2025) 7.9 M, version 1 (2003) 0.77 M and version 0 (1998) 0.05 M (measured; [N_VERSIUNE_CAEN](https://data.gov.ro/dataset/nomenclatoare-04-11-2026)). Any rule over CAEN has to map across four nomenclatures. `N_CAEN` carries all four.
- **Status is a bag of 227 codes**, from "funcțiune" through legal states (dizolvare, lichidare, insolvență, faliment, radiată) to notes such as "sediu expirat" (256,432), "mandat administratori expirat" (30,199), "sechestru părți sociale" (5,342) and "raspundere penala" (1,993) (measured, [N_STARE_FIRMA](https://data.gov.ro/dataset/nomenclatoare-04-11-2026)). Several insolvency codes cite repealed laws (64/1995, 85/2006). A rule needs a reviewed grouping into a few states.
- **Free text:** seat address fields; role labels; dates of birth with a stray `hh:mm:ss` time suffix on about a third of filled rows (1,071,346 of 3,216,992); birthplace written either as one `"CITY, COUNTY"` string or split across columns (both measured). Cedilla diacritics (`Bucureşti`, `Timiş`) are used throughout, so text needs folding to comma-below, as ADR 0003 already does for ANAF names.
- **Legal-person representatives** (insolvency practitioners, management firms) sit in the same name column as natural persons, distinguishable only by legal-form words (`IPURL`, `SPRL`, `SRL`). That is the same person-shape problem as ADR 0003.

## 9. Candidate Signal rules

Rates come from SEAP winner rows (DA, DAN, contracts, award notices, 2021Q1–2026Q3, parsed from the Raw archive with the repo's bulk parser) joined by CUI to the 04.11.2026 snapshot and to archived ANAF answers. These are rough national rates for sizing, not methodology.

Inputs: 15,664,470 winner rows with an all-digit id (DA 12.17 M, DAN 0.95 M, contracts 2.51 M, award notices 0.03 M; latest award 2026-10-06), 186,961 distinct ids, 162,798 of them found in ONRC (measured). RON figures are raw awarded values split equally across winners, **before** suspect-value and framework-ceiling exclusion, so treat them as upper bounds. Counts are the reliable part.

| # | Candidate rule | Sources | Measured national rate | Caveats |
|---|---|---|---|---|
| 1 | **Supplier founded shortly before its first SEAP record**: days from ONRC `DATA_INMATRICULARE` (earliest row for the CUI) to the first award | ONRC (founding date) + SEAP | Of 29,664 suppliers registered since 2021-01-01 (so their first record isn't cut off by the 2021 window), 2,596 (8.8%) win within 30 days, 6,246 (21.1%) within 90 days, 9,981 (33.6%) within 180 days, 15,010 (50.6%) within a year. That is 3.8% of all ONRC-matched suppliers within 90 days. 23,338 winner rows (657 m RON raw) fall within 90 days of registration. Only 2 suppliers "win" before their registration date | It fires often, because a new firm selling to the state is normal. As a Signal it needs a narrower shape: a value threshold, or a direct award (DA) as the first record, or the first record from a single authority. ANAF's `data_inregistrare` is an alternative date, already in our archive. |
| 2a | **Supplier struck off while still winning**: a record awarded after the strike-off date | ANAF (dated `RADIERE din data …`) + SEAP; ONRC adds the legal state | 2,023 winner rows by 874 suppliers were awarded after ANAF's strike-off date (213 m RON raw) | ONRC itself gives no date (§7). Some are probably late-published records or reused ids. Needs a sample review. |
| 2b | **Supplier in insolvency / dissolution / bankruptcy while winning** | ONRC status + SEAP; dates from snapshot diffs | Of 84,033 suppliers with a record in the last 6 months, 586 (0.7%) are *now* struck off or in an insolvency, dissolution, liquidation or bankruptcy state: 326 under Legea 85/2014, 203 insolvență, 179 radiată, 94 reorganizare judiciară, 71 dizolvare, 35 faliment, 4 lichidare. Another 680 have "sediu expirat" | The current state only, so it is an upper bound for "while winning". A dated rule needs monthly snapshot diffs from the first archived snapshot onward, or the BPI insolvency bulletin (a separate Source). Firms in judicial reorganisation may legally keep trading, so the rule must not imply wrongdoing. |
| 3 | **Activity unrelated to what was won**, narrowed to works: CPV division 45 won by a firm with no construction CAEN (divisions 41–43) among its ONRC authorised activities **and** an ANAF main CAEN outside 41–43 | ONRC (authorised CAEN) + ANAF (main CAEN) + SEAP | 28,192 of 478,579 works winner rows (5.9%), 5,915 suppliers | A general CPV→CAEN rule needs a concordance we would own (CPV→CPA→NACE/CAEN), across four CAEN versions. The works-only version avoids that. Subcontracting and consortium leads explain part of it. RON is dominated by suspect values here, so it isn't quoted. |

Rules that would need people, and so wait for the people gate:

- **Same administrator across bidders or winners of one authority**, or across a supplier and the authority's staff (the latter also needs ANI). This needs (name, date of birth) linking.
- **One administrator behind many recently founded suppliers.**

Cross-Source by the recipe's rule: each of these belongs to the later of the SEAP Release and whichever Release brings ONRC in. As a Reference source, ONRC would let the founding-date and status rules ride on SEAP (§11).

## 10. Who already uses it

- **Commercial aggregators** resell the same register with shareholders and financials added from paid ONRC and MF channels. Topograph's Romania guide describes the open data as about 4.1 M entities with "legal representatives" and puts shareholders outside it ([topograph.co](https://www.topograph.co/guides/trade-register-in-romania)). That is a secondary source, and its numbers agree with mine.
- **ONRC itself** publishes the aggregates (§1, [statistici](https://www.onrc.ro/index.php/ro/statistici)).
- **Expert Forum:** I found no primary Expert Forum analysis built on the ONRC bulk files. EFOR has argued for shareholder disclosure by bidders in public procurement (reported in [fiscalitatea.ro](https://www.fiscalitatea.ro/firmele-offshore-vor-avea-noi-obligatii-inclusiv-in-ce-priveste-cazierul-judiciar-14451/); secondary). *Unverified*: the journalists' (Recorder, RISE) and OpenTender use of these files.
- Overall, the open files are under-used for procurement analysis, probably because the people fields arrived only in November 2025 and March 2026.

## 11. Recommendation

**Keep. Bring ONRC in first as a Reference source; make it explorable later, behind the people gate.**

- **As a Reference source (no people fields)**, it adds things ANAF does not give us: legal-state detail (insolvency, liquidation, bankruptcy, dissolution, not just fiscal strike-off), the founding date as ONRC records it, all authorised CAEN codes, the EUID, and a monthly whole-register snapshot that bounds when a status changed. It joins on the ANAF-confirmed CUI (ADR 0003) and drives the two strongest Signal candidates above. Load only the firms rows, status rows and CAEN rows of SEAP suppliers. Archive the full files (ADR 0004).
- **As an explorable Source**, its distinctive content is people (3.1 M named administrators with birth data). That is exactly what `docs/release-recipe.md` §3 gates, so it should not be a Release before the entity-linking map lands. On the other hand, (name, date of birth) is the best person key any candidate Source offers. It could be the anchor for the entity-linking policy and its measured false-link rate, so the people-gate tickets should look at it.
- **What it does not give:** shareholders, capital, beneficial owners (all paid or closed), status dates, a main-CAEN flag, a SIRUTA code. Rules that need ownership remain out of reach on open data.
