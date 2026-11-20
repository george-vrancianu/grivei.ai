# Annex D and the other fields of an award notice: what they say about our Signal rules other than NO_PUBLICATION

Companion to [#310](https://github.com/george-vrancianu/grivei.ai/issues/310), which covers Annex D against `NO_PUBLICATION` (volume, flag stability, the "below the JOUE threshold" non-justification, the `sentToJOUE` threshold check). This note covers **every other Signal rule**, and the candidate rules the question named, against what an award notice declares. Investigated 2026-11-20.

## Answer in brief

- **Annex D exists only on negotiated awards without prior publication.** It was present on all 115 NFPP notices sampled and on none of the 23 others (open, accelerated, simplified). Four of our eleven other rules read only direct purchases (`OVER_CAP`, `SPLITTING`) or framework sums (`FRAMEWORK_OVERRUN`), which have no Annex D. For those, the notice detail adds nothing usable.
- **For the supplier rules, Annex D explains the procedure, not the supplier.** It never says why a young, struck-off, insolvent, construction-less or donor firm was the one chosen. Two exceptions are worth building on:
  - **The ground fixes who the supplier should be.** A commodity-exchange ground (art. 104(5)(c)) implies a licensed energy trader. An exclusive-rights ground usually names the rights holder. When the winner doesn't fit, the Signal is more likely a **wrong-entity entry in SEAP** than a fact about the firm. 4 of the 12 struck-off Records sampled look like this, plus 1 of the 18 young-firm Records (§3).
  - **Art. 104(5)(d)** (buying from a supplier that is winding up or insolvent) is the one ground that would explain an `INSOLVENCY` Signal outright. It occurred 0 times in 115.
- **The structured ground flags can't be trusted on their own to suppress anything.**
  - `isForceMajeure` ("extreme urgency", art. 104(1)(c)) is ticked on 65 of 115. Only 15 of those 65 explanations name an unforeseeable event (COVID-19: 9, weather or structural damage: 6). 14 say outright that the authority's own procedure was still running or its framework had run out, which art. 104(1)(c) excludes ("nu se datorează sub nicio formă unei acțiuni sau inacțiuni a autorității contractante"). 19 only restate the law.
  - "Outside the Directive's scope" (`isAcquisitionDirectiveCompliant`) was misused on all 6 of its notices.
  - Recommendation: **show Annex D as context on the Record, never auto-suppress a Signal with it** (ADR 0019: our own rules, a lead not a verdict).
- **Contradictions are measurable and give two candidate rules** (§5):
  - **Chronic urgency:** the same authority declares extreme urgency year after year. Several hospitals run 200–420 NFPP awards a year, every year from 2021 to 2026.
  - **Bridge urgency:** the explanation itself says the urgency comes from the authority's own pending procedure or expired contract.

  A third, "unique supplier while the same authority buys that CPV competitively", is measurable but too coarse at CPV level to be more than a lead.
- **For the candidate rules the question named:**
  - **Single bidder:** the notice detail carries **no offer counts.** `section5.contractLotList` was empty on all 138 notices, so the ADR 0019 gap stays open.
  - **Short deadline:** accelerated procedures carry a **free-text `acceleratedProcedureJustification`.** It tells a lawful reduction on a prior information notice (art. 74(2)) from an urgency claim (art. 74(3)).
  - **Repeat winner / modification:** grounds art. 104(5)(b) and 104(8) exist but were nearly absent (1 of 115).
  - **Value thresholds:** `totalAcquisitionValue` is **the awarded total, not the estimate.** It equals our recorded value on 117 of 138 notices, so it can't serve as an estimate for a threshold check.

## 1. Method

- **Rules.** The rule registry is `watchdog/pipeline/signals/__init__.py` (`RULES`). It holds twelve rules. Besides `NO_PUBLICATION` they are `OVER_CAP`, `SPLITTING`, `FRAMEWORK_OVERRUN`, `YOUNG_FIRM`, `NO_CONSTRUCTION_CAEN`, `AFTER_STRIKE_OFF`, `INSOLVENCY`, `FEW_EMPLOYEES`, `NO_FINANCIAL_STATEMENT`, `DONOR_TO_PARTY` and `SOE_BOARD_IN_SUPPLIER` (Restricted). Each module's docstring says what it fires on. There is **no single-bidder, short-deadline, repeat-winner, contract-modification or activity-mismatch rule.** Those were tested as candidates (ADR 0019 keeps single bidding out until offer counts exist).
- **Local graph.** I used the Compose `db` that was already running. Only four rules have Signals in it (`NO_PUBLICATION` 20,172; `SPLITTING` 9,759; `OVER_CAP` 4,105; `FRAMEWORK_OVERRUN` 1,544). ONRC, the financial statements, AEP and AMEPIP aren't loaded, so the Reference-source rules have no Signals locally. ANAF answers are loaded (`core.anaf_company`, 192,907 CUIs). Their `registration` text ("INREGISTRAT din data …", "RADIERE din data …") gave a stand-in for `YOUNG_FIRM` (registration within 180 days before the award) and `AFTER_STRIKE_OFF` (strike-off before the award). There is no CAEN locally, so `NO_CONSTRUCTION_CAEN` was approached through works ≥ 1M RON only.
- **Which notices have a `caNoticeId`.** Only crawled Records have one: 2021–22 from the backfill, plus the nightly crawl. That gives 12,080 / 10,118 NFPP Records in 2021 / 2022, against 3–21 a year for 2023–25 (bulk, no id). **The sample therefore leans to 2021–22, COVID years included.**
- **Sample.** Strata were drawn deterministically (`md5(code)`) from crawled CONTRACT Records:

  | Stratum | Notices |
  |---|---|
  | NFPP to a winner registered ≤ 180 days before the award | 18 |
  | Any procedure, winner struck off before the award | 12 |
  | NFPP works ≥ 1M RON | 15 |
  | NFPP between an authority–supplier pair with ≥ 3 NFPP notices | 20 |
  | NFPP ≥ 700k RON (goods/services) or ≥ 27M RON (works) | 19 |
  | `FRAMEWORK_OVERRUN` members (looked up by notice number, since bulk Records have no id) | 6 |
  | Accelerated procedures | 9 |
  | Open procedures | 8 |
  | NFPP to a winner whose name looks like a law firm, office or PFA | 10 |
  | Random NFPP | 20 |
  | The #310 case (CAN1134161) | 1 |
  | **Total** | **138** |

- **Requests.** I sent about 131 requests to `e-licitatie.ro` `api-pub`, sequentially and 1.2–1.5 s apart, with the crawler's headers (`Referer: https://e-licitatie.ro/pub`, from `watchdog/pipeline/crawl/client.py`):
  - `GET /api-pub/C_PUBLIC_CANotice/get/{caNoticeId}`;
  - 6 `GetCANoticeList` lookups by number;
  - 10 `GetCANoticeContracts`.

  23 of the 138 detail answers came from a sibling agent's cache of the same endpoint, fetched the same day. Scratch scripts and answers are in `/tmp/annexd-other/`, not in the repo.
- **Law.** Law 98/2016 consolidated on legislatie.just.ro ([178667](https://legislatie.just.ro/Public/DetaliiDocument/178667), the consolidation the portal served on 2026-11-20). Directive 2014/24/EU art. 32: EUR-Lex refused scripted access (HTTP 202 with an empty body), so I read the text from the legislation.gov.uk copy ([art. 32](https://www.legislation.gov.uk/eudr/2014/24/article/32)). The authoritative text is [CELEX 32014L0024](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0024).

## 2. What a notice detail carries

Observed shape (`sysNoticeVersion` 2, "Formulare in format > 2016", on all 138):

| Field | Where | What it is (observed) |
|---|---|---|
| Ground flags | `caNoticeEdit_New.annexD_New` | Booleans: `noOfferForOpenProcedure`, `noOfferForRestrictedProcedure`, `areProductsResearchAndStudy`, `isForceMajeure`, `isSupplementaryServiceCompliantOrdered`, `isNewServiceARepetition`, `isAssignedToAProjectContestWinner`, `areProductsStockExchangeListed`, `isSupplierCeasingOperations`, `isSuppliedFromBankruptcy`, `isAcquisitionDirectiveCompliant`; also `bargainPurchase` (null/false in all 138) |
| Unique-supplier reason | `annexD_New.sysReasonForUniqueOfferer` | `{id 1 "tehnice"}`, `{id 2 "artistice"}`, `{id 3 "legate de protejarea unor drepturi de exclusivitate"}` (localeKey `SysAnnexDSingleSuppReason.*`) |
| Earlier failed notice | `annexD_New.unawardedNoticeNo` / `unawardedSysNoticeType` | Set once in 115 (`RFQ1000201`). The CN number usually sits in the free text instead (14 notices) |
| Explanation | `annexD_New.explanation` | Free text. Often quotes the law verbatim |
| Utility variant | `caNoticeEdit_New_U.annexD_New_U` | Law 99/2016 sectoral notices (12 of 138, e.g. Nuclearelectrica, CE Oltenia, water companies). Extra flags `noOfferToNegociationProcedure`, `isAdvantageousAcquisition`. **A parser that reads only `caNoticeEdit_New` silently misses these** |
| Accelerated justification | `section4_New.section4_1_New.acceleratedProcedureJustification` | Free text, filled on 7 of 9 accelerated procedures. `isAcceleratedProcedure` was null on all 138, and the procedure type itself says "accelerata" |
| Prior publication | `section4_New.section4_2_New.previousPublicationNoticeNumber` | The TED number of the contract notice (`557659-2024`) on open procedures |
| JOUE | `section0_New.sentToJOUE`, `tedNoticeNo` | 47 of 138 sent, including RNP forestry awards of 2,873 RON (voluntary publication), so it isn't value-driven |
| Value | `section2_1_New.totalAcquisitionValue`, `paapModel.contractAcquisitionValue` | The **awarded** total. It equals our `value` on 117 of 138 notices, and equals the PAAP value on 133 of 138. On subsequent-contract notices it is the subsequent sum, not the framework ceiling. Not an estimate |
| Buyer type | `section1_1.caAddress.legalBuyerType`, `contractingAuthorityType` | e.g. "Autoritate guvernamentală centrală", "Autoritate locală". This is what picks art. 7(1) lit. b) or c) |
| Lots/offers | `section5.contractLotList` | **Empty on all 138.** No offer counts. `GetCANoticeContracts` gives only `contractValueMinOffer`/`MaxOffer` per contract (null on many) |

The flags map onto art. 104 of Law 98/2016 (Directive art. 32) by their names. SEAP doesn't document the mapping; it is confirmed by the explanations that cite an article:

| Flag | Ground |
|---|---|
| `noOfferFor…` | 104(1)(a) |
| `sysReasonForUniqueOfferer` | 104(1)(b) with (2)(a)–(c) |
| `isForceMajeure` | 104(1)(c) |
| `areProductsResearchAndStudy` | 104(5)(a) |
| `isSupplementaryServiceCompliantOrdered` | 104(5)(b) |
| `areProductsStockExchangeListed` | 104(5)(c) |
| `isSupplierCeasingOperations` / `isSuppliedFromBankruptcy` | 104(5)(d) |
| `isAssignedToAProjectContestWinner` | 104(7) |
| `isNewServiceARepetition` | 104(8) |
| `isAcquisitionDirectiveCompliant` | Annex D1's "outside the scope of the Directive" box (no art. 104 ground) |

Of the 56 explanations that cite an art. 104 letter, 52 agree with the ticked flag and 4 don't. For example, CAN1075502 and CAN1092256 tick urgency but cite lit. a). CAN1059182, an aircraft bought at a public auction, ticks urgency.

**Grounds in the 115 NFPP notices** (sample strata, not national shares):

| Ground | Notices |
|---|---|
| Extreme urgency | 65 (3 also tick "no offers") |
| Commodity exchange | 15 |
| No / unsuitable offers | 13 |
| Unique supplier | 18 (technical 8, exclusive rights 5, artistic 5) |
| Outside the Directive | 6 |
| Repetition | 1 |

In the 20 random NFPP: urgency 13, commodity 3, unique (exclusive rights) 2, no offers 1, outside the Directive 1.

**The 65 urgency explanations, read one by one:**

| Kind | Notices | Examples |
|---|---|---|
| Restates the law or the flag, no event named | 19 | CNAIR CAN1059695 "conform art. 104 alin (1) lit. c)"; SCJU Arad "Echipamente de protectie necesare" ×4; CAN1085009 "negociere urgenta" |
| **Bridge:** own procedure pending, framework exhausted or expired, "stoc 0" | 14 | CAN1059173 "LICITATIE DESCHIS IN DESFAURARE"; CAN1057609 "procedura in derulare"; CAN1061636 1.67M RON green-space maintenance "în perioada de derulare a unei proceduri"; CAN1087919 "nu exista contracte … valabile" |
| COVID-19 | 9 | FFP2 masks, vaccination-centre cleaning, VTM kits |
| RNP forestry: the same text on every award, citing ANAP letter 5830/20.04.2018 | 7 | "Servicii de exploatare forestiera Negociere N dssv" |
| Weather or structural event, dated | 6 | DJ 176 bridge after the 2018–2021 floods; Alba July 2021 torrential rain |
| Below-JOUE-threshold text (the #310 pattern) | 4 | Tulcea ×3; one "outside the Directive" |
| Really another ground (failed procedure, additional services, auction) | 4 | CAN1056654 "Act Adițional nr 4", additional services under OUG 114/2011 art. 102 k) |
| Sectoral, other | 2 | CE Oltenia |

## 3. Signal by signal

| Signal rule | Relevant field(s) | Bearing | Evidence |
|---|---|---|---|
| `OVER_CAP` | none | **No bearing** | DA/DAN only; a direct purchase has no award notice and no Annex D |
| `SPLITTING` | none | **No bearing** | Same reason. A contract-level analogue (repeated bridge NFPP) is in §5 |
| `FRAMEWORK_OVERRUN` | `totalAcquisitionValue` on the subsequent award notice | **No bearing** | No Annex D: the 6 frameworks were open or simplified procedures. On 5 of 6, `totalAcquisitionValue` equals our SUBSEQUENT sum within 10 RON (e.g. CAN1103087 152,916 vs 152,911; SCNA1113778 1,946,997.60 vs 1,946,988), so it confirms the numerator and says nothing about the ceiling. On CAN1057753 it is 1,334,890,614.56 against our subsequent 679.7M and ceiling 369.7M (PAAP value 679,705,006.56). That is unexplained and worth one look, but not a basis for a rule |
| `YOUNG_FIRM` | ground flags, explanation, CPV | **Validate (strengthen) for no-competition grounds; invalidate-as-data-error for the commodity ground** | 18 NFPP to firms registered ≤ 180 days earlier: urgency 12, commodity 2, no offers 2, technical 1, none 1. **Urgency:** e.g. ATLAS MEDICAL, registered 24.08.2020, won 4 PPE lots at SCJU Arad on 03.02.2021 with "necessary equipment" and no event named. The ground explains skipping competition, not choosing a 5-month-old firm, so it strengthens the lead. **No offers:** BREJFIN FOREST, registered 06.04.2022, won RNP lots on 14.07.2022 after open procedure CN1036411 got no offers. A plausible innocent reading: the young firm stepped in after nobody bid. **Technical:** a PFA registered 6 weeks earlier as the only operator of an AFIS system; the explanation names a personal qualification, which is plausible. **Commodity exchange:** "As Premier Auto SRL", registered 20.05.2026, won a gas subsequent contract (CAN1177278) awarded through Bursa Română de Mărfuri. A car-named firm 5 months old as a gas supplier points to a wrong CUI picked in SEAP |
| `NO_CONSTRUCTION_CAEN` | ground flags, explanation | **Mostly no bearing; partly explains for exclusive rights** | 15 NFPP works ≥ 1M RON: urgency 9 (road repairs, 3 of them with a dated event), outside the Directive 2, no offers 1, repetition/additional 1 (MApN "Lucrări suplimentare" under OUG 114/2011), exclusive rights 1. The urgency and failure grounds say nothing about the winner's trade. The exclusive-rights case (Sector 4 public lighting to LUXTEN Lighting under the 1997 delegation contract, CAN1087169) explains why that firm, and a concessionaire may hold a non-construction CAEN. CAEN couldn't be checked locally (ONRC not loaded) |
| `AFTER_STRIKE_OFF` | ground flags, explanation, CPV | **Invalidate as a fact about the firm; reveals wrong-entity entries** | 12 Records won by an ANAF-struck-off CUI. The name SEAP shows matches ANAF's name for that CUI on 8 of them; it differs on 4. **Commodity ground, non-energy firm:** "Best Premiere SRL" (struck off 12.07.2018) won 2 MAI gas subsequent contracts in 2022, and "3D NOVA CONSULTING" (struck off 2021) won one in 2025, both on frameworks the explanation says were awarded through Bursa Română de Mărfuri. **Named distributor differs from the winner:** CAN1090071's explanation names "Müller Martini Eastern Europe GmbH" as the exclusive distributor, but the winner is MULLER MARTINI S.R.L. (CUI 10863688, struck off 17.05.2021). **Name differs from ANAF:** for the other 4 (CAN1059695/CAN1060707 "MARISTAR COM", CAN1061176 "FABI TOTAL GRUP", CAN1051130 "Stern Laboratories Inc. Canada" on a CUI ANAF gives to a family association) SEAP's name differs from ANAF's name for that CUI. Those are CUI-mismatch cases, not Annex D's. In all of these the Signal more likely shows a SEAP data-entry error than a payment to a dissolved firm. The explanation is what shows it |
| `INSOLVENCY` | `isSupplierCeasingOperations`, `isSuppliedFromBankruptcy` (art. 104(5)(d)) | **Would invalidate (explain), never observed** | A purchase "în condiții speciale avantajoase" from a supplier winding up or "într-o procedură de faliment" is the legal reason to buy from an insolvent firm. 0 of 115 ticked it. Other grounds have no bearing |
| `FEW_EMPLOYEES` | ground, explanation | **No bearing (weak strengthen)** | A yearly, supplier-level rule; Annex D is per Record. Where the explanation names a different rights holder or manufacturer than the winner (Müller Martini), the winner may be an intermediary, which fits few employees. Not measurable locally (financial statements not loaded) |
| `NO_FINANCIAL_STATEMENT` | none | **No bearing** | SRL/SA only. The artistic ground explains individual/PFA winners, but those are outside this rule anyway |
| `DONOR_TO_PARTY` | ground, explanation | **Validate (strengthen) for no-event urgency or bridge urgency** | A donor winning without any competition, on a ground the explanation itself undercuts, is the sharper lead. Not verifiable locally (AEP/BaniPartide not loaded) |
| `SOE_BOARD_IN_SUPPLIER` (Restricted) | utility Annex D (`annexD_New_U`), unique-supplier reason | **Validate (strengthen) for unique-supplier and urgency grounds** | Sectoral entities use NFPP (Law 99/2016 art. 117), e.g. Nuclearelectrica's "Etansari mecanice" to ROSEAL (technical reasons, CAN1054843), while the same authority bought that CPV (42124290-3) through 11 competitive awards and from 19 other suppliers. Not verifiable locally (AMEPIP/ONRC roles not loaded) |

### Candidate rules the question named

| Candidate | Field | Bearing | Evidence |
|---|---|---|---|
| Single bidder | `section5.contractLotList`; contract `contractValueMinOffer`/`MaxOffer` | **No source** | Empty lot list on all 138. Min = max on many open-procedure contracts (e.g. CAN1139046, Galați snow-clearing vehicle hire, 7,537,238.64 RON) is consistent with one offer but isn't a count (identical offers, a null on frameworks). Annex D can't explain single bidding: an NFPP is single-party by design, and competitive procedures have no Annex D |
| Short deadline | `acceleratedProcedureJustification`, `previousPublicationNoticeNumber` | **Both ways** | 7 of 9 accelerated procedures had a justification. 4 invoke a prior information notice under art. 74(2) (RNP forestry "anuntul de intentie nr. PI1004312"): lawful, so it invalidates the urgency reading. 2 invoke urgency under art. 74(3): Galați snow clearing, which also cites an earlier failed procedure, and military training ammunition. 1 says only "conform motivarii din strategia de contractare". The bid deadline itself isn't in the award notice |
| Repeat winner / modification | `isNewServiceARepetition` (104(8)), `isSupplementaryServiceCompliantOrdered` (104(5)(b)), contract `hasModifiedVersions`, `modifiedCount` | **Would validate or invalidate; nearly unused** | 1 of 115 ticked repetition: MApN additional works, which is really the old OUG 114/2011 art. 102 k) additional-works ground. 1 more is the same ground under the urgency flag (CAN1056654 "Act Adițional nr 4"). Art. 104(8) has checkable conditions: the same contractor, the option announced in the original contract notice, and at most 3 years from the original contract. Art. 221 modifications aren't NFPP notices at all, so they need the contract's modification history |
| Value thresholds | `totalAcquisitionValue`, `sentToJOUE`, `tedNoticeNo`, `legalBuyerType` | **Belongs to #310** | Our value rules (`OVER_CAP`, `SPLITTING`) are direct-purchase only. `totalAcquisitionValue` is the awarded total, not the estimate (see §2), so an "estimate above threshold, not sent to JOUE" check has no estimate here. `legalBuyerType` does pick art. 7(1) lit. b) or c) |
| Winner-activity mismatch | `sysReasonForUniqueOfferer`, `areProductsStockExchangeListed`, CPV | **Both ways** | Artistic ground on 5 of 5 notices in the "law firm/office/PFA name" stratum: individual artists for CPV 923 (folk performers at a museum, a culture house). That is a sound reason for an individual winner, so a mismatch Signal there should be dropped. Commodity ground plus a winner that isn't an energy trader is a strong mismatch (above). The #310 case (law firm, lab reagents) ticks urgency with a below-threshold text, so Annex D gives no reason for the supplier |

