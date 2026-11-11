#!/usr/bin/env python3
"""
Loads a JSON produced by a connector into Postgres (the import_batch table), then
runs the source's SQL transform script (sql/002_load_seap.sql).

No Python dependencies: uses `psql` (the DATABASE_URL variable or --db).

  python connectors/load_batch.py --source seap --file data/raw/seap_brasov.json
"""
import argparse, os, subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
TRANSFORM = {"seap": ROOT / "sql" / "002_load_seap.sql"}


def psql(db, *args, stdin=None):
    cmd = ["psql", db, "-v", "ON_ERROR_STOP=1", "-q", *args]
    r = subprocess.run(cmd, input=stdin, text=True, capture_output=True)
    if r.returncode:
        sys.exit(f"psql failed:\n{r.stderr}")
    return r.stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, choices=TRANSFORM)
    ap.add_argument("--file", required=True)
    ap.add_argument("--db", default=os.environ.get("DATABASE_URL", "postgresql://watchdog:watchdog@localhost/watchdog"))
    a = ap.parse_args()

    raw = pathlib.Path(a.file).read_text(encoding="utf-8")
    tag = "$wd_json$"
    if tag in raw:
        sys.exit("payload contains the dollar-quote delimiter; change the tag")
    psql(a.db, "-c", "CREATE TABLE IF NOT EXISTS import_batch (id bigserial PRIMARY KEY, source_id text NOT NULL REFERENCES source(id), loaded_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL);")
    out = psql(a.db, "-At", stdin=f"INSERT INTO import_batch (source_id, payload) VALUES ('{a.source}', {tag}{raw}{tag}::jsonb) RETURNING id;")
    batch_id = out.strip().splitlines()[-1]
    print(f"import_batch id={batch_id} ({len(raw)//1024} KB)")
    psql(a.db, "-v", f"batch_id={batch_id}", "-f", str(TRANSFORM[a.source]))
    print(psql(a.db, "-c", """
        SELECT 'entities' k, count(*) FROM entity
        UNION ALL SELECT 'edges', count(*) FROM edge
        UNION ALL SELECT 'direct_acquisitions', count(*) FROM seap_direct_acquisition
        UNION ALL SELECT 'award_notices', count(*) FROM seap_award_notice
        UNION ALL SELECT 'contracts', count(*) FROM seap_contract;"""))


if __name__ == "__main__":
    main()
