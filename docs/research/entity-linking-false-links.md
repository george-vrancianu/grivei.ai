# Name-matching false-link rates on ONRC (prototype)

Prototype for [#123](https://github.com/george-vrancianu/grivei.ai/issues/123) on the map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). It measures how often name-based matching links the wrong person, to inform the entity-linking policy ([#124](https://github.com/george-vrancianu/grivei.ai/issues/124)). This branch is throwaway and is never merged. The scripts are in `entity-linking-false-links/`.

## Method

- **Data:** the ONRC snapshot of 04.11.2026 (`OD_REPREZENTANTI_LEGALI`, `OD_REPREZENTANTI_IF`, `OD_FIRME`) and the SEAP supplier CUIs from the 2021Q1–2026Q3 bulk files (contracts, DA, DAN, award notices). CNP-shaped supplier keys are dropped on load and never stored.
- **Normalisation:** names and places are upper-cased, diacritics are folded, and punctuation is dropped. Firms acting as representatives (`IPURL`, `SPRL`, `SRL` and similar) are removed. Birth counties are canonicalised (`JUD DOLJ` → `DOLJ`; two-letter codes are mapped for the conflict check).
- **Named population** (ADR 0009, register roles in organisations receiving public money): natural persons holding any ONRC role in a SEAP supplier. That is **164,496 persons** (distinct name + birth date) across 153,448 registrations.
- **Ground-truth proxy:** a person is a distinct (name, birth date). The proxy is checked separately below. Each rule is scored on two measures:
  - the share of Named persons whose cluster under the rule also contains another person;
  - the share of links from a Named person's role to another role that join two different persons.
- **Scope:** AEP individual donors and private court parties are **not measured**. ADR 0009 never names them, so they get no person page and need no link. A Signal that linked donors to administrators would reveal a donation by a Named person, which needs ADR 0009 to be reopened first. Their data has no birth date, so it would fall under the name-only and name + county rows below. Officials in role have no Source yet.

## Results (measured)

| Rule | Named persons merged with someone else | Links from a Named role that hit a different person |
|---|---|---|
| Exact name | 29.5% (median 4 others, p99 75) | 77.4% of 1.40 M |
| Name, word order ignored | 32.6% | n/a |
| Name + birth county | 11.0% | 24.6% of 359 k |
| Name + company seat county | 13.2% | 34.2% of 349 k |
| Name + birth date | 0 by construction; at most 0.46%, see below | n/a |
| Name inside one registration (name + CUI) | 5,808 registrations nationally (65 suppliers) hold two people with the same name and different birth dates | n/a |

### How far (name, birth date) can be trusted

- **Birthplace check:**
  - 85,066 persons nationally, 11,149 of them Named (6.8%), carry more than one birth locality.
  - Nearly all of these are spelling noise: `TG MURES`/`TARGU MURES`, a county suffix (`MEDIAS SIBIU`), village vs commune, German or Hungarian place names.
  - **Hard conflicts** are localities that don't look alike (Jaro-Winkler < 0.8, no shared first token) *and* lie in different birth counties. There are **754 Named persons (0.46%)**, and that is the upper bound on wrong merges by (name, birth date).
- **Birthday model:**
  - Same-name people share a birth date by chance in about 203 pairs nationally, roughly 0.02% of persons. The model takes about 25k plausible dates; the commonest name has 419 distinct people.
  - Most hard conflicts are therefore data-entry errors, not namesakes. The data cannot tell which is which.

### Missed links

- 10,433 persons (0.43%) are written in more than one word order. Ignoring word order fixes this.
- 1,927 Named roles (1.0%) have no birth date and cannot be linked by any rule that uses it.

### Natural-person suppliers (PFA / II / IF)

- ONRC lists **IF** members with a birth date (all 573 SEAP IF suppliers), so they link like administrators.
- **PFA and II holders are not in the representatives files** (0 of 14,751 SEAP PFA/II suppliers). The only key is the name in the firm name, after stripping initials such as `CT.`.
- Matching the 15,324 SEAP PFA/II/IF suppliers to administrators by name gives these results:

| Rule | No namesake | Exactly one | Ambiguous (2+) | Share of their SEAP value that is ambiguous |
|---|---|---|---|---|
| Name only | 48.9% | 27.0% | 24.0% (p99: 76 candidates) | 43.6% |
| Name + county (seat vs birth or company county) | 60.9% | 30.2% | 9.0% | 9.0% |

"Exactly one" is not a confirmation: name + county joins different people on 25–34% of links (table above).

## What this suggests for the entity-linking policy

These are inputs only; the decision belongs to the entity-linking policy ticket.

1. **Confirmed link:** same normalised name (word order ignored) and the same full birth date from a register.
2. **Possible match, not merged:** same name and birth date, but birthplaces in different counties (at most 0.46% of Named persons).
3. **Never a link, not even a possible match:** name alone (77% wrong) or name + county (25–34% wrong).
4. **Name against a CUI** (another Source names a person for a company): attach it to that company's role holder only when exactly one role holder there has that name. Namesakes in the same company exist (5,808 registrations).
5. **PFA/II holders** keep their own entity page and are not joined to administrator pages by name.
