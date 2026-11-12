# Party of elected leaders over time: 2020 and 2024 results, party switches, cabinet parties

Research for [#131](https://github.com/george-vrancianu/grivei.ai/issues/131) on the map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). The user wants a "Party" filter in search. The proposed model (to be decided in grilling ticket #132) attaches a party to an **authority through its elected leader's mandate**, never to a supplier or a private person. On the supplier side only CUI-keyed firm donations (BaniPartide, [#115](https://github.com/george-vrancianu/grivei.ai/issues/115)) are shown. This note supplies the facts that decision needs: which party data exists over time, how an award date maps to one leader, how often leaders change party, what central government looks like, and how much SEAP money the model can cover. Vocabulary follows `GLOSSARY.md`.

**Method.** Everything was fetched or measured on 12–13 November 2026.

- **Election results:** the 2020 local-election final minutes (`pv_<county>_final.json`, 42 files, 206 MB), downloaded from AEP's official results site, which still serves them. The 2024 minutes are the Code for Romania backup already profiled in [#129](https://github.com/george-vrancianu/grivei.ai/issues/129). AEP's 2020 dataset on data.gov.ro (CKAN metadata and the run-off file). Code for Romania's backup of the 7 December 2025 partial elections.
- **Law texts:** the Administrative Code (OUG 57/2019), consolidated, from legislatie.just.ro. OUG 21/2024 (merging the 2024 elections), as published in Monitorul Oficial. Government decisions setting partial elections, through legislatie.just.ro's free web service.
- **Cabinets:** Wikidata's SPARQL endpoint (cabinet items and their members' `position held` statements).
- **SEAP coverage:** the SEAP bulk files 2021Q1–2026Q3 in the Raw archive (DA, DAN, contracts, award notices without prior notice), parsed with `watchdog/pipeline/bulk` and counted with `watchdog/pipeline/counting.py`, as the rebuild does. The local Postgres graph was empty (only PostGIS tables), so the archive was the reliable route. The `/tmp/onrc-seap` extracts have no authority column and were not used.
- **Donors:** the BaniPartide firm-donor extract from #115.

Counts marked *measured* come from those files. *Unverified* marks claims I could not confirm against a primary text. No personal names are recorded here, only counts and field lists (ADR 0009). Where the same person had to be followed across elections, names were reduced to a hash and never written out.

## Summary

