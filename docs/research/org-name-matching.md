# Matching organisation names to a CUI: homonymy and false-link rates (research)

Measurement for [#136](https://github.com/george-vrancianu/grivei.ai/issues/136) ("Decide how organisations named without a CUI are matched to one"). It measures; it does not decide. This branch is throwaway and is never merged. The scripts and their raw output are in `org-name-matching/`. The approach follows the person measurement for #123 (branch `prototype/entity-linking-false-links`).

All numbers are **measured** unless marked *estimate*.

## Data

- **ONRC** `OD_FIRME` + `OD_STARE_FIRMA`, snapshot of 04.11.2026: 4,233,074 registrations; 86,427 have CUI 0 or blank and are ignored; 4,041,402 distinct CUIs.
- **Struck off** means the registration carries status code **1084 (`radiată`)**. That is 2,036,912 CUIs not struck off, of 4,041,402. No other code (dissolution, liquidation, bankruptcy) counts as struck off here.
- **ONRC holds the current name only.** Former names are not in the open data.
- **SEAP:** the Raw archive bulk files (DA, DAN, contracts, award notices, 2021Q1–2026Q3), parsed with `watchdog/pipeline/bulk`. That is 15.68 M winner rows. CNP-shaped supplier ids are dropped on load and never stored. Values are RON; the [suspect-value rule](../../GLOSSARY.md) is roughly approximated: a DA/DAN row over 3 M RON, or any row over 10 bn RON, counts 0 (3,564 → 2,973 bn RON).
- **ANAF:** the archived VAT-register answers (192,818 CUIs found) are the "confirmed CUI" set and supply the seat county.
- **POCU 2014–2020:** the list of contracted projects at 31.08.2025 (data.gov.ro `proiecte-contractate`). 2,947 projects; 2,941 leader cells and 2,017 partner cells parsed into (name, CUI). That is 2,114 distinct (name, CUI) pairs and 1,999 CUIs.

## Normaliser (`norm.py`)

1. Upper-case, then NFKD with combining marks dropped, so cedilla and comma-below `Ș/Ş`, `Ț/Ţ` both fold to `S`, `T`.
2. Remove dots (`S.R.L.` → `SRL`), turn `&` into `SI`, and turn other punctuation into spaces. Collapse spaces, then join runs of single letters (`S R L` → `SRL`, `A B C` → `ABC`).
3. **Legal forms:**
   - Written-out forms are mapped to their short form: `SOCIETATE CU RASPUNDERE LIMITATA` → `SRL`, `SOCIETATE PE ACTIUNI` → `SA`, `PERSOANA FIZICA AUTORIZATA` → `PFA`, `INTREPRINDERE INDIVIDUALA/FAMILIALA` → `II`/`IF`, `REGIA AUTONOMA` → `RA`, and likewise `SNC`, `SCS`, `SCA`.
   - `SRL-D` → `SRL`.
   - `SOCIETATEA COMERCIALA` and a leading `SC` are dropped.
   - `ASOCIATIA`, `FUNDATIA` and the like stay as words.
4. **Name without legal form:** the normalised name with every token in {SRL, SA, SNC, SCS, SCA, RA, PFA, II, IF, PF, SCM, SPRL, IPURL} removed wherever it occurs.
5. **County:** folded, with `JUDETUL` dropped and every Bucharest spelling turned into `BUCURESTI`. **Locality:** ONRC's `Sat X, Comuna Y` is reduced to the UAT `Y`, prefixes such as `MUNICIPIUL`, `ORAS` and `COMUNA` are dropped, and Bucharest sectors become `BUCURESTI`.

## 1. ONRC homonymy

The table gives the share of distinct keys that map to more than one CUI, and the share of CUIs whose key is shared with another CUI.

| Scope | Key | With legal form: keys >1 CUI | With legal form: CUIs sharing | Legal form removed: keys >1 CUI | Legal form removed: CUIs sharing |
|---|---|---|---|---|---|
| (a) all registrations | name | 3.26% | 8.33% | 4.20% | 10.51% |
| (b) not struck off | name | 0.72% | 1.73% | 0.79% | 1.91% |
| (c) all | name + seat county | 0.54% | 1.10% | 0.97% | 1.97% |
| (c) not struck off | name + seat county | 0.00% (88 keys) | 0.01% | 0.01% | 0.02% |
| (d) all | name + county + locality | 0.42% | 0.84% | 0.74% | 1.48% |
| (d) not struck off | name + county + locality | 0.00% | 0.00% | 0.01% | 0.01% |
| all, excl. PFA/II/IF/PF | name | 3.36% | 9.18% | 3.44% | 9.49% |
| not struck off, excl. PFA/II/IF/PF | name | 0.90% | 2.18% | 0.93% | 2.27% |

At most 36 CUIs share one name (38 with the legal form removed). Short names are the risk: 9.9% of one- or two-word names (legal form counted as a word) are shared, against 2.3% of longer ones.

**Kinds of homonym.** Each later CUI is paired with the first-registered CUI of the same name with legal form; 212,404 pairs in all.

| Kind | Share of pairs | Pattern |
|---|---|---|
| Both registered before 2000, in different counties | 37.6% | Early-1990s county-level registration let one generic one-word name (`<WORD> SRL`) be registered in up to 32 counties. One such name is still live as 29 different CUIs in 29 counties. |
| Both struck off | 19.4% | Dead homonyms. They only hurt a rule that searches all registrations. |
| Person-named (PFA/II/IF/PF) | 19.4% | Named after the holder. Namesakes are common. |
| Earlier one struck off, later one live | 14.4% | The name was reused after strike-off. A historic record naming the old firm links to the new one. |
| Earlier live, later struck off | 5.4% | |
| Both live, different counties | 3.6% | Mostly pre-2000 names. Among live homonyms (excl. person forms), 2,753 names are all pre-2000, 10,683 mix pre-2000 and later registrations, and 77 are 2010+ only. |
| Both live, same county | 28 pairs | Almost never happens. ONRC refuses a name already live in the county. |

The family-association form `AF` was not in the person-form list, so a few person-named rows are counted as companies.

## 2. False-link rate against SEAP ground truth

- **Test set:** distinct pairs of (supplier name as SEAP spelled it, normalised; ANAF-confirmed CUI). That is 244,876 pairs over 177,519 CUIs, of which **223,884 pairs (162,805 CUIs) have their true CUI in ONRC**. The rest are public bodies, NGOs and foreign firms selling to the state, which no ONRC rule can find.
- **County:** ANAF's seat county of the true CUI, standing in for the county text a Source would give.
- **Value:** the SEAP value attached to that spelling and CUI. It is noisy (see caveats).
- **Classes:**
  - unique correct: exactly one candidate CUI, and it is the true one;
  - unique wrong: exactly one candidate CUI, and it is another firm;
  - ambiguous: two or more candidates;
  - no match: no candidate.

**True CUI in ONRC (223,884 pairs):**

| Rule | Unique correct | **Unique wrong** | Ambiguous | No match | Wrong / all unique | Unique correct, RON | Unique wrong, RON | Ambiguous, RON |
|---|---|---|---|---|---|---|---|---|
| r1 name with form, all ONRC | 45.5% | **0.32%** | 4.2% | 50.0% | 0.69% | 33.6% | 0.30% | 3.2% |
| r2 r1, not struck off | 45.6% | **0.34%** | 2.1% | 52.0% | 0.75% | 34.5% | 0.29% | 1.7% |
| r3 r1 + county | 49.3% | **0.13%** | 0.23% | 50.4% | 0.26% | 36.3% | 0.03% | 0.11% |
| r3b r3, not struck off | 47.6% | **0.11%** | 0.00% | 52.3% | 0.23% | 36.2% | 0.03% | 0.00% |
| r4 name without form + county | 90.1% | **0.25%** | 0.62% | 9.0% | 0.28% | 95.0% | 0.04% | 0.79% |
| r4b r4, not struck off | 87.7% | **0.18%** | 0.03% | 12.2% | 0.20% | 94.4% | 0.15% | 0.20% |
| r1x name without form, no county | 82.7% | **0.54%** | 8.5% | 8.3% | 0.65% | 82.7% | 0.42% | 13.7% |

- **Why r1 misses half the pairs:** SEAP often drops the legal form (`ALFA PROD` for `ALFA PROD SRL`). Removing the form on both sides (r4, r1x) recovers most of them.
- **Adding the county** cuts ambiguity by an order of magnitude and halves the wrong-unique rate.
- **All 244,876 pairs**, including those whose CUI is not in ONRC: r4 gives 82.4% correct, 0.36% wrong, 0.57% ambiguous and 16.7% no match.

**r5, the alias index (fair only on a hold-out).** The index is ONRC names plus every SEAP spelling attached to an ANAF-confirmed CUI in rows dated before 2025. It is tested on pairs that occur in 2025+ rows (146,525 pairs), with value from 2025+ rows only.

| Rule | Unique correct | Unique wrong | Ambiguous | No match | Wrong / all unique |
|---|---|---|---|---|---|
| r1 | 44.0% | 0.20% | 4.3% | 51.5% | 0.46% |
| r5 r1 + aliases | 75.8% | 0.25% | 5.0% | 19.0% | 0.32% |
| r5c r5 + county | 80.4% | 0.07% | 0.36% | 19.2% | 0.09% |
| r4 | 92.4% | 0.16% | 0.60% | 6.8% | 0.18% |
| r5d r4 + aliases (name without form + county) | 95.5% | 0.13% | 0.87% | 3.6% | 0.13% |

On the 48,986 pairs whose spelling first appears in 2025+ (new to the index), aliases add no coverage and raise the wrong rate: r1 gives 0.43% wrong and r5 0.73%. The extra wrong links come from SEAP rows where a name was typed against another firm's CUI. In the non-hold-out output (`seap_rules.out`), the r5 rows are circular: the index contains the pair under test.

**What the wrong-unique links are.** The table splits them by how the SEAP spelling relates to ANAF's name for the true CUI. True CUI in ONRC; each figure is a share of the 223,884 pairs.

| Rule | Short name (ANAF's name starts with, or contains all words of, the SEAP spelling) | Near variant (Jaro-Winkler ≥ 0.9: typo, spacing, other form) | Unlike (mostly a wrong CUI in SEAP, or a renamed firm) |
|---|---|---|---|
| r1 | 0.112% | 0.041% | 0.165% |
| r3 | 0.045% | 0.013% | 0.070% |
| r4 | 0.124% | 0.020% | 0.106% |
| r4b | 0.080% | 0.009% | 0.091% |

The first two columns are genuine false links. The usual case is a firm known by a shortened or brand name (`<X>` for `<X> CLINIC SRL`, `<X>` for `<X> DISTRIBUTION SA`) that is the exact full name of a different, often 1990s, firm in the same county. Branches with their own CUI (`<X> SA SUCURSALA <TOWN>`) cited under the parent's name fall here too. Most of the third column is a SEAP data-entry error: in a sample of about 25 checked by eye, the name pointed to the right firm and SEAP's CUI was wrong. **So the genuine false-link rate is roughly half the "unique wrong" column**: about 0.14% of pairs for r4 and 0.09% for r4b (*estimate*, from the heuristic split).

## 3. POCU 2014–2020 (SMIS naming, CUI in free text)

The 2,114 (name, CUI) pairs break down by what the CUI is:

| Kind | Pairs |
|---|---|
| Public body (CUI is a SEAP contracting authority) | 1,203 |
| Company (CUI in ONRC) | 462 |
| NGO / association (not in ONRC, name starts `ASOCIATIA`, `FUNDATIA`, …) | 389 |
| Other / unknown | 60 |

**ONRC covers only 22% of POCU beneficiaries.** Associations and foundations are registered in the NGO registry, not at ONRC. Public bodies are not in ONRC either. POCU's county is the **implementation** county, not the seat; it is given as one county for only 771 pairs, and partners have none.

| Subset | Rule | Unique correct | Unique wrong | Ambiguous | No match |
|---|---|---|---|---|---|
| Companies (462) | r1 name with form, all ONRC | 79.2% | 0 | 9.3% | 11.5% |
| Companies | r2 r1, not struck off | 77.1% | 0 | 5.8% | 17.1% |
| Companies | r1x name without form | 78.8% | 0 | 10.4% | 10.8% |
| Companies | r5 r1 + all SEAP supplier aliases | 78.8% | 0 | 11.0% | 10.2% |
| Companies, one county (83) | r3 r1 + county | 65.1% | 0 | 0 | 34.9% |
| Companies, one county | r4 name without form + county | 63.9% | 0 | 1.2% | 34.9% |
| Public bodies (1,203) | r6 SEAP authority names | 48.3% | 0.8% | 3.5% | 47.4% |
| Public bodies | r6c r6 + county | 21.4% | 0.1% | 0.2% | 78.2% |
| Public bodies, one county (571) | r6 | 50.8% | 1.1% | 3.5% | 44.7% |
| Public bodies, one county | r6c | 45.2% | 0.2% | 0.5% | 54.1% |
| NGOs (389) | r5 SEAP supplier aliases (only source that has them) | 14.9% | 0.8% | 0 | 84.3% |
| All 2,114 | r7 ONRC + supplier aliases + authority names | 48.0% | 1.0% | 5.6% | 45.3% |

- **Implementation county ≠ seat county:** on single-county companies, adding the county drops correct matches from 80% to 65%, so the implementation county disagrees with the seat for about one match in five.
- **No wrong link among 462 companies** puts the 95% upper bound near 0.65% (rule of three, *estimate*).
- **Public bodies** are matched less often because SMIS adds suffixes (`COMUNA X/PROIECTE`, `MUNICIPIUL X/DPFE`) and spells authorities differently from SEAP.
- **Total cost of step 3:** about 15 minutes. The download is one 1.6 MB XLSX.

## 4. Public bodies: contracting-authority name ambiguity

SEAP gives 17,303 authority CUIs and 17,649 distinct normalised spellings; ANAF supplies the county and locality, which it has for 17,286 of those CUIs.

| Key | Keys >1 CUI | CUIs sharing a key | Max CUIs per key |
|---|---|---|---|
| name | 2.35% | 5.92% | 19 |
| name + county | 0.30% | 0.64% | 5 |
| name + county + locality | 0.15% | 0.31% | 2 |

Generic institution names cause the ambiguity:
- name only: `SCOALA GIMNAZIALA NR <n>`, `LICEUL TEHNOLOGIC`, `CONSILIUL LOCAL`, `SERVICIUL PUBLIC …`, `GRADINITA …`;
- name + county: the commonest is `SCOALA GIMNAZIALA …` (14 keys), followed by research stations, public services and local councils.

Part of the residue is SEAP spelling one authority's name against another's CUI.

## Caveats

- **The ground truth is SEAP's own (name, CUI) pairing**, which contains entry errors. The "unique wrong" rates are upper bounds; the heuristic split above estimates the genuine part.
- **ANAF's seat county is cleaner than a Source's county text.** SMIS gives implementation counties and court records give the court's county, so county-keyed rules will cover less on those Sources than here (POCU: about one match in five lost).
- **Court parties and AEP suppliers were not measured directly.** There is no ground truth with CUIs locally. Court parties come with no reliable county, so the name-only rows (r1, r1x, r6) are the relevant ones for them.
- **Values are noisy:** the suspect-value filter is a rough stand-in, and single large suppliers swing the RON columns (r4 vs r4b "short name" RON differs by 3 bn because of one supplier). Prefer the count columns.
- **ONRC has current names only**, so an old name in a historic Source either misses or hits a later firm that took the name (part of the "unlike" column).
- **Struck-off status** comes from code 1084 only, has no dates, and is the current status. "Not struck off" rules therefore also drop firms that were live when the Source record was written.
- **Units:** the unit is a distinct (spelling, CUI) pair, so a supplier with many spellings counts many times. The RON columns weight by money instead.
- **Data hygiene:** no natural person's name appears here; examples are anonymised patterns. CNP-shaped ids were dropped on load and the intermediate extracts deleted.
