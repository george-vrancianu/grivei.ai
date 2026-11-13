# EU-fund natural-person beneficiaries: retention past the 2-year deletion

Research for [#152](https://github.com/george-vrancianu/grivei.ai/issues/152) on the map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Gathered 2026-11-13. It builds on the [person-data legal research](https://github.com/george-vrancianu/grivei.ai/blob/research/person-data-legal/docs/research/person-data-legal.md) (#121), the [EU cohesion funds dossier](https://github.com/george-vrancianu/grivei.ai/blob/research/eu-cohesion-funds/docs/research/eu-cohesion-funds.md) (#110) and the [PNRR dossier](https://github.com/george-vrancianu/grivei.ai/blob/research/pnrr/docs/research/pnrr.md).

**This is not legal advice.** It collects the texts and case law so a decision can be made. ADR 0009 requires a Romanian data-protection lawyer to review the person-data posture before any person-level Source goes live. Every point marked **(unclear)** below should go to that review.

Method: the EU texts were read in the official Publications Office XHTML (EUR-Lex itself blocks automated fetches). The CJEU judgments were read in full from the same source. Law 190/2018 was read on legislatie.just.ro, the OGL-ROU-1.0 licence on data.gov.ro, and the WP29 and EDPB documents as their official PDFs. Anything marked **(unverified)** was not checked against a primary source.

## Short answer

- **The 2-year deletion in CPR art. 49(3) binds the managing authority, not Grivei.** No text puts a deletion duty on a reuser.
- **But keeping the names *public* after the deletion date is hard to defend** under ADR 0009's legitimate-interest basis. Three things point the same way:
  - the 2-year limit is the EU legislature's own proportionality fix after *Schecke*;
  - *Latvijas Republikas Saeima* (C-439/19) holds that reuse cannot go beyond what the source itself may lawfully publish;
  - GDPR storage limitation, read with *Google Spain*, says lawful data can become excessive as time passes.
- **Keeping them internally (Raw archive) is easier to defend but needs a stated purpose and an end date.** Rebuilds and provenance justify keeping the rest of the file. For the names themselves, the only strong ground past the window is defence of legal claims (GDPR art. 17(3)(e)), and that is time-limited.
- **The same reasoning reaches PNRR's ~870 natural-person rows, even though no EU deletion rule covers that file.** It does **not** reach the 2007–2013 SMIS legal-representative fields in the same way: the source still publishes those files 10 years on, and they name people in a representative role, not as recipients.
- **Recommendation: split at fetch.** Natural-person names go to a short-lived sidecar file outside the Raw archive. The archive keeps everything else unchanged. The graph never shows the name after the source's window, and a scheduled purge deletes the sidecar. Details in §6.

## 1. What the EU rules say

### 1.1 Cohesion funds 2021–2027: Regulation (EU) 2021/1060 (CPR), art. 49

- Art. 49(3): the managing authority publishes the list of operations, updated at least every 4 months. It contains "(a) in the case of legal entities, the beneficiary's and, in the case of public procurement, the contractor's name; (b) where the beneficiary is a natural person the first name and the surname", plus the amounts, dates and location. For a natural person, the location is only "the NUTS 2 level region" (point (m)).
- Same paragraph, last subparagraph: "For data referred to in points (b) and (c) of the first subparagraph, the data shall be removed 2 years from the date of the initial publication on the website."
- Art. 49(4): the list must be published "in open, machine-readable formats … which allows data to be sorted, searched, extracted, compared and reused".
- Art. 49(5): "The managing authority shall inform the beneficiaries that the data will be made public before the publication takes place".
- Recital 40: managing authorities should publish this "while taking account of requirements for data protection of personal data in accordance with Regulation (EU) 2016/679".

Source: [Regulation (EU) 2021/1060, art. 49 and recital 40](https://eur-lex.europa.eu/eli/reg/2021/1060/oj) (read from the Publications Office XHTML, CELEX 32021R1060).

Three things follow:
- The duty to remove falls on the managing authority. Nothing in art. 49 speaks to reusers.
- Art. 49(4) invites reuse but says nothing about how long a reuser may keep the data. It points to the Open Data Directive, and that directive leaves personal data to the GDPR.
- The notice to beneficiaries under art. 49(5) describes publication by the managing authority. Whether a beneficiary can "reasonably expect" a third party to show their name for longer is the heart of the balancing test (§2.3).

### 1.2 Cohesion funds 2014–2020: Regulation (EU) 1303/2013, art. 115 and Annex XII

- Art. 115(2): the list of operations is kept "in a spreadsheet data format, which allows data to be sorted, searched, extracted, compared and easily published on the internet". The website "may clearly indicate the applicable licensing rules".
- Annex XII §1: "beneficiary name (only of legal entities; no natural persons shall be named)".
- Annex XII §3.2: beneficiaries are told that "acceptance of funding constitutes an acceptance of their inclusion in the list of operations".
- There is **no** retention or deletion rule for the list.

Source: [Regulation (EU) No 1303/2013](https://eur-lex.europa.eu/eli/reg/2013/1303/oj) (CELEX 32013R1303).

So for 2014–2020 the question changes shape: natural persons should not be in the lists at all. What does appear (per #110) is PFA and II beneficiaries, whose business names contain a person's name. **(unclear)** Whether a PFA/II, which has no legal personality under Romanian law, counts as a "natural person" for Annex XII. In practice the managing authorities published them.

### 1.3 The same 2-year pattern elsewhere in EU law

The EU legislature uses the same 2-year limit every time it publishes natural-person recipients of EU money:

| Text | Rule |
|---|---|
| CAP, [Reg. (EU) 2021/2116 art. 98(4)](https://eur-lex.europa.eu/eli/reg/2021/2116/oj) | Beneficiary data "shall remain available for two years from the date of its initial publication". Names are not published at all if aid is ≤ EUR 1,250 a year. |
| RRF, [Reg. (EU) 2021/241 art. 25a(4)](https://eur-lex.europa.eu/eli/reg/2021/241/oj) (added by Reg. 2023/435) | Top-100 final recipients portal: "Where personal data are published, the information … shall be removed … two years after the end of the financial year in which the funding has been paid". |
| Financial Regulation, [Reg. (EU, Euratom) 2024/2509 art. 38(7)](https://eur-lex.europa.eu/eli/reg/2024/2509/oj) | Commission's recipients database: "Where personal data are published, the information shall be removed two years after the end of the financial year in which the funds were legally committed." Art. 38(3) also says that for natural persons, disclosure "shall be based on relevant criteria such as the frequency or the type of the measure and the amounts involved". |

The CAP rule is the direct descendant of the scheme struck down in *Schecke* (§3.1). The 2-year window and the amount threshold are the two levers the legislature used to make naming proportionate. A reuser who drops one of them has to justify that choice on its own.

### 1.4 The data.gov.ro licence does not cover personal data

The 2014–2020 and 2007–2013 files on data.gov.ro are under OGL-ROU-1.0 (CKAN shows `uk-ogl` for the 2007–2013 datasets). The licence:
- requires that use "să nu încalce drepturile de protecție a datelor cu caracter personal";
- under "D. EXCEPȚII" says: "Această licență nu este aplicabilă: datelor cu caracter personal, dacă există sau pot fi recreate în informația furnizată".

Source: [OGL-ROU-1.0, data.gov.ro](https://data.gov.ro/base/images/logoinst/OGL-ROU-1.0.pdf).

So the licence gives no right to reuse the names. Reuse of the names rests only on Grivei's own GDPR basis (ADR 0009). That would be true anyway, since a licence is not a GDPR legal basis, but the licence says it in terms.

## 2. What the GDPR and Romanian law add

Source for all GDPR quotes: [Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj) (CELEX 32016R0679).

### 2.1 Purpose limitation, art. 5(1)(b), and compatibility, art. 6(4)

- Art. 5(1)(b): data are "collected for specified, explicit and legitimate purposes and not further processed in a manner that is incompatible with those purposes".
- Art. 6(4) lists what decides compatibility: the link between purposes, "the context in which the personal data have been collected", "the possible consequences of the intended further processing for data subjects", and "the existence of appropriate safeguards, which may include encryption or pseudonymisation".
- Grivei is a separate controller, not the managing authority continuing its own processing. WP29 says re-users "would have to comply with data protection law, as data controllers" ([Opinion 02/2016, WP239, §3.6](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2016/wp239_en.pdf)). So Grivei needs its own art. 6(1) basis (ADR 0009: art. 6(1)(f)). **(unclear)** Whether art. 6(4) also applies to a third party's reuse, or only to the original controller, is debated. Either way, the art. 6(4) factors come back into the art. 6(1)(f) balancing test.
- Purpose fit is good: Grivei's purpose (scrutiny of public money) is close to the CPR's stated aim (transparency of EU funds, recital 40). The issue is **duration**, not purpose.

### 2.2 Storage limitation, art. 5(1)(e)

- Data are "kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data are processed".
- Longer storage is allowed "solely for archiving purposes in the public interest, scientific or historical research purposes or statistical purposes in accordance with Article 89(1)", with safeguards.
- *Digi* (C-77/21): storage limitation "requires the controller to be able to demonstrate … that personal data are kept only for as long as is necessary" (para. 53). Keeping data in a secondary database longer than its purpose needs breached art. 5(1)(e), and an oversight was no excuse ([C-77/21, CELEX 62021CJ0077](https://curia.europa.eu/juris/liste.jsf?num=C-77/21)). That is close to the Raw archive situation: a copy kept for rebuilds, beside the live data.
- **The art. 89 archiving route is probably not open to Grivei (unclear).** Recital 158 describes archives in the public interest as services which "pursuant to Union or Member State law, have a legal obligation to acquire, preserve … records of enduring value". Grivei has no such legal mandate. Law 190/2018 art. 8(2) adds Romanian derogations for archiving "în interes public" but does not widen who qualifies.

### 2.3 Legitimate interest and reasonable expectations, art. 6(1)(f)

- EDPB [Guidelines 1/2024 on legitimate interest](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf) (v1.0, adopted 8 October 2024, public-consultation version):
  - footnote 52: "The fact that personal data have been manifestly made public does not automatically mean that they may be processed under Article 6(1)(f) GDPR", though it is a factor in the balancing;
  - para. 53: giving the art. 13/14 notices "is not sufficient in itself to consider that the data subjects can reasonably expect a given processing".
- A grant beneficiary was told their name would be public on the programme website for 2 years. Being shown by a third party for longer goes past that expectation. Showing them inside the same window does not.

### 2.4 Erasure, art. 17

- Art. 17(1)(a): erasure is owed where data "are no longer necessary in relation to the purposes for which they were collected or otherwise processed". Art. 17(1)(c) covers a successful objection under art. 21(1).
- Art. 17(3) exceptions that might apply to Grivei:
  - (a) "for exercising the right of freedom of expression and information". ANSPDCP requires a case-by-case assessment (2020 reply, see #121 research);
  - (e) "for the establishment, exercise or defence of legal claims". This is the cleanest ground for keeping an unchanged copy of what was fetched and shown, for as long as a claim is possible.
- Art. 17(3)(b) (legal obligation or public task) belongs to the managing authority, not Grivei.

### 2.5 Journalism, GDPR art. 85 and Law 190/2018 art. 7

- Law 190/2018 art. 7 lifts GDPR Chapters II–VII and IX for processing "în scopuri jurnalistice", but only for data "făcute publice în mod manifest de către persoana vizată sau care sunt strâns legate de calitatea de persoană publică a persoanei vizate ori de caracterul public al faptelor în care este implicată" ([Law 190/2018](https://legislatie.just.ro/Public/DetaliiDocument/203151)).
- **(unclear)** Whether receiving an EU grant is a "public fact" that brings a private individual inside art. 7. The #121 research concluded that art. 7 does not cover private individuals with no public role. ADR 0009 uses art. 7 only as a second layer. It should not be relied on here.
- Even where art. 7 applies, *Latvijas* holds that art. 85 "cannot be interpreted as justifying the disclosure to any person who so requests" of data whose publication the GDPR otherwise forbids (C-439/19, para. 121).

## 3. Case law

### 3.1 *Volker und Markus Schecke and Eifert* (C-92/09 and C-93/09, Grand Chamber, 9 November 2010)

[CELEX 62009CJ0092](https://curia.europa.eu/juris/liste.jsf?num=C-92/09)

- The Court annulled, for natural persons, the rules that published every CAP beneficiary by name with exact amounts.
- The struck-down scheme **already had a 2-year limit**: Reg. 259/2008 art. 3(3) said "[t]he information shall remain available on the website for two years" (para. 23). The 2-year window alone did not save it.
- What was missing was a distinction "according to the duration, frequency or nature and amount of the aid received" (para. 79). The institutions had not considered "limiting the publication of data by name relating to those beneficiaries according to the periods for which they received aid, or the frequency or nature and amount of aid received" (para. 81).
- "No automatic priority can be conferred on the objective of transparency over the right to protection of personal data … even if important economic interests are at stake" (para. 85).
- Lesson for Grivei: the levers are period, frequency, nature and amount. ADR 0009's Naming threshold works on amount. The CPR uses period. Using the amount lever while dropping the period lever is not ruled out by *Schecke*, but it has not been tested **(unclear)**. The CAP regime after *Schecke* uses both (EUR 1,250 floor *and* 2 years).

### 3.2 *Latvijas Republikas Saeima* (C-439/19, Grand Chamber, 22 June 2021)

[CELEX 62019CJ0439](https://curia.europa.eu/juris/liste.jsf?num=C-439/19)

- The GDPR precluded a law letting the register give penalty-point data to economic operators "in order for the data to be re-used and disclosed to the public by them" (para. 126), for "reasons identical" to those that barred the register's own publication.
- Lesson: a reuser's lawful scope is tied to what may lawfully be public at the source. The data in that case were art. 10 data and the case is about the source's duty, so the analogy is not exact **(unclear)**. Still, it is the closest CJEU statement on republication by third parties.

### 3.3 *Google Spain* (C-131/12, Grand Chamber, 13 May 2014)

[CELEX 62012CJ0131](https://curia.europa.eu/juris/liste.jsf?num=C-131/12)

- "even initially lawful processing of accurate data may, in the course of time, become incompatible with the directive where those data are no longer necessary in the light of the purposes for which they were collected or processed … in the light of the time that has elapsed" (para. 93).
- This is the time-decay rule. For a grant to a private individual, the source's 2-year window is the obvious evidence of when "no longer necessary" begins.

### 3.4 *Manni* (C-398/15, 9 March 2017)

[CELEX 62015CJ0398](https://curia.europa.eu/juris/liste.jsf?num=C-398/15)

- Company-register data on directors need not be erased after a set time (para. 56). Access may be limited "exceptionally", "on the expiry of a sufficiently long period after the dissolution", case by case (paras. 60, 64).
- ADR 0009 already uses *Manni* for register roles. It does **not** carry over to grant recipients. *Manni* rests on a register whose purpose is lasting legal certainty for third parties. Art. 49 states the opposite intent with its 2-year removal.

### 3.5 *Satakunnan Markkinapörssi v Finland* (ECtHR GC, 2017)

Covered in the #121 research. Mass republication of lawfully public data could be stopped. It supports the narrower reading.

## 4. Guidance

- **WP29 Opinion 02/2016 (WP239), §3.4 "Retention periods":** retention "should be determined according to the legitimate purposes for which they are held … It is preferable that the retention periods are clearly stated and also include provisions on on-line availability". It separates "a period for the publication of the data and a period for any archive". §3.6 recommends "internal search engines" or selective access where there is no "global public interest", and says re-users must comply as controllers. [PDF](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2016/wp239_en.pdf). WP29 opinions were not formally re-adopted by the EDPB; they are persuasive, not binding.
- **WP29 Opinion 06/2013 on open data (WP207):** the "principle of reuse" is "not automatic, and cannot override applicable provisions of data protection law"; reuse must stay compatible with the purposes the public body set. [PDF](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2013/wp207_en.pdf).
- **EDPB Guidelines 1/2024:** see §2.3.
- **ANSPDCP:** no guidance on republishing EU-fund beneficiaries was found. Related signals:
  - MFE said when it opened the 2007–2013 SMIS archive that it would anonymise natural persons who were parties to procurement contracts ([alba24.ro](https://alba24.ro/ministerul-fondurilor-europene-pune-la-dispozitia-cetatenilor-arhiva-electronica-smis-2007-2013-privind-proiectele-si-contractele-de-achizitie-523581.html), press report, **unverified** against MFE). That matches the zeroed contractor ids in `contracteanonimizate.csv` (#110).
  - ANSPDCP fined ANAF RON 16,000 over its list of individual tax debtors. As reported, the problems included outdated data on some people ([profit.ro](https://profit.ro/stiri/fiscul-a-fost-amendat-cu-16-000-de-lei-pentru-ca-a-publicat-lista-persoanelor-fizice-datornice-reactia-anaf-15485878), press report). This is a weak signal that stale lists of named individuals draw enforcement.

## 5. The three datasets in the ticket

| Dataset | Who is named | EU deletion rule | Source still publishes? | Constraint on Grivei |
|---|---|---|---|---|
| 2021–2027 art. 49 lists (and Kohesio) | Natural-person beneficiaries: first name and surname, NUTS2 region | Yes, 2 years from first publication (CPR 49(3)) | No, after 2 years if the managing authority complies | Strongest. Public naming past the window is hard to defend. The raw copy needs a purpose and an end date. |
| PNRR projects (`progres_tehnic_proiecte`) | ~871 PF rows, mostly C2 afforestation; name in `denumire_beneficiar`, sometimes in the project title | None for this file. RRF art. 25a(4) covers only the top-100 portal, where the name columns are empty (#PNRR research). | Yes (latest snapshot) | Same reasoning by analogy (storage limitation, reasonable expectations, the EU 2-year pattern), but no hard date. **(unclear)** MIPE's national legal basis and retention for publishing PF names was not found. |
| 2007–2013 SMIS financing contracts | `LEGAL_REPR`, `LEGAL_REPR_POS`, plus `ADDRESS`, `PHONE`, `FAX`, `EMAIL` (16,058 rows) | None. Reg. 1083/2006 / 1828/2006 not checked in this session (the 1828/2006 cellar record returned 404) **(unverified)** | Yes. data.gov.ro still serves both datasets, unchanged since 2016 (CKAN `metadata_modified` 2016-10-11 and 2016-12-06) | Weaker. These are people in a representative role, not recipients, and the source keeps them public. The concern is minimisation and age (*Google Spain*), not a deletion date. |

Notes:
- **ADR 0011 already limits what Grivei can do with these names.** An EU-fund or PNRR natural-person beneficiary has a name and at most a region, with no birth date. So:
  - there is no confirmed link, and no person page;
  - the Naming threshold ("total public money an individual must receive") cannot be totalled across rows, because name alone never links rows. At most it can be applied per operation;
  - a beneficiary above the threshold would at most appear as an unlinked name on the operation's record.
  The value of naming is therefore low, and so is the cost of not naming.
- **2007–2013 `LEGAL_REPR`** could become a confirmed link only through ADR 0011's "name given against a CUI" route, after the beneficiary is matched to a CUI (ADR 0013), and only if ONRC history covers 2007–2016. ONRC itself is the better source for the same roles, with dates.

## 6. Options for the Connector

Each option covers public display (the graph and explorer) and the Raw archive (ADR 0004).

### Option A: keep everything, name above the Naming threshold indefinitely

- *Display:* named above the threshold, with no time limit. *Archive:* unchanged, kept forever.
- *Legal footing:* art. 6(1)(f), arguing the amount threshold is the *Schecke* safeguard.
- *Weak points:*
  - it drops the period lever the legislature chose (§1.3, §3.1);
  - it goes past the beneficiary's expectations (§2.3);
  - it republishes beyond what the source may lawfully show (*Latvijas*, §3.2);
  - nothing justifies keeping the names in the archive past any claims window (*Digi*).
- **Not recommended.**

### Option B: mirror the source window for display, keep the archive unchanged

- *Display:*
  - a natural person is named (above the threshold) only while the name is inside the source's window: from first fetch until the earlier of first-seen + 2 years and the first fetch where the source no longer carries the name;
  - afterwards the row stays in the graph as "Persoană fizică" with its amounts, operation and NUTS2 region.
- *Archive:* unchanged and kept forever.
- *Legal footing:*
  - display matches the source and the CPR window, which is defensible under art. 6(1)(f);
  - archive retention rests on rebuildability and provenance, plus art. 17(3)(e) legal claims.
- *Weak point:* the names in the archive (and in restic snapshots and `pg_dump`) are kept with no end date. Art. 5(1)(e) and *Digi* need a stated limit. "We might rebuild" justifies keeping the file, not keeping identifiable names forever.
- **Acceptable short-term. Not enough alone.**

### Option C: Option B plus a purge job (redact in place)

- Like B, but after the display window plus a claims period, a job rewrites the archived files. Natural-person name cells become a keyed token (same keyed-hash idea as ADR 0011's page ids) or "Persoană fizică". A redaction manifest records the file, row, date and reason.
- Restic retention must be no longer than the purge horizon, or old snapshots still hold the names. The weekly `pg_dump` ages out the same way.
- *Legal footing:* storage limitation is met with a stated end date; art. 17(3)(e) covers the period kept.
- *Cost:* an ADR 0004 amendment, since archived files are no longer "unchanged" (they are unchanged except for recorded redactions). It also adds a job that edits archive files and must handle every file format (XLSX, PDF, JSON). Redacting PDFs in place is fragile.
- **Workable but heavier than D.**

### Option D (recommended): split at fetch into the archive file plus a personal-data sidecar

- At fetch, the Connector:
  1. writes the fetched file unchanged to a **quarantine** area, not the Raw archive;
  2. writes a derived copy to the Raw archive with natural-person name cells (and PF names in PNRR project titles) replaced by a keyed token;
  3. writes a small **sidecar** mapping token → name, dated, outside the Raw archive and outside the nightly restic job (or in a separate restic repository with its own `forget` policy);
  4. deletes the quarantined original once the derived copy and sidecar are checked. If keeping exact original bytes as evidence matters, the original goes into the sidecar store instead and is purged with it.
- *Display:* as in B. Names come from the sidecar only while inside the window, and only above the Naming threshold per operation. Otherwise the row shows "Persoană fizică".
- *Purge:* a scheduled job deletes sidecar entries after the display window plus a claims period. Rebuilds after that show "Persoană fizică", and nothing else in the graph changes.
- *Legal footing:*
  - display is defensible under 6(1)(f) as in B;
  - the archive holds no identifiable natural-person names, so there is no storage-limitation issue for it. Tokens made with a key held outside the repo are pseudonymised, not anonymised, so they are still personal data while the key exists. Destroying or rotating the key per purge cycle makes them effectively anonymous **(unclear)**: the lawyer should confirm;
  - the sidecar has a stated, enforced end date (art. 5(1)(e), WP239 §3.4 "period for the publication … and a period for any archive").
- *Cost:*
  - an ADR 0004 amendment, since this is the first Source whose archived file is a derived copy, not the fetched bytes;
  - format-specific redaction at fetch. That is easy for XLSX, CSV and JSON. PDFs from 2021–2027 managing-authority sites would be parsed to rows first, and the archive would keep the parsed rows plus a hash of the original PDF rather than the PDF.

### Option E: strip at fetch, never name

- Same as D but with no sidecar: names are never stored and never shown. EU-fund and PNRR natural persons are always "Persoană fizică".
- *Legal footing:* the safest one (minimisation, art. 5(1)(c)).
- *Cost:*
  - it departs from ADR 0009's rule that individuals above the Naming threshold are named;
  - it leaves no evidence copy of a name if one was ever wrongly shown (none would be).
- **Use it if the lawyer or the Naming-threshold decision says EU-fund natural persons should not be named at all.** Given ADR 0011 (no link, no page, no cross-row totals), this costs very little and is a reasonable default until that decision is made.

### Per dataset

- **2021–2027 art. 49 lists (and Kohesio):** Option D, or Option E until the Naming threshold is set.
- **PNRR PF rows:** Option D or E as well. No hard EU date applies, so the display window has to be a policy choice. The EU pattern (2 years from publication, or from the end of the financial year of payment as in RRF art. 25a(4)) is the natural one to borrow **(unclear)**. Project titles that contain the landowner's name must be tokenised too, or replaced by the measure name.
- **2014–2020 PFA/II beneficiaries:** keep the archive unchanged. No EU deletion rule applies and the source still publishes the files. Display as an unattached name per ADR 0013, or "Persoană fizică" per the Natural-person supplier convention. **(unclear)** Whether Annex XII's "no natural persons shall be named" should make Grivei treat PFA/II names as natural persons.
- **2007–2013 SMIS legal representatives:**
  - keep the archive unchanged: the source is still public, and no deletion rule applies;
  - drop `LEGAL_REPR`, `LEGAL_REPR_POS`, `ADDRESS`, `PHONE`, `FAX` and `EMAIL` at load. This is what #110 already proposed. None of them reach the graph;
  - if the legal representative is ever wanted, it comes from ONRC through ADR 0011, not from this file.
  - **(unclear)** Whether keeping individuals' phone and email in the archive for years is proportionate when Grivei never uses them. If the lawyer says no, apply Option D's split to just those columns.

## 7. Open questions for the lawyer review (ADR 0009)

1. Does a reuser relying on art. 6(1)(f) have to respect the CPR's 2-year window for *public display*? Or can an amount threshold (the Naming threshold) take its place? (§3.1, §1.3)
2. How far does *Latvijas* para. 126 reach a non-commercial reuser of data that the source itself published lawfully, but only for a limited time? (§3.2)
3. Can Grivei claim art. 17(3)(e) (legal claims) to keep an evidence copy of names it showed? For how long? The Romanian general limitation period of 3 years (Civil Code art. 2517) is the likely anchor **(unverified here)**.
4. Is a keyed token, with the key destroyed at purge, enough to treat the Raw archive copy as no longer personal data?
5. Does the art. 89 / Law 190/2018 art. 8(2) archiving route need a legal mandate (recital 158), so that it is closed to Grivei?
6. Is a private individual's EU grant a "public fact" under Law 190/2018 art. 7?
7. PNRR: what national act lets MIPE publish PF names in the projects file, and does it set a retention period?
8. 2014–2020: are PFA/II beneficiaries "natural persons" under Annex XII?

## 8. What this means for the ADRs (input for the decision, not decided here)

- **ADR 0004** needs an amendment if Option C, D or E is chosen: either a recorded redaction (C) or a derived archive copy with a short-lived sidecar (D/E). "Nothing lives only in the graph" still holds, because the sidecar is a time-limited input, not graph state.
- **ADR 0009** has a retention rule for register roles (*Manni*) but none for direct recipients. It would gain one: a natural person named as a recipient is named no longer than the source's own publication window, or, where the source sets none, a window the lawyer sets.
- The **release recipe's people gate** already loads PNRR and EU-fund natural persons as "Persoană fizică". Option E is that gate written into the Connector, and Option D is the gate plus time-boxed naming.
