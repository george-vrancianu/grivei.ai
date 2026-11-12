# Monitorul Oficial: what is freely reusable and not elsewhere

Research for [#118](https://github.com/george-vrancianu/grivei.ai/issues/118), on the map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Checked 2026-11-12. "Unverified" marks anything not confirmed from a primary source.

## Bottom line

- **Partea I and Partea a II-a are free, permanently, as PDF**, and since 2021 the law says outright that this free copy is available "for search, saving, distribution and printing". The official texts in them are outside copyright. They are reusable, but they are legislation, not a dataset, and the same texts are already free and structured on legislatie.just.ro, behind a SOAP API.
- **Partea a III-a to a VII-a, which hold company acts (IV), cooperatives (VII) and procurement or concession notices (VI), are free only "for reading" for 10 days after publication.** After that they are a paid product (subscriptions, or 2 lei per page for scans). No bulk download, no licence and no API exist for them, and the site sits behind a web application firewall. Lawful bulk reuse of Partea a IV-a is not on offer.
- **AEP's party-financing reports in Partea I are mirrored by law on AEP's own site**, so #115 covers them.
- **Since Law 265/2022, most company registrations go to ONRC's free Buletinul electronic al registrului comerțului (BERC).** Partea a IV-a still carries the acts the law names: registration extracts, general-meeting resolutions, appointments of directors, merger projects and liquidator appointments.
- **What is genuinely not available elsewhere:** the full text of Partea a IV-a filings (general-meeting resolutions, share-capital changes, administrator and director changes over time, mergers), and the paid archive before BERC. None of it is lawfully harvestable in bulk.
- **Recommendation: drop as a Source.** Keep Partea I only as a citation target (a link per act, no Connector), and revisit Partea a IV-a only if RA Monitorul Oficial grants a written bulk licence.

## Checklist

### 1. Access

| Part | What it holds (Law 202/1998) | Free access | Paid access |
|---|---|---|---|
| I | Laws, Government decisions and ordinances, ministerial orders, Constitutional Court decisions, and acts other laws send to Partea I, among them AEP and party financing reports (art. 5) | Permanent, free PDF "without watermark", available the same day (art. 18(2), as amended by Law 57/2021) | Print (art. 18(1)); Autentic-Monitor / Expert-Monitor subscriptions |
| II | Parliamentary stenograms, reports to Parliament (art. 6) | Permanent, free PDF (art. 18(2)) | Same |
| III | Legal acts, notices and communications under specific laws (art. 7) | 10 days, "read-only version" (art. 19) | Subscription; scan or print at 2–2.5 lei/page |
| IV | Acts about economic operators and other legal persons (art. 8) | 10 days, read-only (art. 19) | Part IV subscription delivered by e-mail; per-act orders to expert-monitor@ramo.ro |
| V | Collective labour agreements (art. 9) | 10 days, read-only | Same |
| VI | Award notices for procurement and concessions (art. 10) | 10 days, read-only | Same |
| VII | Cooperative acts (art. 11) | 10 days, read-only | Same |

Sources:
- Law 202/1998, republished, consolidated to 05.04.2021: https://legislatie.just.ro/Public/DetaliiDocument/190749 (arts. 5–11, 18, 19). Law 57/2021, which rewrote art. 18, is listed in that page's history (MO nr. 337 of 2 April 2021).
- The e-monitor page restates the coverage it offers: Partea I in Romanian from 2000, Partea I in Hungarian from 2008, Partea a II-a from 2000, Parts III–VII "for reading" for 10 days. Any issue since 1990 can be ordered at 2 lei/page (full issue) or 2.5 lei/page (selected pages): https://monitoruloficial.ro/e-monitor/
- Part IV delivery: by e-mail on the day of publication for Part IV subscribers, or by order: https://monitoruloficial.ro/informatii-persoane-juridice/
- Paid electronic products (Expert-Monitor, Autentic-Monitor): https://monitoruloficial.ro/ (home page) and https://monitoruloficial.ro/intrebari-frecvente/

**Bulk or API:** none for MO itself. The e-monitor page loads each day's issue list through an internal script (`ramo_customs/emonitor/get_mo.php`, visible in the page source of https://monitoruloficial.ro/e-monitor/). There is also an authenticated, rate-limited lookup from CUI to MO registration number, issue number and date (`ramo_customs/api/cui.php`; the page's own JavaScript handles 401 and 429). Neither is documented or offered for reuse. I did not call them. Fetching `robots.txt` with curl returned an F5 web-application-firewall challenge page instead of the file, so automated access is actively filtered. **Unverified:** whether the free Parts I and II PDFs have stable, scriptable URLs.

**The legislation itself, elsewhere:** the Ministry of Justice's Portal legislativ offers the normative acts as consolidated text, free, through a SOAP web service (`GetToken`, then `Search`): https://legislatie.just.ro/ServiciulWebLegislatie.htm

### 2. Licence and reuse terms

