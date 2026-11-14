# Party attaches to authorities through elected leaders' mandates, never to suppliers

To let search filter public money by Party, a Party is attached to a contracting authority through the mandate of its elected leader. The authority must be a town hall, a Bucharest sector, Bucharest's general city hall or a county council, and the Party is the list the mayor or county council president ran on at that election. Records inherit the Party through their authority and award date. A supplier never has a Party. It can carry dated facts instead: a firm donation, or a Party role held by one of its Named persons. Party is what the data supports: AEP's 2020 and 2024 final minutes give the list each leader was elected on, by SIRUTA or county. Party switches are recorded nowhere, though 454 of 2,448 re-elected mayors changed party family between 2020 and 2024. No Source describes central government's party with dates and a basis ([research](https://github.com/george-vrancianu/grivei.ai/issues/131)). Decision: [ticket](https://github.com/george-vrancianu/grivei.ai/issues/132).

## Considered Options

- **Current party, tracking switches**: rejected. There is no register and no switch dates, so any current party would be a guess.
- **County council majority instead of the president's party**: rejected. Councillors are unnamed and county coalitions are undocumented.
- **Central government through cabinet parties**: rejected for now. A third of ministers have several undated party statements, secretaries of state have none, five of six cabinets since 2021 are coalitions, and no table says which ministry oversees each agency or state company.
- **Local subordinate bodies (schools, local utilities) through their UAT**: deferred. That would need a tutelage table nobody keeps.
- **Party on suppliers, through donations or party-tied administrators**: rejected. A donation or a person's Party role is a fact about that donation or that person, not the company's politics. Cross-matches belong in candidate Signal rules, not in the filter.
- **Party family grouping (ALDE counted as PNL after the merger)**: rejected. The registered list is the sourced fact, and grouping would be our editorial claim.

## Consequences

- **Coverage:** Party covers about 30.5% of awarded value, the share awarded by town halls and county councils. Wherever the filter is used, it states that coverage, so a filtered total never reads as a party's whole spending.
- **Unattributed records:** records with no clear elected leader get no Party and are never assigned to the nearest leader. These are records in the 2024 handover window (27 September 2024 to the oath deadline, since there are no per-UAT oath dates), records under interim leaders after a vacancy until the partial-election winner's oath, and records in mandates we have no results for. They are counted in the coverage note.
- **Independents and alliances:**
  - An independent leader gets "Independent", which can't be selected as a party.
  - An alliance list keeps its registered name, with its member parties recorded, so a member party's filter can include the alliance, labelled as such.
  - Parties that later merged keep the name they ran under.
- **Authority page:** a Leadership list shows each mandate. Each entry has the leader's name, the list, the mandate dates and the basis (AEP final minutes, election date). It notes that the party is as registered at the election and that the leader may have switched since, and it shows gaps as gaps. Leaders are Named persons, and without a birth date they are unlinked role holders (ADR 0011).
- **Supplier page:**
  - A firm donation shows as a dated fact.
  - A Party role shows only on a link confirmed under ADR 0011, which in practice means parliamentarians (cdep.ro birth dates) matched to ONRC administrators. Party roles are what the person made public as a candidate or office holder (GDPR art. 9(2)(e)), never claimed membership.
- **Candidate Signal rules:** "a donor to Party X, or a supplier whose Named person holds a Party role in X, wins from an authority whose mandate is X" stays a candidate Signal rule for the Release-order decision, on confirmed links only.

## Amended 2026-11-13: Party roles on supplier pages are Restricted

A Party role on a supplier page rests on an ADR 0011 link across Sources, which [ADR 0015](0015-go-live-needs-only-a-privacy-notice-restricted-data-sits-behind-a-toggle.md) makes Restricted. It shows only in a Private view, as does the candidate Signal rule above. Elected leaders on an authority's Leadership list stay public: they come from one official source (AEP).

## Amended 2026-11-13: Party reaches subordinate bodies through their principal credit holder

The tutelage table this ADR deferred for lack of a source exists: MF's Lista entităților publice, already a Reference source, gives each public body the CUI of its principal credit holder, and under Legea 273/2006 art. 21(2) a local budget's principal credit holder is the mayor or county council president. A **Subordinate body**, whose principal credit holder set is exactly one town hall, Bucharest sector, Bucharest city hall or county council, inherits that authority's Party for the same mandate dates. This covers county and municipal hospitals, social services, roads, utilities and culture: 1,625 bodies and 4.7% of SEAP value, which lifts Party coverage from 26.6% to 31.3%. The data error is well under 1% of attributed value ([research](https://github.com/george-vrancianu/grivei.ai/issues/153)). Decision: [ticket](https://github.com/george-vrancianu/grivei.ai/issues/156).

- **Dual-funded bodies are out:** any body with a ministry or another non-elected principal in its set (almost all schools, 1.0% of value) gets no Party. A separate, labelled school toggle was rejected: one point of coverage doesn't justify a second Party concept, and "the mayor's party's school" overstates a budget shared with the education ministry.
- **Municipal companies and ADIs stay out:** there is no open owner table, and many have several owners (water operators through an ADI), so no single leader stands for them (about 5.6–7.1% of value). The coverage note counts them as unattributed.
- **Current tie, checked against history:** MF publishes snapshots from 2017, 2018 and 2026 only. The latest tie applies across the whole window, unless a held snapshot gives a different elected-leader principal for that CUI. Those bodies (8 of 6,687 since 2018) get no Party. The MF list is archived monthly from now on, so later awards use the snapshot in force at the award date.
- **Display:**
  - the Party filter includes subordinate bodies by default, with no "direct only" switch;
  - its coverage note splits the elected leader's own authority from subordinate bodies;
  - the authority page states the basis: "Party via <authority>, its principal credit holder (MF Lista entităților publice, snapshot <date>); a funding relation, and the tie is current, not historical."
- **Candidate Signal rules** treat a derived Party like a direct one, and state the derived basis. A firm-donor rule joins through a donation, not through people, so it isn't Restricted under ADR 0015.