## 4. Validate or invalidate: the rule of thumb

- **Annex D validates (strengthens) a supplier Signal** when the declared ground removes competition and the explanation names no event or names the authority's own delay. The supplier was then picked without competition, for a reason the law doesn't accept.
- **Annex D invalidates (explains) a Signal** in three cases:
  - the ground is the legal reason for exactly that supplier fact: 104(5)(d) for insolvency; the artistic ground for an individual winner; a named exclusive rights holder or concessionaire for a "why this firm" question;
  - the explanation shows the Signal sits on a **wrong entity**: a named distributor that differs from the winner, or a commodity-exchange purchase won by a non-trader;
  - for a future short-deadline rule, an art. 74(2) prior-information-notice reduction.
- **No auto-suppression.** The flags disagree with their own explanations often enough (urgency ticked on additional services and on an auction purchase; "outside the Directive" 6 of 6 misused) that a flag alone can't silence a Signal. What fits ADR 0019 and the Record-badge idea in `GLOSSARY.md` is this:
  - show the declared ground and the explanation verbatim on the Record page, as the authority's own statement;
  - let a rule read them only where the check is structured: the flag plus CPV, the flag plus winner identity, or the flag plus an authority–year count.

## 5. Contradicted grounds: candidate new rules

1. **Chronic extreme urgency (authority–year).** Art. 104(1)(c) requires unforeseeable events not attributable to the authority, and urgency declared every year is by definition foreseeable. NFPP Records 2021–2026 (all sources) at authorities that declared urgency in the sample:

   | Authority | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 (to Nov) |
   |---|---|---|---|---|---|---|
   | Spitalul Municipal de Urgență Moinești | 419 | 354 | 394 | 420 | 330 | 267 |
   | Spitalul Universitar de Urgență București | 212 | 194 | 201 | 322 | 266 | 318 |
   | SCJU Arad | 155 | 117 | 61 | 118 | 88 | 220 |
   | Spitalul Județean de Urgență Tulcea | 83 | 53 | 51 | 58 | 94 | 101 |

   These counts are of NFPP, not of urgency notices; the share that is urgency needs Annex D per notice. **Rule sketch:** an authority whose urgency-ground NFPP awards reach a threshold in each of ≥ 3 consecutive years. This needs one detail fetch per NFPP notice, the same crawl change #310 sizes. It sits next to `NO_PUBLICATION`, so the design should be agreed in #310.
