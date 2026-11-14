"""The AEP step of `pipeline rebuild` (#180): the archived results into Mandates, gaps, attributed authorities, subordinate bodies and Party per Record.

Reads only the archive (never the network). Per election the newest unit that parses wins; a file that does not parse is named in the summary and
skipped (its areas get no Mandate, a gap, never a guess). Order: races -> Mandates and gaps (mandates.py) -> which entities are attributed
authorities -> which subordinate bodies inherit (MF principal set) -> Party per Record by award date.

An entity is an attributed authority when it is placed at a UAT, is not national, and its name is the town hall's own: a prefix (MUNICIPIUL, ORAS,
COMUNA, PRIMARIA ...) followed by the UAT's name (`COMUNA UCEA SPITAL ASIMILAT` is no town hall), `PRIMARIA SECTORULUI n` for a Bucharest sector,
`MUNICIPIUL BUCURESTI` for the general mayor, `CONSILIUL JUDETEAN <county>` for a county council. `data/authority_overrides.csv` (cui, kind, key)
pins an exception either way (kind `none` removes). Suppliers are never authorities here: only entities with the name of a public body are matched,
and nothing in this module reads a supplier.
"""
from __future__ import annotations

import csv
import logging
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import psycopg

from ..archive import Archive, Unit
from ..placement.matching import fold
from ..placement.tables import load_gazetteer
from .fetch import SOURCE
from .mandates import ELECTIONS_BY_ID, LOCAL_2020, LOCAL_2024, PARTIAL_2025, REPEAT_2020, derive
from .read import COUNTY_PRESIDENT, GENERAL_MAYOR, MAYOR, Race, alliances, key, read_minutes, read_partial, read_repeat_round

log = logging.getLogger("pipeline.aep")
DATA = Path(__file__).parent / "data"
# a body of these kinds is never a subordinate body, whatever its principal set (schools are dual-funded; companies and ADIs have owners, not a principal)
NOT_SUBORDINATE = re.compile(r"^(SCOALA|LICEUL|COLEGIUL|GRADINITA|GRUP SCOLAR|PALATUL COPIILOR|CLUBUL SPORTIV SCOLAR|CENTRUL SCOLAR|COMPANIA|REGIA AUTONOMA|SOCIETATEA|ASOCIATIA|ADI\b)|\b(S\.? ?A\.?|S\.? ?R\.? ?L\.?)$")
UAT_PREFIX = re.compile(r"^(PRIMARIA (COMUNEI |ORASULUI |MUNICIPIULUI )?|MUNICIPIUL |ORASUL |ORAS |COMUNA )")


@dataclass
class AepSummary:
    rounds: dict[str, int] = field(default_factory=dict)  # election id -> races read
    mandates: int = 0
    gaps: int = 0
    authorities: int = 0
    subordinates: int = 0
    record_parties: int = 0
    skipped: list[str] = field(default_factory=list)

    def line(self) -> str:
        if not self.rounds:
            return "aep: no election results archived (run `pipeline fetch-aep`): no Mandate, no Party" + "".join(f"; skipped {s}" for s in self.skipped)
        return (f"aep: {', '.join(f'{k} {v} races' for k, v in sorted(self.rounds.items()))}; {self.mandates} mandates, {self.gaps} gaps, {self.authorities} attributed authorities, "
                f"{self.subordinates} subordinate bodies, Party on {self.record_parties} Records" + "".join(f"; skipped {s}" for s in self.skipped))


def _units(archive: Archive) -> list[Unit]:
    root = archive.root / SOURCE
    return [u for u, _ in archive.survey(keep=lambda d: d.is_relative_to(root)) if u is not None and u.source == SOURCE]


def _newest(units: list[Unit], stream: str, unit: str) -> Unit | None:
    found = [u for u in units if (u.stream, u.unit) == (stream, unit)]
    return max(found, key=lambda u: (u.fetched_at, str(u.path))) if found else None


