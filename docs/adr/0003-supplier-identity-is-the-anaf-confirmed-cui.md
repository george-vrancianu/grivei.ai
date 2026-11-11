# Supplier identity is the ANAF-confirmed CUI, never the name

A SEAP supplier is one entity per CUI, and a CUI counts only when it passes the Romanian check digit and ANAF finds it. Names never merge Romanian suppliers. Over 2021–2026 the normalised CUI covers 99.78% of winner rows, while 533 distinct names belong to several CUIs: homonyms, branches with their own CUI, group companies and successors ([research](https://github.com/george-vrancianu/grivei.ai/issues/21), [decision](https://github.com/george-vrancianu/grivei.ai/issues/22)). The display name is ANAF's current name, with only the cedilla diacritics fixed to comma-below. SEAP spellings are kept as dated aliases.

## Considered Options

- **Merge by normalised name when no CUI is present** (what `upsert_entity` did): rejected for Romanian suppliers because it merges homonyms like `DRUM CONSTRUCT SRL` in Sălaj and Galați.
- **Check digit alone**: rejected because 128 foreign 9–10 digit numbers pass it. ANAF is already queried for every CUI to place it on the map, so confirming the CUI costs nothing extra.
- **Most frequent SEAP spelling as display name**: rejected because spellings vary per file (doubled legal forms in DAN), while ANAF gives one official name.

## Consequences

- A CUI ANAF doesn't know is an *unresolved CUI*. The supplier then becomes a **name-only supplier**, keyed on a parsed foreign VAT id, otherwise on the normalised name. That holds about 13% of RON in a few foreign and consortium mega-contracts, and the entity page says it is identified by name only.
- A supplier CUI equal to the record's own contracting authority's CUI (186 rows, 1.27 bn RON) is treated as unresolved, and the record gets a *CUI mismatch* badge.
- A SEAP name unlike ANAF's under a confirmed CUI stays attached by CUI, with a *name differs from ANAF* badge. It is never re-keyed, because most such differences are renames (`RCS & RDS` → `DIGI ROMANIA`).
- 13-digit CNPs are never stored or shown. The supplier is a natural-person supplier, "Persoană fizică", with no entity page. The record still counts on the authority side.
- Branches, group companies and merged companies stay separate entities. ANAF status (`RADIERE`, `FUZIUNE`) is badged. Parent/subsidiary and successor links come later as graph edges between entities, never as merges.
- A reviewed **identity override** file, versioned in the repo with a reason per entry, can attach a record's supplier to an identity. It is meant for the top no-CUI mega-contracts and obvious wrong CUIs. It never splits a joint venture. This is the only hand curation of identity. Values are never hand-curated (see [Data caveats](https://github.com/george-vrancianu/grivei.ai/issues/23)).
- `norm_cui` must stop turning foreign ids into digit strings, and the name fallback in `upsert_entity` goes.
