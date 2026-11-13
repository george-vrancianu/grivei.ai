# Go-live needs only a privacy notice; person-level data beyond official roles, and Investigations, are Restricted

ADRs 0008–0011 made Go-live wait on a legal posture: a controller entity, a lawyer's review, a DPIA, and for Investigations the same reviews again. Those gates blocked planning, research and data seeding for content most of which doesn't need to be public at all. We split the content in two instead. **Public tier**: people as a single official source publishes them, in a role tied to public money. That means ONRC administrators, legal representatives and associates/shareholders of organisations in the graph; natural-person suppliers as SEAP names them; and parliamentarians and their party roles from cdep.ro. That data is public by law, and it is shown. **Restricted**: everything else that is person-level, and all Investigations. A single switch on the host hides Restricted content, and it is shown only in a **Private view**, on a local host or behind a login (specified later). Go-live then needs one thing: a privacy notice with a contact for corrections (GDPR art. 14). This is not legal advice.

## Considered Options

- **Keep the legal gates on Go-live** (ADRs 0008–0010 as written): rejected. They blocked seeding and research on data that may never be public, and they treated official-register roles like donors and court parties.
- **Hide all person-level data, including official roles**: rejected. Administrators, legal representatives and parliamentarians are published by law in their registers, and the public-money tie is the whole point of the explorer.
- **Hide Restricted content in the UI only**: rejected. The API would still serve it to anyone reading the JSON.
- **One switch per category** (people, Investigations): rejected for now. Nothing yet needs them apart.

## Consequences

- **What is Restricted:**
  - person links Grivei.ai builds across Sources (ADR 0011's confirmed links between, say, a deputy and an ONRC administrator), and everything shown through them, such as a Party role on a supplier page (ADR 0012);
  - Signals whose rule joins through people, including their counts, since a count alone shows that the join exists;
  - court parties and any other person-level Source content not on the public tier;
  - all of Investigations: public parts, Findings, the `/investigations` index, and Signal labels linking to an Investigation.
- **The switch:** one env var on the host, `GRIVEI_RESTRICTED`. Restricted content is shown only when it is set to `show`; unset or any other value hides it (fail closed).
- **Enforced in the API:** with the switch off, the API serves no Restricted fields, endpoints, search hits or counts. The explorer only reacts to what it gets.
- **Never on the open public host:** the switch is on only for a local host or behind a login. Until the login exists this is a rule, not a technical guard; the login spec adds the enforcement.
- **Go-live:** the explorer at grivei.ai with the switch off, plus a privacy notice and a correction contact. No other legal condition.
- **Publishing Restricted content to the anonymous public** is a later, separate decision. ADR 0009's remaining conditions are its bar: a controller entity, a lawyer's review and balancing test, a DPIA, the corrections path on person pages, `noindex` person pages, and, for Investigations, Right of reply and Editor sign-off.
- **Still binding everywhere, Private view included:** ADR 0009's "Never named" list (relatives as such, beneficial owners, individual party donors, private individuals in court cases, SEAP contact persons), no inferred family or friendship, and no CNPs stored or shown (ADR 0003). The switch limits who sees data, not whether Grivei.ai may hold it.
- **Natural-person suppliers:** the published name shows on the Record, in that winner slot only, with no threshold. There is no entity page, no person page and no total, because no key exists to merge on and names never merge (ADRs 0003, 0011). The Naming threshold is dropped.
- **Investigations in a Private view** show everything, drafts and Findings included. They may use person-level joins.
- **Data quality is not a legal gate:** ADR 0013's hand-check of about 200 links per Source stays, as a condition for serving that Source's confirmed links.
