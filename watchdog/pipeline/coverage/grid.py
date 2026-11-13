"""The Coverage grid (#79): one cell per (quarter, record kind) of SEAP, from 2021 Q1 to the quarter of "today".

Pure: `compute_grid(Inputs)` decides every cell's state from facts the rebuild gathered (see build.py), so it is tested without a
database. The published rules live here and are mirrored in `watchdog/README.md`:

State precedence, first match wins (kind and quarter are the cell's):

 1. hand-entered known gap (known_gaps.csv)           KNOWN_GAP            rule HAND_ENTERED, note = the file's reason, verbatim
 2. a bulk file of the quarter and kind is loaded     POSSIBLY_INCOMPLETE  rule COUNT_BELOW_NEIGHBOURS, when `below_neighbours` says so
                                                      LOADED               otherwise
 3. AWARD_NOTICE in 2021-22 (no bulk file exists):
      the backfill's pass 1 covers the whole quarter  LOADED               rule null ("covered via e-licitatie")
      else, a bulk file of it was quarantined         NOT_YET_LOADED       rule null
      else                                            NOT_IN_SOURCE        rule NO_PRIOR_CALL_BEFORE_BACKFILL
 4. provisional crawled Records exist (no bulk file) CRAWLED_PROVISIONAL  rule AWAITING_BULK_FILE
 5. a bulk file of it was quarantined                 NOT_YET_LOADED       rule null, no note (the quarantine and its reason stay private)
 6. nothing                                           NOT_YET_LOADED       rule AWAITING_BULK_FILE

Provisional = crawled and not backfilled: a backfilled Record (crawl-only from the start) does not make its quarter provisional, so a hole
quarter holding only backfilled Records falls through to step 5 or 6, with its Record count.

A quarantined file is "as if it did not exist" for steps 4 and 6 (a quarter that is quarantined but has crawled Records is crawled
provisional); only the rule differs when nothing else is there.

Per cell: `records` = Records of the kind whose publication quarter it is (bulk and crawled, crawl-only ones included, spec l.224);
`crawl_only` = of them, the crawl-only ones (crawled or backfilled Records the bulk file of their quarter does not hold, #60/#90), whatever the state.
`data_through` = loaded or covered cell: the latest publication date among those Records (null when there are none); crawled
provisional cell: the kind's crawl data-through (the end of the unbroken run of complete crawl days), never past the quarter's end,
when that run starts no later than the quarter's end, else (a hole quarter the run never covered) the latest Record date; known gap: the latest Record date, if any; NOT_YET_LOADED, NOT_IN_SOURCE: null.
"""
from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from datetime import date
from statistics import median

KINDS = ("DA", "DAN", "CONTRACT", "AWARD_NOTICE")  # SeapRecordKind, in the contract's order
FIRST_QUARTER = (2021, 1)
NO_PRIOR_CALL_THROUGH = (2022, 4)  # the 2021-22 award notices (contracts awarded without a prior call) are not in any bulk file

# The possibly-incomplete rule (the published one): a quarter's row count is below 60% of the median row count of the surrounding quarters.
THRESHOLD = 0.6
NEIGHBOURS_EACH_SIDE = 2  # the nearest loaded quarters of the same kind before, and as many after
MIN_NEIGHBOURS = 2  # fewer than this and the rule does not apply

Quarter = tuple[int, int]  # (2024, 4)


