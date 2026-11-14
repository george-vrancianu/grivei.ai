# Supplier identity is the ANAF-confirmed CUI, never the name

A SEAP supplier is one entity per CUI, and a CUI counts only when it passes the Romanian check digit and ANAF finds it. Names never merge Romanian suppliers. Over 2021–2026 the normalised CUI covers 99.78% of winner rows, while 533 distinct names belong to several CUIs: homonyms, branches with their own CUI, group companies and successors ([research](https://github.com/george-vrancianu/grivei.ai/issues/21), [decision](https://github.com/george-vrancianu/grivei.ai/issues/22)). The display name is ANAF's current name, with only the cedilla diacritics fixed to comma-below. SEAP spellings are kept as dated aliases.

## Considered Options

- **Merge by normalised name when no CUI is present** (what `upsert_entity` did): rejected for Romanian suppliers because it merges homonyms like `DRUM CONSTRUCT SRL` in Sălaj and Galați.
- **Check digit alone**: rejected because 128 foreign 9–10 digit numbers pass it. ANAF is already queried for every CUI to place it on the map, so confirming the CUI costs nothing extra.
- **Most frequent SEAP spelling as display name**: rejected because spellings vary per file (doubled legal forms in DAN), while ANAF gives one official name.

## Consequences

- A CUI ANAF doesn't know is an *unresolved CUI*. The supplier then becomes a **name-only supplier**, keyed on a parsed foreign VAT id, otherwise on the normalised name. That holds about 13% of RON in a few foreign and consortium mega-contracts, and the entity page says it is identified by name only.
- A supplier CUI equal to the record's own contracting authority's CUI (186 rows, 1.27 bn RON) is treated as unresolved (a name-only supplier, or a natural-person supplier when the name is a person's), and the record gets a *CUI mismatch* badge.
- A SEAP name unlike ANAF's under a confirmed CUI stays attached by CUI, with a *name differs from ANAF* badge. It is never re-keyed, because most such differences are renames (`RCS & RDS` → `DIGI ROMANIA`).
- 13-digit CNPs are never stored or shown. The supplier is a natural-person supplier, "Persoană fizică", with no entity page. The record still counts on the authority side.
- An individual published *without* a CNP in the id column (blank, an ID card number or series, a CNP truncated to 12 digits) is a natural-person supplier too, never a name-only supplier: a truncated CNP unless the name has a legal form or organisation word (a PFA still counts); otherwise a winner with no CUI ANAF knows and no VAT id whose name is shaped like a person's (two to five alphabetic words, no legal form or organisation word). A CUI-shaped id counts as unusable when it is the authority's own or has more than 8 digits (ANAF is never asked), and a 6-digit id ANAF knows under a different name is an ID card number when the name is person-shaped. A misclassified company is pinned by an identity override, which is checked first.
- Branches, group companies and merged companies stay separate entities. ANAF status (`RADIERE`, `FUZIUNE`) is badged. Parent/subsidiary and successor links come later as graph edges between entities, never as merges.
- A reviewed **identity override** file, versioned in the repo with a reason per entry, can attach a record's supplier to an identity. It is meant for the top no-CUI mega-contracts and obvious wrong CUIs. It never splits a joint venture. This is the only hand curation of identity. Values are never hand-curated (see [Data caveats](https://github.com/george-vrancianu/grivei.ai/issues/23)).
- `norm_cui` must stop turning foreign ids into digit strings, and the name fallback in `upsert_entity` goes.

## Amended 2026-11-12: contracting authorities take ANAF's name too

The display-name rule applies to every entity in either role, not only to suppliers. A contracting authority shows ANAF's current name with comma-below diacritics, or its most frequent SEAP spelling when ANAF has no entry. Its SEAP spellings are listed under "Appears in SEAP as".

## Amended 2026-11-12: natural-person suppliers above the Naming threshold are named

ADR 0009: a natural-person supplier whose public money reaches the Naming threshold becomes a Named person, with a name and an entity page, once that posture's Go-live conditions are met. Below the threshold nothing changes. CNPs are still never stored or shown.

## Amended 2026-11-12: natural-person supplier names are stored, not served

The load now keeps a natural-person supplier's published name, linked to its Record and winner slot, in a table of its own (`withheld.natural_person_name`). Nothing serves it: not the API, not `seap.record.winners`, not `seap.search` or its full-text index. It is also never an entity. A name is shown only once the person's public money reaches the Naming threshold and ADR 0009's Go-live conditions are met; turning that on is a later, separate change. CNPs are still never stored, nor any id that holds one: digit runs are removed from the name, and only whether the published id was a CNP is kept. The database, and so its dumps and backups, now holds natural persons' names.

## Amended 2026-11-13: people follow the same rule

ADR 0011 carries this rule over to people. A person is confirmed only by name plus a full birth date from an official publication, never by name. The identity override file also holds person splits and merges.

## Amended 2026-11-13: natural-person supplier names show on the Record, with no threshold

[ADR 0015](0015-go-live-needs-only-a-privacy-notice-restricted-data-sits-behind-a-toggle.md) drops the Naming threshold. A natural-person supplier's published name shows on the Record, in that winner slot, and in that Source's search, each record separately. It never gets an entity page or a person page, and records are never merged by name into a total. The two amendments of 2026-11-12 above are superseded on this point; `withheld.natural_person_name` becomes served data once the code follows (separate ticket). CNPs are still never stored or shown.

## Amended 2026-11-14: ONRC also confirms a CUI

[ADR 0018](0018-an-onrc-registration-maps-to-its-entity-by-cui-and-never-renames-it.md) adds ONRC beside ANAF: a CUI that ANAF doesn't know but ONRC lists becomes an entity keyed on that CUI, with an *ONRC only* badge, instead of a name-only supplier. The display name is still ANAF's wherever ANAF knows the CUI. ADR 0003's exceptions (override first, CUI mismatch, more than 8 digits, the 6-digit ID-card rule, natural-person classification) still apply before ONRC confirms, with ONRC counting wherever they say ANAF: a 6-digit id that ANAF or ONRC lists under a different name is an ID-card number when the winner's name is person-shaped, and a person-shaped winner with no CUI that ANAF or ONRC knows is a natural-person supplier. So ONRC only replaces ANAF's "found" check. Where only ONRC knows the CUI, ONRC's current name is the display name, ahead of the most frequent SEAP spelling.
