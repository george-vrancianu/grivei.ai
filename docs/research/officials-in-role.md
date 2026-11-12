# Officials in role: which Sources list them, with which identifiers

Research for [#129](https://github.com/george-vrancianu/grivei.ai/issues/129) on the map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). It surveys the Sources that name **officials in role**, the Named category in ADR 0009 that no Source on the map supplies yet. It answers the map's 11-point Source checklist for each candidate worth keeping. It also answers one more question: which identifiers come with each person, and whether any of them allows a **confirmed** link to an ONRC administrator. Vocabulary follows `GLOSSARY.md`.

**Method.** Everything was fetched on 2026-11-12.

- **Election results:** the 2024 local-election minutes (`pv_*_final.json`, 42 county files, 192 MB) from Code for Romania's backup of prezenta.roaep.ro ([code4romania/romanian-elections-data](https://github.com/code4romania/romanian-elections-data)), plus AEP's 2020 files on data.gov.ro.
- **Law texts:** the texts of Legea 115/2015, Legea 161/2003 and Legea 544/2001, through legislatie.just.ro's free web service.
- **Appointments:** every 2025 act with "numirea" in its title, from the same web service (1,126 acts).
- **Parliament and Government:** all 317 current Chamber of Deputies profiles on cdep.ro, the Senate's list of 134 senators with one profile read in full, and the 20 cabinet pages on gov.ro.
- **Public enterprises:** AMEPIP's January 2026 dataset on data.gov.ro.
- **Joins:** names were joined to the ONRC 04.11.2026 representatives file, prepared as in [#123](https://github.com/george-vrancianu/grivei.ai/issues/123): names upper-cased with diacritics folded and word order ignored, firms acting as representatives removed. SEAP pairs (authority CUI, supplier CUI) come from the 2021Q1–2026Q3 bulk files in the Raw archive, parsed with `watchdog/pipeline/bulk`.

Counts marked *measured* come from those files. *Unverified* marks claims I could not confirm against a primary text. No personal names are recorded here, only counts and field lists.

## Summary

- **No Source of local or appointed officials carries a birth date.**
  - Election results name mayors and county council presidents with party, votes and the UAT's SIRUTA code. Councillors appear only as party lists with a seat count.
  - Government decisions and Prime Minister decisions name prefects, sub-prefects, secretaries of state and agency heads with function and date.
  - The law collects candidates' place and date of birth (Legea 115/2015 art. 47(3)) but publishes only name, party, profession and occupation (art. 55).
- **Confirmed link to ONRC:** possible only for **deputies** (cdep.ro shows a full birth date on 315 of 317 profiles) and for **state-owned company boards**, which ONRC already lists with birth dates. For mayors, councillors, prefects and agency heads only name, or name + county, is available, and the suggested entity-linking policy never shows those links.
- **Measured on mayors:** of 3,184 mayors elected in 2024, 50% have no ONRC namesake, 18% exactly one and 32% two or more. Restricted to ONRC persons born in the mayor's county, 17% have exactly one, which #123 found is still a different person on 25–34% of such links.
- **Measured on deputies:** 168 of 315 deputies have an ONRC namesake, but only 37 match on name + birth date. Name alone would have linked 131 deputies (78%) to someone else.
- **Signal rules ruled out:** "mayor or county council president administers a supplier of their own UAT" (an incompatibility under Legea 161/2003 art. 87(1)(d)), and "councillor's company contracts with their own local authority" (art. 90). The same goes for prefects and agency heads.
- **Signal rule kept:** "a state-owned company's board member also holds a role in one of its suppliers", where ONRC gives both sides with birth dates. 71 of the 656 public enterprises that buy in SEAP fire (77 pairs, 212 m RON raw). Only 25 do so once suppliers that are themselves public enterprises are excluded (26 pairs, 142 m RON raw). Measured in §7.
- **Recommendation:**
  - Keep the mayor and county council president results as a **Reference source keyed by SIRUTA**, shown on the UAT's authority page and never linked to a person.
  - Keep AMEPIP's list of public enterprises as a **Reference source keyed by CUI**.
  - Treat appointments from legislatie.just.ro as a later, optional Reference source.
  - Drop councillors, institution heads and procurement staff: there is no central list.

## Candidates at a glance

| Candidate | Who | Central list? | Identifiers with each person | Birth date? | Keep? |
|---|---|---|---|---|---|
| AEP local-election results (minutes) | mayors (3,186 UATs), county council presidents and the general mayor (42) | yes, per election | name, party, votes, UAT name, SIRUTA, county; election date | no | keep, Reference source (SIRUTA) |
| Councillor lists (BEC/BEJ/BEM decisions, council sites, a few data.gov.ro tables) | 39,739 local and 1,393 county councillors (2024 mandates) | no: per bureau PDFs, per council | name, party, list position; sometimes contact details | no | drop |
| Appointment acts on legislatie.just.ro | prefects, sub-prefects, secretaries of state, agency presidents and vice-presidents, state counsellors, some boards | yes, as acts (free web service) | name, function, institution name (no CUI), act date, MO issue | no | later, optional |
| Chamber of Deputies profiles (cdep.ro) | 317 current deputies | yes | name, birth date (day, month, year), circumscription, party, validation date | **yes** | optional, small |
| Senate profiles (senat.ro), Government pages (gov.ro) | 134 senators, 20 cabinet members | yes | name, circumscription, party / portfolio | no | drop |
| State-owned company boards | 3,421 persons in 1,316 public enterprises | yes: ONRC + AMEPIP's list of CUIs | ONRC: name, birth date and place, role, company CUI | **yes** (ONRC) | no new Source; AMEPIP list as Reference source |
| Institution heads, procurement staff | all contracting authorities | no | each institution's own site (Legea 544/2001 art. 5(1)(c)) | no | drop |

## 1. Elected local officials: AEP results

### Access

- **2024 local elections (9 June 2024):** the official results site served per-county JSON minutes under `prezenta.roaep.ro/locale09062024/data/json/sicpv/pv/pv_<county>_final.json` (path read from the site's JavaScript). Today that path answers with an HTTP 302 redirect to the 2024 presidential-election site (measured), so the official copy is no longer reachable. Code for Romania keeps a backup of the same files in [code4romania/romanian-elections-data](https://github.com/code4romania/romanian-elections-data) (`json/locale09062024/sicpv/pv/`). Each county has `_prov`, `_part` and `_final` stages.
- **2020 and earlier:** AEP datasets on data.gov.ro ([organisation `autoritatea-electorala-permanenta`](https://data.gov.ro/organization/autoritatea-electorala-permanenta), 24 datasets). The [2020 local-election dataset](https://data.gov.ro/dataset/alegeri-pentru-autoritatile-administratiei-publice-locale-2020) has county totals and one polling-station file (106.6 MB CSV). The 2012 and 2014 datasets were not profiled.
- **No API, no candidate register.** AEP publishes no list of elected officials as data. `prezenta.roaep.ro` is a results site.

### Licence

- AEP's 2020 dataset is tagged **CC BY 4.0** on data.gov.ro; the 2012 and 2014 ones are `uk-ogl` (CKAN `license_id`).
- The 2024 files carry no licence of their own. Code for Romania's repository is under MPL-2.0, a software licence, and that says nothing about AEP's reuse terms. *Unverified*: AEP's terms for the 2024 data.

### Join key

- **SIRUTA.** Every UAT-level minute carries `uat_siruta`, `uat_name`, `county_code` and `county_name` (measured: 3,186 of 3,186 mayoral minutes have a SIRUTA code). That joins directly to a UAT, and so to the UAT's contracting authority, through the SIRUTA Reference source already used for SEAP.
- **No CUI** for the UAT. The town hall's CUI comes from the SIRUTA→authority mapping we already maintain.
- **Person:** name only (see "Identifiers and the confirmed-link question").

### People

Fields per vote row in the 2024 minutes (measured): `candidate`, `party`, `votes`, plus `mandates1`, `mandates2` (and `mandates_g8`, `mandates_g9` at county level) for council lists.

| Office | Scope in the minutes | Named? | Count (2024, measured) |
|---|---|---|---|
| Mayor | `UAT / P` | yes: candidate name, party, votes | 3,186 UATs, 11,386 candidate rows (median 3 per UAT) |
| County council president; general mayor of Bucharest | `CNTY / PCJ`, `CNTRY / PG_BEC` | yes | 42 counties incl. Bucharest |
| Local councillor | `UAT / CL` | **no**: the `candidate` field holds the party or list name; seats appear as a mandate count | 39,739 seats |
| County councillor | `CNTY / CJ` | **no**, same as above | 1,393 seats |

- **The winner is not flagged.** It has to be derived as the top vote-getter of the final minute. Run-offs and repeat elections (`localepartiale`) are separate files, and I did not check them. Of the 3,186 winning mayors, 3,153 distinct names; 28 names win in two or more UATs (measured). Those are namesakes or data errors, and they show that even within the elected population a name is not a key.
- **2020 data is weaker:** in AEP's 2020 polling-station file the `Competitor` column holds the party for party candidates. A person's name appears only for independent candidates (594 distinct person-shaped values among 815 mayoral competitors, measured).
- **Why there is no birth date.** Legea 115/2015 art. 47(3) requires candidate proposals to contain "numele, prenumele, locul și data nașterii, domiciliul, … seria și numărul actului de identitate, ocupația, profesia și apartenența politică". But art. 55 publishes the final candidacies only "cu precizarea numelui și prenumelui, apartenenței politice, profesiunii și ocupației candidatului". Art. 52(7) posts one copy of each proposal at the electoral bureau's seat, on paper only ([consolidated text of 08.03.2024](https://www.zalausj.ro/ro/monitor/alegeri/legea_115_2015.pdf), published by the Sălaj prefecture). One local bureau's minute of final candidacies (Lupeni, 2024; [PDF](https://municipiullupeni.ro/dm_lupeni/portal.nsf/AllByUNID/9F711E30D6091FC1C2258B17001F0D38/$FILE/PROCES%20-%20VERBAL%20RAMANERE%20DEFINITIVA%20CANDIDATURI.pdf)) lists name and party only (measured: no dates of birth, no 13-digit numbers).

### Money measure

None. Election results are context for an authority, not a money flow.

### Volume

- 2024 final minutes: 42 JSON files, 192 MB (the `_prov` and `_part` stages are about the same size again). The useful extract is about 3,200 mayor rows and 42 president rows per election, a few hundred kB in Postgres.
- 2020: 106.6 MB polling-station CSV (672,806 rows) plus county totals.

### History and cadence

- Local elections every four years (2012, 2016, 2020, 2024), plus partial elections in between. AEP's data.gov.ro datasets cover the 2012 and 2020 local elections and two 2014 rounds (not profiled). I found no 2016 local-election dataset there. The 2024 data survives only in the backup.
- **Term dates are not in the data.** The minutes give the election date. Validation and oath-taking dates, and mid-term changes (resignations, deaths, suspensions, partial elections), are not there.

### Data quality

- Names are free text in upper case, with Romanian diacritics, sometimes with hyphenated double first names (measured shape).
- Bucharest is split across `CNTRY` scopes (`PG_BEC`, `CGMB_BEC`), unlike the other counties.
- The `mandates_g8` / `mandates_g9` fields are undocumented. The 2020 `legenda.txt` documents the 2020 columns only.

## 2. Elected local officials: councillor lists

- **No central list.** Councillor names exist in the electoral bureaus' decisions and minutes (BEJ/BEM PDFs on bureau or town-hall sites), in the prefects' orders constituting councils, and on councils' own sites. A few councils publish them as data: on data.gov.ro, only Cluj ([county councillors 2024–2028](https://data.gov.ro/dataset/tabel-consilieri-judeteni-mandat-2024-2028-cj-cluj): name and party; [mayors, deputy mayors and general secretaries](https://data.gov.ro/dataset/tabel-primari-viceprimari-si-secretari-generali-din-judetul-cluj-mandat-2024-2028): UAT, the three officials and contact details) and Tulcea ([county councillors' contact details](https://data.gov.ro/dataset/lista-si-datele-consilierilor-judeteni-cj-tulcea)). All are CC BY 4.0; none has a birth date (measured on the two Cluj files).
- About 41,000 seats across 3,186 local councils and 42 county councils (§1), spread over thousands of PDFs.
- **Recommendation: drop.** Scraping thousands of bureau PDFs would yield name and party only, which can never be linked under the suggested policy.

## 3. Appointed officials: acts on legislatie.just.ro

### Access

- **Free SOAP web service** at `legislatie.just.ro/apiws/FreeWebService.svc/SOAP` with two operations: `GetToken`, and `Search` by title text, number, year or full text, paged 10 results at a time ([WSDL](https://legislatie.just.ro/apiws/FreeWebService.svc?wsdl)). Each result returns `Titlu`, `TipAct`, `Numar`, `Emitent`, `Publicatie`, `DataVigoare`, `LinkHtml` and **the full `Text`** (measured). The service refuses requests without a `User-Agent` header (HTTP 403, measured).
- Monitorul Oficial was dropped as a Source ([#118](https://github.com/george-vrancianu/grivei.ai/issues/118)); these acts are the same texts, reachable for free here.

### Licence

Official legislative and administrative texts are excluded from copyright under Legea 8/1996 art. 9 (*unverified*: I did not re-read the current text). The portal states no separate reuse licence.

### Join key

The institution appears **by name only**, inside free text ("în funcția de prefect al județului Alba", "secretar de stat la Ministerul …"). Prefects map to a county, and so to the Instituția Prefectului's CUI, by a fixed table of 42 rows. Ministries and agencies need a name→CUI table we would own. That is the same open question as the map's "organisations named without a CUI".

### People

Appointment acts are short (about 780 characters for a prefect, measured): the legal basis, then one article such as "Domnul [nume] se numește în funcția de prefect al județului [X]." Identifiers: **name, honorific (which gives the sex), function, institution, act number and date, MO issue**. There is no birth date, CNP or locality (measured: no act matched a birth-date or CNP pattern).

**Volume, 2025 (measured):** 1,126 acts have "numirea" in the title:

| Issuer | Acts | What they appoint |
|---|---:|---|
| Președintele României | 767 | mostly judges and prosecutors (730 titles mention a court, judge or prosecutor) |
| Prim-ministrul | 175 | secretaries and under-secretaries of state, state counsellors, presidents and vice-presidents of agencies, heads of cabinet |
| Guvernul | 149 | prefects (76) and sub-prefects (61), and a few others |
| Parlamentul, Senatul | 19 | board presidents of public companies (e.g. the public broadcasters), members of authorities |

End dates come from separate "eliberarea din funcție" acts (not counted). A term is therefore the span between two acts that must be paired by name and function, which is again a name-only match.

### Other checklist points

- **Money:** none.
- **Volume in storage:** small, about 1,000–2,000 acts a year, each a few kB of text.
- **History:** the portal holds acts from at least 2001 (measured: Legea 544/2001, Legea 161/2003), and new acts appear around their MO publication date (the 30.10.2026 prefect acts were already there on 12.11.2026).
- **Quality:** titles are free text with old cedilla diacritics; names appear in both name orders. Paging is fixed at 10 results, so a year of appointments takes about 110 requests.

**Recommendation: later and optional.** It gives "who headed this authority when" for prefects and central agencies, at the cost of a name→CUI table, and it cannot be linked to ONRC.

## 4. Parliament and Government

- **Chamber of Deputies (cdep.ro):** each profile (`/ords/pls/parlam/structura2015.mp?idm=<n>&cam=2&leg=2024`) shows the birth date as `n. dd mmm. yyyy`, with the electoral circumscription, the validation date and the party. In the current legislature, 315 of 317 profiles carry a full birth date (measured; 336 links in the list). There is no bulk download and no licence statement; it is a scrape of about 330 pages per legislature.
- **Senate (senat.ro):** a profile shows the circumscription, the election and validation dates and the party, but **no birth date** (measured on a sample). Asset and interest declarations sit behind postbacks, and they fall under ANI's legal limits ([#114](https://github.com/george-vrancianu/grivei.ai/issues/114)).
- **Government (gov.ro):** the 20 cabinet pages carry no birth date and no CV (measured).
- **Measured link to ONRC (deputies):** of 315 deputies with a birth date, 168 have at least one ONRC person with the same name. Only **37** match on name + birth date, and 3 of those hold a role in a SEAP supplier. 116 deputies' names belong to two or more distinct ONRC persons. Name alone would have wrongly linked 131 of the 168 (78%), consistent with #123's 77%.
- **Relevance:** deputies and ministers are officials, but not officials of a contracting authority, so they fit ADR 0009 only weakly. Ministries do buy, but no Source lists who signs which award. **Optional, small:** the only official population with a confirmed link to ONRC.

## 5. State-owned company boards

- **ONRC already lists them with birth dates.** Under OUG 109/2011 the board members (administratori, supervisory board, directorate) are entered in the trade register like any company's.
- **AMEPIP** (the agency that monitors public enterprises under OUG 109/2011) publishes on data.gov.ro, under CC BY 4.0:
  - [indicators for every public enterprise](https://data.gov.ro/dataset/amepip-indicatori-financiari-nefinanciari-si-de-guvernanta-corporativa) (XLSX, 1.5 MB, January 2026; columns `company_id, cui, company, registration_number, CAEN(ONRC), status, ticker_symbol, an` plus financial ratios, and in a second sheet governance ratios such as the share of independent and of female board members and the board's total pay);
  - an [older CSV export to 2023](https://data.gov.ro/dataset/export-de-date-indicatori-financiari-inclusiv-2023-din-site-ul-amepip-gov-ro).

  It has **no names** and no owning authority. What it gives is the list of which CUIs are public enterprises.
- **Measured join:**
  - AMEPIP lists 1,342 distinct CUIs (years 2019–2024; 1,241 "funcțiune", the rest in suspension, insolvency, dissolution or liquidation).
  - 1,316 of them have natural-person roles in ONRC: 3,854 roles held by **3,421 distinct persons (name + birth date)**. Only 33 roles lack a birth date.
  - The roles are administrator 3,345, administrator provizoriu 203, reprezentant al persoanei juridice 94, membru în consiliul de supraveghere 77, director general unic 51, membru în directorat 26 and administrator special 23.
  - 718 of these enterprises are SEAP suppliers themselves.
- *Unverified:* MF's annual report on public enterprises and the tutelary authorities' own lists of board members (OUG 109/2011 requires publication on each authority's site). I did not look for them, because ONRC already gives the people with a better key.
- **Recommendation:** no new person Source. Add **AMEPIP's CUI list as a Reference source** (it flags a supplier or authority as a public enterprise) and take the people from ONRC.

## 6. Institution heads and procurement staff

- **No central list.** Legea 544/2001 art. 5(1)(c) obliges every authority to publish "numele și prenumele persoanelor din conducerea autorității" on its own site (base text via legislatie.just.ro). That gives names only, in thousands of formats.
- **ANFP** publishes 142 datasets on data.gov.ro: aggregate counts of public servants (by grade, gender, age group, mobility approvals), its own budget and its own procurement. None names anyone (measured via CKAN).
- **SEAP contact persons** exist but are never named (ADR 0009).
- **Recommendation: drop.**

## Identifiers and the confirmed-link question

| Source | Name | Locality / UAT | Institution | Term dates | Birth date or equivalent | Confirmed link to an ONRC administrator? |
|---|---|---|---|---|---|---|
| AEP minutes (mayors, CJ presidents) | yes | SIRUTA, county | via SIRUTA | election date only | **no** | **no**: name, or name + county at best |
| Councillor lists | yes | council | council | mandate period in title | no | no |
| legislatie.just.ro acts | yes | county (prefects only) | name, free text | act dates (start; end from a second act) | no | no |
| cdep.ro deputies | yes | circumscription | Chamber | legislature, validation date | **yes** (full date) | **yes**: name + birth date |
| senat.ro, gov.ro | yes | circumscription | Senate / ministry | dates | no | no |
| ONRC (SOE boards) | yes | birthplace, seat | company CUI | none (current roles only) | **yes** | **yes**: same register |
| Institution sites (Legea 544) | yes | – | own site | rarely | no | no |

**Measured on mayors.** The 3,184 distinct (name, county) mayors elected in 2024 were matched to ONRC natural persons with a birth date, ignoring word order:

| Rule | No ONRC namesake | Exactly one person | Two or more |
|---|---:|---:|---:|
| Name only | 49.7% | 18.0% | 32.3% (p99: 137 persons) |
| Name + ONRC birth county = the UAT's county | 74.5% | 16.7% | 8.8% |

"Exactly one" is not a confirmation. Name + county joins different people on 25–34% of links ([#123](https://github.com/george-vrancianu/grivei.ai/issues/123)), and a mayor who is not an administrator can still have a single namesake who is. ONRC's birth county is blank on 22% of natural-person rows with a birth date (measured), so the county rule misses true matches as well. For the 42 county council presidents, the name-only result is 40% with no namesake, 24% with one and 36% with two or more.

**So no Source makes a confirmed link possible for local or appointed officials.** Only one route would supply the anchor: candidates' birth dates from AEP, which the law collects but does not publish. That would need a Legea 544/2001 request, and it would probably be refused as personal data. I didn't send one; it's an open question for the map.

## 7. Candidate Signal rules (checklist 9)

| # | Candidate rule | Sources | Status |
|---|---|---|---|
| 1 | **Mayor or county council president administers a supplier of their own UAT** (the authority and its subordinate institutions). Legea 161/2003 art. 87(1)(d) already makes holding any administrator or board role in a company incompatible with these offices. | AEP results + ONRC + SEAP | **Ruled out:** needs a confirmed person link, and AEP gives no birth date. |
| 2 | **A councillor's company contracts with their own local authority.** Legea 161/2003 art. 90(1) forbids councillors who are administrators, directors, shareholders or associates of a company from contracting with their council's authorities and their subordinate bodies and companies. Art. 90(2) extends this to spouses and first-degree relatives, which ADR 0009 rules out anyway (no inferred kinship). | councillor lists + ONRC + SEAP | **Ruled out:** no central names, no birth date, and ONRC has no shareholders. |
| 3 | **A prefect, secretary of state or agency head administers a supplier of their own institution** | legislatie.just.ro + ONRC + SEAP | **Ruled out:** name only. |
| 4 | **A public enterprise's board member also holds a role in one of its suppliers** (the same person, by name + birth date, in both companies in ONRC; the enterprise is the contracting authority) | AMEPIP list + ONRC + SEAP | **Feasible.** Measured below. |
| 5 | **Deputy holds a role in a SEAP supplier** | cdep.ro + ONRC + SEAP | Feasible but tiny (3 deputies), and a deputy is not an official of the buying authority. Context on a person page at most, not a Signal rule. |

Rule 4, measured (SEAP 2021Q1–2026Q3 contracts, DA and DAN with an authority CUI; public enterprises from AMEPIP; persons from ONRC with a birth date; self-pairs dropped):

| Measure | All suppliers | Supplier is not itself a public enterprise |
|---|---:|---:|
| Public enterprises that buy in SEAP (authority CUI on AMEPIP's list) | 656 (1.13 M winner rows) | |
| (enterprise, supplier) pairs sharing a person by name + birth date | 77 | 26 |
| Enterprises firing | 71 (10.8% of the 656) | 25 (3.8%) |
| Suppliers involved | 69 | n/a |
| Winner rows | 610 | 125 |
| Raw awarded value | 212 m RON | 142 m RON |
| Distinct persons | 76 | n/a |

Inputs: 1.62 M distinct (authority, supplier) pairs over 17,070 authorities and 173,097 suppliers (DA 9.87 M, DAN 0.76 M and contract 1.67 M winner rows with both CUIs; CNP-shaped supplier ids dropped). Values are raw shares before suspect-value exclusion, so they are upper bounds.

- Two-thirds of the hits are public enterprises buying from **other public enterprises with the same board member**, typically a group and its subsidiaries. That is normal corporate governance, not a conflict, so the rule should exclude suppliers on AMEPIP's list or the same group.
- **ONRC roles are undated** (as in #109). A person who holds both roles today may not have held them when the award was made. A dated rule needs monthly ONRC snapshot diffs.
- Name-only matching would have given 79 pairs instead of 77. In this small, specific population, name + birth date and name agree almost entirely, unlike the mayor and deputy populations above.

Legea 161/2003 is quoted from the base text served by legislatie.just.ro ([DetaliiDocument/43323](http://legislatie.just.ro/Public/DetaliiDocument/43323)). Its articles still say "societăți comerciale", so the current consolidated wording is *unverified*. Art. 91 sets when incompatibility starts (after the mandate is validated). ANI enforces these incompatibilities with CNP-level access to the trade register (Legea 176/2010; *unverified* in detail). That is why ANI can run rule 1 and we cannot.

## 8. Who already uses it (checklist 10)

- **Code for Romania** backs up AEP's results files ([romanian-elections-data](https://github.com/code4romania/romanian-elections-data)) and runs results sites on them. That repository is the only surviving copy of the 2024 local-election minutes I found.
- **ANI** checks the incompatibilities in §7 rules 1–2 from declarations and register data (*unverified*: its exact data access).
- Journalists regularly match mayors to companies by name. I found no primary write-up with a method or an error rate, and #123's measurements suggest such matches are often wrong.

## 9. Recommendation (checklist 11)

1. **AEP local-election results: keep, as a Reference source keyed by SIRUTA.** Show the elected mayor and county council president, with party and election date, on the UAT's contracting-authority page: "an official acting in their role" (ADR 0009). Never link them to an ONRC person page or use them in a Signal rule. Load from the 2024 backup and AEP's data.gov.ro files, and archive the raw files (ADR 0004).
2. **AMEPIP public-enterprise list: keep, as a Reference source keyed by CUI.** Board members come from ONRC with birth dates, which makes §7 rule 4 the one officials-related Signal that confirmed links allow.
3. **Appointments on legislatie.just.ro: later and optional.** Useful context for prefectures and central agencies, it needs a name→CUI table, and it is never linked to a person.
4. **cdep.ro deputies: optional.** It is the only official list with birth dates, but the population is small and only weakly tied to procurement.
5. **Drop:** councillor lists, the Senate and Government pages as people Sources, institution heads and procurement staff (no central list), and any name-only or name + county officials-to-administrators link.
6. **Open question for the map:** whether to ask AEP, under Legea 544/2001, for elected officials' birth dates (collected under Legea 115/2015 art. 47(3), not published). Without them, rules 1–3 stay out of reach.
