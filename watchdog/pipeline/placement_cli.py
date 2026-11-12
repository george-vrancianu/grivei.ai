"""CLI verbs of placement (#67), kept apart from cli.py: `geo-fetch`, `geo-table`, `geo-topojson`, `seap-entities`,
`authority-scope`, `national-propose`. `add_parsers(sub)` registers them, `run(archive, args)` runs one (None: not ours)."""
from __future__ import annotations

import logging
import os
import signal
import sys
from datetime import datetime, timezone
from pathlib import Path

from .archive import Archive
from .progress import stamp

PLACEMENT_DATA_ENV = "PIPELINE_PLACEMENT_DATA"
GEO_DIR_ENV = "PIPELINE_GEO_DIR"


def add_rebuild_args(r) -> None:
    r.add_argument("--placement-data", default=os.environ.get(PLACEMENT_DATA_ENV),
                   help=f"directory of the placement tables and reviewed files (env {PLACEMENT_DATA_ENV}; default pipeline/placement/data)")
    r.add_argument("--geo-dir", default=os.environ.get(GEO_DIR_ENV),
                   help=f"where the county and UAT TopoJSON is written (env {GEO_DIR_ENV}; default <archive>/derived/geo)")


def add_parsers(sub) -> None:
    f = sub.add_parser("geo-fetch", help="fetch INS SIRUTA, the ANCPI UAT polygons and the Wikidata SIRUTA points into the raw archive (no loading)")
    f.add_argument("--only", action="append", choices=["siruta", "ancpi", "wikidata"], help="one source (repeatable; default all three)")
    f.add_argument("--siruta-dataset", default="siruta_s1-2026", help="the data.gov.ro dataset id of the SIRUTA release (a new semester is a new id)")
    f.add_argument("--siruta-url", default=None, help="the SIRUTA CSV URL itself (skips the CKAN lookup)")
    f.add_argument("--delay", type=float, default=1.0, help="seconds between ANCPI pages, default 1")
    t = sub.add_parser("geo-table", help="generate the UAT and village tables from the archived SIRUTA, Wikidata and ANCPI snapshots")
    t.add_argument("--out", default=None, help="output directory (default pipeline/placement/data: the checked-in tables)")
    o = sub.add_parser("geo-topojson", help="build the county and UAT TopoJSON from the archived ANCPI polygons (rebuild does this too)")
    add_rebuild_args(o)
    s = sub.add_parser("seap-entities", help="ask SEAP about authority CUIs ANAF does not know (needs a rebuilt graph); archives each answer")
    s.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL (env DATABASE_URL)")
    s.add_argument("--delay", type=float, default=0.35, help="seconds between requests (default 0.35)")
    s.add_argument("--max", type=int, default=None, help="stop after this many CUIs (a small trial run)")
    a = sub.add_parser("authority-scope", help="fetch one award notice per authority for its buyer type (national flag; needs a rebuilt graph); archives each answer")
    a.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL (env DATABASE_URL)")
    a.add_argument("--delay", type=float, default=0.35, help="seconds between requests (default 0.35)")
    a.add_argument("--max", type=int, default=None, help="stop after this many authorities (a small trial run)")
    n = sub.add_parser("national-propose", help="print CSV lines proposing national authorities (by name) that have no award-notice flag or file entry, for review")
    n.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL (env DATABASE_URL)")
    n.add_argument("--placement-data", default=os.environ.get(PLACEMENT_DATA_ENV), help="directory holding national_authorities.csv")


def _stamped(line: str) -> None:
    print(f"{stamp(datetime.now(timezone.utc))} {line}", flush=True)


def make_client(delay: float):
    """The one place the lookups' network client is made: tests replace it."""
    from .placement.lookup import LookupClient

    return LookupClient(delay=delay, log=_stamped)


def run(archive: Archive, args) -> int | None:
    verb = args.verb
    if verb == "geo-fetch":
        from .geo.fetch import GeoFetchError, SOURCES, geo_fetch

        signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(128 + signum))
        try:
            summary = geo_fetch(archive, tuple(args.only or SOURCES), siruta_dataset=args.siruta_dataset, siruta_url=args.siruta_url,
                                delay=args.delay, say=_stamped)
        except GeoFetchError as e:
            print(f"geo-fetch: {e}", file=sys.stderr)
            return 1
        for line in summary.lines():
            _stamped(line)
        return 0
    if verb == "geo-table":
        from .geo.table import TableError, build_tables

        try:
            summary = build_tables(archive, args.out)
        except TableError as e:
            print(f"geo-table: {e}", file=sys.stderr)
            return 1
        for line in summary.lines():
            print(line)
        return 0
    if verb == "geo-topojson":
        from .geo.topo import build_topojson

        out = Path(args.geo_dir) if args.geo_dir else archive.root / "derived" / "geo"
        print(build_topojson(archive, out, args.placement_data).line() + f" -> {out}")
        return 0
    if verb in ("seap-entities", "authority-scope", "national-propose"):
        if not args.db:
            print(f"{verb}: --db or DATABASE_URL is required", file=sys.stderr)
            return 2
        signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(128 + signum))
        if verb == "seap-entities":
            from .placement import seap_lookup

            cuis = seap_lookup.candidates(args.db)
            _, failed = seap_lookup.lookup_locations(archive, make_client(args.delay), cuis[: args.max] if args.max else cuis, note=_stamped)
            return 1 if failed else 0
        if verb == "authority-scope":
            from .placement import scope

            _, failed = scope.lookup_scopes(archive, make_client(args.delay), scope.candidates(args.db), note=_stamped, max_authorities=args.max)
            return 1 if failed else 0
        import psycopg

        from .placement import scope

        with psycopg.connect(args.db) as conn, conn.cursor() as cur:
            cur.execute("SELECT DISTINCT authority_cui, authority_name FROM seap.record WHERE authority_key ~ '^[0-9]+$' AND authority_cui IS NOT NULL AND authority_name IS NOT NULL")
            authorities = [(c, n) for c, n in cur.fetchall()]
        for line in scope.propose(authorities, scope.read_scopes(archive), scope.read_classification(args.placement_data)):
            print(line)
        return 0
    return None


def log_to_stderr() -> None:
    """A handler that flushes every record, so an unattended rebuild's log shows the unmatched-placement lines as they come."""
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%dT%H:%M:%S%z"))
    logging.getLogger("pipeline.placement").handlers[:] = [handler]
    logging.getLogger("pipeline.placement").setLevel(logging.INFO)
