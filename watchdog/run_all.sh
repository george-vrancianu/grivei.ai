#!/usr/bin/env bash
# Reconstruiește totul de la zero dintr-o bază Postgres goală + loturile JSON din data/raw/.
# Necesită: psql în PATH, DATABASE_URL setat (ex. postgresql://watchdog:watchdog@localhost/watchdog), python3.
set -euo pipefail
cd "$(dirname "$0")"
: "${DATABASE_URL:=postgresql://watchdog:watchdog@localhost/watchdog}"; export DATABASE_URL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f sql/001_schema.sql
for f in data/raw/seap_*.json; do python3 connectors/load_batch.py --source seap --file "$f"; done
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f sql/003_views.sql

python3 tools/export_graph.py --authority "MUNICIPIUL BRASOV"    --county Brasov --out viewer/brasov.graph.json
python3 tools/build_viewer.py --data viewer/brasov.graph.json    --out viewer/brasov.html    --title "Watchdog Brașov"
python3 tools/export_graph.py --authority "MUNICIPIUL TIMISOARA" --county Timis  --out viewer/timisoara.graph.json
python3 tools/build_viewer.py --data viewer/timisoara.graph.json --out viewer/timisoara.html --title "Watchdog Timișoara"

python3 tools/export_archify.py --authority "MUNICIPIUL BRASOV" --top 10 --out diagrams/brasov-top10.architecture.json
python3 tools/export_archify.py --authority "MUNICIPIUL TIMISOARA" --top 10 --out diagrams/timisoara-top10.architecture.json
echo "gata: viewer/*.html, diagrams/*.architecture.json"
