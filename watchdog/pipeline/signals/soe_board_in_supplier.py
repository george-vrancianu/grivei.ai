"""`soe-board-in-supplier` (story 58, RESTRICTED, ADR 0011 and ADR 0015): a person with an ONRC role in a public enterprise also holds a role in one of that
enterprise's private suppliers, and the enterprise awarded that supplier a Record.

This is the only rule that joins one person's roles across organisations, so it is Restricted: the rule, its Signals, its Records, their counts and its firing rate
are served only when the host's `GRIVEI_RESTRICTED` is exactly `show` (the API gates it; `seap.search.signals` and `has_signals` never carry it, so no public
filter, facet or count can reveal it).

- Public enterprise: a CUI on AMEPIP's list (`amepip.enterprise`, in any financial year of the newest release; the list is not "currently listed"). Its Records as
  the awarding authority are the ones read.
- Person: a CONFIRMED person key only (ONRC's name plus full birth date, ADR 0011: `onrc.role.link = 'LINKED'`). A namesake with another birth date is another
  person; a possible match, an unlinked holder and a role with no birth date are never joined. Sole traders (PFA, II, IF) and family-enterprise rows are not read:
  the holder of a sole trader is the registration itself.
- Role: any role the legal-representative file lists for the person in the enterprise and in the supplier (administrator, legal representative, ...), as of ONRC's
  newest snapshot. A role is not dated, so the rule cannot tell whether the person held it when the contract was awarded: it is a lead.
- Supplier: a keyed winner of the Record that is not itself a public enterprise. A supplier on AMEPIP's list is left out, even when the person administers both.
- Consortia: a Record triggers when any of its keyed winners meets the rule.
- Numbers: the number of persons the enterprise and the supplier share. No name, no birth date and no person id is in a Signal.
"""
from __future__ import annotations

from .common import Hit, Row, authority_day_hits
from .reference import winner_keys

SLUG = "SOE_BOARD_IN_SUPPLIER"
KINDS = ("DA", "DAN", "CONTRACT", "AWARD_NOTICE")
WHERE = "NOT suspect"
RESTRICTED = True  # the API serves nothing of this rule unless `GRIVEI_RESTRICTED=show` (signals/__init__.py `restricted_slugs`)


class Context:
    """`shared`: (enterprise CUI, supplier CUI) -> how many confirmed persons hold a role in both, for the pairs where the enterprise awarded the supplier a Record."""

    def __init__(self, shared: dict[tuple[str, str], int]):
        self.shared = shared


def load(cur) -> Context | None:
    cur.execute("SELECT EXISTS (SELECT 1 FROM amepip.enterprise) AND EXISTS (SELECT 1 FROM onrc.role WHERE link = 'LINKED')")
    if not cur.fetchone()[0]:
        return None
    # set-based on purpose (seap.search has no supplier index yet): the confirmed persons' CUIs, joined to the enterprise-supplier pairs that have a Record
    cur.execute(
        """WITH held AS (
               SELECT DISTINCT r.person_id, g.cui
                 FROM onrc.role r JOIN onrc.registration g ON g.reg_no = r.reg_no
                WHERE r.link = 'LINKED' AND r.kind = 'LEGAL' AND r.person_id IS NOT NULL AND g.cui IS NOT NULL),
             awarded AS (
               SELECT DISTINCT authority_key, supplier_key FROM seap.search
                WHERE NOT suspect AND supplier_key IS NOT NULL AND authority_key IN (SELECT cui FROM amepip.enterprise))
           SELECT a.cui, b.cui, count(*)::int
             FROM held a
             JOIN held b ON b.person_id = a.person_id AND b.cui <> a.cui
             JOIN awarded w ON w.authority_key = a.cui AND w.supplier_key = b.cui
            WHERE a.cui IN (SELECT cui FROM amepip.enterprise) AND b.cui NOT IN (SELECT cui FROM amepip.enterprise)
            GROUP BY a.cui, b.cui""")
    return Context({(enterprise, supplier): n for enterprise, supplier, n in cur.fetchall()})


def where(context: Context) -> tuple[str, tuple]:
    return (f"{WHERE} AND authority_key = ANY(%s) AND EXISTS (SELECT 1 FROM seap.search s WHERE s.record_code = seap.record.code AND s.supplier_key = ANY(%s))",
            (sorted({e for e, _ in context.shared}), sorted({s for _, s in context.shared})))


def match(row: Row, context: Context) -> dict | None:
    authority = row.get("authority_key")
    if row["kind"] not in KINDS or row.get("suspect") or not authority:
        return None
    persons = [context.shared[(authority, k)] for k in winner_keys(row) if (authority, k) in context.shared]  # type: ignore[index]
    return {"persons": max(persons)} if persons else None


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return {"persons": max(n["persons"] for _, n in members)}


def detect(rows, context: Context) -> list[Hit]:
    return authority_day_hits(SLUG, rows, lambda row: match(row, context), _combine)
