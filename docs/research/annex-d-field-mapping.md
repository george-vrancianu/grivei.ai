# Annex D fields and the legal ground each stands for

Research for [#312](https://github.com/george-vrancianu/grivei.ai/issues/312), on the map [#311](https://github.com/george-vrancianu/grivei.ai/issues/311). It confirms against primary sources the field-to-ground mapping that [#310's note](https://github.com/george-vrancianu/grivei.ai/blob/research/annex-d-no-publication/docs/research/annex-d-no-publication.md) (section 2) inferred from field names. In this note, "Declared ground" means the ground an authority ticks in SEAP's Annex D. "Annex D" names SEAP's form only.

Investigated 2026-11-20.

## Answer in brief

- **Each Annex D flag is one checkbox of the EU standard form**: Annex D1 of Implementing Regulation (EU) 2015/1986 for `annexD_New`, Annex D2 for `annexD_New_U`. SEAP's own view template binds each JSON field to its checkbox, so the mapping below is read off the source, not inferred. Every D1 item maps to one case of Directive 2014/24 art. 32 and Legea 98/2016 art. 104. Every D2 item maps to one case of Directive 2014/25 art. 50 and Legea 99/2016 art. 117(1) lit. a)–j), which follows art. 50 letter for letter.
- **`isAcquisitionDirectiveCompliant` = true means the opposite of its name.** It is the form's part 2 radio, "Achizitia nu se încadreaza în domeniul de aplicare al directivei" (the procurement falls outside the scope of the Directive). It is not an art. 104 ground. When it is true, SEAP disables every part 1 ground. In the sample it was true on 20 of 396 notices, and always with no other ground ticked.
- **Two corrections to #310's table:**
  - `bargainPurchase` is D2's "bargain purchase" (Law 99 art. 117(1)(h)), not the winding-up case. Winding-up and insolvency are the two booleans `isSupplierCeasingOperations` and `isSuppliedFromBankruptcy`.
  - Sub-reason id 4, "Existenta unui drept exclusiv" (`ExclusiveRight`), exists only on the concessions form (D4, Directive 2014/23). It cannot occur on D1 or D2.
- **Unconfirmed:**
  - the meaning of `isAdvantageousAcquisition` on `annexD_New_U`;
  - the current wording of Law 99 art. 117 (I read a 2020 consolidation);
  - the OUG 114/2011 (defence) mapping (I read a 2014 consolidation).

## Sources

1. **Commission Implementing Regulation (EU) 2015/1986**, Annex III (standard form 3, last page: Annex D1) and Annex VI (standard form 6, last page: Annex D2), OJ L 296, 12.11.2015.
   - EUR-Lex returned an empty 202 bot challenge again. The Publications Office Cellar served the official XHTML by content negotiation: `GET https://publications.europa.eu/resource/celex/32015R1986`, `Accept: application/xhtml+xml`, `Accept-Language: eng` (and `ron`).
   - The forms are embedded page images. I read the EN and RO pages directly; they are images 15 (D1) and 31 (D2) of the document.
   - The regulation was repealed by Implementing Regulation (EU) 2019/1780 (eForms) from 25 Oct 2023. SEAP's national form still uses the 2015/1986 layout (`hasEformsDocument` was false on all sampled notices, per #310).
2. **Directive 2014/24/EU art. 32** and **Directive 2014/25/EU art. 50**, official EN XHTML from Cellar (CELEX 32014L0024, 32014L0025).
3. **Legea 98/2016 art. 104**: legislatie.just.ro, consolidated text as fetched by #310 (scratch `/tmp/annexd310/law/l98.txt`, current to OUG 52/2024).
4. **Legea 99/2016 art. 117**: legislatie.just.ro, `DetaliiDocument/227288`. This consolidated version is current only to the 12-02-2020 amendment. Later changes (Legea 208/2022 and OUG 52/2024 reworded Law 98 art. 104(1)(c)) may have reached art. 117(1)(d) too; **not checked**. The letter structure a)–j) is the Directive's and is unlikely to have moved.
5. **OUG 114/2011 art. 102**: legislatie.just.ro, `DetaliiDocument/159171`, consolidated only to 1 Jan 2014. **Not checked for later amendments.**
6. **SEAP SPA**, fetched 2026-11-20 with the crawler's `User-Agent` and `Referer`, 4 requests ≥1.5 s apart:
   - `GET /template/pub/notices/ca-notice/view-c/view`: the public award-notice view. Its Annex D block holds every checkbox, its `ng-model` and its Romanian label.
   - `GET /views/pub/notices/ca-notice/view-c/view.min.js`: the controller. It sets `this.sectionAnnexD = isUtilityContract ? item.caNoticeEdit_New_U.annexD_New_U : item.caNoticeEdit_New.annexD_New`.
   - `GET /locale/ro-RO/CANotice` and `/locale/ro-RO/Common` (the latter cached by #310): label and classifier bundles.
   - Scratch copies are in `/tmp/312/web/`, not in the repo.
7. **Sample:** the notice details cached by #310 and its companion (`/tmp/annexd310/raw`, `/tmp/annexd-other/raw`): 396 distinct notices, 368 with `annexD_New` and 28 with `annexD_New_U`.

## How the form is built (from the template)

- **Header.** The section is titled `Anexa D1 – Achizitii publice generale` or `Anexa D2 – Utilitati`, depending on `isUtilityContract`, and is shown when `conditions.hasAnnexD`. On award notices of type 3, the subtitle names Directiva 2014/24/UE. On type 16 (concession award) it is the D4 variant for Directiva 2014/23/UE; that variant is out of scope here.
- **Part 1 and part 2 are a single radio pair, both bound to `isAcquisitionDirectiveCompliant`.**
  - Part 1, "1. Justificarea alegerii procedurii negociate … în conformitate cu articolul 32 din Directiva 2014/24/UE" (or "articolul 50 din Directiva 2014/25/UE"), is `ng-value=false`.
  - Part 2, "2. Alte justificari ale atribuirii contractului …", is `ng-value=true`. Its one checkbox, "Achizitia nu se încadreaza în domeniul de aplicare al directivei", is bound to the same field and permanently disabled. It simply mirrors the radio.
  - Every part 1 input has `ng-disabled="… || vm.sectionAnnexD.isAcquisitionDirectiveCompliant"`.
- **Group checkboxes are view-only.** "Nicio oferta …", "Lucrarile, produsele sau serviciile pot fi furnizate numai de un anumit operator economic …" and "Cumpararea … în conditii deosebit de avantajoase" are bound to view-model variables (`vm.annexNoOffer`, `vm.reasonForUniqueOffererChecked`, `vm.isSupplierOperations`), not to the JSON. Only their sub-options are stored.
- **The free text is part 3, "3. Explicatie"**, stored in `explanation`. SEAP's help text there still cites "Directiva 2004 / 18 / CE", a leftover from the old form.
- **The earlier-notice link is captured but rarely filled.** "Anuntul anterior publicat" goes to `unawardedSysNoticeType` / `unawardedNoticeNo`, through a picker or manual entry (types: Anunt de participare 2, Anunt de participare simplificat 17, Anunt de concurs de solutii 6, Anunt de concesionare 7, Invitatie de participare 12). Its picker button is enabled only when repetition, design contest, additional deliveries, or a D1 no-offer option (`noOfferForOpenProcedure` / `noOfferForRestrictedProcedure`) is ticked. D2's `noOfferToNegociationProcedure` is not in that condition, so a utility no-offer award cannot link the failed notice.
- **SEAP's labels are the official Romanian text of D1/D2 without diacritics.** One wording differs: SEAP says "o licitatie deschisa" / "o licitatie restransa" where the regulation says "o procedură deschisă" / "o procedură restrânsă".

## `annexD_New` (Annex D1, Directive 2014/24): Legea 98/2016, and OUG 114/2011 notices

"Seen" counts the notices in the 368-notice sample with the field true (or with that sub-reason id).

| Field (JSON) | SEAP label (RO, verbatim from the template) | EU form item (Annex D1, EN verbatim) | Directive 2014/24 | Legea 98/2016 | Seen |
|---|---|---|---|---|---|
| `isAcquisitionDirectiveCompliant` = false | 1. Justificarea alegerii procedurii negociate fara publicarea prealabila a unei invitatii la o procedura concurentiala de ofertare în conformitate cu articolul 32 din Directiva 2014/24/UE | 1. Justification for the choice of the negotiated procedure without prior publication … in accordance with Article 32 | art. 32 | art. 104 (a ground below must be ticked) | 349 |
| `noOfferForOpenProcedure` | Nicio oferta sau nicio oferta/cerere de participare adecvata ca raspuns la: **o licitatie deschisa** | No tenders or no suitable tenders/requests to participate in response to: open procedure | 32(2)(a) | 104(1)(a) | 33 |
| `noOfferForRestrictedProcedure` | … **o licitatie restransa** | … restricted procedure | 32(2)(a) | 104(1)(a) | 0 |
| `areProductsResearchAndStudy` | Produsele în cauza sunt fabricate exclusiv în scopuri de cercetare, experimentare, studiu sau dezvoltare în conditiile prevazute de directiva (numai pentru bunuri) | The products involved are manufactured purely for the purpose of research, experiment, study or development … (for supplies only) | 32(3)(a) | 104(5)(a) | 0 |
| `sysReasonForUniqueOfferer.id` = 1 (`Technical`) | Lucrarile, produsele sau serviciile pot fi furnizate numai de un anumit operator economic pentru urmatorul motiv: absenta concurentei pentru motive tehnice | … only by a particular economic operator: absence of competition for technical reasons | 32(2)(b)(ii) | 104(1)(b) with (2)(b) | 11 |
| `sysReasonForUniqueOfferer.id` = 2 (`Artistical`) | … scopul achizitiei este crearea sau achizitionarea unei opere de arta sau reprezentatii artistice unice | … creation or acquisition of a unique work of art or artistic performance | 32(2)(b)(i) | 104(1)(b) with (2)(a) | 11 |
| `sysReasonForUniqueOfferer.id` = 3 (`Exclusivity`) | … protectia unor drepturi exclusive, inclusiv drepturile de proprietate intelectuala | … protection of exclusive rights, including intellectual property rights | 32(2)(b)(iii) | 104(1)(b) with (2)(c) | 11 |
| `isForceMajeure` | Extrema urgenta determinata de evenimente care nu puteau fi prevazute de catre autoritatea contractanta si în conformitate cu conditiile stricte prevazute de directiva | Extreme urgency brought about by events unforeseeable for the contracting authority … | 32(2)(c) | 104(1)(c) | 237 |
| `isSupplementaryServiceCompliantOrdered` | Livrari suplimentare efectuate de furnizorul initial comandate în conditiile stricte prevazute de directiva | Additional deliveries by the original supplier ordered under the strict conditions … | 32(3)(b) | 104(5)(b) | 0 |
| `isNewServiceARepetition` | Lucrari/servicii noi, constituind o repetare a lucrarilor/serviciilor existente si solicitate în conformitate cu conditiile stricte prevazute de directiva | New works/services, constituting a repetition of existing works/services … | 32(5) | 104(8) | 1 (OUG 114) |
| `isAssignedToAProjectContestWinner` | Contract de servicii care va fi atribuit castigatorului sau unuia dintre castigatori conform regulilor unui concurs de proiecte | Service contract to be awarded to the winner or one of winners under the rules of a design contest | 32(4) | 104(7) | 0 |
| `areProductsStockExchangeListed` | Achizitie de produse cotate si achizitionate pe o piata de marfuri | Procurement of supplies quoted and purchased on a commodity market | 32(3)(c) | 104(5)(c) | 40 |
| `isSupplierCeasingOperations` | Cumpararea de produse sau servicii în conditii deosebit de avantajoase: de la un furnizor care îsi înceteaza definitiv activitatile comerciale | Purchase … on particularly advantageous terms: from a supplier which is definitively winding up its business activities | 32(3)(d) | 104(5)(d) | 0 |
| `isSuppliedFromBankruptcy` | … de la lichidatorul dintr-o procedura de insolventa, un concordat preventiv sau o procedura de aceeasi natura prevazuta în legislatia sau reglementarile nationale | … from the liquidator in an insolvency procedure, an arrangement with creditors or a similar procedure … | 32(3)(d) | 104(5)(d) | 0 |
| `isAcquisitionDirectiveCompliant` = true | 2. Alte justificari … / Achizitia nu se încadreaza în domeniul de aplicare al directivei | 2. Other justification … : The procurement falls outside the scope of application of the directive | none (outside the Directive) | **no art. 104 ground** | 19 |
| `bargainPurchase` | (shown only when `isUtilityContract`; see D2) | not on D1 | none | none | 0 (null on 344, false on 24) |
| `explanation` | 3. Explicatie | 3. Explanation (500 words maximum) | | | free text |
| `unawardedSysNoticeType`, `unawardedNoticeNo` | Anuntul anterior publicat | not on the EU form (SEAP addition) | | | 1 |

**Notes on D1:**

- **Law 98 art. 104(1)(a) is wider than the form.** It also covers a failed *procedură simplificată*, but the form offers only open and restricted. Authorities whose simplified procedure failed must tick "o licitatie deschisa" or fall back on part 2. One part 2 notice in the sample says "La trei licitatii consecutive uzand de Procedura simplificata nu s-a depus nici o oferta" (in three consecutive simplified procedures nobody bid).
- **The research ground is supplies only.** Both the Directive (32(3)) and Law 98 (104(5)) limit it to supply contracts; the form says "(numai pentru bunuri)".
- **Repetition covers works or services only** (104(8)), and only within 3 years of the original contract.
- **OUG 114/2011 (defence and security) notices also use `annexD_New`**, with the same Directive 2014/24 labels: 6 of the 368. Their NFPP grounds sit in OUG 114 art. 102 (2014 consolidation), which follows Directive 2009/81 and has more cases than the form. Approximate correspondence:

  | Form item | OUG 114/2011 art. 102 |
  |---|---|
  | no offers | lit. a), b) |
  | extreme urgency | lit. c) crisis urgency, lit. d) extreme urgency |
  | technical reasons / exclusive rights | lit. e) |
  | research | lit. f) (R&D services), lit. g) (supplies) |
  | additional deliveries | lit. h) |
  | commodity market | lit. i) |
  | winding up / insolvency | lit. j) |
  | repetition | lit. l) |

  Additional works/services, lit. k), has no checkbox. **Unconfirmed** against the current text.

