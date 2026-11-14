"""Reading AEP's results into races (#180): the final minutes (JSON per county, 2020 and 2024), the October 2020 repeat round (two CSVs) and the
2025 partial elections (Code for Romania's CSV backup of AEP's site).

A `Race` is one election for one office at one authority: a mayor of a UAT (`MAYOR`, by SIRUTA), a county council president (`COUNTY_PRESIDENT`, by
county ISO) or Bucharest's general mayor (`GENERAL_MAYOR`, county `B`). Candidates carry the party or alliance exactly as registered (cedilla
spelling normalised to comma-below, nothing else), `None` for an independent. The winner is derived from the vote counts, never read from a flag
(AEP's files do not carry one): the candidate with most votes; a tie or no votes is no winner.
"""
from __future__ import annotations

import csv
import io
import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

MAYOR, COUNTY_PRESIDENT, GENERAL_MAYOR = "MAYOR", "COUNTY_PRESIDENT", "GENERAL_MAYOR"
INDEPENDENT = "CANDIDAT INDEPENDENT"
DATA = Path(__file__).parent / "data"


def tidy(text: str | None) -> str:
    """Whitespace collapsed, cedilla s/t turned into comma-below (AEP mixes both), nothing else touched."""
    t = unicodedata.normalize("NFC", text or "").translate(str.maketrans("şŞţŢ", "șȘțȚ"))
    return re.sub(r"\s+", " ", t).strip()


def key(text: str) -> str:
    """The equivalence key of a party or alliance name: ASCII, upper case, letters and digits only."""
    t = unicodedata.normalize("NFKD", text or "")
    return re.sub(r"[^A-Z0-9]+", "", "".join(c for c in t if not unicodedata.combining(c)).upper())


def is_independent(party: str | None) -> bool:
    """No list at all, or AEP's own marker; a registered name that merely contains the word (a party of the independents) is a list as registered."""
    return not party or key(party) == key(INDEPENDENT)


def alliances(path: Path | None = None) -> dict[str, list[str]]:
    """Alliance key -> member parties, from the checked-in table (`data/alliances.csv`); an alliance not in it has no members recorded."""
    with (path or DATA / "alliances.csv").open(encoding="utf-8", newline="") as f:
        return {key(r["alliance"]): [m.strip() for m in r["members"].split(";") if m.strip()] for r in csv.DictReader(f)}


@dataclass(frozen=True)
class Candidate:
    name: str
    party: str | None  # as registered; None = independent
    votes: int


@dataclass
class Race:
    office: str
    siruta: str | None  # MAYOR
    county: str | None  # ISO, e.g. BV, B
    name: str  # the UAT or county as AEP writes it (source data)
    candidates: list[Candidate] = field(default_factory=list)
    created_at: str | None = None  # AEP's report timestamp

    def winner(self) -> Candidate | None:
        if not self.candidates:
            return None
        top = max(c.votes for c in self.candidates)
        leaders = [c for c in self.candidates if c.votes == top]
        return leaders[0] if top > 0 and len(leaders) == 1 else None


def _int(value) -> int:
    try:
        return int(str(value).strip() or 0)
    except ValueError:
        return 0


def read_minutes(path: Path) -> list[Race]:
    """The mayors (UAT scope, category P) and the county council presidents or general mayor (county scope, category PCJ) of one county's
    FINAL minutes. A file whose FINAL stage is not enabled is an error: partial counts are never read as final."""
    doc = json.loads(path.read_text(encoding="utf-8"))
    stage = doc["stages"]["FINAL"]
    if not stage.get("enabled"):
        raise ValueError(f"{path.name}: the FINAL stage is not enabled")
    out: list[Race] = []
    for scope, category, office in (("UAT", "P", MAYOR), ("CNTY", "PCJ", None)):
        table = stage["scopes"].get(scope, {}).get("categories", {}).get(category, {}).get("table") or {}
        for row in (table.values() if isinstance(table, dict) else []):
            votes = row.get("votes")
            if not votes:
                continue
            county = tidy(row.get("county_code")).upper() or None
            candidates = [Candidate(tidy(v["candidate"]), tidy(v.get("party")) or None, _int(v.get("votes"))) for v in votes]
            if office == MAYOR:
                out.append(Race(MAYOR, str(row["uat_siruta"]), county, tidy(row.get("uat_name")), candidates, row.get("report_created_at")))
            else:
                out.append(Race(GENERAL_MAYOR if county == "B" else COUNTY_PRESIDENT, None, county, tidy(row.get("county_name")), candidates, row.get("report_created_at")))
    return out


