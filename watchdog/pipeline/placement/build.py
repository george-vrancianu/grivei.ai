"""The placement step of `pipeline rebuild` (#67): checked-in tables, archived answers and the reviewed file in, `core` tables out.

Reads only the archive and the data directory (never the network): ANAF's seat from `core.anaf_company` (loaded earlier in the
same rebuild), the archived SEAP entity views for authorities ANAF does not know, the archived award notices and the reviewed
file for `national`. An entity with a known county gets a row (UAT null when no match); a national authority gets one even
without a county; anything else is unplaced. No match is logged, never guessed.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import psycopg

from ..archive import Archive
from .matching import SECTOR_OF, Gazetteer, Place, place_by_anaf, place_by_seap
from .scope import Entry, Observation, decide, read_classification, read_scopes
from .seap_lookup import SeapLocation, read_locations
from .tables import DEFAULT_DATA_DIR, load_gazetteer, read_uat_rows

log = logging.getLogger("pipeline.placement")


@dataclass
class PlacementSummary:
    has_uat_table: bool = False
    by_uat: int = 0
    county_only: int = 0
    by_seap: int = 0
    national: int = 0
    unplaced_authorities: int = 0
    unmatched: list[str] = field(default_factory=list)  # the log lines (all of them also go to the logger)
    observations: dict = field(default_factory=dict, repr=False)  # what the national-authority rule read, handed on to the MF step (#80)
    entries: dict = field(default_factory=dict, repr=False)

    def line(self) -> str:
        table = "" if self.has_uat_table else " (no UAT table: county only; run `pipeline geo-table`)"
        return (f"placement: {self.by_uat} at a UAT, {self.county_only} county only, {self.by_seap} via SEAP, "
                f"{self.national} national authorities, {self.unplaced_authorities} unplaced authorities{table}")


def _seat(seat: dict | None, fiscal: dict | None) -> tuple[str | None, str | None, str | None, str | None]:
    """(county auto, county SIRUTA JUD, locality, postal code) of ANAF's registered seat, else of the fiscal domicile."""
    seat, fiscal = seat or {}, fiscal or {}
    if seat.get("scod_JudetAuto") or seat.get("scod_Judet"):
        return seat.get("scod_JudetAuto"), seat.get("scod_Judet"), seat.get("sdenumire_Localitate"), seat.get("scod_Postal") or None
    return fiscal.get("dcod_JudetAuto"), fiscal.get("dcod_Judet"), fiscal.get("ddenumire_Localitate"), fiscal.get("dcod_Postal") or None


