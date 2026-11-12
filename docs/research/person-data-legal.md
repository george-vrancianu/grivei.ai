# Person data on Grivei: GDPR, Law 190/2018 and defamation facts

Research for [#121](https://github.com/george-vrancianu/grivei.ai/issues/121) on the map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Gathered 2026-11-12.

**This is not legal advice.** It collects texts, judgments and regulator positions so the grilling ticket can decide a posture. A Romanian data-protection lawyer should review whatever posture is chosen before any person-subject Source ships.

Abbreviations: GDPR = Regulation (EU) 2016/679; CJEU = Court of Justice of the EU; ECtHR = European Court of Human Rights; ANSPDCP = Romanian data protection authority; CCR = Romanian Constitutional Court; ANI = National Integrity Agency; AEP = Permanent Electoral Authority.

Note on sources: EUR-Lex and curia.europa.eu block automated fetches, so GDPR articles below are cited to the EUR-Lex text and CJEU judgments to their curia case pages without fresh pull quotes. The exceptions are C-184/20, which was read in full from the judgment PDF, and the Romanian texts, which were read on legislatie.just.ro, ccr.ro and dataprotection.ro.

## 1. Legal bases (GDPR art. 6)

- **Art. 6(1)(e), public task.** Processing is lawful when "necessary for the performance of a task carried out in the public interest or in the exercise of official authority vested in the controller". Art. 6(3) requires that basis to be "laid down by" Union or Member State law. [GDPR, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj). An NGO or private project has no statutory task, so in practice (e) belongs to ANI, AEP, ONRC and the courts that first publish the data, not to a reuser like Grivei.
- **Art. 6(1)(f), legitimate interests.** Lawful when necessary for the controller's or a third party's legitimate interests, "except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject". It requires a three-step test (legitimate interest, necessity, balancing). [GDPR, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj). This is what comparable reusers rely on: OpenSanctions ([privacy policy §6.3](https://www.opensanctions.org/docs/privacy/)), OpenCorporates ([public records privacy policy](https://opencorporates.com/public-records-privacy-policy/)) and North Data, upheld by the Hamburg DPA (§7 below).
- **Art. 9, special categories.** Processing of data "revealing ... political opinions", health, sex life and similar is prohibited unless an art. 9(2) exception applies, e.g. (e) data "manifestly made public by the data subject" or (g) substantial public interest "on the basis of Union or Member State law". [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj). The CJEU reads "revealing" broadly: data from which a special category can be *inferred* count. In C-184/20 the names of an official's spouse or partner, which could reveal sexual orientation, were held to be art. 9 data (operative part, point 2; paras 117–128). [C-184/20 judgment PDF](https://pub-a0410b6281c64831b9c9612cf6920e67.r2.dev/celex-62020CJ0184.pdf), [curia case page](https://curia.europa.eu/juris/liste.jsf?num=C-184/20).
- **Art. 10, criminal convictions and offences.** Processing "shall be carried out only under the control of official authority or when ... authorised by Union or Member State law providing for appropriate safeguards". [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj). The CJEU holds that information about criminal proceedings against a named person, even before conviction, falls under art. 10 ([C-136/17 GC and Others](https://curia.europa.eu/juris/liste.jsf?num=C-136/17)). It also holds that road-traffic penalty points count, and that making them available to anyone is not necessary ([C-439/19 Latvijas Republikas Saeima](https://curia.europa.eu/juris/liste.jsf?num=C-439/19)).
- **National identification numbers (CNP).** Law 190/2018 art. 4 allows a national identification number to be processed only on an art. 6(1) basis. Where (f) is used, it requires safeguards: minimisation, a DPO, storage limits and staff training. [Law 190/2018, legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/203151). ADR 0003 (never store or show a CNP) already sits well inside this.

## 2. The journalistic and public-interest exemption

- **GDPR art. 85.** Member States "shall by law reconcile" data protection with freedom of expression, "including processing for journalistic purposes". Art. 85(2) lets them exempt or derogate from Chapters II–VII and IX for such processing. Recital 153 asks that the notion of journalism be interpreted broadly. [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- **Romanian implementation: Law 190/2018 art. 7.** Processing "în scopuri jurnalistice sau în scopul exprimării academice, artistice sau literare poate fi efectuată" if it concerns data that were "făcute publice în mod manifest de către persoana vizată" **or** that are "strâns legate de calitatea de persoană publică a persoanei vizate sau de caracterul public al faptelor în care este implicată". Where it applies, it derogates from GDPR Chapters II (principles, *including arts. 9 and 10*), III (data-subject rights), IV, V, VI, VII and IX. It does **not** derogate from Chapter VIII (remedies, liability, fines). [Law 190/2018](https://legislatie.just.ro/Public/DetaliiDocument/203151), [ANSPDCP copy](https://www.dataprotection.ro/servlet/ViewDocument?id=1520)
  - The conditions are alternative ("sau"). During the 2018 RISE Project episode the authority was criticised for reading them as cumulative ([Curentul](https://www.curentul.info/actualitate/sefa-anspdcp-nu-pricepe-legislatia-a-inteles-sau-din-legea-privind-gdpr-ca-si-apoi-a-navalit-peste-rise-project/), commentary).
  - The Romanian derogation is narrower than art. 85 allows: it covers only manifestly public data, or data tied to a public role or public facts. A private individual who is not tied to public facts gets no derogation.
- **Who counts as "journalism" (CJEU).** Journalistic activities are those whose object is "the disclosure to the public of information, opinions or ideas, irrespective of the medium". They are not limited to media undertakings, and they can be profit-making. The case involved mass publication of tax data ([C-73/07 Satamedia](https://curia.europa.eu/juris/liste.jsf?num=C-73/07)). A private YouTube video can qualify if its "sole object" is that disclosure ([C-345/17 Buivids](https://curia.europa.eu/juris/liste.jsf?num=C-345/17)).
- **The limit on mass reuse of public data (ECtHR).** In *Satakunnan Markkinapörssi Oy and Satamedia Oy v Finland* (Grand Chamber, 27 June 2017, no. 931/13), the Court found no violation of art. 10 ECHR (15–2) when Finland stopped mass publication of lawfully public tax data on about 1.2 million people. The domestic courts were entitled to find that publishing raw data en masse did not itself contribute to a debate of public interest, and that "public" data does not mean data publishable in any manner or quantity. [ECHR case summary](https://www.echr.coe.int/w/satakunnan-markkinap%C3%B6rssi-oy-and-satamedia-oy-v.-finland-no.-931/13-), [judgment PDF (Columbia GFoE mirror)](https://globalfreedomofexpression.columbia.edu/wp-content/uploads/2017/07/CASE-OF-SATAKUNNAN-MARKKINAP-RSSI-OY-AND-SATAMEDIA-OY-v.-FINLAND.pdf), [IRIS Merlin note](https://merlin.obs.coe.int/article/7977). This is the closest precedent to Grivei's model: a database that republishes official person-level records.
- **ANSPDCP's stated position on press archives (2020).** In reply no. 330 of 8 January 2020, the authority said an operator processing for journalistic purposes must assess each erasure request **case by case**, applying GDPR art. 17(3)(a) together with Law 190/2018 art. 7, and must answer within the art. 12 deadline. [Clujust, reply reproduced](https://www.clujust.ro/ce-spune-anspdcp-despre-aplicarea-gdpr-in-cazul-articolelor-de-presa-aviz-celor-care-cer-sa-fie-stersi/)
- **The RISE Project precedent (Nov 2018).** After RISE published material on Tel Drum and Liviu Dragnea, ANSPDCP sent it eight GDPR questions, including "the sources from where the personal data was obtained", with fines of up to EUR 20 million cited. The European Commission said member states must make exceptions for the media. 18 digital-rights NGOs wrote to the EDPB. [OCCRP](https://occrp.org/en/news/romania-orders-journalists-investigating-corruption-to-give-up-sources), [EDRi](https://edri.org/our-work/teleormanleaks-privacy-vs-freedom-of-expression/), [RSF](https://rsf.org/en/news/romania-tries-use-gdpr-force-journalists-reveal-sources), [Privacy International letter to EDPB](https://privacyinternational.org/sites/default/files/2018-11/letter%20to%20EDPB%20re%20Romanian%20case%20final.pdf). It shows that in Romania GDPR complaints can be used against watchdogs, so a written art. 7 / art. 6(1)(f) reasoning on file matters.
- **No ANSPDCP fine against a media outlet under art. 7 was found** in this research (searches of press coverage of ANSPDCP sanctions). That is absence of evidence, not a safe harbour.
- **DPIA.** ANSPDCP Decision 174/2018 makes a DPIA mandatory for, among others, "processing on a large scale" of art. 9 data "or of personal data relating to criminal convictions and offences" (art. 1(1)(b)), and for large-scale automated evaluation of persons (art. 1(1)(a)). [ANSPDCP Decision 174/2018 (EN)](https://dataprotection.ro/servlet/ViewDocument?id=1870). Court parties in criminal cases and party donors (political opinion) would likely trigger it, unless art. 7 derogation applies (it waives Chapter IV, which contains art. 35).

## 3. Per category of person

### 3.1 Officials acting in their role (mayors, ministers, heads of institutions, signatories)

- Law 190/2018 art. 7's "strâns legate de calitatea de persoană publică" limb is written for this category. [Law 190/2018](https://legislatie.just.ro/Public/DetaliiDocument/203151)
- Law 544/2001 (freedom of information): personal data become information of public interest only insofar as they affect the capacity to exercise a public office (art. 14(1)). [Law 544/2001](https://legislatie.just.ro/Public/DetaliiDocument/31413)
- **C-184/20 (CJEU Grand Chamber, 1 Aug 2022).** Online publication of the declaration of private interests of the head of a publicly funded body is precluded "in so far as, in particular, that publication concerns name-specific data relating to his or her spouse, cohabitee or partner, or to persons who are close relatives", or transactions over EUR 3,000 (operative part, point 1). Publishing to "the whole of the general public" enables access by people with no anti-corruption purpose (paras 102–104). The public interest "may vary according to the importance of the duties carried out by the declarant, in particular his or her hierarchical position ... and the powers that he or she has in relation to the commitment and management of public funds" (para 111). Generic reference to "a spouse" with the interests held would serve the aim (para 96). [Judgment PDF](https://pub-a0410b6281c64831b9c9612cf6920e67.r2.dev/celex-62020CJ0184.pdf), [curia](https://curia.europa.eu/juris/liste.jsf?num=C-184/20)
- **CCR Decision 297 of 29 May 2025.** Relying expressly on C-184/20 (para 33), the CCR held that art. 6(1)(d) and art. 12(6) of Law 176/2010, which required ANI and employers to publish asset and interest declarations online, were unconstitutional. Art. 3(2) is constitutional only so far as it does not cover the spouse's and adult dependent children's assets. Reasons: publication exceeds the law's purpose, which ANI's verification already serves (para 48). The Constitution "se opune unei prelucrări în masă a datelor cu caracter personal prin publicarea declarațiilor de avere" (para 66), with AI-enabled profiling cited as an aggravating risk. A public declaration of financial interests in bands, without detail, would be within the legislature's margin (para 67, citing ECtHR *Wypych v Poland*). [CCR Decision 297/2025 PDF](https://www.ccr.ro/wp-content/uploads/2025/06/Decizie_297_2025.pdf), [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocumentAfis/298986)
- **Law 180 of 28 August 2026** (Monitorul Oficial no. 725, 28 Aug 2026), amending Law 176/2010, as read on legislatie.just.ro:
  - Filing no longer makes a declaration public, and ANI keeps full declarations confidential for 7 years (new art. 2(3)–(4)).
  - ANI publishes instead a "fișă publică privind interesele financiare", generated via e-DAI, for a listed subset of offices: President, MPs, local and county councillors, mayors, government members, prefects, senior civil servants, heads of public institutions, certain state-company board members and others (art. 2(7)). Most judges and prosecutors are not listed.
  - The fișă shows value **bands**, not exact values, and shareholdings in bands (5–20%, 20–50%, ≥50%). It "nu poate reproduce, integral sau parțial" the declaration (art. 2(5)). It excludes CNP, address, property location beyond county, bank details, marital status and **names of third persons** (art. 2(8)). It stays online 5 years (art. 2(9)); for candidates, 1 year (art. 2(10)). New forms apply from 1 January 2027.
  - [Law 180/2026, legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/313868), [Avocatnet summary](https://www.avocatnet.ro/articol_72581/Noi-reguli-de-integritate-pentru-func%C8%9Biile-publice-Declara%C8%9Bii-de-avere-in-alt%C4%83-form%C4%83-interdic%C8%9Bii-%C8%99i-amenzi-mai-mari.html).
- **Consequence for an ANI Source (fact, not posture):** the legal ground under "republish ANI declarations as scraped" has moved. Pre-June-2025 declarations were lawfully published by ANI at the time. Republishing them now, in bulk, would re-expose exactly what CCR 297/2025 and Law 180/2026 withdrew from the public, including spouses' assets and third-party names.

### 3.2 Company administrators, shareholders and beneficial owners

- **Company law requires the data to be disclosed.** Directive (EU) 2017/1132 art. 14 requires disclosure of the appointment and particulars of persons who represent or administer a company. Directive (EU) 2019/1151 (recitals 27, 30) wants that information machine-readable, and Implementing Regulation (EU) 2023/138 classes company and ownership data as high-value datasets. All three are as summarised by the Hamburg DPA below; [Directive 2017/1132](https://eur-lex.europa.eu/eli/dir/2017/1132/oj), [Reg. 2023/138](https://eur-lex.europa.eu/eli/reg_impl/2023/138/oj).
- **C-398/15 Manni (2017).** No general right to erasure of a director's data from the company register after the company is dissolved. Member states may allow restricted access case by case, after a sufficiently long period and on overriding legitimate grounds. [curia](https://curia.europa.eu/juris/liste.jsf?num=C-398/15)
- **C-200/23 Agentsia po vpisvaniyata (4 Oct 2024).** A commercial register is a controller for personal data it publishes beyond what the law requires, and it must erase them on request. Non-material damage under art. 82 can arise from loss of control over data. [curia](https://curia.europa.eu/juris/liste.jsf?num=C-200/23)
- **Hamburg DPA, final decision of 22 September 2025 (North Data GmbH, EDPB register).** A director demanded erasure of his roles shown in a name-searchable, graph-style company database. The complaint was dismissed:
  - Art. 6(1)(f) applied, and there were "compelling legitimate grounds" under art. 21(1).
  - Register data are "less worthy of protection" when they concern professional activity and are subject to compulsory disclosure.
  - Name-search and search-engine findability "increases the impairment" but did not tip the balance.
  - The DPA noted that his former name and the number of directorships may interest creditors.
  - The controller did, however, delete the complainant's *sole-ownership* information during the procedure.
  - [Decision PDF](https://www.edpb.europa.eu/system/files/2026-07/de-ha-2025-09-decision-public_redacted.pdf)
- **Beneficial owners: C-37/20 and C-601/20 WM and Sovim (Grand Chamber, 22 Nov 2022).** The Court invalidated the AMLD rule making beneficial-ownership information accessible to "any member of the general public". General public access is a serious interference that is not strictly necessary. The Court still recognised that the press and civil-society organisations connected with preventing money laundering have a legitimate interest in access (para 74, as reported). [curia](https://curia.europa.eu/juris/liste.jsf?num=C-37/20), [eucrim summary](https://eucrim.eu/news/cjeu-no-unrestricted-access-to-data-of-beneficial-owners/), [OCCRP FAQ for journalists](https://www.occrp.org/en/investigations/17217-faq-the-eu-ruling-on-ownership-transparency-and-what-it-means-for-journalists)
- **Read across:** directors and administrators are the strongest case for publication (compulsory disclosure, professional role). Beneficial owners are the weakest, because the CJEU has said "everyone" access is too much.

### 3.3 Party donors

- **Law 334/2006 (republished) and its methodological norms (13 Jan 2016).**
  - Parties must publish in Monitorul Oficial, Part I, by 30 April, the list of natural persons whose cumulative donations in the previous year exceed 10 gross minimum wages (norms art. 15(a), Annex 5).
  - They must verify and register donor identity (art. 10).
  - They must publish the total of confidential donations (art. 15(c)).
  - AEP publishes campaign income and expense reports in Monitorul Oficial and on its site (art. 4(1), art. 56).
  - [Norms, legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocumentAfis/175292), [MO 225/2015 example of donor lists](https://legeaz.net/monitorul-oficial-225-2015/cuantumul-total-2015-al-sumelor)
- **Disclosure is limited by statute.** The AEP president said in 2026 that AEP had published all the current law allows, and that fuller donor disclosure needs an amendment to Law 334. [Bursa](https://www.bursa.ro/aep-identitatea-donatorilor-lui-nicusor-dan-dezvaluita-doar-dupa-modificarea-legislatiei-48646857)
- **Art. 9 issue.** A donation to a named party plausibly "reveals political opinions" under the inference reading in C-184/20. Republishing the list therefore needs an art. 9(2) exception, or the Law 190/2018 art. 7 derogation from Chapter II.
- **"Manifestly made public by the data subject"** is doubtful when the publication is done by the party under a legal duty, not by the donor. This research found no Romanian ruling on that point (open question). The art. 7 "caracterul public al faptelor" limb is the other route.
- **Comparable practice:** Expert Forum (EFOR) analyses individual party donors from these lists in its party-finance reports. [Spotmedia on EFOR donor analysis](https://spotmedia.ro/stiri/politica/hranim-firme-de-partid-din-bani-publici-fara-transparenta-donatori-cu-mai-nimic-in-declaratia-de-avere-au-dat-partidelor-chiar-si-jumatate-de-milion-de-lei), [Europa Liberă on EFOR 2024 report](https://romania.europalibera.org/a/raport-expert-forum-cum-s-au-finantat-partidele-in-2024/33525590.html)

### 3.4 Court parties

- **Criminal cases** (defendants, convicts) are art. 10 data even before conviction ([C-136/17](https://curia.europa.eu/juris/liste.jsf?num=C-136/17)). Art. 10 permits processing only under official authority or as authorised by law. For a non-authority, the only Romanian route found is the Law 190/2018 art. 7 derogation from Chapter II, which applies only where the case is tied to a public role or to public facts.
- **Civil and administrative cases** are ordinary personal data under art. 6. Parties include many private individuals (divorces, debts, evictions) with no public role.
- **Official publication practice.** Court portals show case parties by name in case records ([portal.just.ro](https://portal.just.ro)). Judgments on ReJust are published in anonymised form ([Agerpres on ReJust launch](https://agerpres.ro/justitie/2021/11/26/csm-aplicatie-gratuita-pentru-acces-mai-facil-la-hotararile-instantelor-de-judecata--822408)), so the courts themselves withhold names in the reusable judgment corpus.
- **Time and archives (ECtHR):**
  - *Hurbain v Belgium* (GC, 4 July 2023, no. 57292/16) found no violation of art. 10 where a newspaper was ordered to anonymise an old online article about a road accident.
  - *Biancardi v Italy* (2021, no. 77419/16) upheld civil liability for keeping an article on criminal proceedings easily accessible online too long.
  - [HUDOC Hurbain](https://hudoc.echr.coe.int/eng#{%22appno%22:[%2257292/16%22]}), [HUDOC Biancardi](https://hudoc.echr.coe.int/eng#{%22appno%22:[%2277419/16%22]})
- **De-referencing.** Search-engine operators must weigh the public interest in criminal-proceedings data. Where the facts have changed, they must arrange results so the current situation comes first ([C-136/17](https://curia.europa.eu/juris/liste.jsf?num=C-136/17)).

### 3.5 Private individuals (no public role)

- Law 190/2018 art. 7 only covers data made public by the person, or data tied to a public role or public facts. An individual with no public role who is merely named in a public record falls outside it, so the full GDPR applies.
- *Satakunnan* (above) is the controlling ECtHR precedent: lawful public availability of records does not by itself justify mass republication.
- SEAP natural-person suppliers: Grivei already shows these only as "Persoană fizică" without a page (GLOSSARY, ADR 0003). That design is consistent with the minimisation reading.

## 4. Erroneous match and defamation exposure

- **Civil law, not criminal.** The current Criminal Code (Law 286/2009, in force since 1 February 2014) contains no offences of insult or calumny. Liability for reputational harm is civil. The history is contested:
  - CCR Decision 62/2007 struck down the 2006 repeal.
  - ICCJ RIL Decision 8/2010 held the old provisions no longer in force.
  - CCR (communiqué of 29 April 2013) declared ICCJ 8/2010 unconstitutional, but that concerned the old Code.
  - [e-juridic on RIL 8/2010](https://e-juridic.manager.ro/articole/ril-admis-normele-de-incriminare-a-insultei-si-calomniei-nu-sunt-in-vigoare-5674.html), [legeaz on 2013 CCR ruling](https://legeaz.net/spete-penal/insulta-si-calomnia-au-881)
- **Civil Code ([Law 287/2009](https://legislatie.just.ro/Public/DetaliiDocument/175630)):**
  - Art. 72(2) prohibits any harm to "onoarei şi reputaţiei" without consent or outside art. 75 limits.
  - Art. 74 lists privacy intrusions, including (k) dissemination of documents with a person's address or phone.
  - Art. 75(2): exercising constitutional rights "cu bună-credinţă" and consistently with international human-rights treaties is not a breach.
  - Art. 253 remedies: prohibition, cessation, a finding of unlawfulness, publication of the judgment at the defendant's cost, and damages.
  - Art. 1357 is the general fault-based tort.
  - Good faith is therefore the pivotal defence. A systematic, documented matching method is evidence of it; a careless name match is evidence against it.
- **Constitution art. 30(6)–(8):** freedom of expression may not prejudice dignity, honour or private life. Civil liability for published information lies with the publisher or producer. [Constitution, art. 30](https://legislatie.just.ro/Public/DetaliiDocument/47355)
- **ECtHR on Romanian defamation:** *Cumpănă and Mazăre v Romania* (GC, 17 Dec 2004, no. 33348/96). Journalists who accused officials of illegal dealings without a sufficient factual basis could legitimately be held liable. The Court still found a violation of art. 10, because the criminal sanctions imposed (prison, a ban on practising journalism) were disproportionate. [HUDOC](https://hudoc.echr.coe.int/eng#{%22appno%22:[%2233348/96%22]})
- **GDPR overlay for a wrong match:**
  - A wrong match is inaccurate personal data about the wrongly linked person, breaching art. 5(1)(d) accuracy. Art. 16 gives a right to rectification "without undue delay", and art. 18 restriction while accuracy is contested. [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
  - The Law 190/2018 art. 7 derogation is arguably *not* available for the wrongly matched person: their data are neither made public by them nor tied to *their* public role (open question).
  - Art. 82 compensation for material or non-material damage needs no seriousness threshold, but the person must prove damage ([C-300/21 Österreichische Post](https://curia.europa.eu/juris/liste.jsf?num=C-300/21)). Chapter VIII is never derogated by art. 7.
  - In [C-460/20 TU and RE v Google](https://curia.europa.eu/juris/liste.jsf?num=C-460/20), a person who shows that information is manifestly inaccurate must get it de-referenced. No court decision is needed first, but the requester must supply the evidence that can reasonably be required.
- **Name collision is a known, measured risk in this repo:** ADR 0003 records 533 SEAP supplier names spread over several CUIs. Person names have no CUI equivalent, because CNPs are never stored, so a person match rests on name plus context.

## 5. Data-subject rights duties (if the art. 7 derogation does not apply)

| Duty | Text | Note |
| --- | --- | --- |
| Inform people whose data came from third parties | GDPR art. 14 | Exception in art. 14(5)(b) where impossible or disproportionate effort, but the controller must then "make the information publicly available" (a public notice). |
| Right of access | art. 15 | Within one month, extendable by two (art. 12(3)). |
| Rectification | art. 16 | Core remedy for wrong matches. |
| Erasure | art. 17 | Excluded "to the extent that processing is necessary ... for exercising the right of freedom of expression and information" (art. 17(3)(a)). ANSPDCP requires a case-by-case assessment ([2020 reply](https://www.clujust.ro/ce-spune-anspdcp-despre-aplicarea-gdpr-in-cazul-articolelor-de-presa-aviz-celor-care-cer-sa-fie-stersi/)). |
| Restriction | art. 18 | While accuracy is contested. |
| Objection | art. 21(1) | Against processing based on 6(1)(e) or (f). The controller must stop unless it shows "compelling legitimate grounds" (Hamburg/North Data found them for directors). |
| DPIA | art. 35, ANSPDCP Decision 174/2018 | Large-scale art. 9/10 data. |
| Records, DPO | arts. 30, 37 | A DPO is required where core activities are large-scale art. 9/10 processing or systematic monitoring (art. 37(1)(b)–(c)). Law 190/2018 art. 4(2) requires a DPO when CNPs are processed on art. 6(1)(f), which ADR 0003 avoids. |

[GDPR, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj). Where Law 190/2018 art. 7 applies, Chapters II–VII and IX are derogated, so these duties fall away, but Chapter VIII (complaint to ANSPDCP, judicial remedy, compensation, fines) remains.

## 6. Precedents from comparable projects

- **OpenSanctions** (Berlin):
  - Relies on art. 6(1)(f) for its sanctions/PEP database (§6.3) and on art. 85 media privilege with Berlin's BlnDSG §19 for journalistic use.
  - Takes data only from official sources and keeps a record only as long as it is in the source.
  - Sends people asking for correction or deletion to the listing body.
  - [Privacy policy](https://www.opensanctions.org/docs/privacy/)
- **OpenCorporates** (UK):
  - Relies on art. 6(1)(f) UK GDPR (transparency, accuracy, fighting corporate crime) and does not auto-delete; it calls itself a "historical archive", citing the CJEU.
  - Publishes officers' DOB and address only as far as the register does, and redacts only when a register restricts for safety.
  - Restricts and no-indexes records that are clearly about minors.
  - [Public records privacy policy](https://opencorporates.com/public-records-privacy-policy/)
- **North Data** (Hamburg): a person-searchable director graph was upheld by the Hamburg DPA in 2025, after it removed sole-ownership details (§3.2).
- **RISE Project** (Romania): drew an ANSPDCP inquiry over a corruption investigation (§2).
- **Expert Forum** (Romania): publishes analyses naming individual party donors drawn from AEP and Monitorul Oficial lists (§3.3).
- **ANI** itself (Romania): published full declarations online until CCR 297/2025 and now publishes only banded fișe (§3.1).

## 7. Open questions for the decision

1. **Which hook does Grivei claim:** Law 190/2018 art. 7 (journalistic purpose), art. 6(1)(f) legitimate interest, or both? Art. 7 removes most duties but only for public-role or public-fact data, and only if Grivei's activity counts as journalism under *Satamedia*/*Buivids*. A pure database may be closer to *Satakunnan* than to journalism.
2. **ANI declarations after CCR 297/2025 and Law 180/2026:**
   - Does Grivei use only the new banded fișe? Does it ignore or keep pre-2025 full declarations already scraped by others?
   - The law now treats full declarations as confidential, so republishing them cuts against both a CCR decision and statute.
   - Does the "institution-only" middle path from #108 become the default?
3. **Spouses, relatives and third-party names** (C-184/20 operative point 1; Law 180/2026 art. 2(8)): are they ever shown, or always generic ("soț/soție")?
4. **Party donors as art. 9 data:** does publication in Monitorul Oficial make them "manifestly made public by the data subject"? No ruling was found. Should donors be shown named, banded, or only above a higher threshold?
5. **Court parties:** criminal-case parties are art. 10 data. Limit to defendants who are officials or companies? Should private individuals in civil cases always be excluded, mirroring ReJust's anonymisation? How should time decay be handled (*Hurbain*, *Biancardi*)?
6. **Beneficial owners vs administrators:** administrators are well supported (Manni, Hamburg/North Data). Beneficial owners carry WM and Sovim's "no general public access" ruling. Show them only behind a legitimate-interest gate, or not at all?
7. **Erroneous-match threshold:** what measured false-link rate is "good faith" under Civil Code art. 75(2)? Should every person link show its evidence and a one-click "this isn't me" path that routes to art. 16 / art. 18 handling?
8. **Name-searchability:** the Hamburg DPA counted name search and search-engine indexing as aggravating, though not decisive. Should person pages be no-indexed, or not searchable by name?
9. **Retention:** mirror source retention (OpenSanctions), keep a permanent archive (OpenCorporates), or follow the new ANI 5-year window?
10. **Governance:** is a DPIA under ANSPDCP Decision 174/2018, a DPO (GDPR art. 37), and a public art. 14(5)(b) notice needed before any person-subject Source ships? What is the response SLA for art. 15–21 requests?
11. **Who is the controller:** Grivei's legal form (NGO, company, individual) decides whether art. 6(1)(e) is ever available, who carries art. 82 and Civil Code liability, and whether art. 85 media status can be claimed.
