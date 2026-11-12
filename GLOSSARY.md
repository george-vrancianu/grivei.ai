# Grivei.ai

A public-money watchdog: Romanian public sources joined into one graph of institutions, companies and people, where every link points to the source document it came from.

## Language

### Sources and ingestion

**Source**:
A public registry Grivei.ai draws data from (SEAP, ONRC, Ministerul Finanțelor, portal.just.ro, ANAF).
_Avoid_: directory, public directory, database

**Reference source**:
A Source used only to enrich the graph (placing entities, confirming identity, counting what coverage is measured against), never explorable on its own, such as ANAF or the Ministerul Finanțelor list of public entities; it joins through the first Release that needs it, never as a Release of its own.
_Avoid_: lookup, enrichment source, auxiliary source

**Connector**:
The harvester and loader that bring one Source's documents into the graph.
_Avoid_: scraper, integration

**Release**:
An increment of the explorer that makes one more Source explorable, with its own search surface on the shared graph, chosen beside the search bar one Source at a time; a Reference source is never a Release. Whether it is public is a separate matter (see Go-live).
_Avoid_: version, phase

**Go-live**:
The moment the explorer becomes public at grivei.ai, with its legal posture settled and a public host; Releases before it run locally.
_Avoid_: launch, release (when going public is meant)

**Raw archive**:
Every file a Connector fetched, kept unchanged and dated; the graph is always rebuildable from it, and nothing lives only in the graph.
_Avoid_: cache, dump, backup

**Switchover**:
Replacing the served graph with a freshly rebuilt one: the rebuild is built into a database beside the live one, must pass its checks, and is then swapped in by renaming, so the API keeps reading the old graph until a moment-long swap. The old graph is kept as the fallback until the next switchover or an explicit cleanup, and a rollback swaps it back.
_Avoid_: migration, cutover (for a rebuild that locks the live database)

**Data-through date**:
The date up to which one Source's records of one kind are complete in the graph.
_Avoid_: last updated, freshness

### Graph

**Contracting authority**:
A public institution that buys through SEAP; it pays, a supplier receives.
_Avoid_: buyer, institution (when the paying role is meant)

**UAT**:
An administrative-territorial unit (commune, town or municipality, or a Bucharest sector), keyed by its SIRUTA code and drawn from ANCPI's polygons; the finest place the map puts a contracting authority. The village ANAF names is stored, not plotted.
_Avoid_: locality, village (for the plotted unit)

**National authority**:
A contracting authority whose remit is the whole country (ministry, national agency, national company); it sits beside the county map, not inside Bucharest.
_Avoid_: central authority

**Supplier**:
A company, foreign firm or institution that wins a SEAP record; it receives, a contracting authority pays. One supplier is one CUI that ANAF knows; an entity that both buys and sells is one entity in both roles.
_Avoid_: vendor, contractor, winner, company (when the receiving role is meant)

**Name-only supplier**:
A supplier with no CUI that ANAF knows (mostly foreign firms and consortia), identified by its foreign VAT id or else by its published name; its page says so.
_Avoid_: unknown supplier, unidentified supplier

**Natural-person supplier**:
An individual who wins a record, with or without a CNP in the published id (an id-less winner whose name is shaped like a person's counts too); shown only as "Persoană fizică", with no entity page, unless the public money they receive reaches the Naming threshold, which makes them a Named person.
_Avoid_: PFA (when any individual is meant), person (alone)

**Alias**:
A spelling under which an entity was published in a Source, kept with its dates; shown on the entity page, never used to merge entities.
_Avoid_: variant, AKA, old name

**Identity override**:
A reviewed, reasoned correction to which supplier a record is attached, or to which records are one person (a split, or a merge on a cited document); the page shows it as curated. It never splits a joint venture into its members.
_Avoid_: manual merge, fix, mapping

**Record**:
One SEAP document entry in the graph (a direct purchase, a contract with its lots and winners, or an award notice), with its own page and source link. A contract's awarded value is counted once, however many lots or winners it has. A search matches records; what it shows are results.
_Avoid_: transaction, entry, hit

**Awarded value**:
The value a record was awarded at, in RON, as published; the only money measure the explorer sums. It is not what was paid, and later contract modifications are not included.
_Avoid_: spent, spending, paid, payments

**Framework ceiling**:
The maximum value of a framework agreement; shown on its record but never summed, because the subsequent contracts awarded under it are counted instead.
_Avoid_: framework value, contract value (for a framework agreement)

**Subsequent contract**:
A contract awarded under a framework agreement ("Cu acord cadru subsecvent"). It is summed, and it shows the framework it belongs to: the one that shares its award notice number, with the ceiling and how much of it the subsequent contracts reported so far use. One whose framework is not in the data still counts, and shows no ceiling.
_Avoid_: call-off, draw-down

**Consortium share**:
A supplier's equal share of an award won jointly by several suppliers; a convention for every per-supplier figure (supplier totals, the supplier side of the map, an authority's counterparties), not a fact from the source. The authority's own total counts the award once.
_Avoid_: split, portion

**Suspect value**:
An awarded value flagged by a published rule as likely a data-entry error (a direct purchase at ten times its cap or more, a contract of 1 bn RON or more at a hundred times its estimated value or more, or above 50 bn RON with no estimate); the record stays shown and searchable but is left out of sums. The source value is never edited. A blank or zero value is not suspect: it is "no value in SEAP", counted as a record and adding nothing.
_Avoid_: outlier, error, corrected value

**Signal**:
A set of one or more records matched by a published rule, worth verifying in the source documents; never a conclusion or an accusation. It belongs to its records, and through them shows on every entity page they touch; Signals are counted, never scored.
_Avoid_: finding, red flag, evidence, risk score

