# Public-tier names follow their source's publication window; the Raw archive may hold a derived copy

A person on the public tier (ADR 0015) is shown for as long as their source's own publication regime keeps their name public. After that, the name is Restricted. It is kept and shown only in a Private view, not deleted. For EU 2021–27 cohesion-fund beneficiaries this window is 2 years, because CPR art. 49(3) has the managing authority remove natural persons' names after 2 years. *Latvijas* (C-439/19) says a reuser should not publish more than the source lawfully may, and *Google Spain* says data can become excessive as time passes. For SEAP the window never ends, because award notices stay public under procurement law. To keep names out of a store that can't be edited, fund Connectors split natural persons' names into a **name sidecar** at fetch. The Raw archive keeps a derived copy with a token in place of each name. For the same reason, SEAP's archived files lose their CNPs. Facts: [research](https://github.com/george-vrancianu/grivei.ai/issues/152) ([findings](https://github.com/george-vrancianu/grivei.ai/blob/research/eu-retention/docs/research/eu-retention.md)); decision: [ticket](https://github.com/george-vrancianu/grivei.ai/issues/155). This is not legal advice.

## Considered Options

- **A: name forever on the public tier.** Rejected. It drops the period lever the EU legislature uses every time it names natural-person recipients (CAP, RRF, the Financial Regulation), and *Schecke* turned on exactly that kind of lever.
- **B: keep the archive unchanged and flip the name to Restricted at the window end.** Rejected. An erasure request, or a later decision to purge, would then mean rewriting archived files and every backup snapshot that holds them.
- **C: redact archived files in place later.** Rejected. It needs a redaction job for every file format, and redacting PDFs in place is fragile.
- **D with a purge at the window end** (what the research recommended). Rejected for now. Names past the window still serve Private views and Investigations. Whether they may be kept without an end date is parked for the Restricted-publishing decision (below), and the sidecar makes a purge cheap if that decision asks for one.
- **E: strip names at fetch, never name.** Rejected. ADR 0015 names natural-person SEAP suppliers on the Record, and fund recipients have the same shape: one official source names them, and they receive public money directly.

## Consequences

- **The tier rule:** while the Publication window is open, a public-tier person is named where ADR 0015 allows, for example a fund recipient on its operation's record only (no entity page, no person page, no total). After the window ends, the name is Restricted and the record shows "Persoană fizică" on the public host.
- **Windows:**
  - **EU 2021–27 lists (and Kohesio):** the window ends at the earlier of:
    - the source's first-publication date + 2 years (our first fetch + 2 years if the source gives no date);
    - the first fetch where the source no longer carries the name.
  - **PNRR natural-person rows (~870, mostly afforestation):** the same rule, borrowing the EU 2-year pattern, since no rule of its own applies. Names inside project titles are tokenised too.
  - **SEAP natural-person suppliers and 2014–20 PFA/II beneficiaries:** no window end, because their sources set none. The 2014–20 archive files are kept unchanged.
  - The window end is stored with each sidecar entry, so a rebuild reads the tier and computes nothing.
- **The name sidecar:**
  - holds token → name and the window end, dated per fetch;
  - lives outside the Raw archive, in its own restic repository with its own retention policy;
  - is a rebuild input, so "nothing lives only in the graph" still holds;
  - lets an erasure or objection request (GDPR arts. 17 and 21) be met by deleting one entry;
  - lets a purge, if one is ever decided, be done as a single job.
- **The keyed token** uses the same keyed-hash approach as ADR 0011's page ids, with the secret held outside the repo.
- **CNPs leave SEAP's Raw archive:**
  - at fetch, the SEAP Connector replaces a 13-digit CNP in the id column with a marker, which keeps the "it was a CNP" fact the load uses;
  - files already archived are rewritten once, with a manifest listing the file, the cells changed and the original file's hash;
  - restic snapshots from before the rewrite are expired afterwards;
  - names stay in SEAP's files, since the Record shows them.
- **2007–13 SMIS financing contracts:** `LEGAL_REPR`, `LEGAL_REPR_POS`, `ADDRESS`, `PHONE`, `FAX` and `EMAIL` are stripped at fetch and never held. Representatives come from ONRC, with birth dates (ADR 0011).
- **Every strip or tokenisation** is declared by its Connector and recorded with the original file's hash (ADR 0004 amendment).

## Open for the Restricted-publishing decision

These go to the lawyer review that ADR 0015 places before any Restricted content is published. None of them blocks a Release or Go-live.

1. Can names past their window be kept with no end date, for a Private view and Investigations only (*Digi*, C-77/21, storage limitation)?
2. Should natural-person SEAP supplier names have a time cap of their own (*Google Spain*, para. 93)?
3. How far does *Latvijas* para. 126 reach a non-commercial reuser of data the source published lawfully, but only for a limited time?
4. What national act lets MIPE publish PNRR natural-person names, and does it set a retention period?
5. Are 2014–20 PFA/II beneficiaries "natural persons" under Reg. 1303/2013 Annex XII ("no natural persons shall be named")?
6. How long can an evidence copy of names be kept under GDPR art. 17(3)(e) (Civil Code art. 2517's 3 years is the likely anchor, not checked)?
