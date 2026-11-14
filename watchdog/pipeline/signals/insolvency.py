"""`insolvency` (story 54): the supplier is now in insolvency or reorganisation and has Records in the last 6 months.

- Status: ONRC's status codes of the newest held snapshot (`onrc.status_span` runs that reach it), by the status NAME ONRC publishes in its nomenclature
  (`onrc.status_name`): a name that folds to something containing "insolven", "reorganizare" or "faliment" (insolvency, judicial reorganisation, bankruptcy:
  the stages of one procedure). No code number is assumed; a status whose name is not in the nomenclature is never read. Other statuses (dissolution,
  liquidation, suspension, struck off) are not this rule's.
- The status is UNDATED. ONRC's open data gives only the statuses a company shows in each snapshot, so the graph knows the snapshot it was FIRST SEEN in
  (`firstSeen`), and, when that is the earliest snapshot held, that it is "since at least" then (`sinceAtLeast`). The insolvency may have begun long before,
  or after the Record: the Signal says "now in insolvency and won recently", never "won while in insolvency".
- "Now" is the newest ONRC snapshot's date; "the last 6 months" are the 6 calendar months up to and including it (a Record exactly 6 months before counts). A
  Record dated after the snapshot is outside what ONRC's status says. Any non-suspect Record counts, whatever its value.
- Consortia: a Record triggers when any of its keyed winners is in such a status.
- Numbers: the status name as ONRC publishes it, the snapshot it was `firstSeen` in and whether that is `sinceAtLeast`.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from ..counting import fold
from .common import Hit, Row, authority_day_hits
from .reference import months_before, winner_keys

SLUG = "INSOLVENCY"
KINDS = ("DA", "DAN", "CONTRACT", "AWARD_NOTICE")
WHERE = "NOT suspect"
WINDOW_MONTHS = 6
STATUS_WORDS = ("insolven", "reorganizare", "faliment")  # in the folded name of the status


@dataclass(frozen=True)
class Status:
    name: str
    first_seen: date
    since_at_least: bool


@dataclass(frozen=True)
class Context:
    snapshot: date  # the newest snapshot: "now"
    insolvent: dict[str, Status]  # CUI -> the status the rule found (the earliest first seen when several)


def is_insolvency_status(name: str | None) -> bool:
    return any(word in fold(name) for word in STATUS_WORDS)


def load(cur) -> Context | None:
    cur.execute("SELECT code, name FROM onrc.status_name")
    codes = [code for code, name in cur.fetchall() if is_insolvency_status(name)]
    cur.execute("SELECT max(snapshot_date) FROM onrc.registration")
    snapshot = cur.fetchone()[0]
    cur.execute("SELECT EXISTS (SELECT 1 FROM onrc.status_name)")
    if snapshot is None or not cur.fetchone()[0]:
        return None
    cur.execute(
        """SELECT r.cui, n.name, s.first_seen, s.since_at_least
             FROM onrc.registration r JOIN onrc.status_span s ON s.reg_no = r.reg_no AND s.last_seen = r.snapshot_date
             JOIN onrc.status_name n ON n.code = s.code
            WHERE r.primary_for_cui AND r.cui IS NOT NULL AND s.code = ANY(%s)
              AND EXISTS (SELECT 1 FROM seap.search x WHERE x.supplier_key = r.cui)
            ORDER BY r.cui, s.first_seen, n.name""", (codes,))
    found: dict[str, Status] = {}
    for cui, name, first_seen, since_at_least in cur.fetchall():
        found.setdefault(cui, Status(name, first_seen, since_at_least))
    return Context(snapshot, found)


def where(context: Context) -> tuple[str, tuple]:
    return ("NOT suspect AND award_date BETWEEN %s AND %s AND EXISTS (SELECT 1 FROM seap.search s WHERE s.record_code = seap.record.code AND s.supplier_key = ANY(%s))",
            (months_before(context.snapshot, WINDOW_MONTHS), context.snapshot, sorted(context.insolvent)))


def match(row: Row, context: Context) -> dict | None:
    if row["kind"] not in KINDS or row.get("suspect"):
        return None
    if not months_before(context.snapshot, WINDOW_MONTHS) <= row["award_date"] <= context.snapshot:  # type: ignore[operator]
        return None
    found = [context.insolvent[k] for k in winner_keys(row) if k in context.insolvent]
    if not found:
        return None
    first = min(found, key=lambda s: (s.first_seen, s.name))
    return {"status": first.name, "firstSeen": first.first_seen.isoformat(), "sinceAtLeast": first.since_at_least}


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return min((n for _, n in members), key=lambda n: (n["firstSeen"], n["status"]))


def detect(rows, context: Context) -> list[Hit]:
    return authority_day_hits(SLUG, rows, lambda row: match(row, context), _combine)