def read_rounds(archive: Archive, skipped: list[str]) -> tuple[dict[str, list[Race]], dict[str, Unit]]:
    """election id -> races, and the unit each came from."""
    units = _units(archive)
    races: dict[str, list[Race]] = {}
    used: dict[str, Unit] = {}
    parties: set[str] = set()
    for election, stream in ((LOCAL_2020, "final"), (LOCAL_2024, "final")):
        unit = _newest(units, stream, election.date.isoformat())
        if unit is None:
            continue
        out: list[Race] = []
        for name in sorted(f for f in unit.files if f.endswith(".json")):
            try:
                out += read_minutes(unit.file_path(name))
            except Exception as e:  # noqa: BLE001 - one broken county file leaves that county without Mandates, never stops the rebuild
                skipped.append(f"{unit.path.relative_to(archive.root)}/{name}: {e}")
                log.warning("aep %s/%s skipped: %s", unit.path, name, e)
        races[election.id], used[election.id] = out, unit
        parties |= {c.party for r in out for c in r.candidates if c.party}
    for election, stream, reader in ((REPEAT_2020, "repeat", "repeat"), (PARTIAL_2025, "partial", "partial")):
        unit = _newest(units, stream, election.date.isoformat())
        if unit is None:
            continue
        try:
            if reader == "repeat":
                out = read_repeat_round(unit.file_path("pv_final_cntry_p_tur2.csv"), unit.file_path("bd_p_11.10.2020.csv"), parties)
            else:
                out = read_partial([unit.file_path(f) for f in unit.files if f.endswith(".csv")], parties)
        except Exception as e:  # noqa: BLE001
            skipped.append(f"{unit.path.relative_to(archive.root)}: {e}")
            log.warning("aep %s skipped: %s", unit.path, e)
            continue
        races[election.id], used[election.id] = out, unit
    return races, used


def area_of(race: Race, county_of_name) -> str | None:
    if race.office == MAYOR:
        return f"UAT:{race.siruta}" if race.siruta else None
    if race.office == GENERAL_MAYOR:
        return "GENERAL:B"
    county = race.county if race.county and len(race.county) <= 2 else county_of_name(race.county or race.name)
    return f"COUNTY:{county}" if county else None


def _overrides(path: Path | None = None) -> dict[str, tuple[str, str]]:
    with (path or DATA / "authority_overrides.csv").open(encoding="utf-8", newline="") as f:
        return {r["cui"].strip(): (r["kind"].strip(), r["key"].strip()) for r in csv.DictReader(f) if r.get("cui")}


def _loose(text: str) -> str:
    """`key` with A and I alike: SIRUTA's name for a UAT folds Â and Î to I (`SINPETRU`) where an authority's own name has A (`SANPETRU`); the UAT is already
    the one the authority is placed at, so the comparison only has to tell `COMUNA UCEA` from `COMUNA UCEA SPITAL ASIMILAT`."""
    return key(text).replace("A", "I")


def attributed_authorities(cur: psycopg.Cursor, overrides: dict[str, tuple[str, str]] | None = None) -> list[tuple[str, str, str]]:
    """(entity key, area, how) for every entity that is a town hall, sector, Bucharest city hall or county council (see the module docstring)."""
    overrides = _overrides() if overrides is None else overrides
    cur.execute("SELECT siruta, name_folded, tip FROM core.uat")
    uats = {r[0]: (_loose(r[1]), r[2]) for r in cur.fetchall()}
    cur.execute("SELECT iso, name FROM core.county")
    counties = {r[0]: _loose(r[1]) for r in cur.fetchall()}
    cur.execute("SELECT e.key, e.display_name, p.county_iso, p.uat_siruta FROM core.entity e JOIN core.placement p ON p.entity_key = e.key WHERE NOT p.national")
    out: dict[str, tuple[str, str]] = {}
    for entity, display, county, siruta in cur.fetchall():
        name = fold(display)
        if m := re.match(r"^CONSILIUL JUDETEAN (.+)$", name):
            if county and county != "B" and _loose(m.group(1)) == counties.get(county):
                out[entity] = (f"COUNTY:{county}", "name")
        elif county == "B" and re.match(r"^(PRIMARIA )?(MUNICIPIULUI |MUNICIPIUL )BUCURESTI( PRIN PRIMAR)?$", name) and "SECTOR" not in name:
            out[entity] = ("GENERAL:B", "name")
        elif siruta and siruta in uats:
            tail_key, tip = uats[siruta]
            if tip == "6":
                if re.match(r"^(PRIMARIA )?SECTORUL(UI)? \d$", name) and name[-1] in tail_key:
                    out[entity] = (f"UAT:{siruta}", "name")
            elif (m := UAT_PREFIX.match(name)) and _loose(name[m.end():]) == tail_key:
                out[entity] = (f"UAT:{siruta}", "name")
    for cui, (kind, target) in overrides.items():
        out.pop(cui, None)
        if kind != "none":
            out[cui] = (target, "override")
    return [(k, area, how) for k, (area, how) in sorted(out.items())]