- **2020 results are still downloadable, and in the same format as 2024.** `prezenta.roaep.ro/locale27092020/data/json/sicpv/pv/pv_<county>_final.json` answers HTTP 200 (last modified April 2024), unlike the 2024 path, which now redirects. They give 3,186 mayoral races and 42 county council president races (Bucharest's general mayor included), each with SIRUTA, county, candidate, party and votes. AEP's data.gov.ro dataset (CC BY 4.0) has polling-station results and the 11 October 2020 repeat round, which the JSON lacks (3 UATs). 2016 is not available: the site path redirects and data.gov.ro has no 2016 local dataset.
- **Mandates start at the oath, not at the election, and run until the successor's oath** (Administrative Code art. 150(3), 151(3)). The 2020 leaders cover SEAP awards from January 2021 until October or early November 2024. OUG 21/2024 art. 34 made all 2024 validation and oath deadlines run from 27 September 2024, so leaders elected on 9 June 2024 took office only in October–November 2024. No dataset has the per-UAT oath date.
- **By-elections are a small but real gap.** A vacancy is filled by a partial election within 90 days (art. 160(11)); meanwhile a deputy mayor acts (art. 163), and no data gives that person's party. In 2025 there were two rounds: 17 mayors plus one county council president (4 May), and 12 mayors plus one county council president and Bucharest's general mayor (7 December). Partial-election results exist as data only for December 2025 (Code for Romania's backup).
- **Party switching is large between elections and leaves no record.** No register of leaders' party membership exists. Measured on AEP results: **of 2,448 mayors re-elected in 2024 in the same UAT, 454 (18.5%) ran for a different party family than in 2020**, 152 of them from PNL to PSD. Expert Forum counted 415 incumbents (13%) running for another party in 2024. Most of this was legal only because OUG 21/2024 art. 33 let sitting officials join another party without losing their mandate; otherwise resigning from the party ends a mayor's mandate (art. 160(1)(h)). "Party at election" therefore misattributes the 2020-mandate money of these UATs for at least the months before the June 2024 election, and the switch date is not recorded anywhere.
- **Central government:** six cabinets cover 2021–2026; the first five were coalitions. Wikidata lists ministers per cabinet with start and end dates and party (CC0), but about a third of members carry several undated party statements. Secretaries of state have no party in any source. A minister's party could be attached to a ministry's own CUI, but agencies and state companies would need a tutelage table that no Source supplies.
- **Coverage:** authorities led by an elected leader (town halls and county councils) awarded **30.5%** of SEAP awarded value 2021–2026 (282 bn of 924 bn RON). Their schools, hospitals, local services and other subordinate bodies add about 9.5%, and local water and transport companies more. Ministries and central agencies awarded 16.5%; national companies 31.4%. Excluding all records of 1 bn RON or more, the elected-leader share rises to 37.9%.
- **What this means for the Party filter:**
  - It should attach to **a mandate** (UAT or county, leader, party as registered at the election, start and end dates), not to "the current party".
  - It covers about a third of awarded value directly, and about 40% once local subordinate bodies are linked to their UAT (half, without the largest contracts).
  - The 2024 switch wave must be disclosed: "party at election" is all the data supports.

## 1. 2020 local elections (checklist 1–3, 6–8)

### Access

- **AEP's results site still serves the 2020 minutes.** `https://prezenta.roaep.ro/locale27092020/data/json/sicpv/pv/pv_<county>_final.json` answers HTTP 200 for all 42 county codes (measured; `last-modified: Mon, 22 Apr 2024`, `content-type: application/json`). The site root now hosts the 8 November 2026 referendum, and `/locale09062024/` redirects to the 2024 presidential site, so this may not last. **Archive it now.**
- **AEP's data.gov.ro dataset** [alegeri-pentru-autoritatile-administratiei-publice-locale-2020](https://data.gov.ro/dataset/alegeri-pentru-autoritatile-administratiei-publice-locale-2020) (8 resources, last modified 14 October 2021, measured via CKAN) holds:
  - county-level totals per office (`pv_final_cntry_p.csv`, `_cl`, `_cj`, `_pcj`, 43 rows each);
  - the polling-station file (`bd_sectii_27.09.2020+24.01.2021.csv`, 106.6 MB, 672,806 rows);
  - the **11 October 2020 repeat round** for mayors at UAT level (`pv_final_cntry_p_tur2.csv`: 3 UATs, with `candidate-party-votes` columns) and at polling-station level (`bd_p_11.10.2020.csv`);
  - a `legenda.txt` documenting the columns.
- **No other mirror is needed.** Code for Romania's [romanian-elections-data](https://github.com/code4romania/romanian-elections-data) covers only the June 2024 elections and the December 2025 partial elections (repository tree, measured).
- **2016:** not cheap. `prezenta.roaep.ro/locale05062016/` redirects to the site root, and data.gov.ro has no 2016 local-election dataset (AEP's local datasets are 2012, two 2014 rounds and 2020, measured via CKAN search). Not pursued further, as SEAP data starts in 2021.

### Licence

- data.gov.ro dataset: `CC-BY-4.0` (CKAN `license_id`, measured).
- The JSON minutes on prezenta.roaep.ro carry no licence statement, the same as the 2024 copy (#129).

### Fields, keys and counts (measured)

The 2020 JSON has the same structure as 2024: `stages → FINAL → scopes (PRCNCT, UAT, CNTY, CNTRY) → categories (P, CL, CJ, PCJ, PG_BEC, CGMB_BEC) → table`.

- **Item keys:** `county_code, county_id, county_name, county_nce, uat_id, uat_name, uat_siruta, report_created_at, report_id, report_stage_code, report_type_category_code, report_type_code, report_type_scope_code, report_version` (plus `precinct_*` at polling-station level).
- **Vote row:** `candidate, party, votes, mandates`. For mayors `mandates` is empty, so the winner is not flagged and has to be derived as the top vote-getter.

| Race | 2020 | 2024 |
|---|---:|---:|
| Mayor (`UAT / P`), with SIRUTA | 3,186 (all with SIRUTA) | 3,186 (all with SIRUTA) |
| County council president (`CNTY / PCJ`), incl. Bucharest's general mayor | 42 | 42 |
| Distinct party labels among winning mayors | 107 | 28 |
| Winning mayors with no party (independents) | 71 | 43 |
| Races with a tie between the top two | 4 | 2 |
| Minutes created | Sept. 2020: 3,016; Oct. 2020: 170 | (#129) |

- **SIRUTA matches across elections:** 3,185 of 3,186 mayoral SIRUTA codes appear in both years. One code exists only in 2020 and one only in 2024.
- **Repeat round:** three UATs with a tie held a second round on 11 October 2020. Their winners are in the data.gov.ro `tur2` file, not in the JSON. A fourth tie in the JSON has no matching repeat-round row (*unverified* how it was resolved).
- **Party labels are messier in 2020:** there are many local alliances (e.g. "Alianța Electorală Coaliția pentru Maramureș", "PRO Caraș-Severin"), and Bucharest's general mayor appears under `PCJ` for county `B` with a blank party (independent) in both years.
- **Volume:** 206 MB of JSON for 2020 (192 MB for 2024). The useful extract is about 3,230 rows per election.

## 2. Mandate dates: which leader an award date belongs to (checklist 7–8)

### Regular mandates

All quotations are from the consolidated Administrative Code (OUG 57/2019) on [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/215925).

| Step | Mayor | County council president |
|---|---|---|
| Validation | by the local court (judecătorie) within 20 days of the election, after the campaign-finance report is filed (art. 149(1)); appeal to the tribunal (art. 149(4)–(5)) | by the tribunal, same procedure (art. 187(1)) |
| Oath | at the council's constitution ceremony, or before a delegated judge if the ceremony is not held within 30 days of the election (art. 150(1)) | at the county council's first sitting, or before the tribunal president if it is not held within 60 days (art. 187(2)) |
| Start of mandate | "După depunerea jurământului, primarul intră în exercițiul de drept al mandatului" (art. 150(3)) | art. 150(2)–(3) apply (art. 187(2)) |
| End of mandate | 4 years, exercised "până la depunerea jurământului de către primarul nou-ales" (art. 151(1), (3), as amended by Law 84/2020) | same rule (art. 187) |

- **2020 mandates:** election on 27 September 2020 (repeat round on 11 October). The 2016 mandates had been extended until then by Law 84/2020. So oaths fell in October–November 2020, and **every SEAP award from January 2021 to the 2024 handover falls in a 2020 mandate**, apart from vacancies.
- **2024 mandates:** election on 9 June 2024. OUG 21/2024 art. 34 says that, by derogation from Code art. 113–115, 121, 149(1), 150(1) and 187(2), the deadlines for the new authorities to take office "încep să curgă de la data de 27 septembrie 2024" (OUG 21/2024, Monitorul Oficial no. 195 of 8 March 2024). Validation and oaths therefore took place in October and early November 2024. Local reports give oath ceremonies on 24 October (Focșani) and 31 October (Iași) (*secondary*: [Euronews](https://www.euronews.ro/articole/cand-isi-incep-primarii-si-consilierii-locali-mandatele-dupa-alegerile-din-9-iunie), [BZI](https://www.bzi.ro/doar-22-de-consilieri-locali-din-27-depun-astazi-juramantul-evenimentul-are-loc-la-sediul-primariei-iasi-5103446)). Between June and that handover, the 2020 mayor stayed in office even if defeated.
- **No dataset gives the per-UAT oath date.** It sits in each court's validation ruling (încheiere) and in council minutes on each UAT's website. A practical rule is a single cut-over date per election with a flagged handover window (about 27 September to mid-November 2024). That window matters only where the party changed: in 2,221 of 3,185 UATs (70%) the 2020 and 2024 winners belong to the same party family (measured, §3).

### Vacancies, interim leaders and partial elections

- **Termination:** a mandate ends early on resignation, incompatibility, a change of domicile, a final prison sentence, interdiction, loss of electoral rights, six months of incapacity, **resignation from the party on whose list the mayor was elected**, an electoral crime or death (art. 160(1)(a)–(j)). The prefect records it by order (art. 160(7)), and the mayor can also be removed by local referendum (art. 162).
- **Interim:** during a vacancy or suspension, "atribuțiile … sunt exercitate de drept de viceprimar" (art. 163(1)). The deputy mayor is a councillor elected by the council (art. 152(2)). Neither the deputy's name nor their party is in any national dataset.
- **Partial election:** set by Government decision (Law 115/2015 art. 10(2)), within 90 days of the vacancy (Code art. 160(11)). The new mayor takes the oath at a council sitting within 30 days (art. 150(1^1), added by OUG 21/2026). The same rule applies to county council presidents (art. 187(2^1)).
- **How many (measured, legislatie.just.ro):**
  - HG 5/2025 set 4 May 2025 for one county council president and 17 mayors; HG 299/2025 later completed its annex.
  - HG 890/2025 set 7 December 2025 for one county council president, Bucharest's general mayor and 12 mayors.
  - HG 554/2021 set a 2021 round for mayors and one local council.

  The web service's title search returns only a partial list, so earlier rounds were not counted. At roughly 15 mayors per round and two rounds a year, about 1% of UATs change leader mid-term each year, each with an interim period of up to about four months.
- **Partial-election results as data:** only for 7 December 2025, in Code for Romania's backup (`csv/pv/LCL-20251207/`: per-UAT and per-county CSVs whose vote columns are named `candidate-party-voturi`). Official `prezenta.roaep.ro` paths for partial elections redirect to the site root, and `roaep.ro` sits behind a reCAPTCHA (as in #115). **Earlier partial-election winners are not available as data.** The Government decisions name the UATs but not the result.

## 3. Party switches mid-term (checklist 8, 10)

### Is there a record?

- **No official one.** AEP keeps no register of elected officials' party membership. Party membership lists are not public. A switch shows only indirectly:
  - as a prefect's order ending the mandate (art. 160(1)(h)), which yields a partial election;
  - in the next election's candidate lists;
  - in press releases and party announcements.
- **The law mostly forbids voluntary switching.** Resigning from the party ends the mandate (art. 160(1)(h)). Three routes keep the mandate:
  - **expulsion**, since only resignation ("prin demisie") is listed;
  - **party mergers and dissolutions**;
  - **one-off windows.** OUG 21/2024 art. 33(1) let holders of a local mandate join any party to run on 9 June 2024 "fără să le înceteze … mandatul deținut", and art. 33(2) required the newly elected to still belong to the party they ran for in order to be validated.
- **Expert Forum** counted 415 incumbent mayors (13%) running in 2024 for a party other than the one they represented, among 3,187 circumscriptions, using AEP's candidate data. By their count PSD gained 279 (174 from PNL) and lost 48; PNL gained 99 and lost 188; USR lost 26 (Expert Forum, [PB-174 "migrație"](https://expertforum.ro/wp-content/uploads/2024/05/PB-174-migratie.pdf), May 2024). The PDF answered HTTP 403 to a script; figures as reported by [G4Media](https://www.g4media.ro/raport-despre-primarii-traseisti-psd-e-cel-mai-mare-beneficiar-usr-a-atras-unul-singur.html), *unverified* against the original.

### Measured from AEP results (2020 vs 2024 winners)

The same person was detected as the same UAT (SIRUTA) with the same name hash (name folded to ASCII, upper case, word order ignored) in both elections. Party labels were folded to families (alliances to their lead party, independents together). That folding is coarse for 2020's local alliances.

| Measure | Mayors | County council presidents |
|---|---:|---:|
| Races in both elections | 3,185 | 42 |
| Same winner in 2020 and 2024 | 2,448 (76.9%) | 27 (64.3%) |
| … of whom ran under a different party label | 477 | 3 |
| … of whom ran under a **different party family** | **454 (18.5%)** | 2 |
| Races whose winning party family changed, any cause | 964 (30.3%) | 10 |

Top family moves among re-elected mayors: PNL → PSD 152, PRO România → PSD 29, PSD → PNL 26, Coaliția pentru Maramureș (a 2020 local alliance) → PSD 24, PMP → PSD 22, independent → PNL 17, independent → PSD 15, USR → PSD 14, PMP → PNL 13, ALDE → PSD 11.

### What "party at election" misses

- **The 2024 switch wave:** at least 454 UATs (14% of all) whose mayor served the 2020 mandate under one party and was re-elected under another. The switch date is not recorded anywhere. Under OUG 21/2024 it fell between 8 March 2024 and the close of candidacies that spring, but expulsions and mergers could be earlier. Attributing the whole 2021–2024 spend to the 2020 party is right for most of the mandate and wrong for its last months. That is a stated simplification, not an error to be fixed with data that does not exist.
- **Mayors who switched and then lost or did not run:** invisible in this measure (Expert Forum's 415 includes some of them).
- **Mergers:** e.g. ALDE's 2020 mayors. The party on the ballot no longer exists, and the leader is now in another party without having "switched".
- **Interim deputy mayors and partial-election winners** (§2).
- **Independents:** 71 mayors in 2020 and 43 in 2024, plus Bucharest's general mayor in both. Their spend has no party by construction.

## 4. Central government (checklist 3–4, 7–8)

### Cabinets 2021–2026

From Wikidata (CC0), cabinet items with their members' `position held` (P39) statements qualified by `cabinet` (P5054):

| Cabinet (Wikidata) | Start | End | Members listed |
|---|---|---|---:|
| Cîțu ([Q104440634](https://www.wikidata.org/wiki/Q104440634)) | 2020-12-23 | 2021-11-25 | 21 |
| Ciucă ([Q109680585](https://www.wikidata.org/wiki/Q109680585)) | 2021-11-25 | 2023-06-12 | 26 |
| Ciolacu I ([Q119472111](https://www.wikidata.org/wiki/Q119472111)) | 2023-06-15 | 2024-12-23 | 21 |
| Ciolacu II ([Q131546294](https://www.wikidata.org/wiki/Q131546294)) | 2024-12-23 | 2025-05-05 | 16 |
| Bolojan ([Q135033273](https://www.wikidata.org/wiki/Q135033273)) | 2025-06-23 | 2026-10-20 (members' end dates) | 23 |
| Niculescu ([Q141794661](https://www.wikidata.org/wiki/Q141794661)) | 2026-10-20 (members' start dates) | – | 19 |

- **Gaps:** the interim periods (12–15 June 2023; May–June 2025) are not modelled as cabinets. The Bolojan cabinet lost six ministers on 25 April 2026 (members' end dates). The dates of the two latest cabinets are *unverified* against gov.ro, which shows only the current cabinet.
- **Party per minister:**
  - 80 of 126 person-cabinet pairs have exactly one party statement (`member of political party`, P102).
  - 42 have two to six, only some with start or end qualifiers, and 4 have none. So the party *at the time* needs checking by hand for about a third.
  - The cabinets were coalitions (PNL–USR PLUS–UDMR, PNL–PSD–UDMR, PSD–PNL–UDMR twice, PNL–PSD–USR–UDMR; the Niculescu cabinet is mostly PSD members and independents on Wikidata).
- **Official sources:**
  - Presidential decrees appointing each Government and each minister are on legislatie.just.ro. They give name, portfolio and date, but no party.
  - gov.ro shows only the current cabinet, without party (#129).
  - Party is therefore always a third-party fact (Wikidata, Wikipedia, the parties' own sites).
- **Secretaries of state:** appointed by Prime Minister decisions (175 "numirea" acts in 2025, #129) that give name and function only. No source states their party. Not feasible.

### Can ministry and agency spending be attributed this way?

- **Ministries' own CUIs:** feasible, with a small hand-kept table (ministry CUI, cabinet, minister, party, dates), about 20 rows per cabinet. Ministries are renamed, split and merged between cabinets (e.g. economy and digitalisation), so CUIs need checking per cabinet. Military units buy under their own CUIs ("Ministerul Apărării – Unitatea Militară …"), so defence needs a unit → ministry rule.
- **Agencies and state companies:** these are the bulk of central money (below). Each sits under a ministry, the Government or the Prime Minister. That tutelage is in each body's founding act, not in a dataset. AMEPIP's public-enterprise list (#129) gives the CUIs but not the tutelary authority.
- **Meaning:** a minister does not run their agencies' tenders, and a coalition cabinet makes "the Government's party" undefined. Attributing central spending to a party is a weaker claim than "the mayor of this UAT, elected for party X".

## 5. Coverage: how much SEAP money has an elected leader (checklist 5)

### Method

- **Records:** every Record in the 2021Q1–2026Q3 bulk files of the Raw archive (DA, DAN, contracts, award notices without prior notice), de-duplicated by code within a kind (the later publication date wins). Award year 2021–2026.
- **Value:** the stored counting rule (`counting.count`): framework ceilings left out, subsequent contracts in, DA/DAN over ten times the cap left out.
  - **No estimates are archived** (`read_estimates` returned 0), so the 1 bn RON contract rule could not run.
  - I listed the 98 records of 1 bn RON or more and dropped the only implausible one: a single 125.9 bn RON contract of an air-traffic agency.
  - A second run drops all 98 (403 bn RON) as a sensitivity bound.
- **Authority:** the authority CUI, classified by its most frequent name in the files, with ordered regular expressions:
  - **A**, elected leader: town halls and UATs ("Primăria", "Comuna", "Orașul", "Municipiul", "UAT", sectors) and county councils ("Consiliul Județean", "Județul X");
  - **B**, local subordinate (estimated by name): schools, local social, police and public services, county road directorates, hospitals. Hospitals are mostly local since 2010, but the class also holds national institutes;
  - **C**, central government: ministries and Government, central agencies and deconcentrated services, military units, courts, universities;
  - **D1**, national companies (CN/SN and known state companies);
  - **D2**, other companies: regional water operators and local transport, which are owned by UATs, but also private sectoral buyers (gas and power distributors);
  - **E**, unclassified.

  A spot check of the largest names in each class found few misfits. E holds 2.4% of value.

### Result (measured)

| Class | Authority CUIs | bn RON 2021–2026 | Share | Share, all records ≥ 1 bn RON dropped |
|---|---:|---:|---:|---:|
| **A. Elected-leader authority** | 3,290 | **282.3** | **30.5%** | **37.9%** |
| – town halls and UATs (incl. Bucharest and its sectors) | 3,249 | 231.9 | 25.1% | 30.5% |
| – county councils | 41 | 50.4 | 5.4% | 7.4% |
| B. Local subordinate bodies (estimated) | 7,697 | 88.2 | 9.5% | 12.7% |
| C. Central government | 1,426 | 153.0 | 16.5% | 16.0% |
| – ministries and Government (incl. military units) | 230 | 59.5 | 6.4% | 4.4% |
| – central agencies and national bodies | 1,130 | 82.8 | 9.0% | 10.0% |
| – universities | 66 | 10.7 | 1.2% | 1.6% |
| D1. National companies | 78 | 290.1 | 31.4% | 19.2% |
| D2. Other companies (local utilities, private sectoral) | 1,244 | 89.3 | 9.7% | 11.0% |
| E. Unclassified | 3,601 | 21.7 | 2.4% | 3.3% |
| **Total** | 17,336 | **924.5** | 100% | 665.6 bn RON |

- **By year,** class A's share was 31.8% (2021), 24.1% (2022), 37.7% (2023), 33.6% (2024), 33.3% (2025) and 21.4% (2026 to Q3, when defence contracts lift ministries to 19%).
- **By kind,** class A holds 47.7% of DA value, 33.2% of DAN value, 31.9% of contract value and 4.2% of award notices without prior notice.
- **Reading:** a Party filter based on elected leaders covers about **a third of awarded value directly**. It reaches about 40% (51% without the records of 1 bn RON or more), and more with UAT-owned companies, if local subordinate bodies are linked to their UAT, which needs a subordination table no Source supplies (the MF entity list gives only the UAT name). Most of the rest is central: national companies, agencies and ministries, which §4 cannot attribute reliably.
- Class A authority CUIs (3,290) slightly exceed the number of UATs (3,186 + 41 counties + Bucharest): some UATs buy under more than one CUI or name. The join from authority CUI to SIRUTA is the graph's existing placement step.

## 6. Candidate Signal rules (checklist 9)

| # | Candidate rule | Sources | Status |
|---|---|---|---|
| 1 | **A firm that donated to party X wins awards from an authority whose leader was elected for party X** (in that mandate) | BaniPartide + AEP results + SEAP | Partly measured: of 117 firm donors since 2020, 41 are SEAP suppliers and **33 won from class-A authorities** (6,482 winner rows, 5.6 bn RON raw, consortium shares, all years in the files). The party match per mandate needs the authority → SIRUTA join and was not run. No base rate yet. |
| 2 | Award volume of a UAT jumps after its leader's party changes | AEP results + SEAP | Not a Signal: party change is political, not a sign of irregularity. Context only. |
| 3 | Awards in the handover window (election to oath) by an outgoing, defeated mayor | AEP results + SEAP | Possible later; needs per-UAT oath dates (§2), which no Source has. |

## 7. Who already uses it (checklist 10)

- **Expert Forum:** the mayors' party-switching brief (PB-174, May 2024), and BaniPartide for party finance (#115).
- **Code for Romania:** backs up AEP's 2024 and December 2025 results.
- **Press:** national party tallies of mayors after each election, and county stories about switching mayors. I found no dataset of leaders' party over time.

## 8. Checklist at a glance

| # | Item | Answer |
|---|---|---|
| 1 | Access | 2020: AEP JSON on prezenta.roaep.ro (still live) + data.gov.ro CSVs. 2024: Code for Romania backup. Partial elections: Dec 2025 only. Cabinets: Wikidata SPARQL |
| 2 | Licence | data.gov.ro 2020: CC BY 4.0. JSON minutes: none stated. Wikidata: CC0 |
| 3 | Join key | SIRUTA (mayors), county (CJ presidents), then the graph's authority placement; ministries by a hand-kept CUI table |
| 4 | People | elected leaders by name, party, votes (officials in role, ADR 0009); ministers by name and portfolio |
| 5 | Money | none; context for 30.5% of awarded value (class A) |
| 6 | Volume | about 3,230 races per election; 206 MB raw for 2020, 192 MB for 2024; cabinets about 20 rows each |
| 7 | History and cadence | 2020 and 2024 regular elections; about two partial rounds a year; cabinets change about yearly |
| 8 | Quality | winner not flagged; 2020 repeat round outside the JSON; 107 party labels in 2020 (local alliances); no oath dates; no switch dates; no interim leaders |
| 9 | Signals | firm-donor-to-leader's-party match (33 donor-suppliers won from class A, party match not yet run) |
| 10 | Users | Expert Forum, Code for Romania, press |
| 11 | Recommendation | below |

## 9. Recommendation (checklist 11)

1. **Keep AEP's 2020 and 2024 results as one Reference source of mandates**, keyed by SIRUTA (mayors) and county (county council presidents and Bucharest's general mayor). Each mandate records the party label as registered at the election, a party family, and start and end dates (a cut-over per election, with the handover window flagged). **Archive the 2020 JSON now**, while AEP still serves it, and add the data.gov.ro repeat-round file.
2. **The Party filter should mean "authority whose elected leader was elected for party X in that mandate"**, never "currently in party X". It must say that 2024 switching (at least 454 re-elected mayors) is not reflected before the 2024 election, and that independents, interim deputy mayors and partial-election winners have no party in the data. Partial elections from December 2025 onwards can be added from Code for Romania's backup; earlier ones stay a known gap of about 1% of UATs a year.
3. **Do not attribute central-government spending to a party in the first version.** If wanted later, attach a minister's party to the ministry's own CUIs only, from a hand-checked table built on Wikidata, and never to agencies or state companies.
4. **Linking subordinate local bodies to their UAT** (schools, local services, UAT-owned utilities) would raise coverage from about a third to about 40% or more. It needs a subordination table, which is the same kind of open question as the map's "organisations named without a CUI".
5. **Supplier side:** only CUI-keyed firm donations (BaniPartide), as proposed. Candidate rule 1 needs a base rate before it can be a Signal.