- **No open licence.** The "Condiții de utilizare" page is only a cookie notice, with no reuse terms: https://monitoruloficial.ro/conditii-de-utilizare/. The footer reads "© Copyright 2022 - Regia Autonomă Monitorul Oficial".
- **Statute:** art. 18(2) of Law 202/1998 makes the free Parts I and II PDF accessible "inclusiv pentru căutare, salvare, distribuire și imprimare" (including for search, saving, distribution and printing): https://legislatie.just.ro/Public/DetaliiDocument/190749. For Parts III–VII, art. 19 grants only a read-only view for 10 days, so redistribution is not granted.
- **Copyright:** Law 8/1996, art. 9(b), excludes "official texts of a political, legislative, administrative, judicial nature" from copyright: https://legislatie.just.ro/Public/DetaliiDocument/201472. That covers Partea I acts. Part IV filings are private acts (companies' general-meeting resolutions and the like), so they are not clearly "official texts". RA Monitorul Oficial could also claim the database maker's sui generis right, which lets it prohibit extraction or reuse of all or a substantial part of the database, including repeated, systematic extraction of insubstantial parts (same law, the "fabricantul bazei de date" articles). **Legal reading, not verified with counsel.**
- **Open-data law:** Law 179/2022 covers public-sector bodies, and public enterprises only in utility and transport sectors. It excludes documents held by public enterprises outside "services of general interest" and documents subject to third-party IP: https://legislatie.just.ro/Public/DetaliiDocument/256414 (art. 1). RA Monitorul Oficial is a *regie autonomă* under the Chamber of Deputies (Law 202/1998 art. 1(2)). **Unverified** whether Law 179/2022 reaches its archive. Even if it did, the law creates no duty to publish bulk Part IV data.
- **Personal data:** RA Monitorul Oficial treats publication as lawful processing and says published content cannot be altered: https://monitoruloficial.ro/intrebari-frecvente/. Republishing it in bulk would be a separate processing by Grivei, under the people gate (#121, #122).

### 3. Join key into the graph

- **Partea I:** none. Acts are keyed by type, number, date and issuer, which sometimes matches an institution by name. Joining an act to an authority would mean name matching against the MF list.
- **Partea a IV-a:** company name, trade-register number and (usually) the CUI. The CUI lookup endpoint above shows that RA Monitorul Oficial indexes filings by CUI internally. **Unverified** for older issues.

### 4. People

Partea a IV-a is full of people: administrators, directors, shareholders, liquidators and the people named in general-meeting resolutions. Law 265/2022 art. 16(1) lists the acts published there, "with respect for personal-data legislation": https://legislatie.just.ro/Public/DetaliiDocument/257835. Law 31/1990, as amended by Law 265/2022, publishes appointments and changes of administrators and directors in Partea a IV-a (same page, consolidated Law 31/1990 provisions on the board). People fall behind the gate in `docs/release-recipe.md` §3. Partea I names people only in decrees and appointments, like the prefects appointed in MO nr. 944 of 12 Nov 2026 (home page listing, https://monitoruloficial.ro/).

### 5. Money measure

There is none to sum. Share-capital amounts in Part IV resolutions, or donation totals in AEP reports, are free-text figures inside PDFs. AEP's figures belong to #115.

### 6. Volume

Not measured, because there is no bulk download, I did not call the internal endpoints, and the WAF was in the way. Partea I had reached nr. 944 by 12 Nov 2026 (https://monitoruloficial.ro/), so about 1,100 issues a year. **Unverified:** Part IV issue counts and page volumes.

### 7. History depth and cadence

The free PDFs go back to 2000 (Partea I and II) and 2008 (Hungarian Partea I). Every part is on paid order back to 1990, with the Buletinul Oficial for 1966–1989 (https://monitoruloficial.ro/e-monitor/). Issues come out daily on working days. Partea a IV-a narrowed after 26 Nov 2022, when Law 265/2022 moved registrar decisions to BERC. Art. 15(2) sends registrar decisions to the Buletin, art. 16(1) keeps the listed acts in MO, and art. 15(4) says publishing in and consulting the Buletin is free: https://legislatie.just.ro/Public/DetaliiDocument/257835

### 8. Data quality

All of it is PDF. Part IV is typeset from filers' Word or PDF uploads, under a 2,000-characters-per-page tariff (https://monitoruloficial.ro/informatii-persoane-juridice/), so it is free text in no structured form. Corrections are published as separate rectifications (Law 202/1998 art. 17). Parsing would need layout-aware extraction per act. **Unverified:** whether pre-2008 PDFs have a text layer.

### 9. Candidate Signal rules

These are candidates only, and all of them would need Part IV, which isn't lawfully available in bulk. Firing rates can't be estimated.
- An administrator change at a SEAP supplier in the 90 days before a contract award (SEAP plus Part IV). People are behind the gate.
- A share-capital increase or merger within N days after a large award (SEAP plus Part IV).
- A supplier dissolved or struck off while still holding active contracts. This one doesn't need MO: the dissolution and strike-off decisions are published free in BERC (Law 31/1990 provisions as amended by Law 265/2022, same page), and ONRC status is covered by #109.

### 10. Who already uses it

**Unverified.** I found no primary statement from Expert Forum or OpenTender on using MO in bulk. Commercial legal-information vendors resell Partea I in consolidated form, and RA Monitorul Oficial sells its own (Expert-Monitor). Investigative journalists are commonly understood to buy individual Part IV issues when reconstructing a company's history. I did not confirm this from a primary source.

### 11. Recommendation

**Drop as a Source and as a Connector.**

- What is free (Parts I and II) is legislation already served better by legislatie.just.ro, which has a free SOAP API and consolidated text. The only part of it that touches our graph, AEP's party-finance publications, AEP must by law also publish on its own site (Law 334/2006 art. 51(1): https://legislatie.just.ro/Public/DetaliiDocument/169064), so #115 covers it.
- What would be new, Partea a IV-a's history of company acts, is paid, read-only for 10 days, behind a WAF, without a licence, and full of person data. Harvesting it daily within each 10-day window would mean systematic extraction against a database owner's right, with no grant to reuse. That is not a lawful bulk posture.
- Free alternatives already cover most of the need: the ONRC open data and Law 265/2022 art. 12 free company data, which include legal representatives (#109), and BERC for registrar decisions, dissolutions and strike-offs.
- **Keep, as a pattern:** link each Record or entity to the MO issue it cites (number and date) where another Source gives one. Ask RA Monitorul Oficial for a written bulk licence for Partea a IV-a only if the entity-linking map (#124) later wants a company-officer history that ONRC can't provide.
