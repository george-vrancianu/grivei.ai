# Annex D justifications for negotiation without prior publication

Research for [#310](https://github.com/george-vrancianu/grivei.ai/issues/310). Builds on the 2021–2022 backfill research ([#30](https://github.com/george-vrancianu/grivei.ai/issues/30), [write-up](https://github.com/george-vrancianu/grivei.ai/blob/research/no-publication-backfill/docs/research/no-publication-backfill.md)) and on ADR 0019 (outside indicators come in only as our own Signal rules).

Investigated 2026-11-20. The e-licitatie API is undocumented, so everything about it below is observed behaviour. I sent about 300 requests to `e-licitatie.ro`, one at a time and at least 1.2 s apart, with the crawler's `User-Agent` and `Referer: https://e-licitatie.ro/pub` (`watchdog/pipeline/crawl/client.py`):

- 290 notice details, `GET /api-pub/C_PUBLIC_CANotice/get/{caNoticeId}`;
- 6 day lists, `POST /api-pub/NoticeCommon/GetCANoticeList/`;
- 1 contract list, `POST /api-pub/C_PUBLIC_CANotice/GetCANoticeContracts`;
- 3 SPA files (`/pub`, `/app-pub`, `/locale/ro-RO/Common`).

Counts come from the local database (the `grivei-db-1` container, rebuilt today). The sampling scripts stayed in `/tmp` and are not in the repo.

## Answer in brief

1. **Volume and cost.** There are about 6–12 k notices a year for *negociere fără publicare prealabilă* (NFPP): 51,444 from 2021 to 20 Nov 2026. A notice detail is about 13.8 KB of JSON (3.8 KB gzipped) and takes 0.72 s to fetch.
   - The nightly crawl would add about 20 requests a day.
   - A one-off backfill of every NFPP notice since 2021 is about 51 k requests: about 15 h at the crawler's pace, about 0.7 GB raw or 0.2 GB gzipped in the raw archive.
   - The 2023–2025 records (and the 2026 bulk ones) came from the bulk files and have no `caNoticeId`. They need about 300 week-window list calls first to map `noticeNo` to an id.
2. **Annex D shape.** There is one form version (`sysNoticeVersion` 2, "Formulare in format > 2016") on all 289 sampled notices from 2021 to 2026.
   - Annex D is present whenever `conditions.hasAnnexD` is true, which held for every NFPP notice. It is also present on *Norme proprii* and *Procedura simplificată proprie* notices.
   - There are two variants: `annexD_New` (Law 98/2016 and OUG 114/2011) and `annexD_New_U` (Law 99/2016 utilities, about 7 %). The flag set inside each variant is the same on every notice.
   - The **flags are a weak signal of the real reason**: the "extreme urgency" flag (`isForceMajeure`) is ticked on **69 %** of notices. The `explanation` is always filled, but 14 % of explanations are under 40 characters and 6 % only cite an article.
3. **Patterns.**
   - **Stop-gaps are the dominant story.** About 24–30 % of all notices tick "extreme urgency" but describe a stop-gap: a tender still running, stock at zero, or a framework agreement expired. Art. 104(1)(c) excludes urgency the authority caused itself.
   - **The "below the JOUE threshold" non-justification is rare (3 %).** It is mostly one authority's template: 7 of 9 sampled cases are the Tulcea county hospital.
   - **The "no suitable offers" ground rarely names the failed procedure.** The structured reference to the earlier notice (`unawardedNoticeNo`) was empty on all 26 such notices, and the text names a notice number in only 9.
4. **Signal design.**
   - **Keep one `NO_PUBLICATION` rule and show the declared ground as a number on it.** Splitting it into one rule per ground isn't worth it, because the ground flag is mostly "urgency" whatever the facts.
   - **Two refinements are worth having:**
     - a value floor at the direct-purchase cap: 77 % of NFPP records fall below it, and they carry 1.6 % of NFPP value;
     - one new text rule, "urgency used as a stop-gap".
   - **Not worth building now: "above the EU threshold but not sent to JOUE".** It fired on 1 of 18 sampled notices above the threshold, and that one declared the purchase outside the Directive's scope. The `sentToJOUE` flag is also true on notices far below the threshold.
5. **Winner/activity mismatch.**
   - **CUI 28697278 is a SEAP data-entry artefact, not a supplier.** It is a law partnership (S.C.P.A.) that SEAP attaches as the winner of **137 Records across 67 authorities and 20 CPV divisions**, worth about 216 M RON. 98 % of them are offline notices. In some notices the winner's name is a different firm (for example a Sibiu security firm), but the CUI and SEAP `entityId` 201763 are the law firm's.
   - **A CAEN rule wouldn't catch it.** Law partnerships are not in the ONRC register, so a CAEN-based rule stays silent by design ("unknown is never a Signal"). The fix is on the identity side, not a new Signal rule.

## 1. Volume and cost

### Counts

NFPP Records in the database, by publication year (`seap.record`, `procedure ~* '^negociere f'`; one Record per notice):

| Year | Notices | Source | Have `caNoticeId` |
|---|---|---|---|
| 2021 | 11,849 | crawl backfill (#78) | all |
| 2022 | 11,934 | crawl backfill | all |
| 2023 | 6,945 | bulk "fără anunț" files | none |
| 2024 | 8,027 | bulk | none |
| 2025 | 6,075 | bulk (1 crawled) | 1 |
| 2026 (to 20 Nov) | 6,614 | bulk 5,960 + nightly crawl 654 | 654 |
| **Total** | **51,444** | | 24,438 |

On the six sampled days, NFPP was 198 of the 830 award notices listed (24 %). Every one had `procedureId: null` and `sysNoticeVersionId` 2, as #30 found.

**`NO_PUBLICATION` is already the most frequent Signal rule.** There are 20,172 Signals (authority-day groups), against 9,759 for `SPLITTING`, 4,105 for `OVER_CAP` and 1,544 for `FRAMEWORK_OVERRUN` (`seap.signal`).

**Most NFPP Records sit below the direct-purchase cap.** The cap is set by art. 7(5): 135,060 / 450,200 lei (goods and services / works) until 9 Sep 2022, and 270,120 / 900,400 lei since Legea 208/2022.

- **Below the cap:** 39,808 of the 51,444 Records (77.4 %). The test uses the contract value, because neither the bulk files nor the notice detail carry the estimate that art. 7(5) actually tests. These Records carry 1.6 % of NFPP value.
- **Median value (`totalAcquisitionValue`) in the sample:** 27 k lei on the random part, 57 k lei overall. The motivating notice (CAN1134161) is 7,950 lei.

### Fetch cost

Measured on the 289 sampled details:

| | Mean | Median | Max |
|---|---|---|---|
| Response size | 13.8 KB | 13.4 KB | 20.4 KB |
| Gzipped | 3.8 KB | | |
| Latency | 0.72 s | 0.70 s | 2.45 s |

There were no errors or throttling at 1 request per 1.9 s.

- **Nightly crawl.** About 20 NFPP notices a day in 2026 (6,614 in 324 days), so about 20 more `GET`s a day. The crawl already makes one contracts call per offline notice, so this roughly doubles the per-notice cost for this subset only. Each detail is archived unchanged next to `contracts-<id>-s00000.json`, per ADR 0004.
- **Backfill since 2021.**
  - **Requests:** about 51 k detail requests. At the client's 0.35 s pause plus 0.72 s latency, that is about 15 h. At the 1.2 s pause used here, it is about 27 h.
  - **Archive:** about 0.7 GB raw (0.2 GB if the archive or restic compresses).
  - **Id mapping:** the 2023–2025 and 2026-bulk Records (about 27 k) first need their `caNoticeId`. That means re-listing by week windows: about 150 weeks × 1–2 pages, the same `capped_list` path as the #78 backfill. The list rows also give `sysNoticeVersionId` and `ronContractValue`.
  - **Other offline procedures:** *Norme proprii* and *Procedura simplificată proprie* notices also carry Annex D (1 of each checked). Including them adds about 15 % to the request count (38 of 236 offline notices on the sampled days).
- **Personal data (ADR 0016).**
  - **Notice details:** the detail names the authority's contact person, with their e-mail and phone (`section1_1.caAddress.contactPerson`, `contactPoints`, `email`, `phone`). These are officials acting in their role. The contracts responses we already archive carry the same kind of fields for winners. No CNP-shaped value was seen.
  - **What the Connector must declare:** whether the contact fields are kept, which is my reading of ADR 0015/0016 for officials in role, or stripped at fetch, as SMIS strips `LEGAL_REPR`/`PHONE`/`EMAIL`.

## 2. Annex D shape

### Where it is

- **Law 98/2016 notices** (`isUtilityContract: false`): `caNoticeEdit_New.annexD_New`.
- **Law 99/2016 notices** (`isUtilityContract: true`): `caNoticeEdit_New_U.annexD_New_U`. The other sections there are also `_U`.
- **`conditions.hasAnnexD`:** true on all 289.
- **The rest of the envelope**, also not loaded today: `legislationType`, `sysNoticeVersion`, `contractingAuthorityType`, `section1_1.caAddress.legalBuyerType`, `section2_1_New.totalAcquisitionValue` and `sysAcquisitionContractType`, `sentToJOUE`, `tedNoticeNo`.

**`totalAcquisitionValue` is the awarded total, not the estimate.** It equals our Record's contract value (±1 lei) on 142 of the 145 crawled notices in the sample, and a separate sampling session found the same on 117 of 138. So the detail adds no estimated value: the PAAP block (`paapModel.acquisitionValue`) was 0 on the motivating notice. The issue lists the field as "(estimate)", which is wrong.

On the 289 notices: `legislationType` was Law 98/2016 on 268, Law 99/2016 on 19 and OUG 114/2011 (defence and security) on 2. `sysNoticeVersion` was 2 on all of them. `hasEformsDocument` was false on all of them.

### Fields and the ground each stands for

The API names are the form's. I matched each one to Law 98/2016 by its name and by the classifier labels in the SPA's `/locale/ro-RO/Common` (`SysAnnexDSingleSuppReason.*`, `SysAnnexDAdvantageousTerm.*`). The matches are **inferred**. The EU standard form these mirror is Annex D1 of Implementing Regulation (EU) 2015/1986, but EUR-Lex returned a bot challenge, so I couldn't quote it.

| Field | Ground (Law 98/2016 art. 104) | Seen in the sample |
|---|---|---|
| `noOfferForOpenProcedure`, `noOfferForRestrictedProcedure` | (1)(a): no offers, or only unsuitable ones, in an open, restricted or simplified procedure | 23 |
| `noOfferToNegociationProcedure` (utilities only) | Law 99/2016 art. 117(1)(a) | 3 |
| `sysReasonForUniqueOfferer`: Technical / Artistical / Exclusivity / ExclusiveRight | (1)(b) with (2)(b) technical, (2)(a) work of art, (2)(c) exclusive rights; "ExclusiveRight" ("Existența unui drept exclusiv") was not seen | 9 / 6 / 8 / 0 |
| `isForceMajeure` | (1)(c): extreme urgency from unforeseeable events not attributable to the authority | 192 |
| `areProductsResearchAndStudy` | (5)(a): products made purely for research | 0 |
| `isSupplementaryServiceCompliantOrdered` | (5)(b): additional deliveries from the original supplier | 0 |
| `areProductsStockExchangeListed` | (5)(c): goods quoted and bought on a commodity market (in practice the Bursa Română de Mărfuri) | 34 |
| `isSupplierCeasingOperations`, `isSuppliedFromBankruptcy`, `bargainPurchase` (classifier ClosingDown/Liquidating), `isAdvantageousAcquisition` (utilities) | (5)(d): particularly advantageous terms from a supplier winding up or insolvent | 0 |
| `isAssignedToAProjectContestWinner` | (7): service contract after a design contest | 0 |
| `isNewServiceARepetition` | (8): repetition of similar works or services from the original contractor | 1 (OUG 114/2011) |
| `isAcquisitionDirectiveCompliant` | Not an art. 104 ground. Used as "outside the Directive's scope": it is the one ticked on a *Norme proprii* notice citing art. 68(h), and its explanations include "Nu este cazul" | 16 |
| `unawardedSysNoticeType`, `unawardedNoticeNo` | Reference to the unsuccessful earlier notice | **0 of 289 filled** |
| `explanation` | Free text | 289 of 289 non-empty |

**Every notice had at least one ground ticked**, and 13 (5 %) had more than one. The usual combination was `noOfferForOpenProcedure` with `isForceMajeure`.

**The ground ticked often contradicts the text.**

- **Art. 104(1)(c) has changed during the period:**
  - before Legea 208/2022 it also allowed buying "in parallel" with the negotiation in cases of immediate intervention;
  - from 10 Sep 2022 to 24 May 2024 it was reworded, and a lit. d) treated termination of transport-infrastructure contracts through the contractor's fault as urgency;
  - since OUG 52/2024 lit. d) and alin. (4^1) are repealed.

  None of this changes the core test: "evenimente imprevizibile și care nu se datorează sub nicio formă unei acțiuni sau inacțiuni a autorității contractante" (unforeseeable events that are in no way due to an action or inaction of the contracting authority).
