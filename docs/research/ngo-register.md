# National NGO register (Registrul național ONG): access, CUI coverage and use as a Reference source (research)

Research for [#151](https://github.com/george-vrancianu/grivei.ai/issues/151) on the map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Checked on 2026-11-13. It answers the map's 11-point Source checklist and measures what the register would attach under [ADR 0013](../adr/0013-organisation-names-attach-only-through-a-confirmed-match.md). This branch is throwaway and is never merged. The scripts and their raw output are in `ngo-register/`.

All numbers are **measured** unless marked *estimate*.

## Bottom line

- **The register can't attach anything to a CUI.** Ministerul Justiției publishes it as weekly-to-monthly XLSX snapshots on data.gov.ro (CC BY 4.0). The rows give name, register number (`Numar inreg Reg National`), status, county, locality, address, purpose and public-utility status. They have **no CIF/CUI column**, so under ADR 0013 it confirms no match on its own. It also has **no people**: founders and board members were taken off the public register in March 2022, and the beneficial-owner register is not public by law.
- **The CUI bridge for NGOs is a different MF dataset.** Ministerul Finanțelor's *Date de identificare plătitori* on data.gov.ro (CC BY 4.0, refreshed yearly) lists every registered taxpayer with CUI, name, county and locality. That includes 184,496 NGO-named legal persons, 62,042 of them homeowner associations.
  - On SEAP's 3,004 NGO suppliers with ANAF-confirmed CUIs, matching against it gives 96.5% correct, **0.30% wrong** and 2.0% ambiguous on exact name, and 97.9% / 0.33% / 0.43% on name + seat county. Both are under ADR 0013's 0.5% bar.
  - On POCU's 337 NGO pairs, exact name gives 83.7% correct and 0 wrong.
- **What it would attach.** The SMIS 2014–2020 lists have 319 distinct NGO-shaped beneficiary names without a CUI.
  - Today's route, SEAP spellings, attaches 117 of them uniquely.
  - The MF list attaches 236 uniquely. Together the two attach 243, so the MF list adds 126, with no disagreement between the routes.
  - The MJ register recognises 183 of the names as exactly one registered NGO but can give none of them a CUI.
  - PNRR already gives a CUI for all 284 NGO beneficiaries, so there it has nothing to attach.
- **Recommendation:** **drop** the MJ register as a Source. Instead, consider the **MF taxpayer-identification list** as the NGO name list in ADR 0013's matching (a Reference source; ADR 0013 now names SEAP spellings as "the only route to NGOs"). Changing that needs a decision ticket. The MJ register's one unique field, NGO status, is undated and fires for 8 of 3,004 NGO suppliers.

## 1. Access

| What | Where | Form |
|---|---|---|
| **MJ register, current years** | data.gov.ro [`registrul-national-ong-2026`](https://data.gov.ro/dataset/registrul-national-ong-2026), [`registrul-national-ong-2025`](https://data.gov.ro/dataset/registrul-national-ong-2025), publisher `mj` | Per snapshot, five XLSX files (Asociații, Fundații, Federații, Uniuni, PJS = foreign legal persons) plus the "Lista dovezi disponibilitate" (reserved names). Plain HTTP via the CKAN API, no auth. |
| **MJ register, 2014–2024** | data.gov.ro [`registrul-national-ong`](https://data.gov.ro/dataset/registrul-national-ong) | Same files, 325 resources. The notes say "Actualizarea listelor se efectuează lunar." |
| **MJ portal** | Portal of the Registrul Național ONG, launched 11 Sep 2026 with PNRR money: online filing, fee payment, application tracking, "access to register information" ([AGERPRES, 11.09.2026](https://agerpres.ro/english/2026/09/11/justice-ministry-launches-ngo-national-register-portal-with-online-establishment-or-administrative-p--1592670); [Știri pe surse](https://www.stiripesurse.ro/justice-ministry-launches-ngo-national-register-portal-with-online-establishment-or-administrative-procedures_3919211); [InfoCons](https://infocons.ro/infocons-141-204-ong-uri-in-registrul-national-al-ong-urilor-lansat-online-de-ministerul-justitiei/)) | Query-only. Its address is **unverified**: `rnong.just.ro` resolves and, like `www.just.ro`, returns HTTP 403 to non-browser clients. No bulk or API was found. |
| **Certified extracts** | OG 26/2000 art. 75(2)–(3): MJ issues certified copies of entries and supporting documents "pe cheltuiala persoanei solicitante", also by post, excluding personal data | Paid, per request |
| **MF taxpayer identification** (the CUI bridge) | data.gov.ro [`date_de_identificare_platitori_actualizate_iunie_2026`](https://data.gov.ro/dataset/date_de_identificare_platitori_actualizate_iunie_2026), publisher MF; yearly datasets back to 2018 | Two `^`-separated UTF-8 TXT/CSV files (~435 MB each). 2,647,764 rows: `COD_FISCAL`, `DENUMIRE`, `COD_FISCAL_PARINTE`, `TIP_UNITATE`, `TIP_CONTRIB` (PJ/PF), locality, street, county, registration date, `ACT_AUTORIZARE`, `STARE`, `DATA_RADIERE`, tax-vector flags |

`www.just.ro/registrul-national-ong/` returns HTTP 403 to both curl and WebFetch, so the ministry's own page could not be read. The data.gov.ro copies are the path a Connector would use.

## 2. Licence and reuse

- **MJ register:** the 2025 and 2026 datasets are **CC BY 4.0**; the 2014–2024 dataset is **OGL-ROU-1.0** (data.gov.ro `license_title`, read from the CKAN API).
- **Publicity in law:** OG 26/2000 art. 75(1): "Registrul național al persoanelor juridice fără scop patrimonial este public, cu excepția datelor care se supun reglementărilor privind protecția datelor cu caracter personal și a datelor din evidența privind beneficiarii reali" ([OG 26/2000, consolidated, legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/20740)).
- **MF taxpayer identification:** **CC BY 4.0** (2019 onwards; 2018 and earlier OGL-ROU-1.0).

## 3. Join key into the graph

- **MJ register: none usable.** Read from the 06.07.2026 files: the header is `Denumire, Numar inreg Reg National, Starea actuala, sediu schimbat, organizatia trece in circumscriptia altei instante, Judet, Localitate, Adresa, Scopul initial, Modificari ale scopului 1–5, HG utilitate publica, Data HG utilitate publica`, and the foreign-entity file adds `Tara`. There is no CIF/CUI, no registration date and no court file number.
  - The register number (`27/B/2020`) is the only key. It carries the section letter (A associations, B foundations, C federations, D unions, E foreign) and the year.
  - The law matches this: the national register exists "în scopul evidenței centralizate" with four sections (art. 73). The courts feed it with final judgments (art. 74(1)). The fiscal side is separate: the court sends the registration order "pentru evidența fiscală" to the local tax office (art. 8(3)), and the CIF is issued there.
- **MF list: CUI, name, county, locality.** The CUI matches SEAP and PNRR directly. For NGOs, `ACT_AUTORIZARE` holds the court order or file number as free text (`DOSAR 123/45/2010`, `INCHEIERE CIVILA NR …`) in dozens of shapes, not the register number. So the two registers can be joined only by name + county.
- **MJ ↔ MF by name + county, both sides unique:** 66,222 of 134,486 non-struck MJ name+county keys (49.2%) pair one-to-one with an MF CUI. On exact name with no county it is 66,625 of 134,421 (49.6%). In the other direction, 69,924 of 122,454 non-homeowner MF NGO CUIs (57.1%) find their name + county in the MJ register. Spellings differ too often for this to be a reliable bridge.

## 4. People

- **None in the published data.** The bulk files have no person columns.
- **Founders and board taken down in March 2022.** MJ stopped showing founding members and the board of directors for all associations and foundations from 1 March 2022, without announcing it. It cited CNPs and home addresses that courts had typed into those fields, and said the names stay available on request by email ([Europa Liberă, updated 26.08.2022](https://romania.europalibera.org/a/registru-ong-romania/32000825.html)).
- **Beneficial owners are excluded by law.** OG 26/2000 art. 75(1) excludes the beneficial-owner records from publicity. Art. 34^4 makes NGOs report beneficial-owner changes to MJ ([OG 26/2000](https://legislatie.just.ro/Public/DetaliiDocument/20740)).
- **For ADR 0009:** the register adds no people, so there is no person-level question to settle. Anyone who wants an NGO's board has to file a per-NGO request, and the person-level gate and the entity-linking policy (ADR 0011) would then apply.
- **MF list:** its 818,693 `PF` rows (sole traders, liberal professions) carry personal names. None has a 13-digit code: lengths are 2–8 digits, so no CNPs. A Reference-source load would keep `TIP_CONTRIB = PJ` only.

## 5. Money measure

None. The register holds identity and status, not amounts. NGO financial statements (`WEB_ONG_AN<year>`) are a separate MF file in the *Situații financiare* datasets, which are already covered by the financial-statements dossier ([#113](https://github.com/george-vrancianu/grivei.ai/issues/113)).

## 6. Volume

**MJ register, snapshot of 06.07.2026:** 152,852 rows.

| Section (letter in register no.) | Rows | Distinct register no. | Struck off (`radiata`) | Dissolved or in liquidation | No county | Public utility (HG) |
|---|---|---|---|---|---|---|
| A associations | 128,836 | 124,880 | 5,619 | 3,109 | 2,748 | 566 |
| B foundations | 21,206 | 20,532 | 947 | 573 | 756 | 225 |
| C federations | 1,664 | 1,625 | 27 | 47 | 62 | 9 |
| D unions | 862 | 844 | 16 | 40 | 25 | 6 |
| (no letter) | 239 | 1 | 1 | 2 | 5 | 0 |
| E foreign | 45 | 43 | 0 | 0 | 38 | 0 |

- **Download size:** about 38 MB of XLSX per snapshot; the associations file alone is 34.3 MB.
- **Postgres:** about 150k rows, under 150 MB with the purpose texts (*estimate*).
- **Raw archive:** keeping one snapshot a month is about 0.5 GB a year (*estimate*).
- **New registrations:** 4,401–4,679 a year in 2021–2025 (from the register-number year).
- **MF taxpayer identification:** 2 × ~435 MB per year; 2.65 M rows, of which 184,496 are NGO-named legal persons.

## 7. History depth and update cadence

- **History:** registrations go back to the early 1990s (register-number years).
- **Cadence on data.gov.ro:**
  - 2025: 41 dated snapshots, roughly weekly.
  - 2026: 11 snapshots, from 05.01 to **06.07.2026**, with a gap from 09.03 to 18.05. **Nothing has been published since 06.07.2026**, which is four months as of this check. That may be linked to the September 2026 portal launch (*unverified*).
- **Older dataset:** monthly to weekly snapshots from 2021 to 2024, plus 2016 files.
- **Change history:** each snapshot is a full current state. Statuses (`radiata`, `dizolvata`, `in lichidare`) are **undated**, like ONRC's. A dated change history would mean diffing archived snapshots.
- **MF list:** yearly ("actualizate iunie <year>"); in 2026 an update followed in July.

## 8. Data quality

- **Broken names.** XLSX cells carry literal `_x000D_` line-break artefacts. Some names are cut to their tail: a row reads `MANUELA"` where the opening part of the name was lost. 29,114 rows (19%) have no legal-form word (ASOCIAȚIA, FUNDAȚIA, …) in the name. Some of those are legitimate (`CLUBUL SPORTIV …`), the rest truncated.
- **Duplicate register numbers.** There are 152,852 rows but 147,925 distinct register numbers. 268 numbers have no parsable year, and a few carry impossible years (1005, 2901).
- **Homonymy inside the register:**
  - by name alone, 5.05% of keys map to more than one register number (16,371 rows share a name);
  - by name + county, 3.97% of keys.

  That is higher than ONRC's not-struck homonymy (0.72% by name; [org-name-matching](https://github.com/george-vrancianu/grivei.ai/blob/research/org-name-matching/docs/research/org-name-matching.md)), because no rule stops two NGOs in different counties, or even the same one, from taking the same name.
- **Missing counties:** 3,634 rows have no county.
- **MF list:**
  - Clean, CUI-keyed, one row per CUI.
  - **Only 170 NGO rows carry a strike-off date.** Struck-off NGOs are mostly missing from it, so it can't on its own meet ADR 0013's "unique across all registrations, struck-off ones included".
  - 62,042 of its NGO-named rows are homeowner associations (`ASOCIAȚIA DE PROPRIETARI`). These are registered under Law 196/2018, not OG 26/2000, and only 1,771 of them appear in the MJ register.

### Match measurement (ADR 0013 keys, against the MF NGO list)

- **Method:**
  - Inputs: MJ snapshot 06.07.2026; MF identification July 2026; SEAP entities from the local national load (as used for [#127](https://github.com/george-vrancianu/grivei.ai/issues/127)); ONRC CUIs as of 04.11.2026; SMIS 2014–2020 lists at 31.08.2025 (POCA, POAD at 31.12.2024); PNRR projects at 15.10.2026.
  - Names are normalised with the `norm.py` from [org-name-matching](https://github.com/george-vrancianu/grivei.ai/blob/research/org-name-matching/docs/research/org-name-matching.md). A "bare" name also drops ASOCIAȚIA/FUNDAȚIA/ONG/ȘI.
  - "NGO-shaped" means the name contains ASOCIAȚIA, FUNDAȚIA, FEDERAȚIA, UNIUNEA or ONG.
  - The test sets are NGO-shaped names whose true CUI is known, is not in ONRC and is not a SEAP contracting authority.

**Ground truth 1: SEAP NGO suppliers.** 3,004 (name, CUI) pairs, with the seat county from the supplier's placement. Since 2021 they won 1.11 bn RON over 64,414 records.

| Rule | Correct | **Wrong** | Ambiguous | No match | Wrong / unique |
|---|---|---|---|---|---|
| exact name (legal-form word kept), no county | 96.47% | **0.30%** (9) | 1.96% | 1.26% | 0.31% |
| name + seat county | 97.87% | **0.33%** (10) | 0.43% | 1.36% | 0.34% |
| bare name + seat county | 97.74% | 0.30% | 0.63% | 1.33% | 0.31% |
| bare name, no county | 95.54% | 0.30% | 2.93% | 1.23% | 0.31% |

- **Coverage:** 99.0% of the true CUIs are in the MF list. 74.4% of the names appear in the MJ register, and 69.6% as exactly one register number.
- **The wrong links:** in all 9, ANAF gives the same name for the true CUI as for the CUI the MF list returns, so the name has two CUIs and the list holds only one of them. In 7 of the 9 the MJ register shows a single registered NGO under that name. Using the MJ register as a uniqueness guard (require at most one register number) would remove 1 of the 9 wrong links and 112 correct ones, so it doesn't pay.
- **Without homeowner associations** (2,954 pairs), the rates are the same within 0.3 points.

**Ground truth 2: POCU NGO pairs** (CUI written in the text). 337 pairs. POCU's county is the implementation county, which ADR 0013 counts as no county, so only the no-county rules apply:

| Rule | Correct | Wrong | Ambiguous | No match |
|---|---|---|---|---|
| exact name, no county | 83.68% | 0 | 3.26% | 13.06% |
| bare name, no county | 81.90% | 0 | 5.34% | 12.76% |
| (name + implementation county, for contrast) | 11.28% | 0 | 0 | 88.72% |

98.5% of the true CUIs are in the MF list. No wrong link among 337 puts the 95% upper bound near 0.9% (rule of three, *estimate*).

**Unattached names: SMIS 2014–2020 beneficiaries with no CUI in the list.** 319 distinct NGO-shaped names; 0.88 bn RON eligible value, an undercount because the POCA value column was not parsed. Unique matches on exact name, no county:

| Programme | Names | SEAP spellings (today's ADR 0013 route) | MF list | MJ register (recognised, no CUI) |
|---|---|---|---|---|
| POCA | 254 | 94 | 197 | 156 |
| POIM | 39 | 19 | 30 | 19 |
| POR | 20 | 3 | 6 | 5 |
| POC | 9 | 3 | 6 | 5 |
| POAT | 1 | 0 | 0 | 0 |
| **All** | **319** | **117** | **236** (10 ambiguous) | **183** (35 ambiguous) |

- SEAP spellings or the MF list together attach **243 names** uniquely.
- Where both routes attach a name, they never disagree.
- The MF list adds 126 names that SEAP spellings can't reach.

**PNRR:** 284 `ONG` beneficiary CUIs, 0.42 bn RON total project value. Every row has a CUI, none is in ONRC, and 259 are in the MF list. Nothing is left to attach. **SEAP name-only NGO suppliers:** 160 entities, 4.5 M RON; ADR 0013 keeps SEAP on ADR 0003, so they are not re-keyed.

**Court parties and AEP subsidy suppliers** were not measured: there is no local ground truth with CUIs.

## 9. Candidate Signal rules

Candidates only. Sizes are against SEAP NGO suppliers matched to a unique MJ entry on name + county (2,076 of 3,004).

1. **Money to an NGO the register marks as struck off, dissolved or in liquidation.** Needs the MJ register and SEAP (or PNRR/EU funds). It fires for **8 suppliers** (4 `radiata`, 3 `in lichidare`, 1 `dizolvata`). The status is undated, so a record dated before the status change can't be told apart. ANAF's own status on the CUI (already archived) gives the same thing, dated.
2. **NGO winning in its registration year or the next.** Needs the register-number year (no full date) and SEAP. Of 377 matched NGO suppliers registered in 2021–2026, **170 first won** in that year or the next, worth 64.3 M RON in total awards. That is far too common to be a Signal, and the year comes from the register number.
3. **Public-utility NGO receiving public money.** `HG utilitate publica` is set on 806 entries. This is context for the entity page, not a Signal.

## 10. Who already uses it

- **Europa Liberă (2022)** reported the removal of founders and boards from the public register ([link](https://romania.europalibera.org/a/registru-ong-romania/32000825.html)).
- **InfoCons (Sept 2026)** used the public data for a sector profile: 141,204 entries ever registered, 130,247 active; associations 121,281, foundations 18,084, federations 1,559, religious associations 238, foreign 42 ([link](https://infocons.ro/infocons-141-204-ong-uri-in-registrul-national-al-ong-urilor-lansat-online-de-ministerul-justitiei/)).
- **Digi24's "DIN|INTERIOR"** traced 28 NGOs funded by the Environment Fund to politicians and officials. It relied on founders and boards, which the open data no longer carries ([link](https://www.digi24.ro/special/reportaje/reportaj/dininterior-politicienii-abonati-la-fondurile-pentru-mediu-362475)).
- No Expert Forum or OpenTender use of the register was found.
- **Pending proposal:** legislative proposal B517/2025 would add a public, free online register of NGO funding sources above 10,000 lei/year, run by MJ with ANAF. That is known only from a citizen's submission hosted on senat.ro ([PDF](https://www.senat.ro/PAGINI/OPINII/2025/11/16/ca9fef7b-4701-4aa8-a0cc-4fab812485d6/B517-2025.pdf)); its status is **unverified**.

## 11. Recommendation

**Drop the MJ register as a Source** for now:

- it carries no CUI, so under ADR 0013 it attaches nothing;
- it has no people since 2022;
- its open-data feed has been silent since 06.07.2026;
- its only unique fields (status, register year, purpose, public-utility HG) are undated, or too thin for a Signal.

**Take NGO identity from MF's *Date de identificare plătitori* instead.** It is a Reference source candidate: CC BY 4.0, CUI-keyed, yearly, and measured at 0.30–0.34% wrong on ADR 0013's keys. This needs a decision, because ADR 0013 names SEAP spellings as "the only route to NGOs":

- **Add the MF list as a third name list?** It reaches 236 of 319 unattached SMIS NGO names, against 117 through SEAP spellings.
- **Uniqueness gap:** the MF list barely holds struck-off NGOs, so it can't meet ADR 0013's "unique across all registrations". ADR 0013 needs a rule for this. One option is to combine it with older yearly MF snapshots (back to 2018).

The MJ register's 2025 snapshots are worth archiving once, cheaply, in case a dated status history is wanted later.

## Caveats

- **The SEAP ground truth is SEAP's own (name, CUI) pairing**, as in #136. The wrong links are upper bounds, and some may be one NGO under two CUIs (a re-registration or a branch) rather than two NGOs.
- **"NGO-shaped" is a name regex.** NGOs named `CLUBUL SPORTIV …`, parishes, cults and similar without a form word are outside every set here. Cults are not under OG 26/2000.
- **MF list uniqueness was tested within NGO-named rows only.** A firm or public body with exactly the same name would not show up. For names that start with ASOCIAȚIA/FUNDAȚIA this is unlikely.
- **The SEAP spelling list here is each supplier's display name**, not every spelling ever used, so the "SEAP spellings" column understates today's route somewhat.
- **The MJ portal of September 2026 was not reached** (HTTP 403). It may offer per-NGO detail the open data lacks.
- **Data hygiene:** no natural person's name appears in this file or in `ngo-register/measure.out`. The MF `PF` rows were never written out.
