"""The `sources` registry (spec #173, First reuse): one entry per Source the graph holds.

Every generic reader goes through it: `pipeline rebuild` stores it as `core.source` (the API's `sources` query and `coverage(source)` read
that table), `pipeline status` calls each entry's `status` hook, and the landing page's row for the Source is checked against the entry
(`tests/test_sources_registry.py`; `site/` is static HTML and cannot read the registry).

Adding a Source means adding an entry here and its own schema file (`sql/<schema>_schema.sql`, applied by the rebuild's schema step), and
its API adapter (`explorer/packages/api/src/sources.ts`). No SEAP code path changes. Reference sources (ANAF, the MF list) are not entries:
they are never explorable on their own.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from .archive import Archive
from . import seap_status
from .onrc import status as onrc_status


@dataclass(frozen=True)
class LandingRow:
    """The Source's row on the landing page (`site/index.html`, `site/ro/index.html`): the wording is copy, so it lives per language."""
    status: str  # live | wip | next | skipped (site/CLAUDE.md)
    name: str
    what: dict[str, str]  # language -> the row's one-line description


@dataclass(frozen=True)
class Source:
    id: str  # the contract's SourceId
    name: str
    schema: str  # the Postgres schema of the Source's own tables (`sql/<schema>_schema.sql`)
    record_kinds: tuple[str, ...]  # in the contract's order
    lenses: tuple[str, ...]  # the explorer lenses the Source declares (a Source with no money measure declares a count lens)
    placement_rule: str  # what puts one of its records in a county (records that can't be placed go to the Unplaced tile)
    methodology_anchor: str  # the methodology page's section that explains the Source's measure (`/explore/methodology#<anchor>`)
    landing_row: LandingRow
    data_through_sql: str  # rows of (record kind, date as text): the Source's data-through date per record kind
    # `pipeline status`: print the Source's own sections and return the exit code; args are (archive, parsed CLI args, rebuild status, ANAF status, code so far)
    status: Callable[[Archive, object, dict | None, dict | None, int], int]


# SEAP's data-through date per Record kind, used by `pipeline status` and the rebuild; the API's `store.dataThrough()` keeps its own copy, and the two must agree: the latest publication
# date of the bulk Records, and for the crawled kinds the end of the unbroken run of complete crawl days after the kind's last bulk quarter
# (crawled Records' own dates do not count: one past a hole would hide the hole; a crawled day with nothing new still means "looked through that day").
SEAP_DATA_THROUGH_SQL = """
SELECT kind, max(d)::text FROM (
    SELECT kind, max(published_on) AS d FROM seap.record WHERE via IS DISTINCT FROM 'CRAWL' GROUP BY kind
    UNION ALL
    SELECT kind, through FROM seap.crawl_state
) x GROUP BY kind ORDER BY kind"""

SEAP = Source(
    id="SEAP",
    name="SEAP",
    schema="seap",
    record_kinds=("DA", "DAN", "CONTRACT", "AWARD_NOTICE"),
    lenses=("MONEY", "COVERAGE", "FLOW"),
    placement_rule="the contracting authority's seat (ANAF's address, else SEAP's), by county and UAT; a national authority sits beside the map",
    methodology_anchor="awarded-value",
    landing_row=LandingRow("live", "SEAP", {"en": "Direct purchases, award notices, contracts", "ro": "Achiziții directe, anunțuri de atribuire, contracte"}),
    data_through_sql=SEAP_DATA_THROUGH_SQL,
    status=seap_status.describe_status,
)

# ONRC's data-through date per Record kind: the newest snapshot read (the whole register is as of that date). Its roles join with ticket #177.
ONRC_DATA_THROUGH_SQL = "SELECT 'REGISTRATION', max(snapshot_date)::text FROM onrc.snapshot HAVING count(*) > 0"

ONRC = Source(
    id="ONRC",
    name="ONRC",
    schema="onrc",
    record_kinds=("REGISTRATION",),
    lenses=("COUNT",),
    placement_rule="the registered seat's county (the UAT from ANAF's placement when the CUI has one); a registration with no county goes to the Unplaced tile",
    methodology_anchor="onrc-registrations",
    landing_row=LandingRow("wip", "ONRC", {"en": "Company directors, status and activity codes", "ro": "Administratori, stare și coduri CAEN ale firmelor"}),
    data_through_sql=ONRC_DATA_THROUGH_SQL,
    status=onrc_status.describe_status,
)

# Order is the order the `sources` query lists them in (harvested Sources first, then the planned ones the API names).
SOURCES: tuple[Source, ...] = (SEAP, ONRC)


def by_id(source_id: str) -> Source:
    for s in SOURCES:
        if s.id == source_id:
            return s
    raise KeyError(source_id)