## `annexD_New_U` (Annex D2, Directive 2014/25): Legea 99/2016

Law 99 art. 117(1) reproduces art. 50 letter for letter, so the letters coincide. "Seen" is out of 28 utility notices (27 under Law 99, 1 under OUG 114).

| Field (JSON) | SEAP label (RO, verbatim from the template) | EU form item (Annex D2, EN verbatim) | Directive 2014/25 | Legea 99/2016 | Seen |
|---|---|---|---|---|---|
| `isAcquisitionDirectiveCompliant` = false | 1. Justificarea alegerii procedurii negociate fara publicarea prealabila a unei invitatii la o procedura concurentiala de ofertare în conformitate cu articolul 50 din Directiva 2014/25/UE | 1. … in accordance with Article 50 of Directive 2014/25/EU | art. 50 | art. 117(1) | 27 |
| `noOfferToNegociationProcedure` | Nicio oferta sau nicio oferta/cerere de participare corespunzatoare primita ca raspuns la o invitatie prealabila la o procedura concurentiala de ofertare: | No tenders or no suitable tenders/requests to participate in response to a procedure with prior call for competition | 50(a) | 117(1)(a) | 5 |
| `areProductsResearchAndStudy` | Contractul vizeaza exclusiv cercetarea, experimentarea, studiul sau dezvoltarea în conditiile prevazute de directiva | The contract involved is purely for the purpose of research, experiment, study or development … | 50(b) | 117(1)(b) | 0 |
| `sysReasonForUniqueOfferer.id` = 1 / 2 / 3 | … absenta concurentei pentru motive tehnice / … opere de arta sau reprezentatii artistice unice / … protectia unor drepturi exclusive, inclusiv drepturile de proprietate intelectuala | … technical reasons / unique work of art … / protection of exclusive rights … | 50(c)(ii) / (i) / (iii) | 117(1)(c) with (2)(b) / (a) / (c) | 5 / 0 / 2 |
| `isForceMajeure` | Situatie de urgenta extrema survenita în urma unor evenimente care nu puteau fi prevazute de entitatea contractanta, în conformitate cu conditiile stricte stabilite de directiva | Extreme urgency brought about by events unforeseeable for the contracting entity … | 50(d) | 117(1)(d) | 7 |
| `isSupplementaryServiceCompliantOrdered` | Livrari suplimentare efectuate de furnizorul initial comandate în conditiile stricte prevazute de directiva | Additional deliveries by the original supplier … | 50(e) | 117(1)(e) | 0 |
| `isNewServiceARepetition` | Lucrari/servicii noi, constituind o repetare a lucrarilor/serviciilor existente si solicitate în conformitate cu conditiile stricte prevazute de directiva | New works/services, constituting a repetition … | 50(f) | 117(1)(f) with (3) | 0 |
| `areProductsStockExchangeListed` | Achizitie de produse cotate si achizitionate pe o piata de marfuri | Procurement of supplies quoted and purchased on a commodity market | 50(g) | 117(1)(g) | 7 |
| `bargainPurchase` | Achizitionare avantajoasa profitand de o oportunitate deosebit de avantajoasa disponibila pentru o perioada foarte scurta de timp la un pret considerabil mai mic decat preturile pietei | Bargain purchase taking advantage of a particularly advantageous opportunity available for a very short time at a price considerably lower than market prices | 50(h) | 117(1)(h) | 0 (null 25, false 3) |
| `isSupplierCeasingOperations` | Cumpararea de produse sau servicii în conditii deosebit de avantajoase: de la un furnizor care îsi înceteaza definitiv activitatile comerciale | Purchase … on particularly advantageous terms: from a supplier which is definitively winding up … | 50(i) | 117(1)(i) | 0 |
| `isSuppliedFromBankruptcy` | … de la lichidatorul dintr-o procedura de insolventa, un concordat preventiv sau o procedura de aceeasi natura … | … from the liquidator in an insolvency procedure … | 50(i) | 117(1)(i) | 0 |
| `isAssignedToAProjectContestWinner` | Contract de servicii care va fi atribuit castigatorului sau unuia dintre castigatori conform regulilor unui concurs de proiecte | Service contract to be awarded to the winner … of a design contest | 50(j) | 117(1)(j) | 0 |
| `isAdvantageousAcquisition` | not bound in the public view | n/a | ? | ? (**unconfirmed**, see below) | 0 (false on 28) |
| `isAcquisitionDirectiveCompliant` = true | 2. Alte justificari … / Achizitia nu se încadreaza în domeniul de aplicare al directivei | 2. Other justification … : outside the scope of the directive | none | **no art. 117 ground** | 1 |
| `explanation` | 3. Explicatie | 3. Explanation | | | free text |

