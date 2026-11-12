# Person-level data: legitimate interest, named only when tied to public money

Grivei.ai names a person only when they are tied to public money. That means one of three things: a role in an official register (administrator, legal representative, associate or shareholder) in an organisation that receives public money in the graph, an official acting in their role, or an individual who receives public money directly above the **Naming threshold**. The main legal basis is legitimate interest (GDPR art. 6(1)(f)), with a written balancing test kept on file. The journalistic derogation in Law 190/2018 art. 7 is claimed only as a second layer, for people tied to a public role or public facts, and never as the only ground. "Tied to public money" is the necessity argument. Grivei does not republish registers; it publishes only the part of them that touches public money. That is the answer to *Satakunnan Markkinapörssi v Finland*, where stopping the mass republication of lawful public records was upheld. Facts and precedents: [research](https://github.com/george-vrancianu/grivei.ai/issues/121); decision: [ticket](https://github.com/george-vrancianu/grivei.ai/issues/122). This is not legal advice. The posture binds at Go-live (ADR 0008).

## Considered Options

- **Name administrators of every company (all of ONRC)**: rejected. It is register republication, and *Satakunnan*'s mass-republication limit is aimed at exactly that. People with no link to public money stay in the Raw archive and are used only for matching.
- **Name private individuals generally, to catch money funnelled through relatives and friends**: rejected. Funnelling through a relative's company already shows up, because that relative holds a register role in a company receiving public money. What naming everyone would add is inferred kinship (shared surname, same locality), which is the false link that brings civil liability under Civil Code arts. 72 and 75. C-184/20 protects relatives' names even for officials.
- **Rely only on the art. 7 journalistic derogation**: rejected. It does not cover private individuals, and a database sits closer to *Satakunnan* than to journalism (*Satamedia*).

## Consequences

- **Before the Go-live of any person-level Source:**
  - a named legal entity is the controller (for example an asociație), with a published contact for data-protection requests;
  - a Romanian data-protection lawyer reviews this posture and the balancing test, and sets the Naming threshold;
  - a DPIA is written, even if Decision 174/2018 does not strictly require one.
- **Never named:** relatives as such; beneficial owners (WM and Sovim, C-37/20 and C-601/20); individual party donors, shown only as a count and total per party per year, while company donors are named by CUI; private individuals in court cases; SEAP contact persons. Court cases are shown only where every named party is an organisation; criminal cases only where the defendant is an organisation.
- **No inferred relationships:** no Signal rule infers family or friendship from names.
- **Findability:** a Named person's page can be searched in the explorer but is `noindex` for search engines.
- **Corrections:**
  - a public privacy notice (GDPR art. 14(5)(b));
  - a "this isn't me / this is wrong" path on every person page;
  - answers within one month;
  - a disputed link is hidden while it is checked (art. 18);
  - fixes go into ADR 0003's identity override file.
- **DPO:** none, as long as no art. 9 or art. 10 data is shown by name.
- **Retention:** a past register role stays visible, with its dates, while its time window overlaps a record in the graph (*Manni*). Otherwise it leaves the graph.
- **ADR 0003 changes for natural-person suppliers above the Naming threshold:** they are named and get an entity page. CNPs are still never stored or shown.
