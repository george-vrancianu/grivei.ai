"""The Ministry of Finance's "Lista entitatilor publice" (#80), a Reference source and the Coverage denominator.

`fetch.py` is the Connector's fetch half (`pipeline fetch-mf`: the data.gov.ro dataset `listaentitatipublice` into the raw archive,
newest monthly file only, resumable); `build.py` reads the latest archived snapshot at rebuild into `core.mf_entity` and `core.mf_snapshot`.
"""