- **The "Artistical" option is ticked by authorities that are not buying art.** Four of its 6 uses come with the text "In baza art. 104 alin. (2) lit. a) si b)", which cites both the art reason and the technical reason. That suggests a picklist whose first item gets chosen.

## 3. Explanation patterns

### Sample

- **Size and spread:** 279 NFPP notices plus 10 notices won by CUI 28697278, which were picked on purpose and are left out of the rates below.
- **Random-by-record part:** 145 notices from 2021, 2022 and 2026, drawn from the database ordered by `md5(code)`, across 76 authorities.
- **List-day part:** 133 notices from 2023–2025, at most 25 a day from the national list of 6 days (2023-03-14, 2023-09-19, 2024-02-20, 2024-09-30, 2025-04-15, 2025-10-21), across 52 authorities.
- **The list-day part is clustered.** For example, one hospital's identical text appears 18 times on 2023-09-19. So the rates below are given for both parts.

The classes are mine. They are regular expressions on the folded text (case and accents ignored), and a notice can be in more than one class:

| Class (on the explanation text) | Random 2021/22/26 (n=145) | List days 2023–25 (n=133) |
|---|---|---|
| Ticks extreme urgency (`isForceMajeure`) | 63 % | 75 % |
| … and the text describes a **stop-gap**: a tender running or unawarded, stock at 0, a framework expired, "until the procedure ends" | **30 %** | 17 % |
| … and the text has no urgency word, no failed procedure and no COVID/war event | 34 % | 30 % |
| Explanation under 40 characters | 14 % | 14 % |
| Only a legal citation ("Conform art.104, alin.1, lit.c din Legea 98/2016") | 4 % | 8 % |
| "Below the JOUE threshold" | 3 % | 4 % |
| Names a failed procedure (no offers, cancelled, unawarded) | 13 % (noOffer ground) | 5 % |
| Commodity exchange ground | 14 % | 11 % |
| Single-supplier ground (technical, artistic, exclusivity) | 8 % | 9 % |
| Identical text shared with another notice in the sample | 129 of 279 notices share 30 texts | |