def split_header(column: str, parties: set[str]) -> tuple[str, str | None]:
    """`'NAME-PARTY-voturi'` -> (name, party): the code4romania CSVs join candidate and list with a hyphen. The list is the longest known
    party (from the minutes) that ends the text, else the text after the first hyphen followed by a list word; a lone name is independent."""
    text = tidy(re.sub(r"-voturi$", "", column))
    if text.endswith("-" + INDEPENDENT) or text == INDEPENDENT:
        return tidy(text[: -len(INDEPENDENT)].rstrip("-")), None
    for party in sorted(parties, key=len, reverse=True):
        if text.endswith("-" + party):
            return tidy(text[: -len(party) - 1]), party
    m = re.search(r"-((?:PARTIDUL|ALIAN[ȚT]A|UNIUNEA|FOR[ȚT]A|BLOCUL|ASOCIA[ȚT]IA|FORUMUL)\b.*)$", text)
    return (tidy(text[: m.start()]), m.group(1)) if m else (text, None)


def _rows(text: str, delimiter: str) -> list[dict]:
    return list(csv.DictReader(io.StringIO(text.lstrip("﻿")), delimiter=delimiter))


def read_repeat_round(results: Path, stations: Path, parties: set[str]) -> list[Race]:
    """The 11 October 2020 repeat round: AEP's one-row-per-UAT results (`pv_final_cntry_p_tur2.csv`, `;`-separated, candidate and list in the
    column names) with the SIRUTA taken from the polling-station file beside it (`bd_p_11.10.2020.csv`, which has `uat_siruta`)."""
    sirutas = {(tidy(r["county_name"]).upper(), tidy(r["uat_name"]).upper()): r["uat_siruta"].strip() for r in _rows(stations.read_text(encoding="utf-8"), ";") if r.get("uat_siruta")}
    out = []
    for row in _rows(results.read_text(encoding="utf-8"), ";"):
        candidates = []
        for col, v in row.items():
            if col and col.endswith("-voturi") and str(v).strip() != "":
                name, party = split_header(col, parties)
                candidates.append(Candidate(name, party, _int(v)))
        siruta = sirutas.get((tidy(row["county_name"]).upper(), tidy(row["uat_name"]).upper()))
        if siruta is not None:  # no SIRUTA: not placeable, so no Mandate
            out.append(Race(MAYOR, siruta, None, tidy(row["uat_name"]), candidates, row.get("created_at")))
    return out


def read_partial(paths: list[Path], parties: set[str]) -> list[Race]:
    """The 2025 partial elections from Code for Romania's CSVs: precinct rows (`pv_part_uat_p_<county>_<siruta>.csv`, mayors) and
    (`pv_part_cnty_pcj_<county>.csv`, county council president or Bucharest general mayor), `,`-separated. Votes are summed over the
    precincts of a race; a UAT-scope row is used instead when a file has one. These are partial counts: the caller states the data-through
    date. A county race carries the county NAME in `county` (the caller reads it as a county); Bucharest's is `B`."""
    precincts: dict[tuple, dict] = {}
    totals: dict[tuple, dict] = {}
    meta: dict[tuple, tuple] = {}
    for path in sorted(paths):
        for row in _rows(path.read_text(encoding="utf-8"), ","):
            cols = [c for c in row if c and c.endswith("-voturi")]
            category = row.get("report_type_category_code")
            if category not in ("P", "PCJ") or not cols:
                continue
            siruta = (row.get("uat_siruta") or "").strip()
            county_name = tidy(row.get("precinct_county_name") or row.get("county_name"))
            if category == "P":
                ident, meta[("P", siruta)] = ("P", siruta), (MAYOR, siruta, None, tidy(row.get("uat_name")))
            else:
                general = "BUCURE" in county_name.upper()
                ident = ("PCJ", "B" if general else county_name)
                meta[ident] = (GENERAL_MAYOR if general else COUNTY_PRESIDENT, None, "B" if general else county_name, county_name)
            bucket = (totals if row.get("report_type_scope_code") == "UAT" else precincts).setdefault(ident, {})
            for col in cols:
                name, party = split_header(col, parties)
                bucket[(name, party)] = bucket.get((name, party), 0) + (_int(row[col]) if row.get(col) not in (None, "") else 0)
    out = []
    for ident, m in meta.items():
        votes = totals.get(ident) or precincts.get(ident) or {}
        out.append(Race(m[0], m[1], m[2], m[3], [Candidate(n, p, v) for (n, p), v in votes.items()]))
    return out
