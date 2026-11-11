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

**Signal**:
A query result worth verifying in the source documents; never a conclusion or an accusation.
_Avoid_: finding, red flag, evidence