### Typical explanations

Quoted as published, with notice and value (`totalAcquisitionValue`).

**Stop-gap under "extreme urgency"** (the commonest real story):

- CAN1066294 (2021, 64,000 lei): "procedura in derulare" (procedure under way).
- CAN1053986 (2021, 50,000 lei): "LICITATIE DESCHISA NEATRIBUITA" (open tender not awarded).
- CAN1062072 (2021, 900 lei): "Conf art. 9 alin (3) lit b) din HG 395/2016, contractul de furnizare va permite autorităţilor contractante desfasurare activitatii pana la incheierea procedurii de atribuire" (the contract lets the authority keep working until the award procedure ends).
- Seen at several hospitals: "Situație de urgență, pentru acoperirea necesarului curent, până la încheierea unui contract de achiziție publică prin procedura de atribuire competitivă" (an emergency, to cover current needs until a contract is concluded by competitive procedure).
- CAN1111042 (2024, 429,131 lei) states the cause outright: "Motivele obiective, pentru care nu a fost posibila initierea procedurii de Licitatie deschisa pana la aceasta data, sunt urmatoarele: a) personal insuficient in cadrul Directiei Achizitii…" (the objective reasons an open tender couldn't be started: a) not enough staff in the procurement department…). That is urgency attributable to the authority, which art. 104(1)(c) excludes.

**The "below the JOUE threshold" non-justification.** CAN1134161 (2024, 7,950 lei), the motivating case:

> "Valoarea estimata a achizitiei nu depaseste progul valoric prevazut la art.7, alin.1,lit.c din Legea 98/2016, iar autoritatea contractanta nu are obligatia publicarii unui anunt de participare in JOUE"

(the estimated value does not exceed the art. 7(1)(c) threshold, so the authority need not publish a contract notice in the JOUE)

- **One authority's template.** The same text, typo "progul" included, appears on CAN1082001 (2022), CAN1099607 and CAN1099625 (2023), CAN1134138 and CAN1134142 (2024) and CAN1175720 (2026). All of them are from Spitalul Județean de Urgență Tulcea, which published 445 NFPP notices from 2021 to 2026.
- **Why it isn't a ground.** Being below art. 7(1) removes the duty to publish in the JOUE. It doesn't remove the procedure: below the thresholds, art. 7(2) (as amended by Legea 208/2022) obliges a *procedură simplificată*, and art. 7(5) allows a direct purchase below the cap. It is not an art. 104 ground.
- **Elsewhere it is rare.** Outside Tulcea I saw it twice: a military unit (2021), and a social-assistance directorate (2026) whose text cites art. 104(5)(c) and the threshold together.

**Bare citation or empty reason:**

- "Conform art.104, alin.1, lit.c din Legea 98/2016" (5 notices of one authority, 2024);
- "art. 104 lit "c" din Legea 98/2016";
- "Nu este cazul" (not applicable), with the outside-the-Directive flag;
- "-", with the commodity flag;
- "Solicitare urgenta" (urgent request; 9 identical texts, Arad county hospital).

**Exclusivity with a named rights holder** (the good case, for contrast):

- CAN1074205 (2022): "Operatorul economic JT GRUP SRL deține exclusivitate pentru colectarea deșeurilor în aria administrativ teritorială a orașului Sulina, în baza art. 22, alin (2) din legea 101/2006" (JT GRUP SRL holds the exclusive waste-collection concession for Sulina).
- CAN1099596 (2023): it names the software's ORDA copyright certificate (registration number and date).

Of the 23 single-supplier notices, 13 name the rights holder or the reason. The other 10 cite the article or a generic reason ("absenta concurentei pentru motive tehnice", absence of competition for technical reasons).

**Failed earlier procedure:**

- CAN1057742 (2021): "la procedura de licitație deschisă organizată conform anunțului de participare CN 1029218/17.03.2021 nu a fost depusă nicio ofertă" (no offer was submitted in the open tender under notice CN 1029218).
- Only 9 of the 26 "no offers" notices name the notice like this, and none fills the structured `unawardedNoticeNo`.

**Recurring institutional uses** that are probably legitimate but would dominate any count:

- Romsilva forest-harvesting services, under "urgency" by a 2018 ANAP letter (9 identical texts in the sample);
- energy and fuel bought on the Bursa Română de Mărfuri (the commodity ground; 12 % of notices; a large share of value);
- 2021 COVID-19 purchases.

## 4. Signal design under ADR 0019

ADR 0019's constraints apply here: rules we write ourselves on our own data, a threshold we derive and publish, no score, and a rule whose input is missing does not fire. Options, with what the sample says:

1. **Show the declared ground on every `NO_PUBLICATION` Signal** (a `ground` number: urgency, single supplier and why, no offers, commodity exchange, repetition, outside the Directive). Recommended.
   - It is factual and needs no interpretation.
   - It lets a reader separate the commodity-exchange purchases from the rest.
   - It is missing until the detail is fetched, so the methodology page would show coverage per year.
2. **Split `NO_PUBLICATION` into one rule per ground.** Not recommended.
   - The flag is "urgency" on about 70 % of notices whatever the facts.
   - The single-supplier and no-offers rules would each fire on fewer than 10 % of notices.
   - A split would multiply rules without sharpening any of them.
3. **Refine `NO_PUBLICATION` with a value floor at the art. 7(5) direct-purchase cap** (the cap in force on the award date, by works vs. goods and services). Recommended for discussion.
   - Below the cap the law would have allowed a direct purchase with no call for competition at all, so the absence of a publication says little.
   - The floor removes 77 % of NFPP Records (39.8 k) and keeps 98.4 % of the value.
   - It would cut the most frequent Signal rule to about a quarter of its Records.
   - The counted value is the contract value. The law tests the *estimated* value. The notice detail gives no better input: its `totalAcquisitionValue` is the awarded total (see §2).
4. **New rule: "extreme urgency used as a stop-gap".** Recommended, after a precision check.
   - **When it fires:** the urgency ground is ticked and the explanation matches a published keyword list: a procedure running or unawarded, stock at 0, a framework agreement expired, "until the award".
   - **Why it matters:** art. 104(1)(c) requires events not attributable to the authority. Running out of contract cover while one's own tender is pending is the textbook counter-case.
   - **How often it would fire:** 17–30 % of NFPP notices, so about 1.5–3.5 k a year. Combined with the floor in (3), much fewer.
   - **What to publish:** the keyword list and the measured precision on a hand-labelled sample. The regex here is a first cut. Its "other" class still hides stop-gaps in prose.
5. **New rule: "no stated reason".** A possible later rule; not recommended now.
   - **When it would fire:** the explanation is under 40 characters, only a citation, "nu este cazul", "-", or the below-JOUE template. That is about 14–18 % of notices.
   - **Why wait:** this is a documentation-quality lead rather than a procurement one, and it depends on wording more than facts. Better shown as a badge on the Record than as a Signal.
6. **New rule: "above the EU threshold for its letter, but `sentToJOUE` is false".** Not recommended.
   - **Picking the letter:** it needs a central/other split. `legalBuyerType` is empty on about half of notices (152 of 279), and `contractingAuthorityType` doesn't separate a county hospital from a ministry agency. The motivating notice is a county hospital typed "Consiliul județean".
   - **It hardly fires.** 18 of the 259 Law 98 notices with a value were at or above their letter's threshold (on the awarded total, since the estimate the law tests isn't published), and 17 of them had `sentToJOUE: true`. The one exception ticked "outside the Directive's scope".
   - **The flag is unreliable.** `sentToJOUE` was true on 12 notices below every threshold, and a TED number was present on only 12 of the 31 with `sentToJOUE: true`.
   - **Better:** if wanted later, check against TED itself by `tedNoticeNo`.
