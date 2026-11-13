# Person identity is name plus birth date from an official publication, never the name

Two person records are the same person only when their normalised name and full birth date match, and the birth date comes from an official publication (ONRC's representatives files; cdep.ro for deputies). Normalising ignores word order, case, hyphens and diacritics (cedilla and comma-below alike). This is ADR 0003's rule carried over to people: a published key confirms identity, and names never merge. Measured on ONRC joined to SEAP suppliers 2021–2026 ([measurement](https://github.com/george-vrancianu/grivei.ai/issues/123)), name + birth date gives at most 0.46% wrong merges, and a birthday-collision model expects about 0.02%. Name alone is wrong on 77% of links, and name + county on 25–34%. The policy binds at the Go-live of a person-level Source (ADR 0008), and only Named persons are linked and shown (ADR 0009). Decision: [ticket](https://github.com/george-vrancianu/grivei.ai/issues/124).

## Considered Options

- **Name + county, or name + institution or UAT**: rejected. These are wrong on a quarter to a third of links, and a wrong link to a named person carries civil liability (Civil Code arts. 72, 75).
- **Show possible matches as "possibly the same person as…"**: rejected. That note is a published link, and it can be false.
- **A persisted table of person ids**: rejected. That would be state outside the Raw archive (ADR 0004).
- **A plain hash of name + birth date as the page id**: rejected. Birth dates are a small space, so it can be reversed by brute force.

## Consequences

- **Confirmed links**, the only links ever shown or used, come from three places:
  - the person key (name + full birth date from an official publication);
  - a name given against a CUI, with no birth date, that matches exactly one current or past role holder of that CUI. No match or several matches (65 suppliers have same-name pairs) leave it as unattached text;
  - an identity override merge.
- **Never a link:** name alone, name + county, name + institution or UAT, or name + birthplace without a date.
- **Possible match:** a same name and birth date with birthplaces in different counties, or a partial name with the same birth date ("Ion Popescu" vs "Ion Vasile Popescu"). Both stay separate persons. A possible match is never public: it sits in a review queue, only an identity override settles it, and in an Investigation it appears at most as an Open question (ADR 0010).
- **Unlinked role holder:** a register role holder with no birth date (about 1% of Named roles) is named on that organisation's page, with no person page and no link to anyone.
- **PFA/II:** the PFA/II is an organisation keyed by its CUI. ONRC gives its holder no birth date, so the holder's name shows only as part of it and is never linked. IF members have birth dates and link like administrators.
- **Officials:** deputies (cdep.ro birth date) and SOE board members (ONRC) link by the person key. Mayors and county council presidents are shown by name on their authority's page from the SIRUTA Reference source and never linked to a person ([research](https://github.com/george-vrancianu/grivei.ai/issues/129)).
- **Display:**
  - a person page shows the name and birth year only, never the full birth date or the birthplace;
  - each role states its basis ("same name and birth date in ONRC", "only holder of this name at CUI X", "curated") and cites its source document.
- **Signals** join through people only by confirmed links. Possible matches and unlinked role holders never feed a Signal rule.
- **Identity override for persons:**
  - it can *split* a confirmed person in two, on a credible request or on evidence;
  - it can *merge* a possible match, but only on a cited document that shows both records are one person;
  - every entry has a reason and is reviewed by a named human, never an agent;
  - disputed links are hidden while they are checked (ADR 0009).
- **Stable ids:** a person page's id is a keyed hash of the person key, with the secret held outside the repo. It is deterministic across rebuilds and cannot be reversed. When the key changes (a split, a merge or a corrected birth date), the page gets a new id, and the override records the old one so it redirects.
- **Organisations named without a CUI** (EU-fund beneficiaries, court parties, subsidy suppliers) are not covered here; see ADR 0013.
