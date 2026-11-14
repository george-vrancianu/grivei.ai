"""`no-construction-caen` (story 52): a works Record of at least 1M RON won by a firm with no construction CAEN among its authorised codes.

- Works: the counting rule's own test (`counting.is_works`: `Tip contract` Lucrari, or CPV division 45), never a copy. The Record's counted value is at least
  1M RON (exactly 1M RON counts); a blank, suspect or ceiling Record counts nothing and never triggers.
- Authorised codes: ONRC's `OD_CAEN_AUTORIZAT` of the supplier's primary registration (the newest snapshot). Construction is division 41, 42 or 43 of CAEN
  Rev.2 (2008) and of Rev.3 (2025), told by the code's own revision (`onrc.caen.version`); a code of CAEN 1998 or 2003 is construction in division 45. A code
  with no revision is read as Rev.2 or Rev.3. The register lets a firm hold codes it does not use and use codes it does not hold: a Signal is a lead.
- Unknown is never a Signal: a winner with no keyed entity, no ONRC registration or no authorised code loaded (the legacy layout has none) does not
  trigger. A consortium triggers only when every winner has codes on record and none of them has a construction code (one capable member is enough).
- Numbers: the largest counted `value` of the Signal's Records and the number of authorised codes of the firm that has the fewest.
"""
from __future__ import annotations

from ..counting import is_works
from .common import Hit, Row, authority_day_hits
from .reference import MILLION_RON, is_construction_caen, winner_keys

SLUG = "NO_CONSTRUCTION_CAEN"
KINDS = ("DA", "DAN", "CONTRACT", "AWARD_NOTICE")
THRESHOLD_BANI = MILLION_RON
WHERE = f"NOT suspect AND counted_bani >= {THRESHOLD_BANI}"


def load(cur) -> dict[str, list[tuple[str, int | None]]] | None:
    """CUI -> authorised (code, revision) pairs, for the suppliers of the works Records of at least the threshold."""
    cur.execute("SELECT EXISTS (SELECT 1 FROM onrc.caen)")
    if not cur.fetchone()[0]:
        return None
    cur.execute(
        """SELECT r.cui, c.code, c.version FROM onrc.registration r JOIN onrc.caen c ON c.reg_no = r.reg_no
            WHERE r.primary_for_cui AND r.cui IS NOT NULL
              AND EXISTS (SELECT 1 FROM seap.search s WHERE s.supplier_key = r.cui AND NOT s.suspect AND s.counted_bani >= %s)""", (THRESHOLD_BANI,))
    codes: dict[str, list[tuple[str, int | None]]] = {}
    for cui, code, version in cur.fetchall():
        codes.setdefault(cui, []).append((code, version))
    return codes


def match(row: Row, codes: dict[str, list[tuple[str, int | None]]]) -> dict | None:
    counted = row.get("counted_bani")
    if row["kind"] not in KINDS or row.get("suspect") or counted is None or int(counted) < THRESHOLD_BANI:  # type: ignore[call-overload]
        return None
    if not is_works(row.get("contract_type"), row.get("cpv_code")):  # type: ignore[arg-type]
        return None
    winners = row.get("winners") or ()
    keys = winner_keys(row)
    if not keys or len(keys) != len(winners) or any(not codes.get(k) for k in keys):
        return None  # a natural person, a winner without an entity or one with no authorised code on record: unknown, never a Signal
    if any(is_construction_caen(code, version) for k in keys for code, version in codes[k]):
        return None
    return {"value": str(counted), "authorisedCodes": min(len(codes[k]) for k in keys)}


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return {"value": max((n["value"] for _, n in members), key=int), "authorisedCodes": min(n["authorisedCodes"] for _, n in members)}


def detect(rows, codes) -> list[Hit]:
    return authority_day_hits(SLUG, rows, lambda row: match(row, codes), _combine)


def where(codes) -> tuple[str, tuple]:
    return (f"{WHERE} AND EXISTS (SELECT 1 FROM seap.search s WHERE s.record_code = seap.record.code AND s.supplier_key = ANY(%s))", (sorted(codes),))