7. **New rule: "no offers, but no earlier procedure named".** Not now.
   - `unawardedNoticeNo` is never filled, and the text names a notice in about a third of cases.
   - A real check would match the authority's own earlier cancelled or unawarded notice for the same CPV in our data. We don't load contract notices or cancellations, so the input is missing.

## 5. Winner/activity mismatch and CUI 28697278

**What the data show.** Records whose supplier CUI is 28697278 (`seap.record`):

| Year | Records | of which NFPP | Authorities | Value (lei) |
|---|---|---|---|---|
| 2021 | 34 | 33 | 25 | 5.7 M |
| 2022 | 42 | 38 | 19 | 5.4 M |
| 2023 | 16 | 13 | 12 | 36.2 M |
| 2024 | 19 | 17 | 16 | 161.0 M |
| 2025 | 12 | 10 | 12 | 4.4 M |
| 2026 | 14 | 9 | 11 | 3.1 M |
| **Total** | **137** | **120** | **67** | **≈ 216 M** |

- **Almost all are offline notices.** 134 of the 137 are NFPP or *Norme proprii* notices; 3 are direct-purchase notifications (DAN).
- **The CPV spread is the giveaway.** They cover 20 CPV divisions: medical supplies (33) in 63 Records, plus repairs, energy, catering, veterinary and ambulance services. The largest are:
  - CAN1097036 (2024), 153.7 M lei of repair and maintenance services for the national power-grid operator;
  - CAN1106813 (2023), 33.0 M lei of waste collection.
