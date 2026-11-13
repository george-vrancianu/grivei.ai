# Party beyond town halls: subordinate bodies' tutelage and senators' birth dates

Research for [#153](https://github.com/george-vrancianu/grivei.ai/issues/153). ADR 0012 attaches a Party to a contracting authority only through the mandate of an elected leader (a mayor or county council president). It defers local subordinate bodies because "that would need a tutelage table nobody keeps", and it confirms Party roles only for deputies, the officials whose birth dates cdep.ro publishes (ADR 0011). This note asks two things. Is there a Source, or a cheap derivation, that ties each local subordinate body to its UAT or county? And do senators' birth dates exist anywhere? Vocabulary follows `GLOSSARY.md`.

**Method.** Everything was fetched or measured on 13 November 2026.

- **MF list:** the Lista entităților publice of 01.11.2026, the file already in the Raw archive (`mf/list/entities/2026-11-01/…`). For a drift check, the 01.04.2018 snapshot from the same data.gov.ro dataset.
- **SEAP:** awarded value by authority CUI, read from the local graph's `seap.rollup_entity` (authority side, award years 2021–2026, the stored counting rule). It was a single light read-only query, with no refresh running. Total: **1,098.3 bn RON**, or 712.2 bn RON without records of 1 bn RON or more (the `OVER_1B` value bucket).
- **ANAF:** the archived v9 responses for 192,907 CUIs (ownership form, legal form, seat).
- **AMEPIP:** the January 2026 public-enterprise dataset on data.gov.ro, and the agency's website.
- **ONRC:** `OD_REPREZENTANTI_LEGALI.CSV` and `OD_REPREZENTANTI_IF.CSV` from the 04.11.2026 snapshot on data.gov.ro.
- **Senate:** all 134 senator profiles linked from senat.ro's senator list (`FisaSenatori.aspx`), fetched one per second.
- **Scripts:** in [`party-beyond-town-halls/`](party-beyond-town-halls/). Downloads were kept in a scratch directory outside the repo and parsed with `python3 -I`.

The total is higher than the 924.5 bn RON in [#131](https://github.com/george-vrancianu/grivei.ai/issues/131). That note re-read the bulk files and dropped one 125.9 bn RON air-traffic contract, while the graph's rollup still counts it. Shares are therefore given both with and without records of 1 bn RON or more.

## Summary

- **The tutelage table exists: it is MF's own list.** The Lista entităților publice has two columns per entity, `CIF Ordonator principal de credite (1)` and `(2)`, so each public entity carries the CUI of its principal credit holder. Under Legea 273/2006 art. 21(2), the principal credit holders of local budgets are the mayors, the Bucharest general mayor, the sector mayors and the county council presidents. #131 wrote that "the MF entity list gives only the UAT name"; that was wrong.
- **Coverage gained:** 1,625 local bodies with a single elected-leader principal (hospitals, social services, roads, public utilities, culture) awarded **4.7%** of SEAP value, or 7.3% without records of 1 bn RON or more. Another 5,595 bodies are dual-funded, with a UAT and a ministry as principals (almost all schools). They awarded **1.0%** (1.5%). Party coverage would rise from **26.6% to 31.3%**, or from 36.8% to 44.1% without the largest records, and by one more point with schools.
- **Error rate of the MF derivation is low:**
  - all 7,220 subordinate authorities sit in the county of their elected-leader principal (9 apparent exceptions are Ilfov bodies whose county council is seated in Bucharest);
  - a random sample of 60 was consistent by name and locality, 60 of 60 (95% upper bound about 5%);
  - between April 2018 and November 2026, only 8 of 6,687 changed elected-leader principal (0.12%, 0.18% of their value), and 5 more left local funding.
- **The real risk is meaning, not data.** A principal credit holder is a funding relation (art. 21(4)), not proof that the mayor runs the body. That relation is strong for hospitals and council services. It is weak for schools, which have a ministry as second principal.
- **Municipal companies: no open Source.** Neither MF nor ANAF nor AMEPIP gives the owning UAT, and ONRC's shareholders are paid data. ANAF's ownership field is also wrong for known public companies. Local-looking public enterprises award about 5–7% of value. Many are regional water operators owned by several UATs through an ADI, which no single elected leader can stand for.
- **Senators' birth dates are on senat.ro, but hidden.** All 134 profiles carry a full birth date (`dd.mm.yyyy`) and a birth county inside an HTML comment (`<!--Data naşterii: … Locul naşterii: …-->`), which a browser does not display. #129 checked the visible page and found none.
- **Measured against ONRC:**
  - 65 senators have an ONRC namesake, and **44 (33%) match on name + birth date**;
  - name alone would have linked the other 21 to someone else, so 32% of name-only links would be wrong;
  - 32 senators' names belong to two or more ONRC persons with different birth dates.
- **Recommendation:**
  1. **Lift ADR 0012's deferral for local subordinate bodies.** Attribute them through the MF principal credit holder, as a derived Party labelled as such. Keep dual-funded bodies (schools) out, or behind a separate, labelled toggle. Keep municipal companies and ADIs out.
  2. **Senators:** whether a commented-out field is an "official publication" under ADR 0011 is a question for the lawyer review (ADR 0009). It should not be decided by an agent. Until then, no senator is linked.

## 1. Local subordinate bodies

### The MF list's principal credit holder

The Lista entităților publice (data.gov.ro dataset [`listaentitatipublice`](https://data.gov.ro/dataset/listaentitatipublice), licence `uk-ogl`) has ten columns in the 01.11.2026 file (13,485 rows):

`Judet, CIF Entitate Publica, CIF in scop TVA, Denumire Entitate Publica, Denumire UAT pe raza careia isi desfasoara activitatea, Adresa de corespondenta, CIF Ordonator principal de credite (1), Denumire ordonator principal de credite (1), CIF Ordonator principal de credite (2), Denumire ordonator principal de credite (2)`

- **Top-level rows** (3,296) have no principal of their own. 3,228 of them are UATs and counties (`COMUNA`, `ORAS(UL)`, `MUNICIPIUL`, `JUDETUL`, `SECTORUL`, and four spelled `PRIMARIA …` or `MUNICIPIULUI …`). The rest are ministries, Parliament, courts and autonomous authorities.
- **Every principal CUI is itself a top-level row** (measured: 0 of 3,767 distinct principal values are missing). The tie is therefore a clean CUI-to-CUI join, with no name matching.
- **Second principal:** 5,695 rows have one, almost always a ministry of education under one of its many spellings. Which of the two is (1) and which is (2) varies between snapshots. The derivation must treat them as a set: in the 2018 file the ministry was usually first, in 2026 the UAT.
- **Legal basis:** Legea 273/2006 privind finanțele publice locale, art. 21: "(2) Ordonatorii principali de credite ai bugetelor locale sunt primarii unităților administrativ-teritoriale, primarul general al municipiului București, primarii sectoarelor municipiului București și președinții consiliilor județene. … (4) Conducătorii instituțiilor publice cu personalitate juridică, cărora li se alocă fonduri din bugetele prevăzute la art. 1 alin. (2), sunt ordonatori secundari sau terțiari de credite, după caz." ([legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/269485)). So a body whose principal is a UAT receives money from that UAT's budget, and the UAT's elected leader is its principal credit holder by law.
- **No history in between:** the dataset holds only snapshots from 2017, 2018 and 2026 (monthly). There is nothing for 2019–2025; one 2023 resource has an empty URL. A tie can therefore only be the current one, checked for drift (below).

### Coverage (measured)

Each SEAP authority CUI 2021–2026 is classified by the MF list: A (itself a UAT or county), B (its principal set contains exactly one elected-leader UAT/county), C (in the list, with no elected-leader principal), D (not in the list: a company by ANAF legal form, name or trade-register number), E (other, not in the list). Script: `attribute.py`.

| Class | Authority CUIs | bn RON | Share | Share, records ≥ 1 bn RON dropped |
|---|---:|---:|---:|---:|
| A. Town halls and UATs | 3,187 | 240.2 | 21.9% | 29.7% |
| A. County councils | 41 | 52.0 | 4.7% | 7.1% |
| **B. Subordinate, single elected-leader principal** | 1,625 | **51.7** | **4.7%** | **7.3%** |
| **B. Subordinate, dual-funded with a ministry (schools)** | 5,595 | **10.5** | **1.0%** | **1.5%** |
| C. In MF list, central or other principal | 2,266 | 185.0 | 16.8% | 19.1% |
| D. Companies, ANAF says state or mixed ownership | 494 | 298.9 | 27.2% | 20.0% |
| D. Companies, other ANAF ownership | 777 | 232.5 | 21.2% | 11.9% |
| E. Not in the MF list, not a company (ADIs, dissolved bodies, NGOs …) | 3,372 | 27.5 | 2.5% | 3.5% |
| **Total** | 17,357 | 1,098.3 | 100% | 712.2 bn RON |

- **Party coverage:** A alone is 26.6% (36.8%). A + B single-principal is **31.3% (44.1%)**, and adding dual-funded bodies gives 32.3% (45.6%).
- **The largest B bodies** are county and municipal emergency hospitals (Colțea under the Bucharest city hall, Târgoviște, Bihor, Galați and others under county councils), Bucharest sectors' property and street directorates, and county road directorates (`b_top.csv` output of the script).
- **Hospitals:**
  - 275 hospitals are local, with 34.5 bn RON;
  - 52 hospitals are central (their principal is a ministry, typically Health or Transport), with 12.4 bn RON.

  #131's name rule counted all hospitals as local. That is the main reason its "about 9.5%" estimate is higher than the 5.7% measured here.

### How often would the derivation be wrong?

| Error | Check | Result |
|---|---|---|
| Wrong UAT in the MF data | The subordinate body's county equals its elected-leader principal's county | 7,220 of 7,220; the 9 apparent misses are Ilfov bodies whose county council is listed with a Bucharest seat |
| Wrong UAT in the MF data | Random sample of 60 B authorities (seed 153), read by hand: name, locality and principal agree | 60 of 60 (95% upper bound about 5%) |
| Tie changed during the window | Same CUI in the 2018 and 2026 snapshots, elected-leader principal set compared | 8 of 6,687 changed (0.12%; 0.18% of their value), e.g. three Botoșani medico-social units moved from town to county; 5 more moved from a UAT to the ministry (county excellence centres, two school sports clubs) |
| Body absent from the list | SEAP authorities not in the MF list | Class E, 2.5% of value: intercommunity associations (ADIs), dissolved or not-yet-listed bodies. These get no Party, which is a miss rather than a wrong attribution |
| Meaning | Dual-funded bodies | For schools the UAT funds part of the budget and a ministry is the second principal, so "under the mayor" overstates the tie. Who appoints a school's director was not checked here (*unverified*) |

So the data error is well under 1% of attributed value. The remaining risk is what a reader takes "Party" to mean for a hospital or a school, which is a labelling decision.

### Municipal companies (shareholder UAT)

- **ONRC:** shareholders (asociați/acționari) are not in the open files and come only with paid RECOM access ([ONRC open-data research](https://github.com/george-vrancianu/grivei.ai/blob/research/onrc-open-data/docs/research/onrc-open-data.md)). No change.
- **AMEPIP:** the [January 2026 dataset](https://data.gov.ro/dataset/amepip-indicatori-financiari-nefinanciari-si-de-guvernanta-corporativa) has `company_id, cui, company, registration_number, CAEN, status, ticker_symbol, an` and ratios, but no tutelary authority. On amepip.gov.ro, "Autoritate publică tutelară" is only an enrolment form (`/formular-inrolare-apt/`). The board-selection announcements name the company but are not a table.
- **ANAF `forma_de_proprietate`** cannot tell a UAT from the state: it says `PROPR.DE STAT-SOCIETATE COMERCIALA` for both. It also gives `PROPR.PRIVATA-CAPITAL PRIVAT AUTOHTON` for RAJA SA, Compania Apa Brașov SA, CNI SA and Romtehnica SA, all of which are public. It is a registration-era code and is not usable.
- **Size:**
  - AMEPIP lists 661 enterprises that buy in SEAP;
  - the 610 whose name does not look national awarded 7.1% of value. That includes Energonuclear (15.9 bn RON, a Nuclearelectrica subsidiary), so the local share is nearer 5.6%;
  - the largest are regional water operators (Apavital, RAJA, CRAB Bacău, Hidro Prahova, Aquatim …) and Bucharest's STB and Termoenergetica (script `amepip_share.py`, a name rule, *estimate*).
- **Even with a shareholder table**, a regional operator is owned by many UATs through an ADI. Under ADR 0012 it has no single elected leader. Only single-owner companies (STB, Termoenergetica and many small town services) could be attributed, and only from paid ONRC data or each council's founding decisions.

## 2. Senators' birth dates

- **Where they are:** every profile (`https://www.senat.ro/FisaSenator.aspx?ParlamentarID=<guid>`) contains, below the photo:

  ```html
  <!--Data naşterii: dd.mm.yyyy
  <br />
  Locul naşterii: <county>-->
  ```

  Measured on all 134 profiles of the 2024–2028 legislature: 134 have a full `dd.mm.yyyy` date and a birthplace (a county), and **0 show either outside the comment**. A browser displays name, circumscription, election and validation dates and the parliamentary group, as #129 found. The "Biografie" tab is an ASP.NET postback. For the one senator tried it returned no birth date (`senat_bio.py`). The site's "Mențiune juridică" page loads by script and was not read (*unverified*: reuse terms).
- **Match with ONRC** (`senators_onrc.py`). Names are normalised as ADR 0011 says (word order, case, hyphens, diacritics), against 3.69 M legal-representative rows and 123 k family-business rows:

| | Senators |
|---|---:|
| With a full birth date on senat.ro | 134 |
| At least one ONRC namesake | 65 |
| **Name + birth date match** | **44** (33% of senators) |
| Namesake but no date match (name alone would link wrongly) | 21 (32% of namesake links) |
| Name held by ≥ 2 ONRC persons with different birth dates | 32 |
| Non-matches with a near-identical date (day/month swap or ±1 day) | 1 |

- **Reading:**
  - The 44 exact agreements show the Senate's dates are, in practice, correct. The single near miss bounds a typo rate at about 1 in 45.
  - The wrong-link rate of name alone (32%) is lower than #129's 78% for deputies, and so is the share of namesakes. Senators are fewer and older, and their names are less common (*unverified* explanation).
  - The 44 / 134 match share is much higher than deputies' 37 / 315. This was not investigated: the deputy figure came from #129's own run, and the two were not re-run on identical code.
  - Which matched senators hold roles in SEAP suppliers was not measured. It needs the ONRC registration number → CUI join through `OD_FIRME`.
- **Is it an "official publication"?** ADR 0011 requires the birth date to come from an official publication, and ADR 0011 shows only the birth year on a person page. The Senate serves the date to every visitor, but chose not to display it. Two readings follow:
  - it is published (it is in the public HTTP response from the official site);
  - it is withheld (a comment is a deliberate choice not to show it).

  That is a legal-posture question for the lawyer review that ADR 0009 already requires before Go-live. Alternatives are a Legea 544/2001 request to the Senate, or each senator's own CV or asset-declaration pages, which are behind postbacks and under ANI's limits ([#114](https://github.com/george-vrancianu/grivei.ai/issues/114)).

## 3. Recommendation

1. **Subordinate bodies:** amend ADR 0012 so that a Party also reaches an authority whose MF principal-credit-holder set contains exactly one UAT or county. The Party comes from that UAT's elected leader, for the same mandate dates.
   - **Basis on the authority page:** "subordinate to <UAT> (MF Lista entităților publice, principal credit holder, snapshot <date>)".
   - **Use the snapshot in force** for each refresh. Drift over eight years is 0.12%, and no 2019–2025 snapshots exist.
   - **Dual-funded bodies (schools, 1.0%):** exclude, or put behind a separate, labelled toggle. Their tie is budgetary and shared with a ministry.
   - **Municipal companies and ADIs:** exclude. There is no open owner table, and multi-UAT ownership has no single leader.
   - **Coverage note:** about 31% of awarded value (44% without the largest records), up from about 27% (37%).
2. **Senators:** put "is a commented-out birth date on senat.ro an official publication for ADR 0011?" on the lawyer-review list. If the answer is yes, a cached scrape of 134 pages per legislature confirms 44 current senators against ONRC. If no, senators stay unlinked role holders.

## Sources

- MF, Lista entităților publice, data.gov.ro [`listaentitatipublice`](https://data.gov.ro/dataset/listaentitatipublice): [01.11.2026 file](https://data.gov.ro/dataset/fcc5b78e-d0e0-4001-b84f-dded4c0dac53/resource/30a44a72-efdb-4e75-9fe9-b4b505b3497d/download/lista_ep_portal_01112026.xls) (as archived 2026-11-12), [01.04.2018 file](https://data.gov.ro/dataset/fcc5b78e-d0e0-4001-b84f-dded4c0dac53/resource/c0bfcca0-1abe-479e-a7a7-8ef9176cd159/download/listaepportal01042018.xls).
- Legea 273/2006 privind finanțele publice locale, art. 21, [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/269485).
- ANAF v9 VAT-register responses, Raw archive `anaf/vat/v9/` (2026-11-12).
- AMEPIP: [dataset, January 2026](https://data.gov.ro/dataset/amepip-indicatori-financiari-nefinanciari-si-de-guvernanta-corporativa); [amepip.gov.ro](https://amepip.gov.ro/) (menu "Autoritate publica tutelara" → `/formular-inrolare-apt/`).
- ONRC open data, [firme-04-11-2026](https://data.gov.ro/dataset/firme-04-11-2026): `OD_REPREZENTANTI_LEGALI.CSV`, `OD_REPREZENTANTI_IF.CSV`.
- Senate: [senator list](https://www.senat.ro/FisaSenatori.aspx) and the 134 linked `FisaSenator.aspx?ParlamentarID=…` profiles, fetched 2026-11-13.
- SEAP awarded value: local graph, `seap.rollup_entity` (generation `f3504d15`), read 2026-11-13.
- Earlier research: [#131 party of elected leaders](https://github.com/george-vrancianu/grivei.ai/blob/research/party-of-elected-leaders/docs/research/party-of-elected-leaders.md), [#129 officials in role](https://github.com/george-vrancianu/grivei.ai/blob/research/officials-in-role/docs/research/officials-in-role.md), [ONRC open data](https://github.com/george-vrancianu/grivei.ai/blob/research/onrc-open-data/docs/research/onrc-open-data.md).
