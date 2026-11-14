"""The BaniPartide step of `pipeline rebuild` (#182): the archived firm-donor table into `donations.source_file` and `donations.donation`.

Reads only the archive (never the network). The newest held copy is read; a copy that does not parse is named in the summary and left out. Rows are
dropped, never stored, when they are not CUI-keyed (individual donors, ADR 0009) or when the CUI is a sole trader's (an entity whose ONRC legal form or ANAF
name says PFA, II or IF): a political donation is not published against a person's name through this section. Both are only counted.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

import psycopg

from ..archive import Archive, Unit
from ..sole_trader import is_sole_trader  # noqa: F401  (the shared rule; also imported from here by this Source's tests)
from .fetch import FILE_NAME, KIND, SOURCE, STREAM
from .read import BaniPartideError, Donation, ReadStats, read_donations

log = logging.getLogger("pipeline.banipartide")


@dataclass
class DonationsSummary:
    files: int = 0
    rows: int = 0  # rows in the archived table
    loaded: int = 0
    dropped_no_cui: int = 0  # not CUI-keyed: individuals and unreadable ids (never kept)
    dropped_sole_trader: int = 0
    dropped_other: int = 0  # unknown kind, unreadable amount
    through_year: int | None = None
    skipped: list[str] = field(default_factory=list)
    incomplete: list[str] = field(default_factory=list)

    def line(self) -> str:
        extra = "".join(f"; skipped {s}" for s in self.skipped) + "".join(f"; incomplete {s}" for s in self.incomplete)
        if not self.files:
            return "donations: none archived (run `pipeline fetch-banipartide`): no entity page lists firm donations" + extra
        return (f"donations: {self.loaded} firm donations and loans of {self.rows} rows (data through {self.through_year}); dropped {self.dropped_no_cui} not CUI-keyed, "
                f"{self.dropped_sole_trader} sole traders, {self.dropped_other} unreadable" + extra)


def held_unit(archive: Archive) -> tuple[Unit | None, list[str]]:
    """The newest complete copy and the incomplete directories."""
    root = archive.root / SOURCE
    best: Unit | None = None
    incomplete: list[str] = []
    for unit, directory in archive.survey(keep=lambda d: d.is_relative_to(root)):
        if unit is None:
            incomplete.append(str(directory.relative_to(archive.root)))
        elif (unit.source, unit.stream, unit.kind) == (SOURCE, STREAM, KIND) and FILE_NAME in unit.files and (best is None or (unit.fetched_at, str(unit.path)) > (best.fetched_at, str(best.path))):
            best = unit
    return best, incomplete


def build_donations(cur: psycopg.Cursor, archive: Archive) -> DonationsSummary:
    unit, incomplete = held_unit(archive)
    summary = DonationsSummary(incomplete=incomplete)
    if unit is None:
        return summary
    path = unit.file_path(FILE_NAME)
    stats = ReadStats()
    try:
        donations: list[Donation] = list(read_donations(path, stats))
    except (BaniPartideError, OSError, UnicodeDecodeError, ValueError) as e:
        summary.skipped.append(f"{unit.path.relative_to(archive.root)}: {e}")
        log.warning("donations %s skipped: %s", path, e)
        return summary
    cuis = sorted({d.cui for d in donations})
    names = dict(cur.execute("SELECT key, display_name FROM core.entity WHERE cui = ANY(%s)", (cuis,)).fetchall())
    forms = dict(cur.execute("SELECT cui, legal_form FROM onrc.registration WHERE cui = ANY(%s)", (cuis,)).fetchall())
    sole = {c for c in cuis if is_sole_trader(names.get(c), forms.get(c))}
    kept = [d for d in donations if d.cui not in sole]
    origin = unit.origin or {}
    years = [d.year for d in donations if d.year is not None]  # any firm row, as `pipeline status` reads it
    cur.execute(
        "INSERT INTO donations.source_file (id, database_hash, table_name, dataset_url, table_url, license, license_url, source, source_url, underlying, underlying_url,"
        " archive_path, fetched_at, row_count, loaded_count, through_year) VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (origin.get("databaseHash") or unit.unit, origin.get("table"), origin.get("datasetUrl"), origin.get("url") or unit.url, origin.get("license"), origin.get("licenseUrl"),
         origin.get("source"), origin.get("sourceUrl"), origin.get("underlying"), origin.get("underlyingUrl"), str(path.relative_to(archive.root)), unit.fetched_at,
         stats.rows, len(kept), max(years) if years else None))
    with cur.copy("COPY donations.donation (id, donor_cui, party, donation_year, donation_date, date_text, amount_bani, kind, source_file_id, source_row) FROM STDIN") as copy:
        for i, d in enumerate(kept, 1):
            copy.write_row((i, d.cui, d.party, d.year, d.date, d.date_text, d.amount_bani, d.kind, 1, d.row_id))
    summary.files = 1
    summary.rows = stats.rows
    summary.loaded = len(kept)
    summary.dropped_no_cui = stats.no_cui
    summary.dropped_sole_trader = len(donations) - len(kept)
    summary.dropped_other = stats.bad_amount + stats.unknown_kind
    summary.through_year = max(years) if years else None
    return summary