- **ANAF has the CUI** as ",, ADRIAN SPIRESCU SI MIHAELA PELTEACU S.C.P.A.", a Bucharest law partnership (`core.anaf_company`).

**Why it is a SEAP artefact, not a winner.**

1. **The name doesn't always match.** In 10 crawled Records the published winner name is another firm (CICLOPS SECURITY, Rompetrol Downstream, ENGIE Romania, LA FANTANA, Expres Transport and others). The contracts call for CAN1051093 returns winner `name: "CICLOPS SECURITY"` with an address in Sibiu, yet `fiscalNumber: "28697278"` and `entityId: 201763`. CAN1134161 returns the law firm's name under the same `entityId` 201763, with a blank street.
2. **No other supplier looks like it.** I listed suppliers with at least 20 offline notices, more than 80 % of their Records offline and at least 10 authorities. This CUI spans 20 CPV divisions. The other three (a fuel trader and two energy suppliers, buying through the commodity exchange) span 5 or fewer.

So in SEAP's offline award-notice form, entity 201763 looks like a record that winners get attached to by mistake. How that happens can't be seen from outside. **Every Record keyed to this CUI says nothing about the real winner.**

**Would a CAEN rule generalise?** `no_construction_caen.py` reads the winner's authorised CAEN codes from ONRC and stays silent when there are none ("unknown is never a Signal").

