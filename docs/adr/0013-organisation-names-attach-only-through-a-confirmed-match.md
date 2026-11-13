# Organisations named without a CUI attach to one only through a confirmed match

Some Sources name organisations without a CUI: EU-fund beneficiaries, portal.just.ro court parties, AEP subsidy suppliers. Such a name attaches to a CUI only when a confirming key finds exactly one candidate. Otherwise it stays an *unattached name*: text on its record, with no entity page and no Signals. This applies ADR 0003's rule (a published key confirms identity, and names never merge) to Sources that publish no key, and it follows ADR 0011's pattern for people.

A key may confirm only if at most 0.5% of its unique matches go to the wrong CUI. Measured on 223,884 SEAP spellings with ANAF-confirmed CUIs, matched against ONRC's 04.11.2026 snapshot ([measurement](https://github.com/george-vrancianu/grivei.ai/blob/research/org-name-matching/docs/research/org-name-matching.md)):

| Key | Wrong | Status |
|---|---|---|
| name + seat county, legal form ignored | 0.25% | confirms |
| same, legal form compared | 0.13% | confirms |
| exact name with legal form, no county | 0.32% | confirms |
| name without legal form, no county | 0.54% | over the bar |
| public bodies by name alone | 0.8% | over the bar |

About half of the wrong matches are SEAP's own CUI typos. Decision: [ticket](https://github.com/george-vrancianu/grivei.ai/issues/136).

## Considered Options

- **A name-only entity per name, as ADR 0003 does for SEAP winners without a CUI**: rejected. Court strings vary too much (one body appeared under 525 spellings in a month), so this would build one page per spelling.
- **Show possible matches as "possibly the same organisation as…"**: rejected for the same reason as for people (ADR 0011). That note is a published link, and a wrong one is defamation-shaped for a firm too.
- **Name alone, with or without the legal form**: rejected. It is over the bar.
- **Re-key SEAP winners without a CUI onto ONRC by name**: rejected. CUIs already cover 99.78% of SEAP winner rows, and re-keying would reopen "names never merge Romanian suppliers" for little gain. SEAP keeps ADR 0003.

## Consequences

- **A CUI written in a Source's text** (POCU's `L: X CUI 20806019`, about 2% of court parties) is treated as a CUI column under ADR 0003. A published CUI that fails the check digit or that ANAF doesn't know can be repaired by the name rule below, and the published value is kept on the record.
- **Before matching:**
  - compound cells are split, so POCU's leader and partners and joint ventures become separate organisations, and a joint venture is never one entity;
  - embedded people ("prin reprezentant legal …", "prin lichidator …") are stripped and never stored.
- **Names shaped like a person's** (ADR 0003's test) never match an organisation. A PFA, II or IF matches only when the Source writes its legal form.
- **Firms, NGOs and other registered organisations** confirm only on a match that is unique across all ONRC registrations, struck-off ones included. A record can name a firm that was struck off later, and ONRC's statuses are undated. Two keys can confirm:
  - **name + seat county**, with the legal form compared when the Source gives it;
  - **exact name with legal form**, used only when the Source gives no seat county. A project location, a court's county or a party branch's county counts as no county.
- **SEAP spellings** already attached to an ANAF-confirmed CUI form a second name list, under the same keys and the same uniqueness test:
  - a spelling attached to two CUIs is ambiguous;
  - if the SEAP spelling and ONRC point to different CUIs, the match is ambiguous.

  This list is the route to firms under their old names, and one of two routes to NGOs (see the amendment below).
- **Public bodies** confirm only on name + county against SEAP contracting authorities and the MF list of public entities, plus the locality when the Source gives it. Name alone never confirms them, because generic names like "Școala Gimnazială nr. 1" repeat across the country.
- **Foreign organisations** stay unattached, unless the Source gives a foreign VAT id. With a VAT id they join a name-only supplier by that id (ADR 0003).
- **Possible matches** (several candidates, or a unique match without a confirming key) are never public. Only an identity override settles one, with a reason, reviewed by a named human.
- **Signals:** a confirmed name match counts as a confirmed link, the same as a CUI given by the Source. Unattached names and possible matches never feed a Signal.
- **Display:**
  - each link states its basis ("CUI given by source", "CUI in text", "same name and county in ONRC", "same name as a SEAP supplier", "curated") and cites the source document;
  - a link with any basis other than a CUI carries a "matched by name" marker.
- **Rebuildable:** matching is a pure function of the Raw archive (ONRC snapshots, ANAF answers, SEAP) and the override file (ADR 0004). No match table is persisted. A record is matched against the ONRC snapshot nearest its own date, falling back to the current one.
- **Checked per Source:** the bar was measured on SEAP spellings, and other Sources are messier. Before a Source's Go-live, its Connector has a sample of about 200 confirmed links checked by hand. Any key that fails the bar on that Source is switched off for it, and the result is recorded in that Source's Release spec.

## Amended 2026-11-13: MF's taxpayer list is a name list for organisations outside ONRC

NGOs, homeowner associations and other legal persons that ONRC doesn't register now have a third name list: MF's "Date de identificare plătitori" (data.gov.ro, CC BY 4.0, yearly, with CUI, name and county). It becomes a Reference source. Ministerul Justiției's NGO register is dropped: it has no CUI, no people, and has published nothing since July 2026. Measured on SEAP's 3,004 NGO suppliers with known CUIs, exact name is 0.30% wrong and name + seat county 0.33% wrong, both under the bar. It attaches 236 of 319 unattached NGO names in the 2014–20 EU-fund lists, against 117 through SEAP spellings, and the two routes never disagree ([research](https://github.com/george-vrancianu/grivei.ai/blob/research/ngo-register/docs/research/ngo-register.md)). Decision: [ticket](https://github.com/george-vrancianu/grivei.ai/issues/157).

- **Who it serves:** organisations outside ONRC only. Firms still confirm against ONRC, where the bar was measured.
- **Keys and uniqueness:** the same two keys as ONRC (name + seat county; exact name with legal form when no county is given), unique across the whole list. Homeowner associations stay in the list as candidates, so they count against uniqueness.
- **Agreement:** if the MF list, ONRC or a SEAP spelling point to different CUIs, the match is ambiguous.
- **Snapshots:** a record is matched against the yearly snapshot nearest its date, falling back to the current one.
- **Struck-off NGOs** are mostly missing from the list. A name it doesn't find stays an unattached name, and each Source's data caveats state the gap.
- **Release:** it joins with the first Release that needs it, EU funds in the planned order. PNRR already gives CUIs.

## Amended 2026-11-13: the hand-check gates serving links, not Go-live

[ADR 0015](0015-go-live-needs-only-a-privacy-notice-restricted-data-sits-behind-a-toggle.md) removes the per-Source checks from Go-live. The hand-check of about 200 confirmed links stays as a data-quality condition: a Source's confirmed name links are served only after it.
