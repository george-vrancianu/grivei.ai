"""The pipeline: Connectors write the raw archive, `rebuild` derives the graph from it (ADR 0004).

Grown out of the `watchdog/` Connector. The legacy JSON-batch loader (`connectors/load_batch.py`, `sql/`) is untouched;
the pipeline loads the bulk files the archive holds into the `seap` schema.
"""
