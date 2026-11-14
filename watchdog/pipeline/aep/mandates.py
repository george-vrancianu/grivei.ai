"""Deriving Mandates and gaps from the races (#180, ADR 0012). Pure functions: no database, no archive.

A Mandate runs from the oath to the successor's oath. AEP publishes no per-UAT oath dates, so the in-force dates are assumptions, stated here and
shown as such: a winner is in force from `ASSUMED_OATH_DAYS` after the election (the validation and oath deadlines of the Administrative Code
art. 150-151 and OUG 21/2024 art. 34 fit inside it); the 2020 mandates end where the 2024 handover window starts (27 September 2024, OUG 21/2024
art. 34); a partial election ends the old mandate at the earliest day the vacancy can have happened (90 days before the partial election, Admin.
Code art. 163 deputy mayor until a partial election within 90 days). What is left between two mandates is a gap, shown as a gap: the handover
window, an interim leader, a mandate without results (a UAT absent from the minutes, a tie). Nothing is guessed to fill it.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from .read import DATA, Candidate, Race, alliances, is_independent, key

ASSUMED_OATH_DAYS = 30
HANDOVER_START = date(2024, 9, 27)  # the 2020 mandates end; the 2024 validation and oath deadlines start (OUG 21/2024 art. 34)
VACANCY_BOUND_DAYS = 90

FINAL_MINUTES, REPEAT_ROUND, PARTIAL_MINUTES = "FINAL_MINUTES", "REPEAT_ROUND", "PARTIAL_MINUTES"
HANDOVER_WINDOW, INTERIM, NO_RESULTS = "HANDOVER_WINDOW", "INTERIM", "NO_RESULTS"


@dataclass(frozen=True)
class Election:
    id: str
    date: date
    basis: str
    oath_after: date | None = None  # the day the oath deadlines start, when it is not the election day (2024: the mandates of 2020 run to 27 September)

    @property
    def in_force_from(self) -> date:
        return (self.oath_after or self.date) + timedelta(days=ASSUMED_OATH_DAYS)


LOCAL_2020 = Election("local-2020", date(2020, 9, 27), FINAL_MINUTES)
REPEAT_2020 = Election("local-2020-repeat", date(2020, 10, 11), REPEAT_ROUND)
LOCAL_2024 = Election("local-2024", date(2024, 6, 9), FINAL_MINUTES, HANDOVER_START)
PARTIAL_2025 = Election("local-2025-partial", date(2025, 12, 7), PARTIAL_MINUTES)


@dataclass(frozen=True)
class Mandate:
    office: str
    siruta: str | None
    county: str | None
    leader: str
    list_name: str  # as registered; "Independent" for an independent leader
    independent: bool
    member_parties: tuple[str, ...]  # an alliance's member parties from the checked-in table; empty otherwise
    election: Election
    votes: int
    start: date
    end: date | None  # None = still in force
    end_basis: str | None  # VACANCY_DATE (a known vacancy) or PARTIAL_VACANCY_BOUND (the assumed bound) when it ended early, HANDOVER_START, or None


@dataclass(frozen=True)
class Gap:
    start: date
    end: date | None
    reason: str


def _mandate(race: Race, winner: Candidate, election: Election, start: date, end: date | None, end_basis: str | None, table: dict[str, list[str]]) -> Mandate:
    independent = is_independent(winner.party)
    members = () if independent else tuple(table.get(key(winner.party or ""), ()))
    return Mandate(race.office, race.siruta, race.county, winner.name, "Independent" if independent else winner.party or "", independent, members, election,
                   winner.votes, start, end, end_basis)


def vacancies(path: Path | None = None) -> dict[str, date]:
    """Area -> the known date its leader's mandate ended early (`data/vacancies.csv`: area, vacancy_date, note)."""
    with (path or DATA / "vacancies.csv").open(encoding="utf-8", newline="") as f:
        return {r["area"].strip(): date.fromisoformat(r["vacancy_date"].strip()) for r in csv.DictReader(f) if r.get("area")}


def derive(races: dict[str, Race | None], table: dict[str, list[str]] | None = None, vacancy: date | None = None) -> tuple[list[Mandate], list[Gap]]:
    """One authority's Mandates and gaps from its race in each election (`races` is keyed by Election id; a missing or None race = no result).
    `vacancy` is the known date the leader's mandate ended early, if any: the mandate is cut there and what follows is an interim gap."""
    table = alliances() if table is None else table
    first = races.get(REPEAT_2020.id) or races.get(LOCAL_2020.id)  # a repeat round replaces the September result of its UAT
    first_election = REPEAT_2020 if races.get(REPEAT_2020.id) else LOCAL_2020
    slots = [(first, first_election, HANDOVER_START), (races.get(LOCAL_2024.id), LOCAL_2024, None)]
    mandates: list[Mandate] = []
    gaps: list[Gap] = []
    for race, election, end in slots:
        winner = race.winner() if race else None
        if winner is None:
            gaps.append(Gap(election.in_force_from, end, NO_RESULTS))
        else:
            mandates.append(_mandate(race, winner, election, election.in_force_from, end, "HANDOVER_START" if end else None, table))
    gaps.append(Gap(HANDOVER_START, LOCAL_2024.in_force_from, HANDOVER_WINDOW))
    partial = races.get(PARTIAL_2025.id)
    cut = vacancy or (PARTIAL_2025.date - timedelta(days=VACANCY_BOUND_DAYS) if partial is not None else None)
    if cut is not None:
        trimmed = []
        for m in mandates:
            if m.end is None or m.end > cut:
                if m.start >= cut:
                    continue  # a mandate starting after the vacancy is dropped rather than shown negative
                m = Mandate(m.office, m.siruta, m.county, m.leader, m.list_name, m.independent, m.member_parties, m.election, m.votes, m.start, cut,
                            "VACANCY_DATE" if vacancy else "PARTIAL_VACANCY_BOUND")
            trimmed.append(m)
        mandates = trimmed
        gaps = [Gap(g.start, cut, g.reason) if g.end is None else g for g in gaps if not (g.end is None and g.start >= cut)]
        winner = partial.winner() if partial is not None else None
        if partial is None:
            gaps.append(Gap(cut, None, INTERIM))  # no partial election held: the interim leader is still in office
        elif winner is None:
            gaps.append(Gap(cut, None, NO_RESULTS))
        else:
            gaps.append(Gap(cut, PARTIAL_2025.in_force_from, INTERIM))
            mandates.append(_mandate(partial, winner, PARTIAL_2025, PARTIAL_2025.in_force_from, None, None, table))
    mandates.sort(key=lambda m: m.start)
    gaps = [g for g in sorted(gaps, key=lambda g: g.start) if g.end is None or g.end > g.start]
    return mandates, gaps


def in_force(mandates: list[Mandate], day: date) -> Mandate | None:
    """The Mandate in force on `day`: start <= day < end (an open end is still in force)."""
    return next((m for m in mandates if m.start <= day and (m.end is None or day < m.end)), None)


ELECTIONS_BY_ID = {e.id: e for e in (LOCAL_2020, REPEAT_2020, LOCAL_2024, PARTIAL_2025)}
