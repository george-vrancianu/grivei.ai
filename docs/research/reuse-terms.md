# Reuse terms for Sources without a licence: PNRR, RegAS, portal.just.ro

Research for [#150](https://github.com/george-vrancianu/grivei.ai/issues/150) on the Source-roadmap map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Gathered 2026-11-13.

**This is not legal advice.** It collects the statutory texts and each body's published terms, so the Source roadmap can record a reuse posture. Where the law does not settle a point, this note says so and does not guess.

Access facts (endpoints, volumes, who the subjects are) come from the earlier dossiers and are not repeated here: `docs/research/pnrr.md` (branch `research/pnrr`), `docs/research/state-aid.md` (branch `research/state-aid`), `docs/research/portal-just.md` (branch `research/portal-just`). GDPR facts are in `docs/research/person-data-legal.md` (branch `research/person-data-legal`), and the posture built on them is ADR 0009.

## Summary

| Source | Reusable by default? | Legal basis | Conditions | Written request before Go-live? |
|---|---|---|---|---|
| PNRR (MIPE dashboard snapshots) | **Yes** | Law 179/2022 art. 3; no copyright in data (Law 8/1996 art. 9) | None imposed by MIPE. By law: no distortion of personal-data rules (art. 1(4)). Attribution is good practice, not a legal duty. | **Not needed.** An optional notice to MIPE is cheap. |
| RegAS (Consiliul Concurenței transparency API) | **Yes**, under the statute | Law 179/2022 art. 3; EU duty to publish awards | Credit the source (CC website terms §7). The same terms' §8 bans copying, distribution and archiving, which contradicts §7 and arguably Law 179 art. 11. | **Advisable.** It resolves the §7/§8 contradiction in writing. |
| portal.just.ro (court web service) | **Yes for organisation data**, probably. **No reuse right for natural-person party names** beyond what GDPR allows. | Law 179/2022 art. 3 (courts are probably "entități publice", **unclear**); GDPR via art. 1(4) | The portal terms have no reuse clause. The courts own the data. Names are removable on request, and cases come off the portal 3 years after they end. | **Advisable**, to MJ (and to the CSM if MJ points there). It confirms the 2013 "free, cite the source" line in writing. |

**Gist:** Law 179/2022 makes all three reusable by default, free and without conditions unless the holder sets proportionate ones. None has. GDPR still governs the people in them. Ask Consiliul Concurenței and MJ in writing before Go-live.

## 1. The law

### 1.1 Law 179/2022 on open data and the reuse of public-sector information

Read in full on [legislatie.just.ro (256414)](https://legislatie.just.ro/Public/DetaliiDocument/256414). Published in MO no. 577 of 14 June 2022. On 2026-11-13 the consolidated text carried no amendment annotations.

- **Default reusability.** Art. 3: the documents in art. 1(1) and (8) "sunt reutilizabile în scopuri comerciale sau necomerciale în conformitate cu cap. III și IV". There is no request or licence precondition. Chapter II (requests) is a route, not a gate.
- **Scope.** Art. 1(1)(a): "documentelor existente deținute de entitățile publice". Art. 2(k) defines "entitate publică" by reference to the Administrative Code art. 5(k), (l), (w), (aa), plus UATs and bodies governed by public law. Art. 2(i): a "document" is "orice conținut informațional sau orice parte a unui astfel de conținut", in any form.
- **Exclusions that could bite (art. 1(2)):**
  - (a) documents outside the body's legally defined remit;
  - (c) documents over which third parties hold IP;
  - (f) documents whose access is restricted, including where a special interest must be shown;
  - (h) documents whose access is excluded or restricted on personal-data grounds, "și părților din documentele accesibile … care conțin date cu caracter personal a căror reutilizare a fost definită prin lege ca fiind incompatibilă" with data-protection law or "ca aducând atingere protecției vieții private".
- **Personal data.** Art. 1(4): the law "nu aduce atingere" GDPR, Law 190/2018 and Law 506/2004. Art. 1(3): it "se bazează pe regimurile de acces … și nu le aduce atingere".
- **Database right.** Art. 1(7): the database maker's right in Law 8/1996 art. 141(1) "nu este exercitat de entitățile publice pentru a împiedica reutilizarea documentelor sau pentru a restrânge reutilizarea dincolo de limitele stabilite prin prezenta lege".
- **Conditions.** Art. 11(1): "Reutilizarea documentelor nu este supusă unor condiții, cu excepția cazului în care condițiile respective sunt obiective, proporționale, nediscriminatorii și justificate din motive legate de un obiectiv de interes general". Conditions must not "limit[a] în mod inutil" reuse or restrict competition.
- **Recommended licences.** Art. 11(4): "Creative Commons Atribuire 4.0 Internațional sau, după caz, Creative Commons Universal CC0".
- **Licence definition.** Art. 2(r) lists what a licence may address: "răspunderea, protecția datelor cu caracter personal, folosirea corectă a documentelor, garantarea nealterării lor și indicarea sursei". Attribution and no-alteration are therefore things a licence *may* impose. The law imposes neither where there is no licence.
- **Cost.** Art. 9(1): "Reutilizarea documentelor este gratuită", with marginal-cost recovery allowed.
- **Non-profit use.** Art. 2(bb): "Folosirea informațiilor de către entitățile nonprofit nu constituie reutilizare în scop comercial".
- **Requests** (art. 4):
  - Anyone may ask any public entity. The request must give name, address, the documents wanted and "scopul pentru care urmează să fie utilizate" (art. 4(2)).
  - The answer comes within 30 working days, extendable by 20 (art. 4(8)). A reasoned refusal comes within 15 working days (art. 4(9)).
  - Where no licence is needed, "se va utiliza o licență standard care va fi publicată și disponibilă online" (art. 4(5)).
  - Challenge: a prior complaint to the Autoritatea pentru Digitalizarea României (ADR), then the administrative court (art. 5).
- **High-value datasets.** Art. 16(1) and the annex. Relevant national categories:
  - 4(a), structured public-procurement data;
  - 6(f), "date privind surse de finanțare din fonduri publice";
  - 14(g), "date privind situația anuală a cauzelor intrate pe rolul instanțelor, după obiectul acestora". This is statistics, not party-level records.

  Art. 16(1) also says data from national registers other than those in annex points 1–17 "sunt considerate surse de date deschise". Whether RegAS counts as such a "registru național" is not defined anywhere found (**unclear**).
- **No implementing norms found.** Art. 18(1) required methodological norms within 60 days, to be approved by Government decision. A search found none (**unverified**: absence of evidence).

### 1.2 Law 109/2007, the law it replaced

- Law 109/2007 on the reuse of information from public institutions transposed Directive 2003/98/EC. Its art. 5(1) read "Reutilizarea documentelor deţinute de instituţiile publice este liberă". Art. 5(4) let institutions allow unconditional reuse "sau pot impune, dacă este cazul, o serie de condiţii" ([consolidated text, legislatie.just.ro, updated to 6 Dec 2015](https://legislatie.just.ro/Public/FormaPrintabila/00000G2U65EZ0OT1IZ41RJAZQBIH28HN)).
- Law 179/2022 does not repeal it by name. Art. 18(5) repeals "orice prevederi contrare". Art. 18(6) keeps Law 109/2007 only for requests filed before 179 entered into force. The legislatie.just.ro consolidated text of Law 109/2007 shows no repeal annotation.
- **Formal status: unclear.** In practice it is superseded, and both laws give the same answer: reuse is free by default.

### 1.3 Directive (EU) 2019/1024

Read from the Official Journal text ([op.europa.eu XHTML](https://op.europa.eu/o/opportal-service/download-handler?identifier=a6ef4c41-97eb-11e9-9369-01aa75ed71a1&format=xhtml&language=en); [ELI](http://data.europa.eu/eli/dir/2019/1024/oj)).

- **Art. 3(1):** Member States "shall ensure that documents to which this Directive applies … shall be re-usable for commercial or non-commercial purposes".
- **Art. 8(1):** "The re-use of documents shall not be subject to conditions, unless such conditions are objective, proportionate, non-discriminatory and justified on grounds of a public interest objective."
- **Recital 44:** licence conditions may cover "liability, the protection of personal data, the proper use of documents, guaranteeing non-alteration and the acknowledgement of source". Licences should "place as few restrictions on re-use as possible, for example limiting restrictions to an indication of source".
- **Recital 8:** "Documents produced by public sector bodies of the executive, legislature or judiciary" are in view. Art. 2(1): a "public sector body" is "the State, regional or local authorities, bodies governed by public law …". Courts are part of the State, which is the basis for §4 below.
- **Art. 1(2)(h) and 1(4):** same as Law 179 art. 1(2)(h) and 1(4).
- **Recital 52:** "the re-use of personal data is permissible only if the principle of purpose limitation as set out in point (b) of Article 5(1) and Article 6 of Regulation (EU) 2016/679 is met".
- **Recital 53:** a DPIA "may have to be performed" when deciding reuse conditions for documents with personal data.

### 1.4 Copyright and the database right (Law 8/1996, republished)

[legislatie.just.ro (7816)](https://legislatie.just.ro/Public/DetaliiDocument/7816).

- **Art. 9:** "Nu pot beneficia de protecția legală a dreptului de autor" includes (b) "textele oficiale de natură politică, legislativă, administrativă, judiciară" and (f) "simplele fapte și date". The rows in all three Sources are facts and data.
- **Art. 141:** a database maker has a sui generis right against extraction or reuse of a substantial part. Art. 141(5) also bars repeated, systematic extraction of insubstantial parts that conflicts with normal use.

  This right is the only property-type hook a public body could have over a full pull. Law 179 art. 1(7) forbids public entities from using it to block or restrict reuse beyond the law's limits.

### 1.5 What reuse law does not do: personal data

The reuse regime makes a document *available*. It does not give the reuser a GDPR legal basis.

- Law 179 art. 1(4) and Directive recital 52 say this expressly.
- For natural persons in these Sources, the basis has to come from GDPR art. 6(1)(f) (and Law 190/2018 art. 7 as a second layer). That is ADR 0009's posture, which applies unchanged.
- **The art. 1(2)(h) exclusion.** It removes documents only where access is restricted on personal-data grounds, or where a law has "defined" reuse as incompatible. No Romanian law was found that defines reuse of PNRR beneficiary names or of court party names as incompatible. So the *documents* are in scope, while each natural-person row still needs its own GDPR footing (**unclear** how a court would apply (h) to portal party names; no case law found).
- **Precedent on publishing beneficiaries of EU funds by name.** In *Volker und Markus Schecke and Eifert* (C-92/09 and C-93/09, Grand Chamber, 9 Nov 2010), the Court held the CAP transparency rules (Regulation 1290/2005 arts. 42(8b) and 44a) invalid "insofar as, with regard to natural persons who are beneficiaries of EAGF and EAFRD aid", they required publication of each beneficiary's data "without drawing a distinction based on relevant criteria". Examples of such criteria: the periods, frequency, nature and amount of aid. Source: [FRA case summary](https://fra.europa.eu/da/caselaw-reference/cjeu-joined-cases-c-9209-and-c-9309-judgment) and [curia](https://curia.europa.eu/juris/liste.jsf?num=C-92/09); the full judgment was not read here.

## 2. PNRR (MIPE dashboard snapshots)

- **Holder:** Ministerul Investițiilor și Proiectelor Europene (MIPE), a ministry. It is an "autoritate publică" under Administrative Code art. 5(k) ("organ de stat … care acționează în regim de putere publică") ([OUG 57/2019, legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/215925)), so it is an "entitate publică" under Law 179 art. 2(k).
- **MIPE's own terms: none for the dashboard** (**measured** 2026-11-13):
  - [mfe.gov.ro](https://mfe.gov.ro/) and [the PNRR dashboard](https://mfe.gov.ro/pnrr-dashboard/) carry only a footer "© 2026 Ministerul Investițiilor și Proiectelor Europene". There is no terms-of-use page, no licence and no reuse statement. The only "copyright" strings in the dashboard bundle belong to third-party JS libraries and map data.
  - The [MIPE open-data page](https://mfe.gov.ro/informatii-de-interes-public/date-deschise/) defines open data as "date ce pot fi utilizate în mod liber, reutilizate și redistribuite de către oricine este interesat". It lists two datasets, neither of them PNRR.
  - On data.gov.ro, MIPE's six datasets are under OGL-ROU-1.0 (5) or CC-BY-4.0 (1). The MDLPA PNRR payment files are CC-BY-4.0 ([CKAN API, organisation `mfe`](https://data.gov.ro/api/3/action/package_search?fq=organization:mfe)). The ministry thus licenses openly where it licenses at all.
- **Reusable by default: yes.** It is a public entity's existing document, with no art. 1(2) exclusion apparent: it is within MIPE's PNRR coordination remit, there is no third-party IP in tabular figures, and access is unrestricted. Art. 3 applies.
- **Conditions:**
  - None imposed. A ministry © line does not create a condition: there is no copyright in "simplele fapte și date" (Law 8/1996 art. 9(f)), and art. 1(7) bars use of the database right against reuse.
  - Attribution is not legally required, but it is the norm the ministry's own data.gov.ro licences set. OGL-ROU-1.0 requires source attribution and use that does not suggest "un statut oficial", does not distort or mislead, and does not breach personal-data rules ([data.gov.ro licence page](https://data.gov.ro/pages/licence)). Following those terms is a safe floor.
- **Personal data:**
  - About 871 project rows have a natural person as beneficiary (MMAP afforestation grants), per `pnrr.md` §4. Reuse law gives no basis for naming them (§1.5).
  - ADR 0009 would name such individuals only above the Naming threshold. *Schecke* is the closest EU precedent: blanket publication of natural-person EU-fund beneficiaries without distinctions by amount, frequency or nature was disproportionate. That supports a threshold and argues against naming the afforestation grantees by default.
  - Family-doctor practices (`MEDIC FAMILIE`) have CUIs and are organisations under ADR 0003, but their names are often personal names. Treat them as organisations, as `pnrr.md` already recommends.
- **What would make it "drop" or "ask first":** MIPE publishing a licence with non-standard conditions, or a statement that the snapshots are not for reuse. Neither exists today. A restrictive condition would still have to pass art. 11(1), and could be challenged at ADR under art. 5.
- **Written request before Go-live: not needed.** An optional one-paragraph notice to MIPE (Grivei reuses the dashboard snapshots, credits the source, excludes natural persons) costs little. It is a courtesy, not a legal step.

## 3. RegAS (Consiliul Concurenței transparency API)

- **Holder:** Consiliul Concurenței, an autonomous public authority. It is a public entity under Law 179 art. 2(k).
- **Purpose of publication:** EU State aid rules require individual awards above the thresholds to be published on TAM or a national site. `state-aid.md` §2 cites the Commission's [aid-beneficiaries page](https://competition-policy.ec.europa.eu/state-aid/aid-beneficiaries_en): the aim is to let "citizens and companies … access easily relevant information about awarded aid". Republication serves that purpose.
- **The transparency page and API carry no terms.** This was measured in `state-aid.md` §2 and not re-checked here. Fetching it again without TLS verification was not done; see the TLS note in that dossier.
- **The main site's terms** ([Termeni și condiții de utilizare](https://www.consiliulconcurentei.ro/termeni-si-conditii-de-utilizare/), undated, read 2026-11-13). They name only `www.consiliulconcurentei.ro`, not the `regas.` subdomain.
  - §7 "Drepturile asupra conţinutului": "Reproducerea materialelor de pe site este autorizată, cu menţionarea sursei şi în limitele prevăzute de legislaţia drepturilor de autor". It adds that any restriction "va fi clar indicată acolo unde este cazul".
  - §8 "Reguli de utilizare", "Nu sunt permise": "copierea, multiplicarea, distribuirea, arhivarea sau pastrarea, prin orice mijloace, inclusiv electronice, magnetice sau computerizate, a materialelor si informatiilor existente pe acest site". §8 also forbids probing "servere sau servicii … care nu sunt publice", and use of the site "în scop publicitar sau pentru orice fel de cerere/ofertă care are un caracter comercial".
  - §5 still cites Law 677/2001, repealed by Law 190/2018, so the terms predate GDPR.
- **Reading:**
  - §7 and §8 contradict each other: §7 authorises reproduction with credit, §8 bans copying and distribution.
  - A blanket §8 ban, applied to documents covered by Law 179, would be a reuse condition that is hard to square with art. 11(1) ("obiective, proporționale … nu limitează în mod inutil"). Under art. 3 the documents are reusable.
  - Whether website terms of this kind bind a reuser contractually, and whether they reach the `regas.` subdomain at all, is **unclear**: no Romanian ruling was found. The law points one way; the body's own text is inconsistent.
- **Reusable by default: yes**, under Law 179 art. 3. No art. 1(2) exclusion applies: the data is published under an EU duty and contains no third-party IP. Beneficiaries are undertakings by CUI; `state-aid.md` §4 found no CNP-shaped identifiers.
- **Conditions:**
  - Credit the source (§7, and good practice).
  - Do not imply official status, and do not alter the figures. The latter matters doubly here, because summing guarantees with grants misstates aid (`state-aid.md` §5; ADR 0014).
  - The `raf`/`altCod` rows may include sole traders or farmers (unverified). Apply ADR 0003/0009 to them.
- **What would make it "drop" or "ask first":** a written refusal, or a licence imposing §8-style limits. A refusal would have to cite an art. 1(2) ground (art. 4(9)), and none is apparent. It could be challenged at ADR.
- **Written request before Go-live: advisable.** A Law 179 art. 4 request should ask Consiliul Concurenței to confirm that the RegAS transparency data may be reused with source credit, and under which standard licence (art. 4(5)). Purpose: put the §7/§8 contradiction to rest in writing. The answer is due within 30 working days (art. 4(8)). The same letter can ask about RegAS 2 and TAM timing.

## 4. portal.just.ro (court case web service)

- **Holder:**
  - The Ministry of Justice hosts the portal. Its terms say the courts own the data: "instanțele de judecată deținând proprietatea asupra bazelor de date și a conținutului acestora", replicated nightly from each court's ECRIS. MJ "are doar competente tehnice" (portal [Termeni şi condiţii](https://portal.just.ro/SitePages/termeni.aspx), read via the [Wayback snapshot of 25 Aug 2026](http://web.archive.org/web/20260825091417/https://portal.just.ro/SitePages/termeni.aspx), because the live site is behind Cloudflare).
  - Courts are "organ[e] de stat … în regim de putere publică" (Administrative Code art. 5(k)), and the Directive covers the judiciary (recital 8, art. 2(1)). So they are probably "entități publice" under Law 179.

    This is **not certain**. Law 179 art. 2(k) cross-refers to Administrative Code definitions written for public administration, and no Romanian guidance or ruling applying Law 179 to courts was found.
- **The portal's own terms:**
  - There is no licence, no reuse clause and no automated-access clause in the terms or on the [Acces programatic page](http://web.archive.org/web/20260825091349/https://portal.just.ro/SitePages/acces.aspx). That page documents `portalquery.just.ro/query.asmx` for programmatic access and offers a sample client, which invites machine use.
  - The terms are a disclaimer: the information "nu este în mod obligatoriu atotcuprinzătoare, completă, corectă sau actualizată", and only officially published acts are authentic.
  - The 2013 MJ statement "în mod gratuit, cu menţionarea sursei" remains secondary (`portal-just.md` §2). No primary text was found.
- **Personal data, which is what changes the answer here** (same terms page):
  - Courts publish "doar numele si prenumele justițiabililor", on the GDPR basis of "îndeplinirea unei obligații legale a operatorului".
  - People who do not want a case public must ask the court, which can mark it confidential in ECRIS so that it is "eliminat[ă] și de pe portal". Other personal data (CNP, address) is removed on request.
  - Since the 2018–2019 maintenance, only cases still pending, or closed for less than 3 years, are online: "termenul de menținere a dosarelor pe portalul instanțelor de judecată este de 3 ani de la data finalizării procedurii".
  - So the publisher's own GDPR footing is a legal duty, with a purpose (case-stage information), a takedown route and a 3-year window. A reuser that copies names keeps none of those safeguards unless it rebuilds them. Law 179 does not supply them (§1.5).

    ADR 0009 already decides that private individuals in court cases are never named, and that cases show only where every named party is an organisation. Criminal cases show only where the defendant is an organisation.
- **Reusable by default:**
  - **Yes, for organisation-level case metadata** (case number, court, object, stage, hearing dates, outcome, organisation parties), on the reading that courts are public entities.
  - **No reuse-law basis for natural-person names.** These need GDPR grounds, which ADR 0009 does not claim for private individuals.
  - Names embedded in organisation party strings ("PRIN REPREZENTANT LEGAL ‹name›", `portal-just.md`) must be stripped too.
- **Conditions:**
  - Credit the source (portal.just.ro, the court).
  - Follow the takedown. If a case disappears or turns confidential on the portal, drop it from the graph, and do not keep case records longer than the portal's 3-year window unless an organisation-only case is still relevant. That retention rule is a posture choice, not a legal requirement found.
  - Do not present portal data as authentic court records, which mirrors the disclaimer.
- **What would make it "drop" or "ask first":**
  - Drop or narrow: a ruling or MJ/CSM position that portal data is outside Law 179 (for example, that courts are not "entități publice", or that party data falls under art. 1(2)(h)), or a published restriction on the web service.
  - Ask first: today, as a matter of prudence, because the only reuse statement is a 2013 press report.
- **Written request before Go-live: advisable.** A Law 179 art. 4 request should go to MJ (the portal operator and author of the 2013 statement), asking it to confirm:
  - that the `portalquery.just.ro` web service may be reused for organisation-party case metadata, with source credit;
  - any rate limits;
  - whether MJ or each court is the competent body.

  If MJ says the courts own the data, the fallback is the CSM rather than 246 courts. This is **unclear**: there is no single designated holder for the portal data set.

## 5. Open points

- No methodological norms for Law 179/2022 were found (art. 18(1)), and ADR has not been seen to publish a standard licence under art. 4(5). Either could add conditions later.
- Law 109/2007's formal status: superseded in practice, never expressly repealed.
- Whether general website terms such as Consiliul Concurenței §8 can contractually restrict reuse that Law 179 allows: no ruling found.
- Whether courts are "entități publice" for Law 179: probable, not confirmed.
- *Schecke* was read from the FRA summary, not the full judgment.
