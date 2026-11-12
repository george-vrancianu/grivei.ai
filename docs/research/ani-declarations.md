# ANI asset and interest declarations

Research for [#114](https://github.com/george-vrancianu/grivei.ai/issues/114), part of the Source roadmap map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108).
Researched 2026-11-12.

**Question.** How can ANI's asset and interest declarations (declarații de avere și de interese) be obtained and parsed? What do they hold, how many are there, and on what terms can they be reused? Which Signals could they support, and what could an institution-only use (no person entities) show?

**Method.** I read the portal's front-end code and called its unauthenticated field endpoints. I ran a handful of institution searches on the old portal and downloaded four sample PDFs into `/tmp`, looking only at their structure. I read the consolidated Law 176/2010 and the operative part of CCR Decision 297/2025. Press is cited only where no primary text was reachable, and it is marked as such. No declarant's personal data is recorded here.

## Answer in brief

- **The legal ground moved under this Source.** CCR Decision 297/2025 (29 May 2025) declared publication of declarations unconstitutional, both on institutions' sites (art. 6(1)(d)) and on ANI's site (art. 12(6)) ([decision PDF](https://www.ccr.ro/wp-content/uploads/2025/06/Decizie_297_2025.pdf)). Law 180/2026, in force since 31 August 2026, keeps full declarations confidential at ANI. For some categories it publishes only an auto-generated *declarație de interese financiare* with **value bands**, on ANI's site ([juridice.ro](https://www.juridice.ro/841680/legea-nr-180-2026-privind-integritatea.html); final text not verified).
- **What is still online is an archive.** It is not a feed. The old portal serves about **12.0 M declarations** (2008 to about 2023) as PDFs. Its search needs no captcha, but it caps every query at 10,000 results. The new portal requires a Cloudflare Turnstile captcha for every search and every download.
- **The format is mostly PDF.** Paper-era declarations are **image scans with no text layer** (a 2015 sample: 1.6 MB, two pages). e-DAI-era declarations (2022 onwards) are generated PDFs with a text layer (2023 samples: 37–57 KB). There is no structured or bulk dataset, and I found none on data.gov.ro.
- **There is no join key.** Institutions and companies appear as free-text names and addresses, with no CUI anywhere on the interest declaration form ([Law 176/2010, Annex 2](https://www.ubbcluj.ro/ro/infoubb/documente_publice/declaratiiavere/Legea_nr_176_2010_2026.pdf)).
- **Both candidate Signals need person entities,** so they sit behind the people gate. ANI already runs the first one itself (councillors' firms contracting with their own UAT) ([TVR Info](https://tvrinfo.ro/ani-problemele-de-integritate-depistate-cu-ajutorul-solutiilor-informatice-pe-baza-declaratiilor-de-avere-si-de-interese/), secondary).
- **Recommendation: drop as an explorable Source for now.** At most, revisit the Law 180/2026 financial-interest declarations once they are published and their form is known (§11).

## 1. Access

| Channel | What | Access | Verified |
|---|---|---|---|
| `old-declaratii.integritate.eu` | ICEfaces/JSF search over "12 028 815" declarations, "din anii 2008 - 2022" ([home](https://old-declaratii.integritate.eu/)). Searches by name or institution; advanced search by year, institution and county ([statistics](https://old-declaratii.integritate.eu/statistics.html)) | No captcha. A JSF partial-AJAX POST to `/search.html` returns an HTML results table, and each row links to `DownloadServlet?fileName=…&uniqueIdentifier=…` (PDF). Any query above **10,000 results** is refused ("Căutarea întoarce mai mult de 10 000 de rezultate") | Probed 2026-11-12 |
| `declaratii.integritate.eu` | Angular app over `https://declaratii.integritate.eu/api`. The search is `POST /search/searchdecl` with name, institution, function, county, locality, type (`DA`/`DI`) and date range. The download is `POST /search/downloadDecl/{id}`. Result columns: `fullName, institutie, functie, localitate, judet, dataCompletare, tipDeclaratie` ([portal](https://declaratii.integritate.eu/), `main.js`) | Every search and every download carries a **Cloudflare Turnstile** token (site key in `main.js`). Without one, search returns HTTP 500. The lookups `GET /fields/organizations` (11,700 institutions, `{id, numeOrganizatie}`, no CUI), `/fields/functii` (1,109 function names) and `/fields/judete` are open | Probed 2026-11-12. The new portal's date coverage is **not verified** |
| e-DAI | Filing platform; the only filing channel since 2022 ([Law 176/2010 art. 5(2)](https://www.ubbcluj.ro/ro/infoubb/documente_publice/declaratiiavere/Legea_nr_176_2010_2026.pdf); [Agerpres, 2022](https://agerpres.ro/justitie/2022/04/08/ani-15-iunie---data-limita-pentru-depunerea-declaratiilor-de-avere-si-interese-doar-pe-cale-electron--899386)) | Filers and responsible officers only | n/a |
| Institutions' own sites | Formerly had to post declarations under art. 6(1)(d), which CCR 297/2025 struck down ([decision](https://www.ccr.ro/wp-content/uploads/2025/06/Decizie_297_2025.pdf)) | Scattered, no longer mandatory | Not probed |
| Bulk / API / data.gov.ro | None found | n/a | Searched, none |

**Harvest cost.** Coverage of the old portal is only reachable by query, not by listing. Institution queries must be narrow: "Comuna Budila" returned 157 declarations, "Municipiul Brasov" only 2, and "Consiliul Judetean Brasov" more than 10,000. The institution text does not match consistently (see §8). Bypassing the new portal's captcha is out of the question.

In May 2025, ANI blocked the old portal for a while after "peste 10 milioane de interogări" (more than 10 million queries) and a backup attempt by Code for Romania ([Digi24](https://www.digi24.ro/stiri/ani-anunta-restabilirea-functionalitatii-portalului-pentru-declaratii-de-avere-si-de-interese-3266869); [G4Media](https://www.g4media.ro/code-for-romania-sustine-ca-agentia-nationala-de-integritate-a-taiat-accesul-la-baza-de-date-cu-declaratiile-de-avere-din-perioada-2008-2022.html)). Bulk harvesting draws attention and may be throttled.

## 2. Licence and reuse terms

- **No licence is stated.** ANI's terms of use name no licence and say nothing about reuse or automated access ([conditii de utilizare](https://integritate.eu/conditii-de-utilizare-2/)).
- **Publication itself is now unconstitutional.** CCR 297/2025 held that publishing declarations on ANI's and institutions' sites breaches the right to private life. It struck down art. 6(1)(d) and art. 12(6) of Law 176/2010 ([decision, operative part](https://www.ccr.ro/wp-content/uploads/2025/06/Decizie_297_2025.pdf); [FRA summary](https://fra.europa.eu/en/node/49452)).
- **Effect on the archive.** The decision is reported to act only for the future, so declarations already published are not touched ([Euronews](https://www.euronews.ro/articole/ccr-a-decis-ca-declaratiile-de-avere-nu-trebuie-sa-includa-bunurile-si-veniturilo), secondary). Even so, the old documents still contain names and other personal data, and re-publishing them would run against the decision's reasoning.
- **The new regime.** Law 180/2026 (Monitorul Oficial no. 725, 28 August 2026; in force 31 August 2026) works as follows ([juridice.ro](https://www.juridice.ro/841680/legea-nr-180-2026-privind-integritatea.html); [economedia](https://economedia.ro/noua-lege-a-integritatii-votata-de-deputati-se-elimina-publicarea-integrala-a-declaratiilor-de-avere-si-apare-declararea-intereselor-financiare-ce-date-ale-demnitarilor-raman-ascu.html), secondary):
  - full declarations stay confidential at ANI for 7 years;
  - for some categories of officials, e-DAI generates a *declarație de interese financiare* in value bands, published "exclusiv pe pagina de internet a Agenției" (only on ANI's website) within 60 days.

  **Not verified:** the final article text, the categories covered, the bands, and what CCR 883/2026 struck out of the bill before promulgation ([juridice.ro on CCR 883/2026](https://www.juridice.ro/844311/obiectie-de-neconstitutionalitate-partial-admisa-privind-noua-lege-a-integritatii.html)).
- **Recipe consequence.** Any use of this Source needs the legal posture to be settled first. That is a Go-live matter, beyond the people gate.

## 3. Join key into the graph

- **Declarant's institution:** a free-text name from ANI's list of 11,700 organisations. It has no CUI and no SIRUTA code (`/api/fields/organizations`). It would need mapping onto SEAP authority CUIs by name, county and locality: a new matching problem, with the ambiguity ADR 0003 rejects for suppliers.
- **Companies in the interest declaration (section 1: shareholdings; section 2: board roles):** "Unitatea – denumirea şi adresa" (the entity's name and address). **There is no CUI field** ([Law 176/2010, Annex 2](https://www.ubbcluj.ro/ro/infoubb/documente_publice/declaratiiavere/Legea_nr_176_2010_2026.pdf)). A name and address could be matched to an ANAF-confirmed CUI only with a probability attached, which ADR 0003 forbids as a merge key.
- **Contracts with the state (section 5):** the contracting institution is also given as name and address only.
- **People:** a name only. The CNP is masked in the published PDFs (observed as asterisks, consistent with art. 6(1)(d), [law](https://www.ubbcluj.ro/ro/infoubb/documente_publice/declaratiiavere/Legea_nr_176_2010_2026.pdf)) and must never be stored anyway (ADR 0003).

## 4. People

**Every declaration has a person as its subject**, so the Source falls under the recipe's §3 people gate in full. The fields come from the law's annexes ([Law 176/2010, Annexes 1–2](https://www.ubbcluj.ro/ro/infoubb/documente_publice/declaratiiavere/Legea_nr_176_2010_2026.pdf)).

- **Header (both declarations):** declarant name, function, institution, CNP (masked when published), domicile (masked except the locality), date of completion.
- **Asset declaration (DA):** land and buildings, vehicles, valuables, financial assets, debts, gifts, income (for the declarant and, before CCR 297/2025, the family).
- **Interest declaration (DI):**
  1. Shareholder or associate in companies, credit institutions, economic interest groups and NGOs: entity name and address, role, number of shares, total value.
  2. Membership of management or control bodies of companies, regies, national companies and NGOs: entity, role, value of benefits.
  3. Professional associations and unions.
  4. Political party roles.
  5. **Contracts financed from state, local or external funds, or with state-owned companies**, held by the declarant, spouse, first-degree relatives or their firms. Columns: beneficiary, contracting institution, award procedure, contract type, date, duration, **total value**. Firms where the family holds under 5% of a joint-stock company are exempt.

Third parties (spouse, relatives, partner firms) appear inside the documents. CCR 297/2025 removed the obligation to declare the spouse's and adult children's assets ([decision, point 1](https://www.ccr.ro/wp-content/uploads/2025/06/Decizie_297_2025.pdf)).

## 5. Money measure

- **DI section 5 "Valoarea totală a contractului"** (total contract value) is a declared figure, in a currency the filer chooses. It overlaps SEAP's awarded value for the same contracts and also covers non-procurement contracts (grants, legal assistance, civil contracts). It must **never be summed** next to SEAP's Awarded value. At most it could be shown as a declared figure on a match.
- **DI section 1 share values and DA incomes** are private money, not public money. There is no Money lens use.
- Under Law 180/2026, the published financial-interest declarations carry **bands, not amounts** ([juridice.ro](https://www.juridice.ro/841680/legea-nr-180-2026-privind-integritatea.html), not verified).

## 6. Volume

| Measure | Figure | Source |
|---|---|---|
| Declarations on the old portal | 12,028,815 (DA + DI) | [old-declaratii home](https://old-declaratii.integritate.eu/), read 2026-11-12 |
| Filed in 2025 | 846,719 declarations by 355,378 unique filers | ANI annual report, via [economica.net](https://www.economica.net/peste-840-000-de-declaratii-de-avere-si-interese-au-fost-depuse-la-ani-in-2025-primul-an-in-care-nu-mai-sunt-publice_919616.html) (secondary) |
| Institutions in the new portal's list | 11,700 | `GET /api/fields/organizations` |
| Function names | 1,109 | `GET /api/fields/functii` |
| One small commune (old portal, institution "Comuna Budila") | 157 declarations | Probe 2026-11-12 |
| Sample PDF sizes | Scan (2015): 1.6 MB for 2 pages. e-DAI (2023): 37–57 KB for 2–5 pages | Four samples, 2026-11-12 |

**Rough sizes (estimates, not measured).**

- **Full archive:** 12 M documents at an assumed 0.1–1 MB each (between the e-DAI and scan sizes) is roughly **1–10 TB** of Raw archive. That is out of proportion to the project.
- **Interest declarations only:** about half the stock, going by the 2023 sample mix and the 2025 filing pattern (**an assumption**).
- **Scoped harvest:** interest declarations of the people at SEAP contracting authorities for 2021–2025 would be in the low hundreds of thousands of documents, or tens to low hundreds of GB.
- **Postgres:** parsed rows from DI sections 1 and 5 would be small, likely under 1 GB.

## 7. History depth and update cadence

- **Depth:** 2008 onwards on the old portal. The banner says 2008–2022, but the probes returned rows dated 2023 ([old-declaratii](https://old-declaratii.integritate.eu/)). The new portal's coverage (2022/2023 up to May 2025) is **not verified**.
- **Cadence until 2025:** annually by 15 June, plus within 30 days of appointment and of leaving office (art. 4, [law](https://www.ubbcluj.ro/ro/infoubb/documente_publice/declaratiiavere/Legea_nr_176_2010_2026.pdf)). Institutions had to publish within 30 days of filing (art. 6(1)(d), now void).
- **After 29 May 2025:** new declarations are not published ([economica.net](https://www.economica.net/peste-840-000-de-declaratii-de-avere-si-interese-au-fost-depuse-la-ani-in-2025-primul-an-in-care-nu-mai-sunt-publice_919616.html)).
- **From Law 180/2026:** financial-interest declarations are published within 60 days of generation. New declaration forms apply from 1 January 2027 (reported, [economedia](https://economedia.ro/noua-lege-a-integritatii-votata-de-deputati-se-elimina-publicarea-integrala-a-declaratiilor-de-avere-si-apare-declararea-intereselor-financiare-ce-date-ale-demnitarilor-raman-ascu.html); not verified).
- **The live feed of full declarations has stopped,** so the explorable history is frozen at about mid-2025.

## 8. Data quality

- **Scans:** paper-era declarations (until 2021) are image-only PDFs. Using them needs OCR of handwriting and table forms, which is error-prone. The 2015 sample has no text layer, and its producer is "Star Storage".
- **e-DAI PDFs:** these are generated (`iText` producer) with a text layer, but they are laid-out PDFs, not structured data. Table rows have to be reconstructed. The same form in Romanian has changed through amendments (Annex 2 point 5 was amended by Law 116/2013, [law](https://www.ubbcluj.ro/ro/infoubb/documente_publice/declaratiiavere/Legea_nr_176_2010_2026.pdf)).
- **Institution names do not match consistently.** "Comuna Budila" returned 157 documents, "Primaria Budila" none, and "Municipiul Brasov" only 2. The institution field is free text as filed.
- **No CUI** for companies or institutions (§3). Free-text company names and addresses come with typos and legal-form variants.
- **Rectifications** (art. 7) produce several versions of one declaration. The "tip declaratie" and date fields do not mark which version is final (**not verified**).
- **Section 5 is under-reported.** ANI has found councillors whose interest declarations left out contracts ([Știri pe surse](https://www.stiripesurse.ro/ani-a-prins-inca-un-lot-de-alesi-locali-in-conflict-de-interese-18-dintr-o-lovitura_1163528.html), secondary).

## 9. Candidate Signal rules

Both need person entities, so both are gated. Neither can be sized nationally without parsing the DI corpus.

1. **Declared shareholding in a SEAP supplier of the same institution.**
   - **Rule:** a declarant's DI section 1 or 2 names a firm that wins SEAP records from the institution the declarant serves.
   - **Sources:** ANI DI, SEAP and ANAF (to turn the firm's name and address into a CUI).
   - **Reference rate:** ANI ran the councillor version (Law 161/2003 art. 90) itself in 2025. Risk screening flagged 57 councillors from over 300 declarations, and 3 incompatibility cases were confirmed, with contracts above 1 M lei in total ([TVR Info](https://tvrinfo.ro/ani-problemele-de-integritate-depistate-cu-ajutorul-solutiilor-informatice-pe-baza-declaratiilor-de-avere-si-de-interese/), secondary). The national firing rate is unknown.
   - **Overlap:** an ONRC shareholder and administrator Source plus a list of office holders would cover the same link with a CUI join key (ONRC is a separate ticket).
2. **A contract declared with the state is not visible in SEAP.**
   - **Rule:** a DI section 5 contract (institution, beneficiary, date, value) has no matching SEAP record.
   - **Sources:** ANI DI and SEAP.
   - **Expected noise:** high. Section 5 includes grants, legal-assistance and civil contracts that never go through SEAP, and both sides are joined by name. The firing rate is unknown and would be dominated by false positives unless the contract type is filtered.

## 10. Who already uses it

- **ANI itself.** It runs automated risk screening of declarations against the councillor-incompatibility rule ([TVR Info](https://tvrinfo.ro/ani-problemele-de-integritate-depistate-cu-ajutorul-solutiilor-informatice-pe-baza-declaratiilor-de-avere-si-de-interese/), secondary). It also runs PREVENT checks on procurement procedures before award; 2025 produced 15 integrity warnings over procedures worth 241.8 M lei ([economica.net](https://www.economica.net/peste-840-000-de-declaratii-de-avere-si-interese-au-fost-depuse-la-ani-in-2025-primul-an-in-care-nu-mai-sunt-publice_919616.html)).
- **Code for Romania with În Primul Rând.** They started backing up the archive on 29 May 2025 and called for volunteers to digitise it ([G4Media](https://www.g4media.ro/code-for-romania-sustine-ca-agentia-nationala-de-integritate-a-taiat-accesul-la-baza-de-date-cu-declaratiile-de-avere-din-perioada-2008-2022.html)). Their repo [code4romania/declaratii-avere](https://github.com/code4romania/declaratii-avere) was created 2025-06-03, is MPL-2.0 and was last pushed 2026-11-01. Its README is still a template, so what it holds is **not verified**. An earlier crowdsourced transcription effort is [code4romania/asset-declarations](https://github.com/code4romania/asset-declarations) (Moonsheep).
- **Expert Forum.** Its local-infrastructure procurement reports link winners to politically connected people using SEAP and data.gov.ro ([Profit.ro](https://profit.ro/stiri/raport-efor-peste-50-din-contractele-pentru-infrastructura-locala-sunt-castigate-de-firme-cu-probleme-penale-16073334), secondary). I found no EFOR dataset of parsed declarations.
- **Journalists** use single declarations case by case. I found no published systematic dataset.

## 11. Recommendation

**Drop as an explorable Source for now; do not build a Connector.**

**Reasons:**
- Publication is unconstitutional since May 2025, and full declarations are confidential under Law 180/2026 (§2).
- The remaining archive has no licence, no bulk access, and no join key (§1, §3).
- It is mostly OCR-grade scans at terabyte scale (§6, §8).
- Every useful field is about a named person, so the people gate stays shut, and the legal posture is now worse than "gated" (§4).

**Revisit when the financial-interest declarations under Law 180/2026 appear on ANI's site.** Check their format (structured or PDF), coverage (which categories), terms, and whether they carry company identifiers. If they are structured and name firms, they could become a person-subject Source once the entity-linking policy lands. Until then, the shareholding Signal is better pursued through ONRC with a CUI join.

**Institution-only use (no person entities).**

- *What it could show:*
  - Per institution and year, how many asset and interest declarations were filed and published, from the old portal's institution search (counts only, no names). This is a weak "transparency compliance" figure on the authority's page.
  - With parsing, counts of declared section 5 contracts naming the institution as the contracting party. These would be aggregated, but deriving them still means processing personal data.
- *What it could not show:*
  - Who holds what, or any conflict-of-interest link. Every Signal above is person-mediated.
  - Anything after May 2025.
  - A reliable join. Institution names are free text without CUI, and the matching is visibly inconsistent (§8).
- *Verdict on the middle path:* it costs a name-matching layer and a harvest to produce a count of little explanatory value. Not worth it.

**Repo note.** `site/CLAUDE.md` lists ANI as "in progress" and mentions a `004_ani.sql`, but no ANI code or SQL exists in the repo (`watchdog/sql/` holds `001`–`003` only). The landing-page status may need correcting once the map decides.