def quarter_of(day: date) -> Quarter:
    return (day.year, (day.month - 1) // 3 + 1)


def label(q: Quarter) -> str:
    """The contract's quarter text, `2024-Q4`."""
    return f"{q[0]}-Q{q[1]}"


def parse_quarter(text: str) -> Quarter:
    """`2024-Q4` or the archive's `2024Q4`."""
    year, _, number = text.strip().upper().replace("-", "").partition("Q")
    if len(year) != 4 or not year.isdigit() or number not in ("1", "2", "3", "4"):
        raise ValueError(f"not a quarter: {text!r}")
    return (int(year), int(number))


def first_day(q: Quarter) -> date:
    return date(q[0], 3 * q[1] - 2, 1)


def last_day(q: Quarter) -> date:
    month = 3 * q[1]
    return date(q[0], month, calendar.monthrange(q[0], month)[1])


def quarters_to(today: date) -> list[Quarter]:
    """Every quarter from 2021 Q1 to the one of `today`."""
    out, q, end = [], FIRST_QUARTER, quarter_of(today)
    while q <= end:
        out.append(q)
        q = (q[0], q[1] + 1) if q[1] < 4 else (q[0] + 1, 1)
    return out


# ---- the possibly-incomplete rule ---------------------------------------------------------------------------------------


def below_neighbours(rows: int, neighbours: list[int]) -> bool:
    """The published rule, pure: fewer than `THRESHOLD` of the median of the neighbours' row counts (strictly: exactly 60% is not flagged).
    Not evaluated (False) with fewer than `MIN_NEIGHBOURS` neighbours."""
    if len(neighbours) < MIN_NEIGHBOURS:
        return False
    return rows < THRESHOLD * median(neighbours)


def neighbour_rows(candidate: Quarter, rows_by_quarter: dict[Quarter, int]) -> list[int]:
    """Row counts of the up to two nearest quarters before and two after `candidate` among `rows_by_quarter` (the quarters with a loaded
    bulk file of the kind that no hand-entered gap covers), the candidate itself left out."""
    before = sorted(q for q in rows_by_quarter if q < candidate)[-NEIGHBOURS_EACH_SIDE:]
    after = sorted(q for q in rows_by_quarter if q > candidate)[:NEIGHBOURS_EACH_SIDE]
    return [rows_by_quarter[q] for q in (*before, *after)]


# ---- the grid -----------------------------------------------------------------------------------------------------------------


@dataclass
class CellFacts:
    records: int = 0  # Records of the kind published in the quarter, any way they were obtained
    crawled: int = 0  # of them, via the crawl (provisional and crawl-only, and the backfill's)
    latest: date | None = None  # the latest publication date among them
    provisional: int = 0  # of the crawled ones, those still provisional (no bulk file of the kind and quarter, not backfilled)
    crawl_only: int = 0  # of the crawled ones, those crawl-only (the bulk has the quarter, not them; or backfilled)


@dataclass
class Inputs:
    today: date
    bulk_rows: dict[tuple[str, Quarter], int] = field(default_factory=dict)  # (kind, quarter) with a loaded bulk file -> data rows read (the largest file)
    quarantined: set[tuple[str, Quarter]] = field(default_factory=set)  # a bulk unit of it sits in the quarantine area
    facts: dict[tuple[str, Quarter], CellFacts] = field(default_factory=dict)
    crawl_through: dict[str, date] = field(default_factory=dict)  # per crawled kind
    crawl_from: dict[str, date] = field(default_factory=dict)  # per crawled kind: where its unbroken run of crawl days starts
    backfilled: set[Quarter] = field(default_factory=set)  # the 2021-22 quarters whose every backfill week is complete
    known_gaps: dict[tuple[str, Quarter], str] = field(default_factory=dict)  # (kind, quarter) -> the operator's reason


@dataclass(frozen=True)
class Cell:
    quarter: str  # `2024-Q4`
    kind: str
    state: str  # GapState
    rule: str | None  # GapRule
    note: str | None
    records: int
    data_through: date | None
    crawl_only: int = 0  # of `records`, the crawl-only ones (#60/#90)


def compute_grid(inputs: Inputs) -> list[Cell]:
    """Every (quarter, kind) from 2021 Q1 to today's quarter, oldest quarter first, kinds in `KINDS` order."""
    eligible: dict[str, dict[Quarter, int]] = {
        kind: {q: rows for (k, q), rows in inputs.bulk_rows.items() if k == kind and (k, q) not in inputs.known_gaps}
        for kind in KINDS
    }
    cells = []
    for q in quarters_to(inputs.today):
        for kind in KINDS:
            cells.append(_cell(inputs, eligible[kind], q, kind))
    return cells


def _cell(inputs: Inputs, eligible: dict[Quarter, int], q: Quarter, kind: str) -> Cell:
    key = (kind, q)
    facts = inputs.facts.get(key) or CellFacts()

    def cell(state: str, rule: str | None = None, note: str | None = None, through: date | None = None) -> Cell:
        return Cell(label(q), kind, state, rule, note, facts.records, through, facts.crawl_only)

    if key in inputs.known_gaps:
        return cell("KNOWN_GAP", "HAND_ENTERED", inputs.known_gaps[key], facts.latest)
    if key in inputs.bulk_rows:
        if q in eligible and below_neighbours(eligible[q], neighbour_rows(q, eligible)):
            return cell("POSSIBLY_INCOMPLETE", "COUNT_BELOW_NEIGHBOURS", through=facts.latest)
        return cell("LOADED", through=facts.latest)
    if kind == "AWARD_NOTICE" and q <= NO_PRIOR_CALL_THROUGH:
        if q in inputs.backfilled:
            return cell("LOADED", through=facts.latest)  # covered via e-licitatie
        if key in inputs.quarantined:
            return cell("NOT_YET_LOADED")
        return cell("NOT_IN_SOURCE", "NO_PRIOR_CALL_BEFORE_BACKFILL")
    if facts.provisional:
        through, start = inputs.crawl_through.get(kind), inputs.crawl_from.get(kind)
        # the run covers the quarter only when it starts no later than the quarter's end; a quarter before it (a hole between bulk
        # files, filled by the backfill or a stray crawl) was not crawled through, so it claims only its latest Record
        covered = through is not None and start is not None and start <= last_day(q)
        return cell("CRAWLED_PROVISIONAL", "AWAITING_BULK_FILE", through=min(through, last_day(q)) if covered else facts.latest)
    if key in inputs.quarantined:
        return cell("NOT_YET_LOADED")
    return cell("NOT_YET_LOADED", "AWAITING_BULK_FILE")


def flagged(cells: list[Cell]) -> list[str]:
    """Progress lines for the cells a reader should look at: possibly incomplete, hand-entered gaps and not-yet-loaded bulk files.
    A not-yet-loaded cell is reported without saying why (a quarantine is not shown; the rebuild's quarantine lines say it)."""
    out = []
    for c in cells:
        if c.state == "POSSIBLY_INCOMPLETE":
            out.append(f"coverage: {c.quarter} {c.kind} possibly incomplete (fewer than {int(THRESHOLD * 100)}% of the median of its neighbouring quarters), {c.records} records")
        elif c.state == "NOT_YET_LOADED" and c.rule is None:
            out.append(f"coverage: {c.quarter} {c.kind} not yet loaded")
        elif c.state == "KNOWN_GAP":
            out.append(f"coverage: {c.quarter} {c.kind} known gap (hand-entered)")
    return out
