"""Placement (#67): where a contracting authority (or any ANAF-known entity) sits, as a county, a UAT, a village and a Bucharest sector.

`matching.py` is the pure rules (folding, ANAF's locality string, SEAP's city and postal code), `tables.py` reads the
checked-in county, UAT and village tables and the two reviewed files (typo aliases, national authorities), `seap_lookup.py` and
`scope.py` are the two small Connectors the rules need beyond ANAF (SEAP's entity views, the award notice's buyer type), and
`build.py` is the step `rebuild` calls: the archive and the tables in, `core.county`, `core.uat` and `core.placement` out.
"""