- **Untested here.** The local database has no `onrc` schema loaded, so I couldn't run it.
- **It would be silent on this case anyway.** A *societate civilă profesională de avocați* is organised under the Bar (Legea 51/1995), not registered at ONRC, so it has no CAEN codes. The rule would stay silent.
- **A general "activity incompatible with CPV" rule needs a CPV→CAEN compatibility table.** There is no official one that I know of. Building and publishing one is a project of its own, with its own false positives: wholesalers hold broad codes, and firms may legally act outside their authorised codes.

**Recommendation.** Treat CUI 28697278 as an identity problem.

- A curated list of "SEAP entity artefact" CUIs, starting with this one, makes the winner of those Records *unknown*. That fits ADR 0003 (supplier identity is the ANAF-confirmed CUI) and the existing identity overrides.
- The Records keep their value and authority, but credit nothing to the law firm's entity page.
- The concentration check above (many authorities, many CPV divisions, almost all offline) is cheap and could run as a data-quality report after each rebuild to find any other such CUI.

## Recommendation

1. **Crawl.** Fetch `C_PUBLIC_CANotice/get/{caNoticeId}` for every offline award notice (`procedureId == null`: NFPP, *Norme proprii*, *Procedura simplificată proprie*), archived unchanged in the crawl unit next to its contracts.
   - Nightly: about 20–25 requests a day.
   - Then a one-off backfill from 2021: about 60 k detail requests plus about 300 list calls for the bulk-loaded years.
   - Declare the contact-person fields under ADR 0016 (keep or strip).
