# Curtea de Conturi audit reports: reusable form and Signals

Research for [#117](https://github.com/george-vrancianu/grivei.ai/issues/117), part of the Source roadmap map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108).
Researched 2026-11-12.

**Question.** Do the audit reports of the Curtea de Conturi a României (individual audit reports, and the county reports on local public finances) exist in a reusable form? That means per-institution findings, prejudicii amounts, formats and history. Is this a document Source keyed by institution, and can any amount be summed? How big is the candidate Signal "an authority with procurement findings that keeps awarding to the same suppliers"?

**How this was checked, and its limits.** `www.curteadeconturi.ro` sits behind a Cloudflare managed challenge. Every direct request for a page or PDF returned HTTP 403 "Just a moment… Enable JavaScript and cookies" (tested 2026-11-12). Only `robots.txt` came back. So the Court's own listing pages were **not** read directly. Their structure comes from search-engine snippets of those pages, plus five official Court PDFs that third parties mirror (newspapers, an NGO), which were downloaded and read in full. Anything that rests only on snippets is marked *(snippet)*. Anything not checked is marked **unverified**.

## Answer in brief

- **Three kinds of publication matter**, all PDFs and none in a structured format:
  1. **Individual audit and follow-up reports.** One per audited entity, published within 30 days of approval, and only for missions from 1 January 2023 on.
  2. **One "Raport privind finanțele publice locale" (RFPL) per county per year.** Its **annex is a per-entity table**: audit opinion, then *venituri suplimentare*, *prejudicii* and *abateri financiar-contabile* in thousand lei.
  3. **National syntheses**, including a yearly report on procurement findings.
- **No bulk download, API or open data.** data.gov.ro has no Court dataset. The website blocks non-browser clients, so a Connector would need permission or an allowlist from the Court. Scraping around the challenge is not an option.
- **Join key.** The audited entity's **CUI is printed in the body of each audit report** ("având atribuit codul fiscal 4280205"), and can be pulled out with a regex. The RFPL annex gives only a typed name ("UATC DOBROMIR") within a county. That is enough for a SIRUTA match.
- **People.** Published reports replace natural persons and private companies with "XXX". People are not subjects, so the people gate does not apply.
- **Money.** *Prejudicii* is an **estimate** of loss to public budgets, and establishing its full extent is left to the audited entity. It can be added up per entity, county and year from the RFPL annexes, but it is a different measure from awarded value and must never be mixed into the Money lens. *Abateri financiar-contabile* are accounting misstatements and are not money lost. They should not be summed alongside prejudicii.
- **Volume is small.** About 1,300–1,400 audited entities a year nationally. Download ids on the site reached about 12,700 by December 2025 *(snippet)*. Most likely a few GB of PDFs in total.
- **Recommendation: keep, as an explorable document Source with a count lens, but late in the order.** Access is the blocker (the Cloudflare wall, and no bulk files). Ask the Court for bulk access or an extract from its internal SPID findings database before building anything. Detail in §11.

## 1. Access

- **Website only, behind Cloudflare.** Every direct request for a page or PDF on `www.curteadeconturi.ro` got a Cloudflare managed challenge, both with `curl` and with a plain fetch. The response body was the "Just a moment… Enable JavaScript and cookies to continue" page (`cType: 'managed'`, `cZone: 'www.curteadeconturi.ro'`), tested 2026-11-12 on e.g. https://www.curteadeconturi.ro/uploads/1ffccafb/b34f5987/b0a6d46f/a5775149/0150a7bc/a3fdf338/21178ec7/cba40f6c/RFPL_2023_Satu_Mare.pdf.
- **robots.txt** (https://www.curteadeconturi.ro/robots.txt, fetched 2026-11-12) does not forbid crawling. It says `User-agent: * … Allow: /` with `Content-Signal: search=yes,ai-train=no,use=reference`, and it disallows a list of AI and SEO crawlers (ClaudeBot, GPTBot, CCBot and others). A polite Connector is allowed by robots.txt but blocked by the challenge, so this needs a request to the Court, not a workaround.
- **Where the reports are listed** *(snippet, URL patterns seen in search results)*:
  - Individual reports, one page each, e.g. https://www.curteadeconturi.ro/rapoarte-audit/rapoarte-audit-financiar/raport-de-audit-financiar-pentru-anul-2023-nr-5389-22-01-2025-uatj-vrancea. File downloads are at `/rapoarte-audit/downloads/<id>`, e.g. https://www.curteadeconturi.ro/rapoarte-audit/downloads/12396.
  - Listings by type: https://www.curteadeconturi.ro/rapoarte-de-audit/audit-financiar/ and https://www.curteadeconturi.ro/rapoarte-de-audit/audit-al-performantei/. Two URL trees exist (`rapoarte-audit/…` and `rapoarte-de-audit/…`), which suggests a site restructure. **Unverified.**
  - County local-finance reports (RFPL): https://www.curteadeconturi.ro/rapoarte-audit/raporte-privind-finantele-locale?page=5 (paginated; page 5 lists the 2021 reports, one per county).
  - Annual public reports: https://www.curteadeconturi.ro/en/ce-facem/raport-public-anual/. The 2021 report is at https://www.curteadeconturi.ro/wp-content/uploads/2025/11/Raportul%20public%20al%20Curt%CC%A6ii%20de%20Conturi%20pe%20anul%202021.pdf.
- **Report titles follow a parseable convention** *(snippet)*: "Raport de audit financiar pentru anul 2024, nr.36603/22.05.2025, UATC Telciu". That gives the audit type, the audited year, the Court's registration number and date, and an entity code (UATC/UATO/UATM/UATJ = commune / town / municipality / county) plus a name.
- **No open data.** A search of the data.gov.ro CKAN API (`package_search?q="curtea de conturi"`) returned 0 datasets on 2026-11-12, and no Court organisation is among the portal's 181 publishers (https://data.gov.ro/api/3/action/organization_list).
- **A structured database does exist inside the Court.** The procurement synthesis says every finding is recorded in the internal "aplicația informatică SPID", **coded by deviation type**, and that its figures come from "datelor încărcate în aplicația SPID … la data de 15.01.2025". See the 2024 procurement report, mirrored at https://www.ziuaconstanta.ro/images/stories/2025/07/15/raport-privind-constatarile-curtii-de-conturi-a-romaniei-in-domeniul-achizitiilor-publice-in-anul-2024.pdf. A per-entity extract from SPID, requested under Law 544/2001 or as a reuse request, is the most promising route to structured data. **Not requested yet.**
- **Paid:** none.

## 2. Licence and reuse terms

- **Publication is a legal duty.** The Court's Regulation on external public audit (20.12.2022) says audit reports "au caracter public după aprobare" (art. 79(1)). Reports or their summaries must be published on the Court's website within 30 calendar days of approval (art. 45(1)), and follow-up reports within 30 days of becoming public (art. 58(1)). Reports with classified information are excluded (art. 45(2)). Interim versions are not public (art. 79(3)). In a local-election year the plenum may delay publication until after the vote (art. 45(3)). Source: https://legislatie.just.ro/public/DetaliiDocument/263698.
- **No explicit reuse licence was found** for the website or the PDFs. The terms-of-use page was not reachable through the Cloudflare wall. **Unverified.**
- **Copyright backdrop.** Law 8/1996 art. 9(b) excludes official administrative texts from copyright (consolidated text, e.g. https://upfr.ro/download/legea%208%201996%20forma%20sintetica%20pentru%20data%202017%2005%2003.pdf; WIPO Lex https://www.wipo.int/wipolex/en/details.jsp?id=3578). Audit reports are very likely covered. This is a legal reading for the legal-posture ticket, not settled here.
- The robots.txt `Content-Signal` says `ai-train=no`. Grivei.ai does not train models, so this does not conflict with a Connector, but the legal-posture ticket should record it.

## 3. Join key into the graph

- **Individual audit reports: CUI in free text.** Both financial audit reports read in full give the audited entity's fiscal code in the opening paragraph:
  - "Unitatea Administrativ Teritorială Județul (U.A.T.J.) Dâmbovița … având atribuit codul fiscal 4280205" (https://www.gazetadambovitei.ro/wp-content/uploads/2026/07/2025-12-02_AF__UATJ_Dambovita.pdf, a mirror of the Court's report CCDB\2025-81659\02.12.2025);
  - "Unitatea Administrativ Teritorială Oraș (UATO) Eforie, … cod de identificare fiscală 4617794" (https://ziuaconstanta.ro/images/stories/2025/04/19/uato-eforie.pdf, Court report nr. 26927/07.04.2025).

  A regex on "cod(ul)? (de identificare )?fiscal(ă)?" will find it. Its consistency across all report types is **unverified**: the follow-up report on the Ministry of Finance gives an address but no CUI (https://publicrecord.ro/wp-content/uploads/2025/10/06_Iun_10_2025_Curtea-de-Conturi_Raport-Follow-Up.pdf).
- **The audited entity is often a consolidated UAT.** A financial audit of a UAT covers its subordinate entities with legal personality, which are named in the text (Eforie: 5, including schools and a sports club; Dâmbovița: 10). Findings attach to the UAT's CUI. Attaching them to a subordinate entity's CUI would mean reading the finding text.
- **RFPL annex: name and type within a county.** For example "UATC DOBROMIR", "UATM MEDGIDIA", "CLUB SPORTIV AXIOPOLIS CERNAVODĂ" (Constanța 2022, https://ziuaconstanta.ro/images/stories/2024/10/04/rfpl-2022-constanta.pdf). For a UAT, county + type + name gives a SIRUTA match, and through MF's list or ANAF the CUI. Other entities need name matching.
- **SEAP notice numbers sometimes appear** in finding text, e.g. "Anunț SEAP: CN1072861/04.09.2024" in the MF follow-up report above. That allows occasional links from a finding to SEAP Records. It is free text and not systematic.
- **Placement rule (candidate):** the audited entity's county, the same as SEAP's contracting-authority placement. The RFPL is organised by county already.

## 4. People

- **People are not subjects.** Published reports replace natural persons and private companies with "XXX". In the MF follow-up report, employees whose diplomas were annulled appear as "salariata XXX", a supplier as "furnizor XXX SRL" and a custodian company as "SC XXX SRL", with addresses also redacted ("str. XXX") (publicrecord.ro mirror above). The Dâmbovița report also contains "XXX" placeholders. Whether the Court applies this redaction to every report is **unverified**, but it was seen in both kinds of report read.
- **Names that remain** are the Court's own officials (approving head of department, chamber staff) and office-holders identifiable by role ("primarul", "Președinte în calitate de ordonator principal de credite"). The procurement synthesis lists its own authors.
- **Consequence:** this is not blocked by the people gate (release-recipe §3). Contractors are anonymised, so audit findings **cannot** be linked to SEAP suppliers by name. Only the authority side, and occasionally a SEAP notice code, links.

## 5. Money measure

Three figures recur in every RFPL annex and every synthesis (Constanța 2022 annex; 2024 procurement synthesis):

| Figure | Meaning | Summable? |
|---|---|---|
| **Prejudicii** ("erori cauzatoare de prejudicii") | Estimated loss to public budgets or assets, including missed benefits and accessories (Regulation art. 1 h)). Its full extent is for the audited entity's management to establish (art. 37(1)). | Yes, per entity, county and year, labelled as an *estimate by the auditor*. Never added to awarded value. |
| **Venituri suplimentare** | Revenue the entity failed to collect (taxes, rents). | Yes, as a separate measure. Not spending. |
| **Abateri financiar-contabile** | Accounting misstatements (wrong entries, unrecorded assets). | **No.** These are balance-sheet errors, not money lost, and they dwarf the rest (Constanța 2022: 1,073,663 thousand lei vs 6,235 thousand lei of prejudicii). |

- **Example per-entity rows** (Constanța RFPL 2022, audits done in 2023, thousand lei; columns are total / venituri suplimentare / prejudicii / abateri f-c): "UATC MERENI Concluzia adversă 3.057 0 2.896 161"; "UATJ CONSTANȚA Opinia cu rezerve 980.649 11.879 2.583 966.187". Entities still being finalised show "–" and a note that the report will be published later.
- **National scale** (2024 procurement synthesis, mirror above): prejudicii from all 2024 audits were 441,000 thousand lei, 206,030 thousand lei of them in procurement. Local administration produced 95.35% of procurement prejudicii (press coverage of the same report: https://www.g4media.ro/curtea-de-conturi-prejudicii-de-peste-206-milioane-de-lei-in-urma-verificarilor-efectuate-in-2024-in-domeniul-achizitiilor-publice.html).
- **Lens.** Release-recipe §6 allows the Money lens only for a Source with a money measure, and the glossary limits it to awarded value. Prejudicii belong in a **separate count lens** (audits / entities with findings per county), with the amount shown per record and per county but never coloured on the same scale as SEAP money. This is a decision for the Release, flagged here.

## 6. Volume

- **Audited entities per year:** 1,361 entities in 2024. Earlier years: 2,402 (2017), 2,522 (2018), 2,246 (2019), 2,647 (2020), 2,177 (2021), 2,168 (2022), 1,295 (2023) (table in the 2024 procurement synthesis).
- **UAT audits:** at UAT level there were 902 financial audits in 2023 and 479 in 2024, and 180 compliance audits in 2023 and 763 in 2024. Financial audits are now chosen by statistical sampling ("abordare statistică (eșantionare)"), so a UAT is not audited every year. Source: the national synthesis of RFPL 2023, https://www.romaniatv.net/wp-content/uploads/2025/11/dHVyaS5wZGYmaGFzaD0yNGJkNDNhNjA1MzJmZDg1NTAwNmE3MGEwODcwOGQ1MQ.pdf.
- **Published documents:**
  - The first batch in July 2023 was 690 documents: 567 follow-up reports, 117 financial audit reports and 6 compliance audit reports, for missions after 1.01.2023 (https://www.curteadeconturi.ro/comunicare/comunicate-de-presa/rapoarte-de-audit-si-de-follow-up-sunt-accesibile-cetatenilor-si-partilor-interesate, *snippet*).
  - Download ids reached about 12,694 by a report dated 08.12.2025 (https://www.curteadeconturi.ro/rapoarte-audit/downloads/12694, *snippet*). That suggests roughly 12–13k files by the end of 2025. Whether ids are dense and one per report is **unverified**.
- **File sizes** of the four mirrored Court PDFs: 0.34 MB (Eforie, 10 pp.), 0.78 MB (Dâmbovița, 11 pp.), 0.65 MB (MF follow-up, 30 pp.), 1.15 MB (RFPL Constanța, 37 pp.).
- **Rough sizing (estimate):**
  - Raw archive: about 15k PDFs × ~0.5 MB ≈ **5–10 GB** to date, growing by ~3–5k files a year.
  - RFPL: 42 PDFs a year (41 counties + Bucharest) at ~1–2 MB.
  - Postgres: one row per report and one per annex line (~1–2k a year), plus extracted text for search. Well under 1 GB.

## 7. History depth and update cadence

- **Individual reports:** only missions from **1 January 2023** onwards are on the website (the July 2023 announcement above). Before that, reports were not published routinely. Some appear in mirrors kept by the audited entities, e.g. Buzău 2020: https://primariabuzau.ro/wp-content/uploads/2020/06/Raport-de-Audit-Financiar_compressed.pdf.
- **RFPL county reports:** the listing shows the 2021 reports, posted March 2023 *(snippet)*. Older per-county chamber reports exist under `/uploads/…/Raport.pdf`, e.g. Camera de Conturi Suceava on its 2016 activity *(snippet)*: https://www.curteadeconturi.ro/uploads/c27bb02a/f9bfd86e/b932df92/8f77039d/aba787dc/d0aa96b1/a00ad510/f783b24e/Raport.pdf. Whether every year back to 2016 carries the per-entity annex is **unverified**.
- **Annual public report:** on the website from 2020–2021 onwards *(snippet)*. Older ones were tabled in Parliament, e.g. 2015: https://www.cdep.ro/bperm/2016/F254672155-Rap.C.Conturi_2015.pdf, and 2017: https://www.cdep.ro/bperm/2018/F1047361041-Raport_2017_C.Conturi.pdf.
- **Cadence:**
  - Individual reports appear continuously, within 30 days of approval (Regulation art. 45).
  - RFPL and syntheses come yearly with a long lag. The reports on fiscal year 2023, audited in 2024, were sent to Parliament in July 2025 (https://www.bursa.ro/curtea-de-conturi-a-transmis-parlamentului-raportul-pe-anul-2023-07782655).
  - Data-through dates would therefore be per record kind: report approval date for individual reports, and fiscal year for the RFPL annex.

## 8. Data quality

- **Format:** text PDFs with Court letterhead. The ones read extracted cleanly with `pypdf`. Charts in the syntheses are images, so their numbers are lost. Some mirrors carry a "PROIECT" watermark (Dâmbovița). Scanned reports were not seen but cannot be ruled out. **Unverified.**
- **Keys:** CUI only in free text; no SIRUTA; RFPL annex by name; subordinate entities folded into the UAT.
- **Amounts:** in free text in individual reports (e.g. "stabilită întinderea prejudiciului la nivelul sumei totale de 620.160 lei", Dâmbovița). The RFPL annex has them in tables, in **thousand lei**, with "–" for reports not yet finalised. Prejudicii are estimates, which the entity may change later.
- **Two regimes.** Missions before the 2022 Regulation ended in a binding *decizie* with measures (the MF follow-up still tracks "Decizia nr. 19/25.11.2022"). Under the new Regulation the output is a report with recommendations and a management action plan (art. 25, 29), and a decision only for blocking funds (art. 38). Report structure therefore differs across 2022–2023.
- **Coverage is a sample, not a census:** ~1.3k entities a year out of tens of thousands of public entities. "No audit" must never read as "clean" (the same caution as Coverage grey).
- **Typos in legal citations** in the source (Eforie cites "Legea nr. 98/2026"): data is shown as published.

## 9. Candidate Signal rules

Candidates only.

1. **Procurement findings + supplier concentration.** An authority with procurement findings (any, or prejudicii > 0) in an audit published in year Y that, in SEAP, awards more than a share X of its value to its top supplier in Y–1..Y+1. Needs Curtea de Conturi (authority + finding category) and SEAP.
   - *Sizing:* the audit half fires broadly. 791 of 1,361 entities checked in 2024 (58.12%) had procurement deviations, totalling 2,325 deviations (2024 procurement synthesis). On "any finding" the rule would barely narrow SEAP authorities. A version keyed on **procurement prejudicii > 0** is more selective, but per-entity procurement prejudicii are only in the synthesis's Annex 2/3. The mirrored copy stops at page 59 of an index that runs to p. 222, so whether that annex names entities is **unverified**.
   - The SEAP half was not measured. National firing rate: **unsized**.
2. **Prejudicii in an RFPL annex and SEAP spend in the same year.** A UAT with prejudicii > 0 in its county's RFPL annex for fiscal year Y, shown next to its SEAP records for Y. This is more an entity-page overlay than a Signal. Firing rate is bounded by UATs with prejudicii > 0. In Constanța 2022, 11 of the 28 completed missions (23 financial, 5 compliance) found prejudicii > 0 (counted from the annex above). Nationally **unsized**.
3. **SEAP notice cited in an audit finding.** A SEAP Record whose notice code (CN…/SCN…/DA…) appears in an audit report's text. This is the only Record-level link available. It is rare and needs full-text extraction. **Unsized.**

## 10. Who already uses it

- **Journalists:** routinely, one report at a time. For example, Ziua de Constanța republishes full reports and RFPLs (sources above); Gazeta Dâmboviței (above); Digi24 on Sector 5: https://www.digi24.ro/stiri/actualitate/politica/nereguli-la-primaria-lui-piedone-23-mil-lei-pentru-salubrizare-si-asfaltari-la-preturi-umflate-ce-a-mai-descoperit-curtea-de-conturi-3779525.
- **Public Record** aggregated the Court's criminal referrals for 2018–2024: about 6.8 bn lei of prejudicii identified against about 6 m lei recovered (https://publicrecord.ro/2026/02/12/mandatul-busuioc-la-curtea-de-conturi-68-miliarde-prejudicii-jumatate-din-sesizari-clasate-sase-milioane-de-lei-recuperate6-ani-6-miliarde-prejudiciu-6-milioane-recuperate/).
- **Funky Citizens** cites Court data on internal audit capacity in communes (via https://buletin.de/bucuresti/analiza-funky-citezens-doua-treimi-dintre-comunele-din-ilfov-nu-isi-acopera-functionarea-din-venituri-proprii-polul-bucuresti-are-nevoie-de-guvernare-comuna/).
- **No structured, per-entity dataset** of Court findings by Expert Forum, OpenTender or others was found. **Unverified absence**, from searching only.

## 11. Recommendation

**Keep, as an explorable document Source keyed by institution, scheduled late, and only after access is resolved.**

- **Why keep.** It is the only official, per-institution record of audited wrongdoing in public spending. It joins on the authority side by CUI (individual reports) or by UAT name within a county (RFPL annex). It has no people problem, because natural persons and contractors are redacted. It is small in volume. On an authority's entity page, "audited in 2024: opinion with reservations, 2.9 m lei estimated prejudicii, report link" is high-value context next to its SEAP records.
- **What it is not.** It is not a Money-lens Source. Prejudicii are auditor estimates, a different measure from awarded value, so they need their own count lens (audits / entities with findings per county) and a data-caveats section. It cannot link findings to suppliers.
- **Blockers, before any Release ticket:**
  1. **Access.** Ask the Court for a bulk export, an allowlist for a polite Connector, or an SPID extract (entity, CUI, year, audit type, opinion, prejudicii / venituri / abateri, deviation codes). Without that, a Connector would have to defeat a bot challenge, which is not acceptable.
  2. Confirm the reuse terms (legal-posture ticket).
  3. Read a sample of RFPLs across counties and years to confirm the annex is everywhere.
- **Reference sources it would need:** none new. SIRUTA/ANCPI for UAT names, MF's list and ANAF for CUIs, all already brought in by SEAP.
- **Minimal first cut** if access stays document-only: the 42 RFPL annexes per year (per-entity figures, placement by county) plus a link list of individual reports with the CUI extracted. Leave full-text finding extraction for later.
