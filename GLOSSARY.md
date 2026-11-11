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

### Graph

**Contracting authority**:
A public institution that buys through SEAP; it pays, a supplier receives.
_Avoid_: buyer, institution (when the paying role is meant)

**National authority**:
A contracting authority whose remit is the whole country (ministry, national agency, national company); it sits beside the county map, not inside Bucharest.
_Avoid_: central authority

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
The lens on one entity's page showing where across Romania its money comes from or goes.