2. **Load.** Add to the Record:
   - the Annex D ground(s) and the explanation;
   - `legislationType`, `isUtilityContract`;
   - `sentToJOUE` and `tedNoticeNo`, plus `legalBuyerType` for later use.
3. **Rules.**
   - Add `ground` as a number on `NO_PUBLICATION`.
   - Decide on the direct-purchase-cap floor.
   - Prototype "urgency used as a stop-gap" with a published keyword list and a hand-labelled precision check before adopting it.
4. **Identity.** Flag CUI 28697278 as a SEAP artefact so its Records have an unknown winner. Add the concentration check as a rebuild report.

## Proposed follow-up tickets

1. **Crawl the award-notice detail for offline notices.** Extend the nightly crawl to fetch and archive `C_PUBLIC_CANotice/get/{id}` for every `procedureId == null` row. Declare the contact-person fields under ADR 0016.
2. **Backfill notice details from 2021.** A one-off pass: map `noticeNo` → `caNoticeId` for the bulk-loaded 2023–2026 Records by week-window lists, then fetch about 60 k details at the crawler's pace (about 15–20 h).
3. **Load Annex D and the notice envelope onto the Record.** Parse both `annexD_New` and `annexD_New_U` into a normalised ground list plus the explanation. Also parse `legislationType`, `sentToJOUE`/`tedNoticeNo` and `legalBuyerType`. Missing stays missing.
4. **Show the declared ground on `NO_PUBLICATION`.** Add the ground as a Signal number and in the methodology section, with coverage per year.
5. **Decide the direct-purchase-cap floor for `NO_PUBLICATION`.** Measure and publish the effect (−77 % Records, −1.6 % value), then adopt or reject it, with the reasoning on the methodology page.
6. **Prototype the "urgency used as a stop-gap" Signal rule.** Draft the keyword list, hand-label about 200 urgency notices to measure precision and recall, and adopt it only with a published precision.
7. **Mark SEAP entity artefacts as unknown winners.** Add a curated CUI list (seed: 28697278 / SEAP entity 201763) that unkeys the winner. Add a rebuild report of suppliers concentrated in offline notices across many authorities and CPV divisions.