**Signal rule**:
One published rule that produces Signals (for example, possible splitting of direct purchases); each has its own section on the methodology page with its time window and how often it fires nationally.
_Avoid_: Signal type, check, test

**Named person**:
A person Grivei.ai shows by name: someone with a role in an official register (administrator, legal representative, associate or shareholder) in an organisation that receives public money in the graph, an official acting in their role, or an individual whose own public money reaches the Naming threshold. Everyone else in a Source stays unnamed.
_Avoid_: PEP, subject, person of interest

**Person key**:
A normalised name plus a full birth date taken from an official publication (ONRC, cdep.ro); two person records are the same person only when their person keys match. A name alone, or a name with a county, is never a person key.
_Avoid_: person id, fingerprint

**Possible match**:
Two person records that might be one person (same name and birth date with birthplaces in different counties, or a partial name with the same birth date); never shown publicly, and only an identity override merges them.
_Avoid_: likely match, probable link, namesake

**Unlinked role holder**:
A Named person with a register role but no birth date; named on that organisation's page only, with no person page and no link to anyone.
_Avoid_: unknown person, anonymous administrator

**Naming threshold**:
The total public money an individual must receive directly (as a natural-person supplier or a fund recipient) before they are named.
_Avoid_: cutoff, limit

### Explorer

**Lens**:
One way the explorer's map of Romania encodes data; the map shows one lens at a time.
_Avoid_: mode, layer, view

**Money lens**:
The default lens: awarded value by county, either where it is awarded (contracting authority) or where it goes (supplier). Zoomed into a county, it colours each UAT the same way.

**Coverage lens**:
The lens showing, per county and per Source, whether the harvest is complete enough to trust the Money lens there; it colours each county by coverage status, never by how much an authority buys. Grey means not harvested, never no spending.

**Coverage status**:
One of harvested, harvested with known gaps, partial, or not harvested, for one Source in one county.
_Avoid_: coverage %, completeness score

**Known gap**:
A period and record kind for which a Source's records are missing or possibly incomplete, either flagged by a published rule or entered by hand with a written reason; shown on the Coverage lens and its page.
_Avoid_: missing data, hole, outage

**Coverage cell state**:
The state of one Source's records for one quarter and one record kind: loaded, possibly incomplete (the published rule), known gap (entered by hand), not in source, crawled provisional, or not yet loaded. "Known gap" as a cell state means the hand-entered kind only.
_Avoid_: cell status, quarter status

**Not yet loaded**:
A Coverage grid cell whose bulk file is not in the graph yet: not published (the current quarter), or set aside; the reader is never told which. Records that exist for it (crawled, backfilled) are still counted.

**Unplaced authority**:
A contracting authority that neither ANAF nor SEAP places in a county; it sits in its own tile beside the map, with its records and their value. An authority whose county is known but whose UAT isn't is not an unplaced authority; the zoomed county lists it in a row of its own.
_Avoid_: unknown county, orphan

**Flow lens**:
The lens on an entity page's Relationships tab showing where across Romania its money comes from (supplier) or goes (contracting authority).

**Entity page**:
The page, with its own URL, for one entity in one role, as contracting authority or as supplier; an entity with both roles has two, linked to each other, and their numbers are never added together. Each has three tabs over the same data, Overview (the default), Records and Relationships.
_Avoid_: profile, drawer, detail view

**Overview tab**:
The entity page's summary card: headline numbers, Signals, top counterparties, procedure types, consortia, largest records.

**Records tab**:
The entity page's filterable table of every record, its filters kept in the URL so a filtered list can be cited.
_Avoid_: ledger

**Pipeline ledger**:
The refresh run's own record of every run and step (when, outcome, counts, warnings), kept in the raw archive (`refresh-ledger.json`) and not rebuilt with the graph; unrelated to the Records tab.
_Avoid_: history, audit log

**Relationships tab**:
The entity page's view of how money moves between the entity and its counterparties: a counterparty graph, a monthly timeline and the Flow lens.

**Record page**:
The page, with its own URL, for one SEAP record (a contract or a direct purchase), linking to its source document.

### Investigations

**Investigation**:
A written case Grivei.ai builds itself, opened by a person from a Signal (or from a tip tied to an entity) and worked across Sources and their source documents; every fact in it is cited, it ends Explained or Unexplained, and it has a public part only after Editor sign-off. It is re-opened only on a new fact, as a new version. It is not a Source and never a Release.
_Avoid_: own source, case file, story, report

**Editor sign-off**:
A named human editor's dated approval of an Investigation's public part, never given by an agent; nothing in an Investigation is public without it.
_Avoid_: review, approval (alone)

**Finding**:
A conclusion an Investigation reaches; never public, shared only with named journalists by a recorded hand-off.
_Avoid_: verdict, result (and never for a Signal)

**Open question**:
A statement in an Investigation's public part that the evidence raises but does not settle, including any link made by name alone.
_Avoid_: suspicion, allegation

**Right of reply**:
The fixed window every organisation and Named person in an Investigation's public part gets to answer before it is published; the answer, or its absence, is published verbatim.
_Avoid_: comment request

**Explained**:
The outcome of an Investigation whose Signal has an innocent explanation; its public part is published to show it, as a courtesy to the entities involved.
_Avoid_: cleared, closed, false positive

**Unexplained**:
The outcome of an Investigation whose public part ends in Open questions, with any Findings handed off privately; the only other outcome is Explained, and there is no "confirmed" or "suspicious".
_Avoid_: suspicious, confirmed, guilty, flagged
