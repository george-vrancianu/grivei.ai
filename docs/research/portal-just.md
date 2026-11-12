# portal.just.ro court cases: access, parties, volume and Signals

Research for [#116](https://github.com/george-vrancianu/grivei.ai/issues/116), part of the Source roadmap map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108).
Researched 2026-11-12.

**Question.** What can be obtained from portal.just.ro (case metadata through its web service: parties, case object, stage, outcomes) and from ReJust/ROLII (rulings)? What are the access terms, rate limits, volume and history? How are parties named (firms vs people, any CUI)? What are the reuse terms? Answer the map's 11-point Source checklist, and size two candidate Signals: a SEAP supplier that is a party to an insolvency or criminal case while winning, and a contracting authority in litigation with its own supplier.

**Method.** I read the WSDL of the public SOAP service and ran 14 small queries against it (one at a time, a few seconds apart) to see the response shape and filter behaviour. Responses were downloaded to `/tmp` and analysed only in aggregate. No individual's data is recorded here. portal.just.ro's HTML pages and rolii.ro could not be read from this environment: portal.just.ro answered with a Cloudflare challenge (HTTP 403), and rolii.ro did not connect. Statements that rest on secondary sources are marked as such.

## Answer in brief

- **Access is good, for metadata only.** `http://portalquery.just.ro/query.asmx` is a free, unauthenticated SOAP service. It searches cases by number, object, party name, court, registration date and last-modified date. It also lists hearings by court and day. Each response holds **at most 1,000 cases** and is truncated silently. A harvester has to slice by court and by last-modified time window. The time-of-day part of that window is honoured, so hour slices work.
- **No identifier for parties.** A party is `nume` (free text) plus `calitateParte` (role). There is no CUI, no CNP and no party id. In samples, 30–66% of parties were organisations by name shape. The rest are individuals: defendants, claimants and employees. One public body appeared under **525 distinct spellings** in a single month. A CUI turns up inside the name string only occasionally (about 2% of parties in one sample, 0 in others).
- **People are the main subjects.** Criminal defendants (`Inculpat`) are named. Organisation names often embed a named legal representative. The Source falls squarely under the people gate (recipe §3).
- **No money field.** Amounts appear only inside the free-text `solutieSumar` (ruling summary). They mention "lei" in about 4–7% of hearings.
- **History is shallow.** In this probe, cases registered before 2023 came back almost empty. Old cases surface only while they are still active. Long-term history has to come from our own Raw archive, kept from the day harvesting starts.
- **Volume is large.** About 3.66 M cases across all stages in 2024 (CSM). One tribunal alone had more than 1,000 cases modified in a single day.
- **Rulings (ReJust/ROLII).** These are anonymised full texts, so they are of little use for joining. ReJust is a Blazor app with no documented API or bulk download (not verified further).
- **Signals.** About **345 public-procurement court cases per month** are registered nationally ("litigiu privind achiziţiile publice", Oct 2026). That count is easy to obtain and makes "authority in litigation with its own supplier" sizeable. The **insolvency** candidate is better served by the insolvency bulletin (BPI, keyed by CUI) than by name-matching court parties.
- **Recommendation: keep as an organisation-only Source, later than its people-free siblings.** Ingest only the cases where at least one party resolves to an existing organisation entity. Use the procurement-litigation and insolvency case categories first. Never show the names of natural-person parties. Do it after the entity-linking policy lands, because even organisation matching is name-based. Details in §11.

## 1. Access

| Channel | What | Access | Verified |
|---|---|---|---|
| `http://portalquery.just.ro/query.asmx` ([WSDL](http://portalquery.just.ro/query.asmx?WSDL)) | Case and hearing metadata from the courts' ECRIS systems | SOAP 1.1/1.2, no key, HTTP only | Yes, WSDL fetched and queried 2026-11-12 |
| [portal.just.ro](https://portal.just.ro/) | The same data as HTML, plus court pages and summons | Behind a Cloudflare JS challenge (403 to scripts) | Challenge observed. Content not read |
| [rejust.ro](https://www.rejust.ro/) (CSM) | Anonymised rulings, search UI | Blazor WebAssembly app, no documented API | Shell page fetched. API not explored |
| [rolii.ro](https://www.rolii.ro/) | Anonymised rulings (older portal) | Did not connect from here | No |
| [data.gov.ro](https://data.gov.ro/api/3/action/package_search?q=jurisprudenta) | Any court-case dataset? | CKAN API | Yes: none. The Ministry of Justice only publishes payment statements ([search](https://data.gov.ro/api/3/action/package_search?q=justitiei)) |

**Service operations** (from the WSDL `wsdl:documentation`):

- `CautareDosare(numarDosar, obiectDosar, numeParte, institutie, dataStart, dataStop)`: "Cautare dosare dupa numar, obiect, parte, institutie, data".
- `CautareDosare2(... , dataUltimaModificareStart, dataUltimaModificareStop)`: the same, plus a **last-modified** window. This is the operation an incremental harvester needs.
- `CautareSedinte(dataSedinta, institutie)`: the hearing list of one court for one day.
- `institutie` is an enum of **246 courts**: 179 judecătorii, 46 tribunale (incl. specialised), 15 courts of appeal, 5 military tribunals and the military court of appeal. **The High Court (ÎCCJ) is not in the enum.** Its cases live on [scj.ro](https://www.scj.ro/), which was not researched here.

**Response shape** (`Dosar`):

- case fields: `numar`, `numarVechi`, `data` (registration), `institutie`, `departament`, `categorieCaz` (12 values, e.g. Penal, Civil, Contencios administrativ şi fiscal, Litigii cu profesioniştii, Faliment, Insolvenţa persoanei fizice), `stadiuProcesual` (25 values: Fond, Apel, Recurs, …), `obiect` (free text) and `dataModificare`;
- `parti[]`: `nume` and `calitateParte`;
- `sedinte[]`: `complet`, `data`, `ora`, `solutie` (outcome class, e.g. "Amână cauza", "Admite cererea"), `solutieSumar` (free-text summary), `dataPronuntare`, `documentSedinta`, `numarDocument` and `dataDocument`;
- `caiAtac[]`: `dataDeclarare`, `parteDeclaratoare` and `tipCaleAtac`.

**Limits observed** (queries of 2026-11-12):

- **1,000-case cap per call, truncated silently.**
  - Tribunalul București, cases modified on 2026-11-10: exactly 1,000 returned.
  - The same court, modified 10:00–10:59 that day: 704. The cap is real, and hour windows work.
  - Tribunalul Cluj, modified over one week: exactly 1,000.
- A third-party wrapper documents the same 1,000 cap ([Apify actor README](https://apify.com/apnoda/portal-just.md), secondary).
- Party-name search ignores diacritics: "NATIONALA" matched "NAŢIONALĂ".
- Response times were 1.7–10 s and payloads 0.5–4.2 MB per 1,000 cases.
- **No published rate limit found.** Unverified. The HTML portal's Cloudflare challenge suggests the operator does defend against scraping. The SOAP host did not challenge us.

## 2. Licence and reuse terms

- **No explicit licence found.** The terms page `portal.just.ro/SitePages/acces.aspx` is behind Cloudflare and could not be read. Unverified.
- At the 2013 relaunch the Ministry of Justice said that anyone may build services and applications on the portal data through the web service, "în mod gratuit, cu menţionarea sursei" (free of charge, crediting the source). This is reported by [e-juridic.manager.ro, 11 Apr 2013](https://e-juridic.manager.ro/articole/mj-versiunea-imbunatatita-a-portalului-instantelor-de-judecata-din-romania-11061.html) (secondary). Treat it as attribution-only, pending the primary text.
- Party names are personal data under GDPR.
  - A party can ask the court to have their name anonymised on the portal ([euroavocatura.ro](https://www.euroavocatura.ro/articole/2595/Portal_Just_ro_-_Dreptul_justitiabilului_de_a_ii_fi_sterse_datele_cu_caracter_personal), secondary).
  - So a mirrored copy can go stale against later anonymisations. That matters for the Raw archive principle (ADR 0004): we would keep names that the court later redacted.
- Rulings on ReJust/ROLII are published anonymised under CSM rules on publishing case law ([Agerpres on the ReJust launch, 26 Nov 2021](https://agerpres.ro/justitie/2021/11/26/csm-aplicatie-gratuita-pentru-acces-mai-facil-la-hotararile-instantelor-de-judecata--822408), secondary). No reuse licence was found for either site.

## 3. Join key into the graph

- **Name only.**
  - No CUI field exists (WSDL `DosarParte` has only `nume` and `calitateParte`).
  - In the samples, a "CUI …" or "J##/…" token appeared inside the name string in 79 of 4,613 parties (one sample searched by a national company's name) and in 0–1 of 892–4,043 parties (court-by-day samples).
- **Name variance is severe.** One month of cases naming one national company had 525 distinct party strings containing its name. Sources of variance:
  - with or without diacritics and "S.A."/"SA";
  - "prin Direcţia Regională …" suffixes;
  - "Statul Român prin …" prefixes;
  - encoding damage ("?" for ş/ţ).
- Matching to ANAF-confirmed CUIs (ADR 0003) needs:
  - normalisation;
  - stripping "prin …" representation clauses;
  - a name-to-CUI resolver with a measured false-link rate.

  This is the entity-linking problem the map is meant to decide.
- **Institution and place.** `institutie` gives the court, which maps to a county, but that is not the party's location. No SIRUTA.

## 4. People

- **Yes, people are core subjects.**
  - Roles seen include Inculpat (defendant), Reclamant, Pârât, Petent, Contestator and Creditor/Debitor.
  - Criminal cases name defendants in full.
  - By name shape, 34–70% of parties in the samples were not organisations.
- People also hide inside organisation party strings: "…, PRIN REPREZENTANT LEGAL ‹name›" was common. An organisation-only ingest must still strip embedded personal names.
- No CNP was seen: no 13-digit numbers in any sample.
- Recipe §3 already lists "parties on portal.just.ro" as gated on the entity-linking map ([docs/release-recipe.md](https://github.com/george-vrancianu/grivei.ai/blob/main/docs/release-recipe.md)).

## 5. Money measure

- **None structured.** No amount field in the WSDL.
- Amounts appear in free text only. `solutieSumar` mentioned "lei"/"RON" in 52 of 1,262 hearings (Tribunalul Cluj, one day) and 144 of 2,222 (Tribunalul București, one day).
- `obiect` sometimes carries a value ("pretenţii", "litigiu privind achiziţiile publice suma …") but unstructured.
- Nothing to sum, and no Money lens. Count-based only (number of cases, by category and role).

## 6. Volume

- **National caseload.** 3,655,103 cases across all stages in 2024, up from 3,214,079 in 2023 ([CSM report on the state of justice 2024](https://www.csm1909.ro/files/f73ab5c2-3ced-4f25-8e2a-7b398a04728b); the figures as reported by [stiripesurse.ro](https://www.stiripesurse.ro/romania-campioana-la-procese-in-ue-numar-record-de-dosare-si-avertisment-csm-privind-degradarea-actului-de-justitie_3860309), PDF not opened).
- **Daily churn.** More than 1,000 cases modified in one day at Tribunalul București, and 400 at Tribunalul Cluj (observed).
- **Per-case size.** About 2.5–4.2 KB of XML per case, with about 3.5–4.6 parties and 1–5 hearings per case in the samples.
- **Rough sizes. These are estimates, not measured.**
  - Full national metadata for one year: about 3.7 M cases × ~3 KB ≈ **11 GB XML** per snapshot.
  - Daily last-modified harvesting re-fetches active cases at every hearing, so the Raw archive grows maybe 3–5× that per year, or ~10–20 GB/yr after gzip (XML compresses well).
  - Postgres: ~3.7 M cases, ~15 M party rows and ~10 M hearing rows per year, about 10 GB with indexes.
  - **Organisation-only, procurement/insolvency-filtered ingest is orders of magnitude smaller.** Procurement litigation is ~4 k cases/yr (§9). Insolvency ("Faliment") was 12% of one day at Tribunalul București.
- **Harvest cost.** 246 courts × hourly windows ≈ 6 k calls/day if done naively. Adaptive slicing (split a window only when it returns 1,000) is far less. A national backfill of currently visible cases is probably tens of thousands of calls. Unmeasured.

## 7. History depth and update cadence

- **Cadence.** Near real time: `dataModificare` on the day of the query, with cases modified up to the query date. Per [e-justice.europa.eu](https://e-justice.europa.eu/pdf-export/2724_ro), case and hearing details on court sites are pulled automatically from the courts' electronic system (ECRIS); the PDF text could not be extracted here, so this rests on the search snippet.
- **Depth is shallow and looks like a rolling window. This is an observation, not a documented policy.** Tribunalul Cluj, cases by registration date, one weekday each:

  | Registration day | Cases returned |
  |---|---|
  | 2003-03-02 | 0 |
  | 2008-03-02 | 0 |
  | 2012-03-02 | 2 |
  | 2016-03-03 | 0 |
  | 2020-03-03 | 0 |
  | 2023-03-03 | 10 |
  | 2024-03-04 | 27 |
  | 2025-03-03 | 41 |
  | 2026-03-03 | 51 |

  Cases registered as early as 2009 do appear when they are still being modified. Closed old cases seem to drop out.
- **Consequence.** No historic backfill. A Connector gets "currently visible" cases plus whatever the Raw archive accumulates from its start date. A Data-through date would be "from first harvest".

## 8. Data quality

- No party identifiers; free-text names with heavy variance and some encoding damage ("?" in place of ş/ţ).
- `obiect` is free text with many spellings of the same object, e.g. "pretentii" / "pretenţii" and "anulare proces verbal de contravenţie" with suffixes.
- `solutie` is empty for 20–55% of hearings (future hearings and some non-ruling events). Most filled values are adjournments ("Amână cauza", "Amână pronunţarea").
- The role string can be doubled ("Inculpat Inculpat").
- Courts are a fixed enum and categories and stages are clean enums. Those are the structured part.
- Silent truncation at 1,000 is the main harvesting hazard.
- Court-ordered anonymisation of a party can arrive after we archived the name (§2).

## 9. Candidate Signal rules

Candidates only. Firing rates are rough.

1. **Contracting authority in court with its own supplier.**
   - Rule: a case of object "litigiu privind achiziţiile publice" (or any civil/commercial case) where one party resolves to a SEAP contracting authority and another to a supplier that won from that authority.
   - Needs: SEAP and portal.just.ro (plus ANAF for name-to-CUI).
   - Base volume: **345 procurement-litigation cases registered nationally in Oct 2026**. These were 344 "Contencios administrativ şi fiscal" and 1 criminal, 92% organisation-shaped parties, mostly at the Court of Appeal and Tribunal of Bucharest. One query, under the cap, so complete for that month. That is ~4 k/yr.
   - Many will be bidder-vs-authority challenges (CNSC appeals), not disputes with the contracted supplier. The share that pairs an authority with an actual winner is unmeasured.
   - Better complement: CNSC decisions (not researched here).
2. **Supplier in insolvency while winning.**
   - Rule: a supplier whose case category is "Faliment" (debtor role) has a SEAP award dated after the insolvency case was registered.
   - Needs: SEAP and portal.just.ro, or better **BPI (Buletinul procedurilor de insolvenţă, ONRC), which identifies the debtor by CUI**.
   - Rate: unmeasured. Faliment was 121 of 1,000 sampled cases at Tribunalul București in one day, and 55 of the 1,000 in the national-company sample.
   - Name-matching here is weaker than BPI's CUI. Recommend researching BPI as the Source for this Signal. BPI access and cost were not checked here.
3. **Supplier as defendant in a criminal case while winning.**
   - Rule: an organisation party with role Inculpat (legal persons can be criminally liable) and a SEAP award during the case.
   - Needs: SEAP and portal.just.ro.
   - Rate unmeasured. Most Inculpat parties are individuals, which stay out of scope under the gate, so only organisation defendants qualify.

## 10. Who already uses it

- **Commercial aggregators.** Termene.ro sells case monitoring and insolvency alerts on companies ([termene.ro](https://termene.ro/solutie-avocati)). Dosar24.ro and Wolters Kluwer's LexForce integrate portal.just.ro case data ([Wolters Kluwer](https://www.wolterskluwer.com/ro-ro/news/acces-direct-din-lexforce-dosare-electronice-instanta)). Third-party wrappers around the SOAP service exist ([Apify actor](https://apify.com/apnoda/portal-just.md)).
- **Civil society.** I found no published Expert Forum, Funky Citizens or OpenTender analysis joining court cases to procurement suppliers (search, 2026-11-12). Not found does not mean absent.
- **Anonymisation critique.** CRJM evaluated how court rulings are anonymised ([report, Dec 2024](https://crjm.org/wp-content/uploads/2025/03/2024-12-Evaluarea-modului-de-anonimizare-a-hotararilor-judecatoresti_RO-fin.pdf)). CRJM is a Moldovan NGO, so the report may concern Moldova, not Romania. Not read.

## 11. Recommendation

**Keep, as an explorable Source of court cases between organisations, scheduled after the entity-linking policy, with natural-person parties never named.**

- **Why keep.**
  - It is the only public, free, near-real-time, national feed of litigation.
  - It has a clean SOAP interface, clean enums (court, category, stage) and a directly sizeable procurement-litigation slice (~4 k cases/yr).
  - It gives explorable Records ("cases involving this authority or supplier") that SEAP cannot provide.
- **Why not early.**
  - Every join is name-to-CUI, so it needs the false-link measurement the map is deciding.
  - Party lists mix people and organisations, and organisation strings embed people.
  - The reuse licence is not documented beyond "free, cite the source" (2013, secondary).
  - History is shallow, so the value grows only with time harvested.
- **Starting the Raw archive early has value**, because history is not recoverable later. Harvest a narrow, organisation-heavy slice (categories Faliment, Litigii cu profesioniştii, Contencios administrativ; object "achiziţiile publice") before deciding the Release. That should wait until the legal posture covers storing names that a court may later anonymise.
- **Reference sources it drags in:** ANAF (name-to-CUI confirmation), and probably BPI for insolvency by CUI. Researching BPI next is the stronger path for the insolvency Signal.
- **ReJust/ROLII: drop for now.** They hold anonymised rulings with no API or bulk route found and no join key. Revisit only to link a Record to its ruling text.
