# Grivei.ai

A public-money watchdog: Romanian public sources joined into one graph of institutions, companies and people, where every link points to the source document it came from.

## Language

### Sources and ingestion

**Source**:
A public registry Grivei.ai draws data from (SEAP, ANI, ONRC, Ministerul Finanțelor, portal.just.ro, ANAF).
_Avoid_: directory, public directory, database

**Connector**:
The harvester and loader that bring one Source's documents into the graph.
_Avoid_: scraper, integration

**Release**:
A shipped increment of the public explorer that makes one more Source explorable, with its own search surface on the shared graph.
_Avoid_: version, phase

**Data-through date**:
The date up to which one Source's records of one kind are complete in the graph.
_Avoid_: last updated, freshness

### Graph

**Contracting authority**:
A public institution that buys through SEAP; it pays, a supplier receives.
_Avoid_: buyer, institution (when the paying role is meant)

**National authority**:
A contracting authority whose remit is the whole country (ministry, national agency, national company); it sits beside the county map, not inside Bucharest.
_Avoid_: central authority

**Record**:
One SEAP document entry in the graph (a direct purchase, a contract award to one winner on one lot, or an award notice), with its own page and source link. A search matches records; what it shows are results.
_Avoid_: transaction, entry, hit

**Signal**:
A query result worth verifying in the source documents; never a conclusion or an accusation.
_Avoid_: finding, red flag, evidence

### Explorer

**Lens**:
One way the explorer's map of Romania encodes data; the map shows one lens at a time.
_Avoid_: mode, layer, view

**Money lens**:
The default lens: public money by county, either where it is spent (contracting authority) or where it goes (supplier).

**Coverage lens**:
The lens showing, per county and per Source, how much has been harvested; grey means not harvested, never no spending.

**Flow lens**:
The lens on an entity page's Relationships tab showing where across Romania its money comes from (supplier) or goes (contracting authority).

**Entity page**:
The page, with its own URL, for one contracting authority or supplier; it has three tabs over the same data, Overview (the default), Records and Relationships.
_Avoid_: profile, drawer, detail view

**Overview tab**:
The entity page's summary card: headline numbers, Signals, top counterparties, procedure types, consortia, largest records.

**Records tab**:
The entity page's filterable table of every record, its filters kept in the URL so a filtered list can be cited.
_Avoid_: ledger

**Relationships tab**:
The entity page's view of how money moves between the entity and its counterparties: a counterparty graph, a monthly timeline and the Flow lens.

**Record page**:
The page, with its own URL, for one SEAP record (a contract or a direct purchase), linking to its source document.
