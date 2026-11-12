"""`no-publication` (story 73): every contract awarded by negotiation without prior publication.

- The procedure is told by `Tip procedura` (bulk) or `sysProcedureType` (crawl and backfill), both stored as `procedure` as published.
  The match ignores case, accents and spacing and takes the prefix `negociere fara publicare`, so "Negociere fara publicare prealabila"
  and its accented or truncated spellings count; other procedures without a prior call that the backfill reads (Norme proprii,
  Procedura simplificata proprie) are not this rule's.
- Contracts and award notices (the Contracte files, the "fara anunt" files, crawled notices and the backfilled 2021-22 ones): a Record
  of channel CONTRACT. A direct purchase has no procedure.
- A suspect value is left out of the Signal altogether (the Record neither triggers nor counts, story 79).
- Numbers: `procedure`, as published on its first Record.
"""
from __future__ import annotations

from ..counting import fold
from .common import Hit, Row, authority_day_hits

SLUG = "NO_PUBLICATION"
KINDS = ("CONTRACT", "AWARD_NOTICE")
WHERE = "channel = 'CONTRACT' AND NOT suspect AND procedure ~* '^\\s*negociere'"
PROCEDURE_PREFIX = "negociere fara publicare"


def is_no_publication(procedure: object) -> bool:
    return fold(str(procedure) if procedure else None).startswith(PROCEDURE_PREFIX)


def match(row: Row) -> dict | None:
    if row["kind"] not in KINDS or row.get("suspect") or not is_no_publication(row.get("procedure")):
        return None
    return {"procedure": str(row["procedure"])}


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return members[0][1]  # the Records are sorted by code, so the first one's spelling is deterministic


def detect(rows) -> list[Hit]:
    return authority_day_hits(SLUG, rows, match, _combine)