def build_placement(cur: psycopg.Cursor, archive: Archive, data_dir: Path | str | None = None,
                    after_insert: "Callable[[psycopg.Cursor], int] | None" = None) -> PlacementSummary:
    """`after_insert` runs once ANAF's and SEAP's placements are in (a Source that places what they could not, e.g. ONRC's seat county), before the search rows take their county."""
    out = PlacementSummary()
    gaz, out.has_uat_table = load_gazetteer(data_dir)
    for c in gaz.counties:
        cur.execute("INSERT INTO core.county (iso, siruta_jud, name) VALUES (%s, %s, %s)", (c.iso, c.siruta_jud, c.name))
    for r in read_uat_rows(Path(data_dir) if data_dir else DEFAULT_DATA_DIR):
        cur.execute(
            "INSERT INTO core.uat (siruta, county_iso, tip, name, name_folded, lon, lat, point_source) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (r["siruta"], r["county_iso"], r["tip"], r["name"], r["name_folded"], float(r["lon"]) if r.get("lon") else None,
             float(r["lat"]) if r.get("lat") else None, r.get("point_source") or None))
    observations = read_scopes(archive)
    entries = read_classification(data_dir)
    out.observations, out.entries = observations, entries
    seap_locations = read_locations(archive)

    cur.execute("SELECT DISTINCT authority_key FROM seap.record WHERE authority_key IS NOT NULL")
    authorities = {row[0] for row in cur.fetchall()}
    rows: list[tuple] = []
    with cur.connection.cursor(name="placement_entities") as stream:
        stream.itersize = 2000
        stream.execute(
            """SELECT e.key, e.display_name, a.seat, a.fiscal_domicile, a.fetched_at, a.archive_path
                 FROM core.entity e LEFT JOIN core.anaf_company a ON a.cui = e.key
                WHERE e.identity = 'CUI' ORDER BY e.key""")
        for key, name, seat, fiscal, fetched_at, path in stream:
            authority = key in authorities
            place: Place | None = None
            placed_by, located_on, source = "ANAF", fetched_at, path
            if seat is not None or fiscal is not None:
                auto, jud, locality, postal = _seat(seat, fiscal)
                place = place_by_anaf(gaz, county_auto=auto, county_jud=jud, locality=locality, postal=postal)
            if place is None and authority and (loc := seap_locations.get(key)) is not None:
                place = place_by_seap(gaz, city=loc.city, county=loc.county, address=loc.address, postal_code=loc.postal_code)
                placed_by, located_on, source = "SEAP", loc.fetched_at, loc.archive_path
                out.by_seap += place is not None
            national, national_by = decide(key, observations.get(key), entries) if authority else (False, "default")
            if place is not None and place.uat is not None and place.uat not in gaz.uat_by_siruta:
                place = Place(place.county, why=f"UAT {place.uat} is not in the UAT table")  # never a UAT the table does not have
            if place is None and not national:
                out.unplaced_authorities += authority
                continue
            if place is not None and place.uat is None and not national:
                out.county_only += 1
                if out.has_uat_table:  # without a UAT table every entity would say the same: the summary line says it once
                    line = f"placement: {key} {name!r} placed in {place.county} only: {place.why}"
                    out.unmatched.append(line)
                    log.warning(line)
            elif place is not None and place.uat is not None and not national:
                out.by_uat += 1
            out.national += national
            # a national authority with no seat still needs a `placed_by` (the contract's field is non-null): it says where the flag came from
            rows.append((key, place.county if place else None, place.uat if place else None, place.village if place else None,
                         place.sector if place else None, national, national_by, placed_by if (place or not national) else "SEAP",
                         located_on if place else None, source if place else None))
    for i in range(0, len(rows), 1000):
        cur.executemany(
            """INSERT INTO core.placement (entity_key, county_iso, uat_siruta, village_siruta, sector, national, national_by, placed_by, located_on, source_path)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", rows[i:i + 1000])
    if after_insert is not None:
        after_insert(cur)
    # the search rows carry the county (ISO 3166-2:RO, `RO-BV`), the UAT for the county/UAT filter and the Money lens area (#71); this runs before the
    # pg_search index is built. A national authority keeps a NULL county/UAT (never counted in Bucharest) but its area is NATIONAL; an authority with
    # no county and not national keeps the column defaults (UNPLACED); a supplier takes its county from its own placement. A national entity acting as a
    # supplier stays UNKNOWN_SUPPLIER_COUNTY (the default): no county is served for a national entity.
    cur.execute(
        """UPDATE seap.search s SET
                  authority_county = CASE WHEN p.national THEN NULL ELSE 'RO-' || p.county_iso END,
                  authority_uat = CASE WHEN p.national THEN NULL ELSE p.uat_siruta END,
                  authority_area = CASE WHEN p.national THEN 'NATIONAL' ELSE 'RO-' || p.county_iso END
             FROM core.placement p WHERE p.entity_key = s.authority_key AND (p.national OR p.county_iso IS NOT NULL)""")
    cur.execute(
        """UPDATE seap.search s SET supplier_county = 'RO-' || p.county_iso, supplier_area = 'RO-' || p.county_iso
             FROM core.placement p WHERE p.entity_key = s.supplier_key AND NOT p.national AND p.county_iso IS NOT NULL""")
    return out