**Notes on D2:**

- `annexD_New_U` has no `noOfferForOpenProcedure` or `noOfferForRestrictedProcedure`: the D2 form has a single no-offer item.
- **`isAdvantageousAcquisition` is unexplained.** The public template has no input bound to it. The bargain item is bound to `bargainPurchase`, yet its locale key is `CANotice.Label.AdvantageousAcquisition(_D2_New)`. So `isAdvantageousAcquisition` is either what SEAP's private (authority-side) editor writes for the same 50(h) item, or a dead field. It was false on all 28. Settling it needs the authenticated editor template, or a notice with either field true. Until then, **treat either field being true as 117(1)(h)**.
- The classifier `SysAnnexDAdvantageousTerm` (ClosingDown / Liquidating, in `/locale/ro-RO/Common`) is not used by the current form, which stores the two sub-options as separate booleans. It is probably a leftover from the 2004 forms.

## What `isAcquisitionDirectiveCompliant` means

- **What it is.** It is the form's part 2 radio. True means "Other justification: the procurement falls outside the scope of application of the directive"; false means a part 1 (art. 32 / art. 50) ground. The name reads as "is compliant with the Directive", but true means *outside* the Directive.
- **No legal ground of its own.** It names no art. 104 or art. 117 case. Under Romanian law an NFPP award still needs an art. 104 / art. 117 ground even below the EU thresholds: Law 98 and Law 99 apply to below-threshold awards too. The EU form's part 2 is meant for awards that are outside the Directive altogether, e.g. exclusions.
- **Mutually exclusive in the data, as the template enforces.** On all 20 notices where it was true, no part 1 ground was set.
- **Mostly misused.** In the sample, most of its explanations cite an art. 104 case anyway:
  - "In temeiul art. 104 alin. (1) lit. c …", and "Art. 104 alin. (1) lit. b) …";
  - stop-gap texts like "STOC 0, PROCEDURA IN DERULARE" (stock at zero, procedure under way);
  - "Solicitare urgenta" (urgent request);
  - the below-threshold argument ("art. 7, alin (5) … sub pragurile de publicare în JOUE");
  - "Nu este cazul" (not applicable).

  A Declared ground of part 2 should therefore be shown as "outside the Directive (as declared)", with the explanation verbatim, and never mapped to an article.

## Unconfirmed or open

1. **`isAdvantageousAcquisition`** (`annexD_New_U`): which form item it stores, if any. See D2 notes.
2. **Current wording of Law 99 art. 117(1)(d)**: read on a 2020 consolidation. Law 98's twin, art. 104(1)(c), was reworded by Legea 208/2022 and OUG 52/2024 (see #310 §2). The letter mapping is unaffected.
3. **OUG 114/2011 art. 102**: read on a 2014 consolidation; the mapping to D1 items is approximate (the form is not built for Directive 2009/81).
4. **No ANAP guidance read.** I found no ANAP or ANRMAP document on filling Annex D; the template and the regulation are the authoritative sources for what each field records.
5. **Why the earlier-notice link is almost never filled** (1 of 396) even though the form offers it for the no-offer ground: not investigated. The failed notice's number is usually in the free text instead (#310's companion note).