def build_aep(cur: psycopg.Cursor, archive: Archive, data_dir: Path | str | None = None) -> AepSummary:
    summary = AepSummary()
    races, used = read_rounds(archive, summary.skipped)
    if not races:
        return summary
    gaz, _ = load_gazetteer(data_dir)
    by_area: dict[str, dict[str, Race]] = defaultdict(dict)
    for election_id, rs in races.items():
        summary.rounds[election_id] = len(rs)
        for race in rs:
            area = area_of(race, gaz.county_of_name)
            if area:
                by_area[area].setdefault(election_id, race)
    for election_id, unit in used.items():
        e = ELECTIONS_BY_ID[election_id]
        through = date.fromisoformat((unit.origin or {}).get("dataThrough") or e.date.isoformat())
        cur.execute("INSERT INTO aep.snapshot (election_id, election_date, basis, fetched_at, archive_path, data_through, races) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (election_id, e.date, e.basis, unit.fetched_at, str(unit.path.relative_to(archive.root)), through, len(races[election_id])))
    through_of = {election_id: date.fromisoformat((unit.origin or {}).get("dataThrough") or ELECTIONS_BY_ID[election_id].date.isoformat()) for election_id, unit in used.items()}
    table = alliances()
    next_id = 0
    for area, per_election in sorted(by_area.items()):
        mandates, gaps = derive(per_election, table)
        for m in mandates:
            next_id += 1
            cur.execute("INSERT INTO aep.mandate (id, area, office, leader_name, list_name, independent, member_parties, election_id, election_date, basis, data_through, votes, start_date, end_date, end_basis) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        (next_id, area, m.office, m.leader, m.list_name, m.independent, list(m.member_parties), m.election.id, m.election.date, m.election.basis,
                         through_of[m.election.id], m.votes, m.start, m.end, m.end_basis))
        cur.executemany("INSERT INTO aep.gap (area, start_date, end_date, reason) VALUES (%s, %s, %s, %s)", [(area, g.start, g.end, g.reason) for g in gaps])
        summary.mandates += len(mandates)
        summary.gaps += len(gaps)
    # the authorities with no race at all in the results still get the gaps (every election's slot is NO_RESULTS) and the handover window
    authorities = attributed_authorities(cur)
    for _, area, _ in authorities:
        if area not in by_area:
            _, gaps = derive({}, table)
            cur.executemany("INSERT INTO aep.gap (area, start_date, end_date, reason) VALUES (%s, %s, %s, %s)", [(area, g.start, g.end, g.reason) for g in gaps])
            by_area[area] = {}
    cur.executemany("INSERT INTO aep.authority (entity_key, area, how) VALUES (%s, %s, %s)", authorities)
    summary.authorities = len(authorities)
    summary.subordinates = _subordinates(cur)
    cur.execute("""INSERT INTO aep.record_party (record_code, mandate_id, via_key)
                   SELECT r.code, m.id, s.authority_key
                     FROM seap.record r
                     LEFT JOIN aep.subordinate s ON s.entity_key = r.authority_key
                     JOIN aep.authority a ON a.entity_key = coalesce(s.authority_key, r.authority_key)
                     JOIN aep.mandate m ON m.area = a.area AND m.start_date <= r.award_date AND (m.end_date IS NULL OR r.award_date < m.end_date)""")
    summary.record_parties = cur.rowcount
    return summary


def _subordinates(cur: psycopg.Cursor) -> int:
    """`aep.subordinate`: a body whose principal set (self left out) is exactly one attributed authority in EVERY held snapshot that lists it."""
    cur.execute("SELECT snapshot_date, cui, principal_cui FROM core.mf_principal ORDER BY snapshot_date")
    sets: dict[str, dict[date, set[str]]] = defaultdict(lambda: defaultdict(set))
    for when, cui, principal in cur.fetchall():
        sets[cui][when]  # the entity is listed, with or without a principal
        if principal and principal != cui:
            sets[cui][when].add(principal)
    cur.execute("SELECT entity_key FROM aep.authority")
    authorities = {r[0] for r in cur.fetchall()}
    cur.execute("SELECT key, display_name FROM core.entity")
    names = dict(cur.fetchall())
    rows = []
    for cui, snapshots in sets.items():
        if cui in authorities or cui not in names or NOT_SUBORDINATE.search(fold(names[cui])):
            continue
        distinct = {frozenset(s) for s in snapshots.values() if s}  # a snapshot that names no principal is no evidence either way
        if len(distinct) != 1:
            continue  # none named, or a held snapshot contradicts another: no tie
        (principals,) = distinct
        if len(principals) == 1 and next(iter(principals)) in authorities:
            rows.append((cui, next(iter(principals)), max(w for w, s in snapshots.items() if s), sum(1 for s in snapshots.values() if s)))
    cur.executemany("INSERT INTO aep.subordinate (entity_key, authority_key, snapshot_date, snapshots) VALUES (%s, %s, %s, %s)", rows)
    return len(rows)
