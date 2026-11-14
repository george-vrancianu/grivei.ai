"""ONRC (the National Trade Register Office) as a Source: the open "Firme inregistrate la Registrul Comertului" snapshots on data.gov.ro.

- `fetch.py`: the Connector's fetch half (raw archive, one unit per snapshot, manifest last, resource identity recorded).
- `read.py`: the readers of one archived snapshot (both file layouts ONRC has published).
- `build.py`: the `onrc` schema's rebuild step: registrations, authorised CAEN codes, and the derived status and name history.
- `status.py`: ONRC's part of `pipeline status`.

ADR 0018 is the identity rule: a registration maps to its entity by CUI and never renames it.
"""
