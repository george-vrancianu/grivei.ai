# Insolvency bulletin (BPI): access, CUI coverage and Signals

Research for [#126](https://github.com/george-vrancianu/grivei.ai/issues/126), part of the Source roadmap map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108).
Researched 2026-11-12.

**Question.** What does the Buletinul Procedurilor de Insolvență (BPI, published by ONRC) offer? It carries insolvency, reorganisation, bankruptcy and closure notices. What are its access terms (free or paid, bulk, API), history and volume, and how is it keyed (CUI)? How does it relate to the company-state fields in ONRC's open data? Answer the map's 11-point Source checklist, and size two candidate Signals: a supplier winning SEAP contracts while in insolvency, and an authority awarding to a firm whose earlier contract ended in its insolvency.

**Method.**
- Read BPI's official information site [bpi.ro](https://www.bpi.ro/) (ONRC), its tariff, services and statistics pages, and its GDPR note.
- Read Law 85/2014 (consolidated, [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/159286)), Law 98/2016 art. 167 ([legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/178667)), the e-Justice page on the Romanian register, and Regulation (EU) 2015/848.
- Downloaded BPI's 2025 statistics PDFs, ONRC's monthly "profesioniști intrați în insolvență" spreadsheet, and the ONRC open-data company-state file (`OD_STARE_FIRMA.CSV`, snapshot of 04.11.2026) with its nomenclature. Counted these locally. No individual's data is recorded here.
- Could not do: the BPI content itself sits on [myportal.onrc.ro](https://myportal.onrc.ro/), an Angular single-page app behind a user account. I did not create an account, so the shape of a BPI record and the free "Persoane publicate în BPI" search were not seen first-hand. They are described from ONRC and e-Justice text.

## Answer in brief

- **No free bulk, no API, no open licence.** The full bulletin is a paid, single-user subscription on myportal.onrc.ro (949.95 lei/yr). A free per-debtor lookup ("Persoane publicate în BPI") needs a free account and is a web form only. ONRC sells paid extracts: a list of debtors by criterion, with name, registration number and CUI, costs 3 lei per criterion per debtor, discounted 80% above 1,000 debtors.
- **Keyed by CUI and trade-register number.** Debtors are searchable by fiscal code (CUI), trade-register number, name, case number and court. Regulation 2015/848 makes the core facts (opening date, court, type of proceedings, debtor, practitioner) free of charge through the EU e-Justice interconnection, but only per search.
- **History back to 1 Aug 2006, issued daily.** In 2025 it had 29,102 issues, 540,067 pages and 356,226 published acts. About 6,800 professionals enter insolvency each year: 4,561 in Jan–Aug 2025 (ONRC).
- **People:** the legal-persons section holds sole traders (PFA/II) identified by CNP. A separate section (since 2018) holds natural persons under Law 151/2015, with CNP and address. Both are out of scope under ADR 0003 and the people gate.
- **Money:** creditor claim tables (24,199 in 2025) and distribution plans carry amounts, but only inside the paid full text. No summable measure is in reach.
- **ONRC open data already carries the status.** The free CC-BY-4.0 company-state file has codes for insolvență, faliment and reorganizare judiciară. In the 04.11.2026 snapshot, 22,342 registrations held at least one of these. That is the cheap route to the insolvency Signal. It overlaps with ONRC research #109.
- **Recommendation: drop BPI as a Connector.** Take insolvency status from ONRC open data, as a Reference source (#109). Cite BPI and e-Justice as the place to verify. Consider a one-off paid BPI extract of opening dates by CUI only if the snapshot diffs prove too coarse. Details in §11.

## 1. Access

| Channel | What | Access | Verified |
|---|---|---|---|
| [bpi.ro](https://www.bpi.ro/) | Information site: law, tariffs, statistics, forms | Free, no account | Yes, read 2026-11-12 |
| [myportal.onrc.ro](https://myportal.onrc.ro/), "Buletinul Insolvenţei online" | Full bulletin: every published act, searchable | **Paid subscription**, one user per subscription, needs an account | Terms read on [bpi.ro p.56](https://www.bpi.ro/?page_id=56). Service not used |
| myportal.onrc.ro, "Persoane publicate în BPI" | Per-debtor index: whether a debtor is in proceedings, closed, or has a pending insolvency file | Free, needs a free account ([bpi.ro p.38](https://www.bpi.ro/?page_id=38)) | Described only |
| myportal.onrc.ro, "Sumar număr BPI" | Table of contents of one issue | Free, needs an account ([bpi.ro home](https://www.bpi.ro/)) | Described only |
| ONRC paid information services | Certificates, debtor history reports, **lists of debtors by criterion**, statistical extracts | Paid, by online order or email to `furnizare.bpi@onrc.ro` ([bpi.ro p.56](https://www.bpi.ro/?page_id=56)) | Terms read |
| [e-Justice insolvency registers search](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_en) | EU interconnection (IRI): the core facts of Romanian proceedings | Free, interactive search | Page read. Search not run |
| [data.gov.ro, ONRC](https://data.gov.ro/organization/onrc) | Company register incl. **current company state** | Free bulk CSV, CC-BY-4.0 | Yes, downloaded (see §6, §8) |

- **Since the 2014 reform, BPI is only on the ONRC portal.** "Serviciile BPI … sunt disponibile doar pe portalul de servicii online al ONRC … trebuie să dețineți un cont de utilizator" ([bpi.ro](https://www.bpi.ro/)).
- **Subscription terms.** The subscription covers only issues published during the paid period ("Veţi avea acces doar la buletinele publicate în perioada … de abonament"). It is single-user: "Abonamentul este monopost" ([bpi.ro p.56](https://www.bpi.ro/?page_id=56)). So a subscription bought today does not open the back issues.
- **No API, bulk download or data feed** is mentioned by ONRC or by the [e-Justice page](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_en). The portal is an Angular SPA (shell fetched 2026-11-12). It must call some JSON backend, but scraping a paid, single-user service is not a route we should take. Not explored.
- **No BPI dataset on data.gov.ro.** A search for "insolventa" returns only MF debt datasets ([CKAN search](https://data.gov.ro/api/3/action/package_search?q=insolventa)).

**Prices** (government-set, [bpi.ro p.47](https://www.bpi.ro/?page_id=47), VAT included):

- Subscription to the electronic bulletin: 949.95 lei/yr, 237.49 lei/quarter, 79.16 lei/month.
- Certificate of whether an act is published, or a debtor's history report: 30 lei.
- **"Date statistice şi informaţii pentru serii de debitori grupate în funcţie de un criteriu": 3 lei/criterion/debtor.** Discounts: 30% for 11–100 debtors, 60% for 101–1,000, 80% above 1,000. The output identifies each legal-person debtor by "denumire, număr de înregistrare …, cod unic de înregistrare fiscală, sediul social". For natural persons the output is name and county or locality.
  - So a list of, say, 30,000 debtors with one criterion (for example opening date) would cost about 0.60 lei × 30,000 ≈ **18,000 lei**. This is my arithmetic from the tariff and has not been quoted by ONRC.
- Specialised statistical work (Order 1877/C/2017): 5 lei/firm/selection type, discounted 60% above 10,000 firms.

## 2. Licence and reuse terms

- **No open licence.** BPI is a priced publication ("Comercializarea Buletinului Procedurilor de Insolvenţă se derulează prin sistemul abonamentelor", [bpi.ro p.38](https://www.bpi.ro/?page_id=38)). Prices are set by HG 124/2007 and Order 1878/C/2017 ([GDPR note](https://www.onrc.ro/documente/date%20cu%20caracter%20personal/3.2.%20NOTA%20INFORMARE%20BPI%20RGPD.docx)).
- **Reuse terms of subscription or extract content: not found.** Whether purchased extracts may be republished is unverified. It would need ONRC's written answer before any public use.
- **Free tiers.** The free per-debtor index on myportal.onrc.ro is offered as "o primă modalitate de informare" ([bpi.ro p.38](https://www.bpi.ro/?page_id=38)). No reuse grant is stated.
- **EU baseline.** Regulation 2015/848 art. 24(2) lists the mandatory register information. Art. 27(1) says it must be available "free of charge" through the interconnection system ([EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32015R0848)). Free to look up is not the same as licensed for bulk reuse.
- **Contrast.** ONRC's own company-register open data on data.gov.ro is **CC-BY-4.0** since 2020 (licence field on every package, [data.gov.ro ONRC](https://data.gov.ro/organization/onrc)).

## 3. Join key into the graph

- **CUI, directly.** The paid bulletin and the free index both search by "tax identification number" and "Trade Register registration number" as well as name, case number and issue ([e-Justice, Romania](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_en)). The paid debtor-series extract delivers the CUI per debtor ([bpi.ro p.47](https://www.bpi.ro/?page_id=47)).
- This is ADR 0003's key (ANAF-confirmed CUI), so a BPI debtor joins the supplier entity without name matching. It is the main advantage over portal.just.ro ([portal-just research](https://github.com/george-vrancianu/grivei.ai/blob/research/portal-just/docs/research/portal-just.md)).
- **ONRC open data** is keyed by trade-register number (`COD_INMATRICULARE`) in `OD_STARE_FIRMA.CSV`. It maps to CUI through `OD_FIRME.CSV` (`DENUMIRE^CUI^COD_INMATRICULARE^…`, header read 2026-11-12, [dataset](https://data.gov.ro/dataset/firme-04-11-2026)). How clean that mapping is belongs to #109.
- **Also in BPI, not joinable for us:** the insolvency practitioner (administrator or liquidator, an organisation or a person) and the court and case number. The case number would link to portal.just.ro.

## 4. People

- **Two sections** ([bpi.ro](https://www.bpi.ro/)):
  - "Persoane juridice" (Law 85/2014): companies, but also professionals who are natural persons (PFA, II). ONRC notes that courts sometimes open proceedings against a natural person "identificată prin cod numeric personal – CNP" ([GDPR note](https://www.onrc.ro/documente/date%20cu%20caracter%20personal/3.2.%20NOTA%20INFORMARE%20BPI%20RGPD.docx)).
  - "Debitori – persoane fizice cu obligaţii ce nu decurg din exploatarea unei întreprinderi" (Law 151/2015, since 1 Jan 2018). It shows the debtor's name, CNP and address ([e-Justice](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_en)). **Entirely out of scope.**
- **Creditor tables and reports name individual creditors and employees** (inferred from the act types listed in §6). This is unverified in content, because the full text is paid.
- **Within scope:** only organisation debtors, joined by CUI. PFA/II debtors fall under the Natural-person supplier rule ("Persoană fizică", never named). In the ONRC snapshot, 348 of the 22,342 insolvency-state registrations carry an `F` (PFA/II/IF) registration prefix.

## 5. Money measure

- **None in reach.** Amounts exist in "Tabele de creanțe" (claim tables, 24,199 published in 2025), "Plan de distribuire" (1,082) and "Plan de reorganizare" (50) ([2025 statistics, cap. 3](http://www.bpi.ro/wp-content/uploads/statistici/2025/statistica_2025_cap3.pdf)). These are free-text documents in the paid bulletin, with no structured field.
- No lens. At most the Money lens could later show "total admitted claims", which would need document parsing. Not recommended.

## 6. Volume

BPI, from ONRC's own statistics ([statistics index](https://www.bpi.ro/?page_id=1469)):

- **2025:** 29,102 issues, 540,067 pages ([cap. 5](http://www.bpi.ro/wp-content/uploads/statistici/2025/statistica_2025_cap5.pdf)). That is roughly 100–120 issues per working day, because each issue is per case or practitioner submission rather than one daily gazette.
- **356,226 procedural acts** in 2025 ([cap. 2](http://www.bpi.ro/wp-content/uploads/statistici/2025/statistica_2025_cap2.pdf)):

  | Type | Acts |
  |---|---:|
  | Reports | 93,425 |
  | Summonses (citații) | 59,179 |
  | Court decisions | 47,970 |
  | Other acts | 39,006 |
  | Communications | 38,196 |
  | Convocations | 28,501 |
  | Claim tables | 24,199 |
  | Notifications | 13,655 |
  | Requests | 6,299 |
  | Announcements | 4,664 |
  | Distribution plans | 1,082 |
  | Reorganisation plans | 50 |

  Court decisions split into 22,343 sentences, 20,716 interim rulings (încheieri), 4,884 appeal decisions and 27 other.
- **New debtors:** ONRC counts "profesioniști intrați în insolvență". It recorded 4,561 for 1 Jan–31 Aug 2025 (4,657 a year earlier) and 499 in Aug 2025 ([ONRC spreadsheet, Aug 2025](https://www.onrc.ro/statistici/2025/august/Profesionisti_intrati_in_insolventa%20august%202025.xlsx), [index](https://www.onrc.ro/index.php/ro/statistici?id=252)). Extrapolated, that is **~6,800 per year** (my estimate).
- **Stock** (ONRC open data, `OD_STARE_FIRMA.CSV`, snapshot 04.11.2026, 4,676,946 rows over 4,228,287 registrations, my count): 5,249 registrations in insolvență (code 1107), 15,733 in faliment (1070) and 1,472 in reorganizare judiciară (1057). That is **22,342 distinct registrations** with at least one of these codes. Another 15,862 are in lichidare and 59,913 in dizolvare (voluntary or administrative, not BPI proceedings).
- **Size if ingested.** Only a debtor-level status table is realistic: tens of thousands of rows, a few MB in Postgres. The full bulletin would be ~540 k pages a year of PDF/HTML text, and that is not a path we would take. The ONRC state file is 92 MB raw per snapshot.

## 7. History depth and update cadence

- **BPI:** first issue on **1 Aug 2006** (Law 85/2006), electronic from the start, visible on the portal ([bpi.ro p.38](https://www.bpi.ro/?page_id=38)). Earlier proceedings under Law 64/1995 are not in BPI. The natural-person section dates from 2018. Issues are published continuously on working days ([cap. 5](http://www.bpi.ro/wp-content/uploads/statistici/2025/statistica_2025_cap5.pdf)). Back issues are reachable only through debtor reports or certificates, because the subscription covers only its own period ([bpi.ro p.56](https://www.bpi.ro/?page_id=56)).
- **ONRC open data:** a snapshot of the company register, published roughly monthly in 2026 (04.11, 19.10, 02.09, 08.07, 03.06, 06.05, 03.04, 02.03, 03.02, 09.01). Before that it was roughly quarterly, back to 2014 ([data.gov.ro ONRC](https://data.gov.ro/organization/onrc)).
  - The state file carries **only the current code, no date** (header `COD_INMATRICULARE^COD`).
  - An entry date can be bounded only by diffing consecutive snapshots: to about a month in 2026, and to a quarter for older years. Whether every older snapshot still carries the state file is for #109.

## 8. Data quality

- **BPI** is a legal publication. Publication counts as service of process (Law 85/2014 art. 42(1): "Citarea părților, precum și comunicarea oricăror acte de procedură se efectuează prin BPI", [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/159286)), so completeness for opened proceedings should be high. The acts themselves are free-text documents. Structured fields are limited to the debtor identifiers, case, court, act type, issue and date ([e-Justice](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_en)). Not verified first-hand.
- **The ONRC state codes are messy.** The nomenclature has 197 codes, mixing legal regimes:
  - Law 64/1995 (codes 1073, 1116, 1118), Law 85/2006 (1037) and Law 85/2014 (1038);
  - suspensions (1119, 1123, 1114, 2105–2108);
  - a parent company in insolvency (1037/1038/1146);
  - foreign insolvency (1121).

  These come from [`N_STARE_FIRMA.CSV`](https://data.gov.ro/dataset/nomenclatoare-04-11-2026). A registration can hold several codes at once: 4.68 M rows for 4.23 M registrations. A Signal rule needs a curated code list, which belongs to #109.
- **The state file lags the bulletin.** ONRC registers the opening in the trade register after BPI publication (Law 85/2014 art. 115(3) has registration "din oficiu"). The lag is unmeasured.

## 9. Candidate Signal rules

Candidates only. Rates are rough.

1. **Supplier winning while in insolvency proceedings.**
   - Rule: a SEAP award or direct purchase to a supplier CUI dated after the opening of insolvency (or bankruptcy) proceedings and before their closure.
   - Needs: SEAP plus an opening date per CUI. The date can come from (a) BPI (paid extract, exact date) or (b) ONRC state-file snapshot diffs (free, month or quarter precision, from the first snapshot onward).
   - Legal context: being in insolvency is an exclusion ground (Law 98/2016 art. 167(1)(b)). But art. 167(2) makes the authority keep a bidder that is in observation with a feasible reorganisation plan, or in judicial reorganisation that respects its plan ([legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/178667)). So a firing is worth verifying, not a conclusion. The rule should distinguish faliment (bankruptcy, no such exception) from insolvență or reorganizare.
   - Base rates: ~22.3 k registrations in an insolvency-family state now and ~6.8 k new ones per year. The overlap with SEAP suppliers is **unmeasured**. It is cheap to measure in-house by joining the ONRC snapshot (via `OD_FIRME` CUI) to Release 1 supplier CUIs.
   - Press shows it happens: a Iași firm reportedly got 11 direct awards after entering insolvency ([BZI](https://www.bzi.ro/o-firma-de-constructii-din-iasi-aflata-in-insolventa-abonata-la-contractele-cu-statul-sute-de-mii-de-lei-intra-in-conturile-afaceristului-prin-incredintare-directa-foto-5008379), secondary).
2. **Authority awarding to a firm whose earlier contract with it ended in the firm's insolvency.**
   - Rule: an authority awards to supplier X after a previous contract between them whose performance window overlaps X's insolvency opening. A sharper variant: the new award goes to a firm that shares a CUI-confirmed successor or name with X, but that needs ONRC ownership (#109) and the people gate.
   - Needs: SEAP (contract dates) and opening dates as above.
   - Rate unmeasured. A smaller set than rule 1.
3. **Supplier in bankruptcy with an active contract** (a variant of 1 on the contract side).
   - Rule: a contract still running (SEAP end date in the future) when the supplier enters faliment.
   - Needs the same inputs. It is useful as Record context ("this supplier entered bankruptcy during the contract") more than as a Signal.

## 10. Who already uses it

- **Commercial aggregators.**
  - Termene.ro sells alerts "în momentul în care firma apare în Buletinul Procedurilor de Insolvență" ([termene.ro monitoring](https://termene.ro/produs-monitorizare-firme)). Its API is CUI-only and on demand ([termene.ro API](https://termene.ro/produs-api)).
  - Listafirme has an insolvency list product ([listafirme.eu](https://listafirme.eu/insolventa.asp)).
  - These are presumably fed by paid BPI subscriptions or extracts. Unverified.
- **Press.** Case-by-case stories on insolvent suppliers winning public contracts: [BZI](https://www.bzi.ro/o-firma-de-constructii-din-iasi-aflata-in-insolventa-abonata-la-contractele-cu-statul-sute-de-mii-de-lei-intra-in-conturile-afaceristului-prin-incredintare-directa-foto-5008379), [Puterea](https://www.puterea.ro/?p=542679), [Profit.ro on contracts with a firm that sought insolvency](https://www.profit.ro/must-read/serviciile-secrete-camera-deputatilor-curtea-conturi-metrorex-societatea-nationala-radiocomunicatii-municipiul-bucuresti-printre-cei-au-semnat-contracte-getica-95-com-cerut-insolventa-20248047). Insolvency trend coverage cites ONRC counts (for example [StartupCafe](https://startupcafe.ro/mii-de-firme-si-pfa-uri-in-insolventa-in-2026-realitatea-mai-grava-din-spatele-cifrelor-si-sectoarele-cu-cel-mai-mare-risc-107326)).
- **Civil society.** I found no Expert Forum, Funky Citizens or OpenTender analysis that systematically joins BPI to SEAP (one web search, 2026-11-12). Not found does not mean absent.

## 11. Recommendation

**Drop BPI as a Connector. Get insolvency status from ONRC open data, as a Reference source (#109). Cite BPI and e-Justice as the place to verify each Signal.**

- **Why not BPI itself.**
  - There is no bulk or API route, and the subscription is paid, single-user and forward-only.
  - There is no reuse licence.
  - The free tiers are interactive per-debtor lookups behind an account.
  - Every substantive field (amounts, plans, reports) is free text inside the paid layer, and parts of it name natural persons.
- **What the Signal actually needs is a status and a date per CUI.** ONRC's CC-BY-4.0 company-state file already gives the status. Snapshot diffs give the date to about a month in 2026, and coarser before. That is enough for rule 1 at first.
- **Escalation path, if snapshot precision proves too coarse.** Ask ONRC for a one-off paid "serii de debitori" extract: CUI plus opening date (and closure date), ~0.60 lei/debtor/criterion above 1,000 debtors ([bpi.ro p.47](https://www.bpi.ro/?page_id=47)). Get written reuse terms first. Treat it as a Raw-archive file, not a live Connector.
- **For verification links,** a Signal can point users to the free e-Justice search or the ONRC "Persoane publicate în BPI" lookup for the CUI.
- **Reference sources it drags in:** none new. It folds into ONRC (#109), which brings `OD_FIRME` for the registration-number-to-CUI mapping.
- **Out of scope:** the natural-person section (Law 151/2015) and any PFA/II debtor names, per ADR 0003 and the people gate.
