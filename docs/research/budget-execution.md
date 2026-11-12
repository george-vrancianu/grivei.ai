# Budget execution per institution (MF): access, granularity and Signals

Research for [#112](https://github.com/george-vrancianu/grivei.ai/issues/112) on the Source roadmap map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Checked on 2026-11-12. Anything not checked against a primary source is marked **(unverified)**.

## Summary

- **Per-institution execution exists, monthly, keyed by CUI, from January 2016.** MF's *Sistemul Național de Raportare* (Forexebug) publishes, for every public entity, cumulative year-to-date receipts and payments by funding source × functional (COFOG) code × economic code × budget programme. Formats are XML, XLSX and PDF. There are also approved budgets and budget commitments (*angajamente*) reports.
- **No bulk download.** The search portal has a CAPTCHA. Report files sit at static URLs on `static.anaf.ro`, but each URL ends in a per-file sequence number, so it can't be derived. The open-source Transparenta.eu (Hack for Facts) API already lists those URLs for 15,307 entities.
- **The `transparenta-bugetara.gov.ro` hostname no longer resolves.** The portal now lives on `extranet.anaf.mfinante.gov.ro`.
- **There are no people and no counterparties.** The data has classification lines only. The **Records** are not money flows to suppliers.
- **MF's data.gov.ro budget data is aggregate.** It covers the general consolidated budget, arrears by UAT and SOE indicators, and is mostly stale on data.gov.ro, though current on mfinante.gov.ro.
- **SOE reporting (staff, pay, arrears) survives only in aggregate form.** MF still posts the quarterly SOE indicators annex, as PDF, up to Q1 2026. The portal's "Rapoarte Întreprinderi Publice" tab is empty.
- **Recommendation: keep as a Reference source** for contracting authorities, not an explorable Source.

## Checklist

### 1. Access

**Forexebug public reports (the per-institution data).**

- Portal: <https://extranet.anaf.mfinante.gov.ro/anaf/extranet/EXECUTIEBUGETARA/>. It has four tabs: "Informații utile", "Rapoarte Entități Publice", "Alte Rapoarte" and "Rapoarte Întreprinderi Publice". The old hostname `transparenta-bugetara.gov.ro` fails DNS resolution (`curl: (6) Could not resolve host`, 2026-11-12), and the `www.` variant refuses connections.
- The search form (`Rapoarte_Forexe`, reached via the "Rapoarte Entități Publice" tab) offers eight report types:
  - *Bugetul individual al entităților raportoare*: the approved budget.
  - *Execuție - Angajamente bugetare*: commitments, aggregated at principal or secondary credit-holder level, or detailed.
  - *Execuție bugetară agregată la nivel de ordonator principal / secundar*.
  - *Execuție bugetară detaliată*.
  - *Fișa entității publice*.

  You can filter by year, 2016 to 2026; by month; by budget sector, from 01 State to 05 FNUASS; by county; and by principal or entity CIF. The form fields come from the live page, `idTipRaport`, `idLuna`, `idAn`, `idSectBug`, `idJudet`, `cuiOcp` and `codFiscal`, plus a `seccode` CAPTCHA field.
- MF's own user guide says a search needs at least one criterion **and the 5-character CAPTCHA**, and that results download as Excel, PDF or XML ([Instrucțiuni de utilizare, 2019](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/0a9fcce3-5b6e-4c13-9e11-cd34190bae9d/Instructiuni+de+utilizare+a+portalului+de+afisare+a+rapoartelor+2019.pdf?MOD=AJPERES)). Paging through results also needs the CAPTCHA again.
- **The files themselves are static and need no CAPTCHA.** One example: `https://static.anaf.ro/rapfxb/LOT733/20260731_FXB-EXB-900_TREZ002_4331031_4331031_02_127693489.xml` (Oraș Zlatna, detailed execution to 31 July 2026). It downloaded with HTTP 200 and is 144 KB.
  - The name pattern is `{period end}_{report code}_{treasury}_{principal CUI}_{entity CUI}_{sector}_{sequence}`. The sequence number is unique per file.
  - Directory listing is forbidden: `https://static.anaf.ro/rapfxb/LOT734/` returns 403.
  - The bugete-locale-romania project confirms that the URLs can't be derived. It notes that the search needs a CAPTCHA, that the LOT number is constant per period, and that the final sequence differs for every report ([docs/executie.md](https://github.com/danadrianparaschiv/bugete-locale-romania/blob/main/docs/executie.md)).
- **A discovery route without the CAPTCHA:** the public GraphQL API of Transparenta.eu, `https://api.transparenta.eu/graphql` ([server source, Apache-2.0](https://github.com/ClaudiuBogdan/hack-for-facts-eb-server)).
  - It returns every report's `download_links`, pointing at the original `static.anaf.ro` files, per CUI.
  - Checked: `entity(cui:"4331031"){reports{...download_links}}` returned 252 reports, from January 2016 to July 2026. `entities{pageInfo{totalCount}}` returned 15,307.
  - A Connector could use it only to *find* URLs and then fetch the originals into the Raw archive. That puts a dependency on a third party in the fetch path.
- Report structure: the XML schemas are FXB-EXB-900 (entity, detailed), -901 (principal aggregate), -905 (secondary aggregate), -902 and -903 (commitments). All are linked from the "Informații utile" tab ([FXB-900 structure](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/dd57bcbd-3b79-4d40-a1a9-e54c824898b9/Structura+fisier+XML+raport+FXB-900.pdf?MOD=AJPERES); [presentation of the report layout, 2024](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/ff1ec2dd-1766-4fce-9e52-0f8be59a96ff/prezentare_structura_rapoartelor_executie_bugetara_08.05.2024.pdf?MOD=AJPERES)).
- Public entity list: "Alte Rapoarte" holds `Lista_EP_portal_01112026.xls`, dated 01.11.2026, 4.0 MB, with 13,485 entities ([link](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/42c74184-c4b0-4beb-9076-7c3193eabdfb/Lista_EP_portal_01112026.xls?MOD=AJPERES)). This is the Lista entităților publice that is already a Reference source.

**MF aggregate publications.**

- MF's execution page has monthly general consolidated budget files to September 2026, in XLSX and PDF. It also has monthly arrears of the consolidated budget and monthly "plăți restante > 90 zile" per county/UAT (`Arieratejud_UAT_30092026.xls`), plus quarterly reports ([Informații execuție bugetară](https://mfinante.gov.ro/ro/domenii/bugetul-de-stat/informatii-executie-bugetara)). The listing was verified. Downloads from `mfinante.gov.ro/static/` were reset by the server, so the file contents are **(unverified)**.
- data.gov.ro, organisation `mfp`, has 109 datasets ([API](https://data.gov.ro/api/3/action/package_search?fq=organization:mfp&rows=200)). The budget-execution datasets there are aggregate and stopped in 2018: [executii-bugetare](https://data.gov.ro/dataset/executii-bugetare) and [executii-bugetare-lunare-2018](https://data.gov.ro/dataset/executii-bugetare-lunare-2018). [arierate](https://data.gov.ro/dataset/arierate) was last modified in 2020.
- Separately, about 65 data.gov.ro datasets matching "executie bugetara" are one-off uploads by individual institutions ([search](https://data.gov.ro/api/3/action/package_search?q=executie%20bugetara)). They are not a usable national source.

**Paid?** No; everything above is free.

### 2. Licence and reuse terms

- The ANAF portal footer says the site's content is ANAF's property and that unauthorised modification is an offence under Laws 8/1996 and 161/2003. It shows no open licence ([portal](https://extranet.anaf.mfinante.gov.ro/anaf/extranet/EXECUTIEBUGETARA/)). The reports are public-sector information published for transparency. Reuse would rest on the general public-sector-information reuse law (Law 179/2022, transposing Directive (EU) 2019/1024) **(unverified, needs legal confirmation in the legal-posture ticket)**.
- On data.gov.ro, MF datasets carry `uk-ogl` (older) or `CC-BY-4.0` (newer) ([API](https://data.gov.ro/api/3/action/package_search?fq=organization:mfp&rows=200)). This applies to the aggregates, not to the Forexebug per-entity files.
- Transparenta.eu's code is Apache-2.0 ([repo](https://github.com/ClaudiuBogdan/hack-for-facts-eb-server)). Terms for its API and data were not found **(unverified)**.

### 3. Join key

- **The CUI of the public entity.** It appears as `P_CUI`/`COD_FISCAL` in the XML ([FXB-900](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/dd57bcbd-3b79-4d40-a1a9-e54c824898b9/Structura+fisier+XML+raport+FXB-900.pdf?MOD=AJPERES)), together with the principal credit-holder's CUI. This is the same key SEAP uses for contracting authorities.
- The Lista entităților publice adds county, UAT, address, the principal credit-holder's CUI and a VAT CIF where one exists (columns read from the 01.11.2026 file). It already acts as the coverage denominator, so the join path into the graph exists today.
- Caveats:
  - Some SEAP buyers buy under a CUI that has no Forexebug report of its own. The spitale dashboard found 16 hospitals on the CNAS list with no execution of their own, including military, SRI and CF hospitals folded into other units ([spitale-executie-bugetara README](https://github.com/gh9rhdhz9t-spec/spitale-executie-bugetara)).
  - SEAP CUIs may carry an `RO` prefix and will need the usual normalisation.

### 4. People

- None. The rows are classification lines: funding source, COFOG code, economic code, programme, amount ([FXB-900](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/dd57bcbd-3b79-4d40-a1a9-e54c824898b9/Structura+fisier+XML+raport+FXB-900.pdf?MOD=AJPERES)). There is no counterparty, supplier or person field.
- Pay appears only as totals by economic code, for example 10.01.01 base salaries per institution. That is no person-level data.
- Note: Transparenta.eu has separately scraped leader names and parties into an `EntityProfile` ([schema](https://github.com/ClaudiuBogdan/hack-for-facts-eb-server/blob/main/src/modules/entity/shell/graphql/schema.ts)). That is not MF data and is out of scope here.

### 5. Money measure

- `RULAJ_CH_VN` is cumulative execution from 1 January to the end of the reporting month, in lei: receipts for revenue lines, payments for expense lines ([FXB-900](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/dd57bcbd-3b79-4d40-a1a9-e54c824898b9/Structura+fisier+XML+raport+FXB-900.pdf?MOD=AJPERES); [layout presentation](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/ff1ec2dd-1766-4fce-9e52-0f8be59a96ff/prezentare_structura_rapoartelor_executie_bugetara_08.05.2024.pdf?MOD=AJPERES)).
  - Monthly values are differences between consecutive months.
  - It splits by section F (operating) and D (development) for the local budget.
  - Sample: Zlatna, July 2026. The 316 lines were 222 F and 90 D.
- **It can be summed**, but it is cash paid by an institution, not value awarded to a counterparty. It can't feed the Money lens by supplier. It could colour authorities by spend, for example title 20 "goods and services" plus title 71 "non-financial assets". That would be a different measure from the SEAP Money lens and would need its own lens or entity-page panel.
- Commitments (*angajamente*) reports are a second measure, closer in spirit to contracts (FXB-902/903). Their content was not checked **(unverified)**.

### 6. Volume

Most of the sizes below are estimates.

| Item | Figure | Basis |
|---|---|---|
| Entities reporting | ~13.5k (MF list) / 15,307 (Transparenta.eu, incl. history) | Lista_EP 01.11.2026: 13,485 rows; API `totalCount` |
| Reports per entity | ~250 over 2016–2026 | Zlatna 252, MAI 270 (API) |
| Lines per detailed report | ~90 (a school) to ~320 (a town) | sampled XML: Liceul C. Medrea 90, Oraș Zlatna 316 |
| File size, detailed XML | ~50–150 KB | sampled: 53 KB, 144 KB; 2016 file 98 KB |
| Raw archive, all months, detailed XML only | ~13 GB/year, ~140 GB for 2016–2026 **(estimate)** | 13.5k × 12 × ~80 KB |
| Raw archive, December (year-end) only | ~1.1 GB/year, ~12 GB total **(estimate)** | 13.5k × ~80 KB |
| Postgres rows, year-end only | ~2M/year, ~20M total **(estimate)** | 13.5k × ~150 lines |
| Postgres rows, year-end plus November (for the spike Signal) | ~40M **(estimate)** | ×2 |

Recommendation for scope: fetch **November and December detailed (FXB-900) per year**, not every month. That covers year-end totals and the end-of-year spike, and keeps the archive near 25 GB.

### 7. History depth and update cadence

- Detailed and aggregated execution runs from **January 2016**. Checked: earliest report for both Oraș Zlatna and MAI is `2016 / Luna 01` (API), and the 2016 file is still served (`.../LOT62/20160131_FXB-EXB-900_..._1438146.xml`, HTTP 200). The portal's year selector also starts at 2016.
- Cadence is monthly, cumulative year to date ([user guide](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/0a9fcce3-5b6e-4c13-9e11-cd34190bae9d/Instructiuni+de+utilizare+a+portalului+de+afisare+a+rapoartelor+2019.pdf?MOD=AJPERES)).
- The latest period visible through Transparenta.eu on 2026-11-12 was July 2026, published as LOT733/734. Whether the portal itself already has August–September is **(unverified)**, because checking it needs the CAPTCHA.
- The MF aggregate general consolidated budget is published to 30.09.2026 ([MF](https://mfinante.gov.ro/ro/domenii/bugetul-de-stat/informatii-executie-bugetara)).

### 8. Data quality

- The portal itself warns that published reports are "într-un proces continuu de reconciliere" with what institutions report each quarter ([user guide](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/0a9fcce3-5b6e-4c13-9e11-cd34190bae9d/Instructiuni+de+utilizare+a+portalului+de+afisare+a+rapoartelor+2019.pdf?MOD=AJPERES)). So a period's figures can change after publication, and the Raw archive must keep each fetch dated.
- The Court of Accounts reported in 2025 that double reporting persists: MF still used the older Darsam system rather than Forexebug for 2023 annual balance sheets and the general budget account ([Agerpres, 2025-03-05](https://agerpres.ro/economic/2025/03/05/curtea-de-conturi-dubla-raportare-a-situatiilor-financiare-persista-in-evidentele-ministerului-finan--1427935)). Forexebug figures may therefore differ from official final accounts.
- Code quirks: Forexebug drops the budget suffix from functional and revenue codes and carries it in the funding-source column. For example, `510103` + source A means `51.02.01.03`. Some deep codes are missing from the classification annexes, under 0.5% of lines. Report totals should equal line sums within 0.1% ([bugete-locale-romania, docs/executie.md](https://github.com/danadrianparaschiv/bugete-locale-romania/blob/main/docs/executie.md)).
- The detailed report has two levels: `NIVEL` 1 is the total across programmes and 2 is per programme ([FXB-900](https://extranet.anaf.mfinante.gov.ro/anaf/wcm/connect/dd57bcbd-3b79-4d40-a1a9-e54c824898b9/Structura+fisier+XML+raport+FXB-900.pdf?MOD=AJPERES)). Summing both double-counts.
- The schema types `RULAJ_CH_VN` as `xs:float` (same source), so amounts must be parsed as decimals from the text.
- Coverage gaps: some institutions have no own report, such as military hospitals and units folded into a parent ([spitale-executie-bugetara](https://github.com/gh9rhdhz9t-spec/spitale-executie-bugetara)).

### 9. Candidate Signal rules

Neither rule was sized nationally; both need SEAP and Forexebug loaded side by side.

1. **SEAP awards exceed reported spending.** The rule: for a contracting authority (CUI) and year, the SEAP awarded value exceeds the year's payments on title 20 (goods and services) plus title 71 (non-financial assets) by a wide margin. Sources: SEAP and budget execution.
   - Caveats that will inflate the firing rate:
     - SEAP values are contract or framework totals, often multi-year and without VAT. Payments are cash in one year, with VAT.
     - A purchase can be paid by a different CUI, such as a principal paying for a school.
     - Framework agreements carry maxima, not spend.
   - A narrower variant is likely to fire less spuriously: direct purchases and single-year contracts only, against title 20.
2. **End-of-year spending spike.** The rule: the December payment on title 20 or 71 (December minus November year-to-date) is more than *k* times the authority's average monthly payment over January–November. Source: budget execution alone, plus SEAP for the "and these are the contracts" drill-down.
   - The national firing rate depends on *k*. Year-end concentration of capital spending is common in Romanian local budgets, so a plain ratio will fire widely **(unverified)**.
   - Comparing an authority with its own prior years is a candidate refinement.

### 10. Who already uses it

- **Transparenta.eu (Hack for Facts).** It ingests Forexebug execution for 13,000+ institutions into Postgres, partitioned by year and report type. It offers a public GraphQL API with per-capita and inflation normalisation, and UAT/county heatmaps ([server README](https://github.com/ClaudiuBogdan/hack-for-facts-eb-server); [technical reference](https://github.com/ClaudiuBogdan/hack-for-facts-eb-server/blob/main/docs/TECHNICAL-REFERENCE.md)). It is the obvious prior art and a possible discovery path for file URLs.
- **bugete-locale-romania.** It compares approved budgets (extracted from PDFs) with Forexebug FXB-EXB-901 execution for cities. Report fetching is manual because of the CAPTCHA ([docs/executie.md](https://github.com/danadrianparaschiv/bugete-locale-romania/blob/main/docs/executie.md)).
- **spitale-executie-bugetara.** A dashboard of 356 public hospitals, 2016–2025, built from the Transparenta.eu API. It found wide variation in bonus-to-base-salary ratios, by economic codes 10.01.05/10.01.06 against 10.01.01 ([README](https://github.com/gh9rhdhz9t-spec/spitale-executie-bugetara)).
- **Funky Citizens.** Its municipal budget-transparency rankings collect data by hand from city-hall websites, not from Forexebug ([2024 report](https://funky.ong/wp-content/uploads/2024/04/Transparenta-bugetelor-de-municipii-2024-Funky-Citizens.pdf)).
- I found no use by Expert Forum or OpenTender **(unverified, not searched exhaustively)**.

### SOE reporting (staff, pay, arrears): still published?

- **The quarterly SOE indicators annex is still published.** Its full title is *Situaţia trimestrială a principalilor indicatori economico-financiari realizaţi de operatorii economici la care statul sau UAT-urile sunt acţionari unici ori majoritari*. It is a PDF from 2023 on, earlier XLS, and runs from 2014 to **Q1 2026** (`AnexatrimI2026rom.pdf`) ([MF, Indicatori întreprinderi publice](https://mfinante.gov.ro/ro/domenii/buget/indicatori-intreprinderi-publice)).
  - The file couldn't be opened, because the MF static server reset the connection. Its per-company granularity is therefore **(unverified)**.
  - The older 2017 XLS copy on data.gov.ro is 47 KB, which suggests aggregate tables rather than a per-company list ([data.gov.ro/intreprinderi](https://data.gov.ro/dataset/intreprinderi)). That copy is also corrupted by double encoding.
  - The data.gov.ro mirror stopped in 2021.
- The portal's "Rapoarte Întreprinderi Publice" tab renders an unconfigured portlet ("Vă rugăm editaţi setările comune") with no reports ([tab](https://extranet.anaf.mfinante.gov.ro/anaf/extranet/EXECUTIEBUGETARA/?uri=nm:oid:Z6_G8H019S0J8HP80Q7TST6UV2006)).
- The list of SOEs monitored by MF on data.gov.ro dates from 04.10.2022 ([dataset](https://data.gov.ro/dataset/lista-intreprinderilor-publice-ip-monitorizate-la-nivelul-mf)).
- Public-sector headcount by posts ([numar-salariati-bugetari](https://data.gov.ro/dataset/numar-salariati-bugetari)) stops at August 2018 on data.gov.ro.
- Conclusion: per-SOE staff, pay and arrears are **not** available as a current open dataset from MF. Company financial statements (`situatii_financiare_*` on data.gov.ro, through 2025) are a separate, ANAF-side Source.

### 11. Recommendation

**Keep, as a Reference source for contracting authorities. Not an explorable Source.**

Reasons:

- **It joins cleanly.** The join is on the authority CUI, the same CUI SEAP uses, and the Lista entităților publice that already serves as a Reference source is its own entity register.
- **It isn't a Source of Records.** It has no counterparties and no people, and its money is an institution's cash by budget classification. It can't feed the Relationships tab, the Flow lens or the Money lens by supplier.
- **Its value is context and Signals on authority pages:** what the authority actually spent on goods, services and investment each year, and its year-end concentration. That context also feeds the two cross-Source Signal candidates above.
- **Access is the cost driver.** There is no bulk download, and the portal search has a CAPTCHA, which we should not automate around. Static file URLs can be found only through a third party (Transparenta.eu) or by hand. The Release that brings this in must either accept Transparenta.eu as a URL index, verifying every file against `static.anaf.ro`, or ask MF for a bulk export.
- **Scope it narrowly:** FXB-EXB-900 detailed, November and December of each year from 2016. Revisit the commitments reports later.
- **Drop the SOE angle from this dossier.** The MF publications are aggregate PDFs; per-company figures belong with company financial statements.