2. **Bridge urgency (Record).** The urgency flag, with an explanation saying the authority's own procedure is still running or its contract or framework expired. 14 of 65 in the sample. This is free-text classification, so it is fragile: a keyword list with a published false-positive rate, or a hand-reviewed flag, not an automatic Signal. An alternative is structured: the same authority, CPV group and supplier receive NFPP awards repeatedly while a competitive procedure for that CPV is open (`initiation_code` is on 89% of 2021+ contract Records). This is the contract-level analogue of `SPLITTING`.
3. **Unique supplier contradicted.** The technical or exclusive-rights ground while the same authority bought the same CPV competitively from other suppliers. Measured on the 18 unique-supplier notices:
   - ROSEAL / Nuclearelectrica, CPV 42124290-3: 11 competitive awards by the same authority, 19 other suppliers.
   - Messer, medical oxygen: Messer itself won that CPV 256 times competitively, and 6 suppliers compete nationally.

   An 8-digit CPV is coarser than "this spare part for this machine", so it is a lead for review, not a rule yet.
4. **Declared failed procedure contradicted.** The no-offers ground citing a CN that our graph shows awarded. The 3 cited CNs found in the graph were all consistent: CN1036411 awarded one lot, the explanation says lots 1–20 got no offers; CN1039322 awarded 75 Records, the explanation is about lot 9. So it is checkable, but it needs lot-level matching, and none fired in the sample.