## Not verified

- **The field-to-ground matching in §2 is inferred** from field names and SPA classifier labels. The form's own labels for the boolean fields weren't in the locale file I fetched, and EUR-Lex blocked the fetch of Regulation 2015/1986 Annex D1.
- **The rates are from a sample of 278 notices.** The list-day half is clustered by authority. The class regexes are a first cut and were not hand-validated.
- **How SEAP attaches entity 201763 to winners** is not visible from the public API.
- **The CAEN path wasn't run**, because ONRC is not loaded in the local database.
- **No source of the *estimated* value was found** in the notice detail. Any threshold test (art. 7(1) or 7(5)) on these notices uses the awarded value.
- **Fifteen detail files** written into my scratch directory by a concurrent process (a sample deliberately chosen above the EU threshold) were excluded from every count here. For about 30 s two clients fetched in parallel.

## Sources

**Law 98/2016 on legislatie.just.ro** (accessed 2026-11-20). Art. 7 (thresholds, art. 7(2) simplified procedure, art. 7(5) direct-purchase caps) and art. 104:

- current consolidation 17.11.2024: https://legislatie.just.ro/Public/DetaliiDocument/178667;
- 05.04.2021 version: https://legislatie.just.ro/Public/DetaliiDocument/239598 (the art. 7(1) values for 2020–2021 and the pre-2022 art. 104(1)(c));
- version with art. 104(1)(d) and (4^1), in force 10.09.2022–24.05.2024: https://legislatie.just.ro/Public/DetaliiDocument/259943.

**Art. 7(1) thresholds (lei), as given in the consolidations' notes:**

| Period | a) works | b) goods and services | c) goods and services, local authorities | d) social services |
|---|---|---|---|---|
| 2020–2021 | 25,013,925 | 649,895 | 1,000,557 | 3,506,625 |
| 2022–2023 | 26,093,012 | 678,748 | 1,042,363 | 3,636,150 |
| 2024–2025 | 27,334,460 | 705,819 | 1,090,812 | 3,701,850 |
| 2026 | 26,960,556 | 698,460 | 1,077,624 | 3,741,750 |

The 2026 values come from Delegated Regulations (EU) 2025/2150–2152, as noted in the 178667 consolidation.

**EU sources:**

- Commission Implementing Regulation (EU) 2015/1986, Annex D1: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015R1986 (not fetched: bot challenge);
- Directive 2014/24/EU art. 32: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0024.

**e-licitatie.ro** (2026-11-20):

- `GET /api-pub/C_PUBLIC_CANotice/get/{caNoticeId}` (290);
- `POST /api-pub/NoticeCommon/GetCANoticeList/` (6 days);
- `POST /api-pub/C_PUBLIC_CANotice/GetCANoticeContracts` (CAN1051093);
- `/locale/ro-RO/Common` (Annex D classifier labels).

**Local database `grivei-db-1`:** `seap.record`, `seap.search`, `seap.signal`, `core.anaf_company`.

**Repo:**

- `watchdog/pipeline/crawl/core.py`, `client.py` and `unitdir.py`;
- `watchdog/pipeline/signals/no_publication.py` and `no_construction_caen.py`;
- `watchdog/pipeline/bulk/headers.py`;
- ADRs 0003, 0004, 0016 and 0019.
