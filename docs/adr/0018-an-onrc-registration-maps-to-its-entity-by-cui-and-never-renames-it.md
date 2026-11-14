# An ONRC registration maps to its entity by CUI, and never renames it

An ONRC registration belongs to the entity with the same CUI, and nothing else joins them: not the name, not the address. This is [ADR 0003](0003-supplier-identity-is-the-anaf-confirmed-cui.md)'s rule with a second Source that confirms a CUI. ONRC's open files list every registered organisation with its CUI, registration number, status and seat, and its administrators, legal representatives and IF members ([spec #173](https://github.com/george-vrancianu/grivei.ai/issues/173)). Release 2 makes ONRC explorable, so every registration needs an entity to hang off, including organisations that never appear in SEAP.

## Considered Options

- **Match registrations to entities by normalised name**: rejected for the reason ADR 0003 gives for SEAP: homonyms, branches with their own CUI, group companies and successors share names.
- **Only attach ONRC to entities ANAF confirms; drop the rest**: rejected. A registration ANAF doesn't know (a company ANAF's VAT endpoint doesn't list) would have no page, and ONRC would stop being searchable by CUI for exactly the organisations that are hardest to look up elsewhere.
- **ONRC's name as the display name**: rejected. ADR 0003's display name is ANAF's current name, one official spelling; ONRC's own spellings differ by file and snapshot.
- **Fold branches and successors into their parent by name or registration number**: rejected. That is a merge, and ADR 0003 allows none.

## Consequences

- **By CUI:** a registration whose CUI passes the check digit attaches to the entity keyed on that CUI. A registration with no valid CUI is not an entity: it stays searchable as an ONRC record, and the page says it has no CUI.
- **A CUI ANAF doesn't know but ONRC lists** becomes an entity keyed on the ONRC CUI. Its provenance is ONRC (`core.entity.provenance_source` and the contract's `Provenance.source` allow `ONRC` beside `ANAF` and `SEAP`), its display name is ONRC's current name with comma-below diacritics, and it carries an *ONRC only* badge ("ANAF does not know this CUI"). ONRC only replaces ANAF's "found" check: ADR 0003's exceptions all apply first and are unchanged (an identity override wins, a supplier CUI equal to the authority's own is unresolved, an id with more than 8 digits is never looked up, a 6-digit id that is person-shaped is an ID-card number, and a natural person is never an entity). Only a CUI that survives them is confirmed by ONRC. SEAP records that name such a CUI attach to the ONRC-keyed entity instead of becoming a name-only supplier. The reason: ONRC is an official register keyed on that CUI, and leaving them name-only would give one CUI two entities, an ONRC-keyed one and a name-only supplier, which breaks ADR 0003's one entity per CUI (ADR 0003 amended). ONRC's current name also beats the most frequent SEAP spelling as the display name when ANAF has no entry.
- **Names:** ONRC's legal name and earlier names become dated [aliases](../../GLOSSARY.md), never a reason to merge. Where ANAF knows the CUI, the display name stays ANAF's (ADR 0003 as amended). A name that differs from ANAF's under a confirmed CUI is shown, not re-keyed.
- **Branches and successors stay separate entities.** A branch with its own CUI, a company that merged or split, and a re-registered company are each their own entity. Parent and successor links come later as graph edges, never as merges.
- **Status and dates:** ONRC statuses are undated. The rebuild dates a status only by comparing consecutive held snapshots ("first seen in snapshot X", or "since at least X" for the earliest), and the page says so. ANAF's status (`RADIERE`, `FUZIUNE`) stays ANAF's and is badged as before.
- **Reach:** every registration is searchable and has an organisation page. Its people are shown only when the organisation is a SEAP counterparty in the graph (ADR 0015's public tier, and the limit on republishing a whole register, ADR 0009). People are still loaded, to match them.
- **People follow [ADR 0011](0011-person-identity-is-name-plus-birth-date.md):**
  - the person key is the normalised name plus the full birth date ONRC publishes;
  - the same key with birthplaces in different counties is a possible match, kept in a review queue and never served;
  - a role holder with no birth date is an unlinked role holder, named on that organisation's page only;
  - a PFA or II holder is shown only inside their CUI's entity and never linked, and an IF member links like an administrator;
  - the stable person id is a keyed hash with the secret held outside the repo, and only the birth year is served;
  - the person identity overrides (split, merge) carry a reason and a named human reviewer.
- **Never stored or served:** ONRC carries no CNP, and the Connector declares that none are stripped. Birthplace is kept for possible-match detection only and is never served. Beneficial owners and relatives are out of scope (ADR 0009).
- **Mayors and county council presidents** are never joined to an ONRC person, whatever the name matches (ADR 0011).