## 6. Proposed follow-up tickets

- **Load the award-notice detail for NFPP Records (with #310).** Store `annexD_New`/`annexD_New_U` verbatim, plus `acceleratedProcedureJustification`, `legalBuyerType`, `sentToJOUE`/`tedNoticeNo`. The parser must handle the utility variant (`caNoticeEdit_New_U`).
- **Show the declared ground on the Record page.** The flag label and the explanation verbatim, as the authority's statement. It never changes a Signal.
- **`AFTER_STRIKE_OFF` / `YOUNG_FIRM`: review wrong-entity winners.** Sample the Signals whose Record has a commodity-exchange ground (CPV 09) or names a rights holder different from the winner. Decide whether to add a Record badge ("winner may be mis-entered in SEAP").
- **Candidate rule: chronic extreme urgency.** Authority–year counts of urgency-ground NFPP, with a threshold derived and published per ADR 0019.
- **Candidate rule: NFPP while a competitive procedure is open** (bridge contracts). Same authority, CPV group and supplier, structured on `initiation_code`.
- **Short-deadline rule input.** If a deadline source is found, read `acceleratedProcedureJustification` and treat art. 74(2) prior-notice reductions as lawful.
- **Check CAN1057753's `totalAcquisitionValue`** (1.33bn against our 680M subsequent and 370M ceiling) against `FRAMEWORK_OVERRUN`'s ceiling.

## 7. What I couldn't verify

- Rates for the Reference-source rules: ONRC, financial statements, AEP and AMEPIP aren't in the local DB. The young-firm and strike-off strata use ANAF dates as a stand-in, not the rules' own inputs (ONRC registration date).
- 2023–25 notices: bulk Records have no `caNoticeId`, so the sample is 2021–22-heavy (COVID-era urgency) plus late-2025/2026 crawl.
- The flag-to-article mapping is inferred from field names and the explanations; SEAP publishes no documentation for `api-pub`.
- Offer counts: none in the detail or contracts endpoints. Whether another endpoint has them was not explored.
- Directive art. 32 was read from the legislation.gov.uk copy, because EUR-Lex refused scripted access.
- The national shares of the urgency kinds come from a stratified sample of 65 hand-read explanations, not a random national sample.

## Sources

- Law 98/2016, consolidated, legislatie.just.ro [178667](https://legislatie.just.ro/Public/DetaliiDocument/178667): art. 7(1) (thresholds, lit. b) for central and lit. c) for county/local authorities), art. 74(2)–(3), art. 104(1)–(8), art. 221(1)(b)–(c), (4). Fetched 2026-11-20.
- Directive 2014/24/EU art. 32, [legislation.gov.uk copy](https://www.legislation.gov.uk/eudr/2014/24/article/32); official text [CELEX 32014L0024](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0024).
- e-licitatie.ro `api-pub`, 2026-11-20: `C_PUBLIC_CANotice/get/{id}` (138 notices), `NoticeCommon/GetCANoticeList` (6 lookups), `C_PUBLIC_CANotice/GetCANoticeContracts` (10).
- Repo: `watchdog/pipeline/signals/*.py` (rule definitions), `watchdog/pipeline/crawl/core.py` and `client.py` (endpoints, headers), `docs/adr/0019-…` (main checkout), GLOSSARY.md (Signal, Record badge).
- Prior research: `origin/research/no-publication-backfill` (`procedureId: null` marker, volumes), `origin/research/signal-firing-rates` (rule sizing), `docs/research/law-98-2016-minimum-periods.md` (art. 74 reductions), `docs/research/opentender-indicators.md` (single bidding).
