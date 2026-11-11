# How one supplier appears under more than one identity in the SEAP bulk exports

Research for [#21](https://github.com/george-vrancianu/grivei.ai/issues/21), part of the Release 1 map [#2](https://github.com/george-vrancianu/grivei.ai/issues/2). Input for the merge-rule decision [#22](https://github.com/george-vrancianu/grivei.ai/issues/22).
Researched 2026-11-11.

**Question.** In ADR's quarterly SEAP exports on data.gov.ro (2021 onward, per [ADR 0002](../adr/0002-seap-seeding-bulk-first.md)), how does one supplier show up under several identities? How do CUI spellings collapse? How many name spellings sit under one CUI? Which rows have no usable CUI? Can ANAF's name serve as the display name?

## Answer in brief

- **The CUI is a good key once normalised.** 99.78% of deduplicated winner rows carry a CUI that normalises to a valid Romanian CUI (control digit OK). The 137,823 distinct raw strings collapse to **126,061 CUIs**. The variants are formatting only: `RO` prefix (`RO 8955860`, `RO8955860`, `ro…`), a leading space, a trailing comma, rare leading zeros. Which variant you get depends mostly on the file, not on the supplier.
- **Names are not a key.** 28% of CUIs (73% of RON) appear under 2 or more exact spellings, up to 102 for one CUI. Folding case, diacritics, punctuation and legal-form tokens leaves 3.8% of CUIs (12.7% of RON) with more than one name. Those are mostly renames, mergers, branch suffixes, and a small number of wrong CUIs. The same name also maps to different CUIs: homonyms, branches with their own CUI, and group companies.
- **Rows without a usable CUI are few but expensive.** They are 0.22% of rows but **13.4% of RON** (88 bn of 658 bn). This is driven by a handful of large foreign and consortium contracts: the top 20 such rows hold 66% of that RON. Excluding single rows of 1 bn RON or more, the share is 5.3%. In DA and DAN, unusable CUIs are typos and carry almost no money.
- **Wrong CUIs exist.** In 186 rows (1.27 bn RON) the supplier CUI is the contracting authority's own CUI. Further cases are typos that land on another valid CUI, and consortium members carrying a partner's CUI. Comparing the SEAP name with ANAF's name catches them.
- **ANAF gives exactly one non-empty name per CUI.** In a 466-CUI sample, 464 were found (the 2 misses were foreign numbers that happen to pass the Romanian check digit). That name is usable as the display name, but it is the **current** name, in upper case, with inconsistent legal-form suffixes. It doesn't explain historic names: SEAP's `RCS & RDS` is ANAF's `DIGI ROMANIA S.A.`. It flags absorbed companies (`DIZOLVARE FARA LICHIDARE(FUZIUNE)`) but doesn't say who absorbed them.

## 1. Sample and method

**Sample.** Downloading every quarter since 2021 would be heavy: 23 quarters, several GB, and slow XLSX parsing. I took **one quarter per year, spread across quarter positions**, with every supplier-bearing record type:

| Quarter | DA (direct purchases) | Contracte | DAN (offline DA notifications) | Fără anunț (award without prior notice) | Format |
|---|---|---|---|---|---|
| Q3 2021 | yes | yes | not published that year | not published that year | CSV (old SICAP layout) |
| Q1 2022 | yes | yes | not published that year | not published that year | CSV, `\|`-quoted |
| Q4 2023 | yes | yes | yes | yes | CSV (Contracte is Windows-1250) |
| Q2 2024 | yes | yes | yes | yes | CSV |
| Q4 2025 | yes | yes | yes | yes | XLSX |
| Q3 2026 | yes | yes | yes | yes | XLSX |

The 2021 and 2022 datasets publish only DA, Contracte, initiation notices and modifications (CKAN `package_show` for `achizitii-publice-2021`/`-2022`). DAN and "fără anunț" start in 2023. Resource URLs are in [`supplier-identity/sample.tsv`](supplier-identity/sample.tsv), and every file's size matched CKAN's `size`.

**Rows.** 5,202,159 raw rows. Deduplicating gives **4,342,835 winner rows**:
- DA and DAN by public code, which removes the 38% exact duplicates in Q3 2026 DA;
- contracts by (award notice, contract no.), keeping one row per distinct winner per contract. Rows repeat per lot, and a contract re-published in a later sampled quarter is counted once.

Per kind: DA 3,471,854 · DAN 294,096 · Contracte 566,977 (461,826 contracts, 63,792 with more than one winner) · fără anunț 9,908.

**RON.** RON is the reported value, summed: 658.0 bn over the 6 quarters. A contract's value is split equally among its winners, matching the existing `n_winners` model. Contracte values include framework-agreement maxima and a few mega-contracts, so **RON shares are dominated by a few rows.** I give row shares beside them and, where it matters, the share excluding rows of 1 bn RON or more.

**CUI normalisation used.**
1. Trim whitespace (including tabs and NBSP).
2. Uppercase, and strip a `CUI:`/`CIF`/`C.F.` label.
3. Strip `RO` with any separator (`RO`, `RO `, `RO-`, `RO.`) and stray punctuation (`,` `` ` `` `;` `%` `+` `:` `/` `-`).
4. Remove internal spaces in all-digit strings, and strip leading zeros.
5. Validate the control digit with ANAF's key `753217532` (2–10 digits).

Values that don't validate are classified rather than repaired.

**Scripts** (all in [`supplier-identity/`](supplier-identity/), run with `python -I`):
- `list_sample.py` picks resources from the CKAN JSON.
- `extract.py` maps each file's columns into one TSV. It uses python-calamine for XLSX.
- `analyze.py` does the classification, normalisation, dedup and name variants. Its output is in `analyze-output.txt`.
- `anaf_sample.py` and `anaf_eval.py` do the ANAF sample, with output in `anaf-eval-output.txt`.
- `extra.py` produces `extra-output.txt`.

In the committed outputs, names and personal numeric codes of natural persons are redacted.

## 2. CUI format variants

### What the raw supplier-CUI cell looks like

Measured over all deduplicated winner rows (`analyze-output.txt`, "Category of supplier CUI value"):

| Category | Rows | % rows | RON | % RON | Examples |
|---|---|---|---|---|---|
| Normalises to a valid RO CUI | 4,333,241 | 99.78% | 569.95 bn | 86.62% | `6865630`, `RO 8955860`, ` 23517392`, `16728583,` |
| Digits, control digit fails | 5,124 | 0.12% | 50.13 bn | 7.62% | `3324092` (MEDI SENSE, real 33240921), `RO317126` (LOIAL IMPEX, real 3176126), `24193233` (Van Oord, foreign) |
| Foreign VAT format | 1,317 | 0.03% | 9.94 bn | 1.51% | `BG130545438`, `ATU 18379608`, `FR 82542021829`, `PL5240015630` |
| Other junk | 1,091 | 0.03% | 17.72 bn | 2.69% | `A-28854727` (FCC), `R 21790662`, `16-0980138`, `11968470-2-43` |
| Too many digits (11+, not a CNP) | 1,059 | 0.02% | 8.22 bn | 1.25% | `1007607001228` (Moldovan IDNO), `+40 0755768415` (a phone number) |
| Blank or placeholder | 640 | 0.01% | 66.6 M | 0.01% | `''`, `-`, `...`, `N/A` |
| 13 digits with a valid CNP check (natural persons) | 187 | <0.01% | 91.7 M | 0.01% | personal numeric codes, mostly in fără anunț (172 rows) |
| A name instead of a code | 137 | <0.01% | 1.88 bn | 0.29% | `VAT BE 0413330856`, `GEMH 06556101000`, company names in the CUI cell |
| Trade register number | 27 | <0.01% | 0.2 M | 0.00% | `J40/10454/20`, `J16 /984 /20` (DAN only) |
| Excel scientific notation | 12 | <0.01% | 5.0 M | 0.00% | `1.00761E+12`, `2.61E+11` (2021 CSVs; digits irrecoverably lost) |

### Format flags on the valid rows

Of the valid rows, 89.8% (but only 29.8% of their RON) were plain digits needing no fix:

| Variant | Rows | % of valid rows | % of valid RON |
|---|---|---|---|
| `RO` prefix | 382,326 | 8.82% | 63.66% |
| … of which with a separator (`RO 123`, `RO-123`, `RO.123`, `RO  123`) | 321,703 | 7.42% | 52.50% |
| … of which lower/mixed case (`ro…`, `Ro…`) | 3,529 | 0.08% | 0.09% |
| Leading/trailing whitespace | 60,119 | 1.39% | 6.50% |
| Leading zeros | 117 | <0.01% | 0.02% |
| Stray punctuation (`16728583,`, `` 16876644` ``, `%15202318`) | 116 | <0.01% | 0.02% |
| Label prefix (`CUI: …`, `C.F. …`) | 38 | <0.01% | 0.00% |
| Stored as an XLSX number (formatting invisible) | 1,352,510 | 31.21% | 13.70% |

**The variant is mostly a property of the file and record type:**
- **Contracte and fără anunț (2021, 2023–2026):** `RO` on 58–82% of rows, mostly `RO 1234567` with a space. This is where the money is.
- **Contracte Q1 2022:** no `RO`, but a leading space on 70% of rows (` 23517392`).
- **DA:** almost always plain digits. There is `RO` on 0.47% of rows in 2021 and essentially none later.
- **DAN:** `RO` on 1.2–2.1% of rows, plus most of the typos, blanks and trade-register numbers. DAN is hand-entered offline data.
- **XLSX files (2025 onward):** cells that are pure digits are stored as numbers. All of DA and 27–29% of Contracte, so any leading zeros or spaces are gone before we see them. The rest are text (`RO…`).

### How raw strings collapse

**137,823 distinct raw strings → 126,061 valid normalised CUIs.**

| Raw spellings per CUI | 1 | 2 | 3 | 4 | 5+ |
|---|---|---|---|---|---|
| CUIs | 116,633 | 7,170 | 2,183 | 74 | 1 |

The worst case is `16728583`, with five spellings: `' 16728583'`, `'16728583'`, `'16728583,'`, `'RO 16728583'` and `'RO16728583,'`. Typical cases are `8955860` and `335278`, each written as `' X'`, `'X'`, `'RO X'` and `'ROX'`.

### Two traps in "valid"

- **Long numbers that pass the check digit by chance.** Romanian CUIs in the sample have at most 8 digits. 128 rows (71 with 9 digits, 57 with 10) pass the check digit anyway, with 2.7 bn RON on the 10-digit ones. These are mostly foreign numbers:
  - Italian partita IVA with the leading `0` stripped (`04596040966` SIRTI, `04880340874` MIGIFRA);
  - Turkish, Belgian or US numbers (`442008451` WIX.COM, `101976861` Bureau van Dijk);
  - a few Romanian CUIs with an extra digit (`RO251120304` ATICO LOGISTIC).

  ANAF returned `notFound` for both 10-digit numbers in its sample. A practical rule is to treat more than 8 digits as not Romanian unless ANAF confirms.
- **The country column is unreliable.** It exists only in 2021 DA/Contracte, 2023 Contracte/fără anunț and 2024 Contracte. It says `Romania` for FCC Construcción, Van Oord and Imeva, and a foreign country for some rows whose CUI passes the check digit (23 rows, 1.49 bn).

## 3. Name variants under one normalised CUI

Distinct names per valid CUI at three folding levels (126,061 CUIs):

| Names per CUI | Exact string: CUIs | rows | RON | Case and space folded: CUIs | Diacritics, punctuation and legal form stripped: CUIs | rows | RON |
|---|---|---|---|---|---|---|---|
| 1 | 72.1% | 21.4% | 27.1% | 72.5% | **96.2%** | 85.6% | 87.3% |
| 2 | 23.6% | 45.9% | 37.0% | 23.5% | 3.3% | 8.1% | 7.0% |
| 3–5 | 4.1% | 27.0% | 32.7% | 3.8% | 0.46% | 5.9% | 5.6% |
| 6–10 | 0.14% | 4.9% | 2.3% | 0.11% | 0.05% | 0.1% | 0.02% |
| 11+ | 0.06% | 0.9% | 0.9% | 0.04% | 0.02% | 0.3% | 0.2% |

The legal-form tokens stripped at the third level are `SC`, `S.C.`, `SRL`, `S.R.L.`, `SA`, `S.A.`, `SRL-D`, `SNC`, "societatea comercială" and similar. Any supplier that appears often is spelled in more than one way: CUIs with a single exact spelling cover only 21% of rows.

Typical cases (CUI, then SEAP spellings):

- `430008`: `CONSTRUCTII ERBASU S.A.`, `CONSTRUCTII ERBASU`, `S.C. CONSTRUCTII ERBASU S.A.`
- `9378655` (11 spellings): `DR.MAX`, `S.C. DR.MAX S.R.L.`, `Dr Max SRL`, `DR. MAX S.R.L.`, `Dr.Max`, …
- `18921652` (79 spellings): `SC JUMBO EC.R S.R.L.`, `JUMBO EC.R SRL`, `JUMBO EC.RS.R.L.`, `JUMBO E.C.R.`, `JUMBO`, `Jumbo Ec.R Srl`, …
- `13348610` (45): `S.C. REWE ROMANIA SRL`, `REWE ROMANIA SRL/PENNY`, `Rewe (Romania) SRL`, `SC REWE (ROMANI) SRL/PENNY`, …
- `16054368` (102): CNAIR as a supplier, with branch suffixes (`CNAIR DRDP CLUJ`, `CNAIR-D…`). `14476722` Distribuție Energie Electrică (43) has the same pattern (`… Sucursala Brasov`, `… Sucursala Bistrița`).

**An export artefact to strip.** SEAP itself writes a doubled legal form, `S.C. <name> <form>`, around a name that already contains one. Examples are `S.C. S.C. Alstom Transport S.A. S.A.`, `S.C. TEHNOSTRADE S.R.L. S.R.L.` and `S.C. VODAFONE ROMANIA S.A. S.R.L.`. In DAN, 60–62% of names start with `S.C. ` and about 24% have the doubled form (16–20k rows per quarter). In DA and Contracte it is 0.5–3.5% (`extra-output.txt`). The doubled suffix can even contradict the real form (`S.A. S.R.L.`).

## 4. Rows without a usable CUI

**9,594 rows (0.22%) and 88.05 bn RON (13.38%)** have no CUI that normalises to a valid Romanian one. By likely reason (first matching rule):

| Reason | Rows | % rows | RON | % RON |
|---|---|---|---|---|
| Consortium named as one winner ("Asocierea …", "… JV") | 16 | <0.01% | 37.72 bn | 5.73% |
| Foreign, from the country column | 605 | 0.01% | 18.31 bn | 2.78% |
| Control digit fails (typo or foreign number) | 4,920 | 0.11% | 17.08 bn | 2.60% |
| Foreign, from a VAT prefix | 1,027 | 0.02% | 6.65 bn | 1.01% |
| Too many digits | 1,029 | 0.02% | 4.85 bn | 0.74% |
| Other junk | 1,004 | 0.02% | 3.30 bn | 0.50% |
| A name instead of a code | 135 | <0.01% | 68.5 M | 0.01% |
| Blank | 638 | 0.01% | 66.3 M | 0.01% |
| Excel scientific | 9 | <0.01% | 5.0 M | 0.00% |
| CNP-like | 184 | <0.01% | 0.9 M | 0.00% |
| Trade register number | 27 | <0.01% | 0.2 M | 0.00% |

- **Concentration.** The top 5 rows hold 39% of this RON, the top 20 hold 66%, and the top 100 hold 91%. The largest are:
  - `FCSA JV`, CUI cell `125644669`: 15.76 bn (fără anunț, Q4 2025);
  - `Asocierea Candu Energy Inc. – Canadian Commercial Corporation – Ansaldo Nucleare …`, `789509-7`: 10.24 bn;
  - `Asocierea FCC - ASTALDI-CONVENSA, tronson 3`, `A-28854727`: 3.10 bn;
  - `Asocierea RailWorks … Aktor (Lider), Alstom …`, `094149722`: 2.72 bn;
  - Turkish contractors `Cengiz Insaat` and `MAPA Insaat`: 2.13 bn each.
- **Share by kind.** Without a usable CUI: Contracte 1,324 rows / 58.4 bn; fără anunț 467 rows / 29.6 bn; DAN 6,091 rows / 0.07 bn; DA 1,712 rows / 0.02 bn.
- **Without the mega-rows.** Excluding the 52 rows of 1 bn RON or more (21 of which lack a CUI), rows without a usable CUI are **5.33%** of RON.
- **By sampled quarter.** As a share of each quarter's RON: 3.4% (2021), 15.7% (2022), 16.1% (2023), 9.7% (2024), 16.6% (2025), 13.2% (2026).
- **Romanian-looking typos** (at most 8 digits, failing the check digit, not marked foreign): 3,724 rows, mostly DAN (2,656) and DA (862), with tiny values. The 5.0 bn RON in this bucket comes from foreign firms with short ids (Van Oord `24193233`, Shield Fire `5089679`, Ukrainian and Turkish firms).
- **Recovering typos by name.** For 1,188 invalid-check-digit rows, the folded name matches exactly one valid CUI elsewhere in the sample, for example `MEDI SENSE SRL` `3324092` → `33240921` (a dropped digit) and `LOIAL IMPEX` `RO317126` → `3176126`. 180 rows match several CUIs, and 3,756 match none.
- **Foreign ids are a usable secondary key.** There are 2,442 distinct foreign or invalid ids after normalising to `[0-9A-Z]`. Only 160 carry more than one name spelling (`CZ46960031`: `ZLIN AVION SERVICE` / `ZLIN-AVION SERVICE S.R.O.` / `ZLÍN-AVION SERVICE`). Euro-Asfalt has the same id `20038799007` on all its 2025 contracts.

**Consortia.** The bulk usually lists consortium members as separate winner rows: 63,792 contracts, carrying 43% of RON, have more than one winner. Sometimes, though, the whole consortium is one row named "Asocierea …". There are 1,242 such rows (42.3 bn), and 1,222 of them carry a valid CUI, usually the leader's. Concelex Engineering's CUI `14052360` appears both as `Concelex Engineering S.R.L` and as `Asocierea Concelex Engineering S.R.L si Act Construct SRL`. Without a CUI, the consortium name is the only handle.

## 5. ANAF as the display-name source

I posted 466 CUIs to `PlatitorTvaRest/v9/tva` in 5 requests of at most 100 CUIs, 3 s apart. That is inside doc_WS_V9's "maxim 100 de CUI-uri … maxim 1 request pe secundă"; see [#6](https://github.com/george-vrancianu/grivei.ai/issues/6) and `docs/research/authority-county-mapping.md` on branch `research/authority-county-mapping`. The sample was:
- the top 100 CUIs by RON;
- 200 random CUIs;
- the 100 highest-RON CUIs with disjoint name spellings;
- 127 CUIs that share a distinctive name with another CUI.

Results (`anaf-eval-output.txt`):

- **Coverage.** 464 of 466 were found. The 2 misses are the 10-digit foreign numbers that pass the Romanian check digit. ANAF also returns deregistered entities: 5 `RADIERE`, 9 `DIZOLVARE FARA LICHIDARE(FUZIUNE)`, 1 `SUSPENDARE ACTIVITATE`, and 11 flagged inactive.
- **One name per CUI.** `date_generale.denumire` is always non-empty.
- **Formatting is official, not pretty.**
  - Names are upper case (463/464).
  - The legal form varies: `SRL`, `S.R.L.`, `SA`, `S.A.`, and once mixed case, `Porr Construct SRL`.
  - Diacritics appear in 44 names, 29 of them with cedilla forms (`Ş`, `Ţ`).
  - Official long names can stand in for the common one: `SOCIETATEA DE PRODUCERE A ENERGIEI ELECTRICE IN HIDROCENTRALE " HIDROELECTRICA" S.A.` where SEAP has `SPEEH HIDROELECTRICA SA`.
  - Branches carry long composite names (`COMPANIA NATIONALA POSTA ROMANA S.A. - PUNCT DE LUCRU OFICIUL JUDEŢEAN DE POŞTA PRAHOVA`).
- **Agreement with SEAP.**
  - Top 100: 97 of 98 CUIs have a SEAP spelling equal to ANAF's name after folding, and 96.7% of their rows use such a spelling.
  - Random 200: 184 exact matches, 12 near matches (contained or similar), and 4 with no resembling spelling:
    - an abbreviation, `D.S.V.S.A. ARGES` for `DIRECTIA SANITARA VETERINARA SI PENTRU SIGURANTA ALIMENTELOR`;
    - a rename, `ERDCA INNOVATION` → ANAF `CMC GROUP SRL` (`25515142`);
    - a spelling slip, `SC NAFSIK&KONST SRL` vs `NAFSIKA & KONST SRL`;
    - a sole trader (PFA) whose name differs only in word order and diacritics.
  - In the top group the one miss is the abbreviation `SPEEH HIDROELECTRICA SA`.
  - In this sample, 98.8% of rows use a spelling that matches ANAF exactly after folding.
- **ANAF gives the current name only.** Historic names in SEAP are real, and ANAF can't explain them:

  | CUI | SEAP spelling (rows) | ANAF name today |
  |---|---|---|
  | `5888716` | `RCS & RDS S.A.` (2,219) | `DIGI ROMANIA S.A.` |
  | `3596251` | `SIEPCOFAR` (241) | `DONA. LOGISTICA S.A.` |
  | `21349608` | `CEZ VANZARE S.A.` (236) | `PREMIER ENERGY FURNIZARE S.A.` |
  | `15071999` | `STERICYCLE ROMANIA S.R.L.` (711) | `STERILECO S.R.L.` |
  | `2114184` | `TOP TECH` (1,394) | `DENDRIO TECHNOLOGY S.R.L.` |
  | `35372791` | `MEC-DIESEL SEE` (953) | `DUBHE ROMANIA S.R.L.` |
  | `6614131` | `ASSECO SEE` | `ASEE SOLUTIONS` |
  | `15687329` | `Wiebe Romania` | `BAWI CONSTRUCTION` |
  | `14125527` | `Agilrom Scientific` | `ALTIUM INTERNATIONAL` |
  | `8955860` | `FARMEXPERT D.C.I.` | `ALLIANCE HEALTHCARE ROMANIA` |

  A display name taken from ANAF will therefore show today's name on 2021 records. In the disjoint-name group, 4.5% of rows carry a spelling unlike ANAF's, mostly for this reason.
- **Mergers are flagged, but the successor is not.** ANAF marks the absorbed side `DIZOLVARE FARA LICHIDARE(FUZIUNE) din data …`. Examples:
  - `33358111` DONA. LOGISTICA S.A., 31.12.2023: absorbed into `3596251`, which then took the name, so both CUIs are now "DONA. LOGISTICA S.A.";
  - `9311280` MEDIPLUS EXIM, 31.12.2023;
  - `427320` ORANGE ROMANIA COMMUNICATIONS (ex-Telekom), 01.06.2024;
  - `23517392` B. BRAUN AVITUM, 30.06.2025;
  - `14721007` DRAGER SAFETY ROMANIA, 2021.

  v9 has no field naming the absorbing company.

## 6. One CUI, clearly different companies

**Scale.** 1,003 CUIs (0.8%) have two spellings that share no token after folding. They account for 273k rows and 41 bn RON, 7.2% of valid RON; the RON share is high because large suppliers are among them. ANAF review of the top 100 sorts the "unlike" spellings into four kinds.

1. **Rename or merger, same legal entity** (the majority by rows): the examples in §5.
2. **Wrong CUI: the contracting authority's own CUI typed as the supplier's.** 186 rows (161 DAN, 23 Contracte, 2 fără anunț), **1.27 bn RON**, where supplier CUI equals the row's authority CUI. For example:
   - `1443170` is `COMPANIA DE UTILITATI PUBLICE SA` (the authority), but shows up as supplier for `HIDROCONSTRUCTIA S.A.`, `TANCRAD S.R.L.`, `ROTARY CONSTRUCTII S.R.L.` and `PORR CONSTRUCT S.R.L.`;
   - `13328043` Transelectrica shows up for `RETRASIB S.A.`, `ELM ELECTROMONTAJ CLUJ S.A.` and `Smart S.A.`;
   - also `20330054` Compania de Apă Arieș (for `EPTISA ROMANIA`), `11054529` CFR (for `STRABAG`, `ARCADA COMPANY`), and Județul Vrancea, Satu Mare and Sălaj (`4350394`, `3897378`, `4494764`).
3. **Wrong CUI: a typo or a partner's CUI that lands on another real entity.**
   - Typos: `ORANGE ROMANIA` on `3430258` (ANAF: Inspectoratul Școlar Județean Tulcea), `OMNIASIG VIENNA INSURANCE GROUP` on `4969090` (Orașul Vașcău), `ORANGE ROMANIA COMMUNICATIONS` on `4280140` (Comuna Comișani), `DIRECTIA DE SANATATE PUBLICA A JUDETULUI ARAD` on `10933694` (B.N. BUSINESS SRL).
   - Within multi-winner contracts, a partner's CUI copied onto another member: `EUROPHARM HOLDING` on Mediplus's `9311280`, `STRYKER ROMANIA` on Medical Ortovit's `9625593`, `KAPAMED INTERNATIONAL` on B. Braun Medical's `11080242`.

   These are usually 1–20 rows per CUI, but they move money onto the wrong entity page.
4. **Branch or trade-name suffixes on the parent CUI**: `CNPR MANGALIA`, `CNPR CLUJ NAPOCA OPRM` on Poșta Română `427410`; `OCOLUL SILVIC …`, `R.N.P. DIRECTIA SILVICA TIMIS` on Romsilva `1590120`; `REWE ROMANIA SRL/PENNY`. These are the same entity.

## 7. One company under two CUIs

**Scale.** 1,314 folded names map to more than one valid CUI (2,823 CUIs). 533 of those names are distinctive (2 or more tokens, at least 12 characters). ANAF shows they are not one thing:

- **Homonyms: different legal entities with the same name.**
  - `DRUM CONSTRUCT SRL`: `7224633` (Sălaj, 1995) and `23580950` (Galați, 2008);
  - `SUPER CONSTRUCT SRL` ×2, `MEDICAL GRUP SRL` ×2, `PROIECT INVEST SRL` ×2, `PRIMA CONSTRUCT SRL` ×3;
  - `ELECTROCONSTRUCTIA ELCO` ×6 (separate county companies).

  Merging by name would be wrong.
- **Branches with their own CUI** (a sucursală or punct de lucru registered separately):
  - Poșta Română county offices (`15673684`, `30515831`, `30537341`, `30565694`, `30716720` beside `427410`);
  - Societatea Națională a Sării branches (`4367264` Salina Praid, `756684` Cacica, `9165010` Târgu Ocna beside `1590430`);
  - `22124891` E.ON Energie România Sucursala Sibiu (radiated 2023), `26834093` Bin Go Solutions Sucursala Ploiești.

  The same company, but separate fiscal identities.
- **Group companies with a shared brand**: `OMV PETROM SA` `1590082` vs `OMV PETROM MARKETING SRL` `11201891`; `B.BRAUN MEDICAL` `11080242` vs `B. BRAUN AVITUM` `23517392`; `MEDIST S.R.L.` `6705884` vs `MEDIST LIFE SCIENCE` `24205119`; `DRAEGER ROMANIA` vs `DRAGER SAFETY ROMANIA`. These are distinct legal entities.
- **Successors after a merger**: `33358111` → `3596251` (Dona), `427320` Orange Romania Communications → Orange, `23517392` → `11080242` (B. Braun). One business is spread over two CUIs across time, and ANAF v9 doesn't link them.
- **Wrong CUIs** from §6 (PORR CONSTRUCT on `1443170` and on its real `16601724`; ARCADA COMPANY on CFR's `11054529` and its real `5437520`). These look like "one company, two CUIs", but one of the CUIs is simply wrong.

## 8. What the merge rule (#22) has to weigh

These are observations, not the decision.

1. **Key on the normalised CUI, and only on it, for Romanian suppliers.** Normalisation is mechanical and lossless: strip whitespace, `RO` with any case or separator, stray punctuation, labels and leading zeros, then validate the check digit. Treat more than 8 digits as non-Romanian until ANAF confirms. This collapses 137,823 spellings into 126,061 keys and covers 99.78% of rows.
2. **Never merge by name.** Homonyms, branches, group companies and wrong CUIs all produce "same name, different CUI". Name similarity is useful only as a hint, for example to recover the 1,188 typo rows whose name maps to exactly one CUI, and every such repair should be flagged.
3. **Use ANAF's `denumire` as the display name, and keep SEAP spellings as dated aliases.** It is one non-empty name per CUI with 99.6% coverage in the sample. It is the current name and needs light cosmetic treatment: case, legal-form suffix and cedilla diacritics. Historic names (RCS & RDS, Siepcofar, CEZ Vânzare) exist only in SEAP, and search needs them.
4. **Detect wrong CUIs, don't trust them silently.**
   - The cheap check is supplier CUI equal to the row's authority CUI: 186 rows, 1.27 bn.
   - The broader check is a SEAP spelling that shares no token with ANAF's name, for example `ORANGE ROMANIA` on a school inspectorate.
   - Both should produce a flagged record, not a silent merge into the wrong entity page.
5. **The biggest RON risk is the no-CUI tail, not the format variants.** About 13% of RON (5% excluding single rows of 1 bn RON or more) belongs to foreign suppliers and consortium rows without a Romanian CUI. They need their own identity: the normalised foreign id where one exists, otherwise the name, under an explicit "foreign / consortium" type. Otherwise the largest contracts in the explorer have no supplier page.
6. **Mergers and branches are a roll-up question, separate from identity.** ANAF flags absorbed companies (`FUZIUNE`) and branches have their own CUIs, but nothing in v9 links them to a parent or successor. Keep them as separate entities now; a later "group" link would need ONRC or another source.
7. **Clean the names SEAP generated.** Strip the `S.C. … S.R.L. S.R.L.` doubling, which affects about 24% of DAN names, before aliases are stored or shown.
8. **Treat the 2021 CSVs' Excel-mangled CUIs (`1.00761E+12`) and natural persons' CNPs as unrecoverable or private.** Don't publish CNPs (187 rows). The Grivei.ai privacy posture should decide how natural-person suppliers (PFA and individuals) are shown.

## Caveats

- **Sample.** 6 of 23 quarters, one per year. All record types are covered where they exist, but 2021–2022 have no DAN or fără anunț files. Percentages by row should be stable across quarters, since the variants are file-driven. RON shares are not stable: they hinge on a few mega-contracts per quarter.
- **Parsing.** A dozen rows in the `|`-quoted 2022–2024 DA CSVs are malformed (a `|` inside a field) and were kept with an unparsable value of 0. Contract values for framework agreements are the agreement maxima as reported.
- **ANAF sample.** It is biased on purpose (top, disjoint and multi-CUI groups); only the random-200 group estimates population rates.

## Sources

- data.gov.ro CKAN `package_show` for `achizitii-publice-2021` … `-2026` (read 2026-11-11), and the 20 resources listed in [`supplier-identity/sample.tsv`](supplier-identity/sample.tsv). ADR, CC BY 4.0.
- ANAF public web service `POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva`, called 2026-11-11. Docs: [doc_WS_V9.txt](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt) (limits: 100 CUIs per request, 1 request per second).
- Romanian CIF control-digit algorithm (key `753217532`) and CNP control digit (key `279146358279`), as implemented in `analyze.py`.
- Earlier research: `docs/research/seap-bulk-sources.md` (branch `research/seap-bulk-sources`, #5) and `docs/research/authority-county-mapping.md` (branch `research/authority-county-mapping`, #6). Decision: [ADR 0002](../adr/0002-seap-seeding-bulk-first.md) (#9).
