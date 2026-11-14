"""`donor-to-party` (story 57): a firm donor or lender wins from an authority whose Mandate's Party received its money within 365 days before the award.

- Donation: a firm's donation or loan to a party, from BaniPartide (`donations.donation`), with the one readable day of the donation. A donation whose cell
  holds no single readable date (a list of dates, none) has no day and never triggers. The donor is the firm's CUI, the same string as the supplier's key. Sole
  traders (PFA, II, IF) and individuals are not in the donations at all (ADR 0009), so no Signal can name one.
- Party: the Party of the Mandate in force at the Record's authority on its award date (`aep.record_party`, ADR 0012): the Mandate's list as registered, an
  alliance's recorded member parties, and, for a subordinate body, the Party it inherits from its principal credit holder (a derived Party, weaker: the Signal says
  so). A Record with no Mandate, an independent leader's Mandate (Independent is no party), a handover window or a gap has no Party and never triggers.
- Match: the donation's party is the Mandate's list or one of the alliance's recorded member parties, through the reviewed, versioned party-name table
  (`party_names.toml`: an abbreviation or a spelling, a reason per entry). A predecessor or successor party is never merged, and an alliance is matched through its
  own name or its member parties only.
- Window: from 365 days before the award date up to the award date itself, both days in (day 365 is in, day 366 is not; a donation after the award is not). The
  award date is the Record's own (ADR 0002). Days are calendar days.
- Consortia: a Record triggers when any of its keyed winners is a donor that meets the rule.
- A donation is context for a firm and a Party is context for a Record; only the combination inside the window is a Signal (ADR 0014). It is a lead, not an
  accusation: firms and parties give within the law, and a donation does not say why a contract was awarded.
- Window of the firing rate: the donations end with BaniPartide's newest year, so the national firing rate is measured in that year (an award of a later year
  cannot be matched to donations not yet published), and the window starts in 2021 (the first whole year of AEP's 2020 Mandates).
- Numbers: the smallest `days` from donation to award among the Signal's Records, the Mandate's `party` as registered, whether it is `derived`, and the donation's `kind`.
"""
from __future__ import annotations

from datetime import date

from .common import Hit, Row, authority_day_hits
from .party_names import matches, table

SLUG = "DONOR_TO_PARTY"
KINDS = ("DA", "DAN", "CONTRACT", "AWARD_NOTICE")
WHERE = "NOT suspect"
WINDOW_DAYS = 365
WINDOW_FROM = date(2021, 1, 1)  # the first Mandates of AEP's 2020 local elections come into force in October 2020: the first whole year the rule can see is 2021


class Context:
    """`found`: Record code -> the numbers of its best donation (the one nearest the award), for the Records with a matching donation in the window;
    `last_year`: the newest year BaniPartide's donations cover, the newest year the rule can see (the firing rate is measured in it)."""

    def __init__(self, found: dict[str, dict], last_year: int | None = None):
        self.found, self.last_year = found, last_year


def base_year(context: Context) -> int | None:
    return context.last_year


def best(candidates: list[dict]) -> dict:
    """The donation nearest the award; ties by party text and kind, so the same data always gives the same numbers."""
    return min(candidates, key=lambda n: (n["days"], n["party"], n["kind"]))


def load(cur) -> Context | None:
    cur.execute("SELECT EXISTS (SELECT 1 FROM donations.donation WHERE donation_date IS NOT NULL) AND EXISTS (SELECT 1 FROM aep.record_party), (SELECT max(donation_year) FROM donations.donation)")
    loaded, last_year = cur.fetchone()
    if not loaded:
        return None
    names = table()
    # set-based on purpose: seap.search has no supplier index yet (the record indexes are built after the Signals), so no per-supplier probes
    cur.execute(
        """SELECT s.record_code, (s.award_date - d.donation_date)::int, d.kind, d.party, m.list_name, m.member_parties, rp.via_key IS NOT NULL
             FROM donations.donation d
             JOIN seap.search s ON s.supplier_key = d.donor_cui
             JOIN aep.record_party rp ON rp.record_code = s.record_code
             JOIN aep.mandate m ON m.id = rp.mandate_id
            WHERE d.donation_date IS NOT NULL AND NOT s.suspect AND NOT m.independent
              AND s.award_date - d.donation_date BETWEEN 0 AND %s""", (WINDOW_DAYS,))
    candidates: dict[str, list[dict]] = {}
    for code, days, kind, published, list_name, members, derived in cur.fetchall():
        if matches(published, list_name, members, names=names):
            candidates.setdefault(code, []).append({"days": days, "party": list_name, "derived": bool(derived), "kind": kind})
    return Context({code: best(found) for code, found in candidates.items()}, last_year)


def where(context: Context) -> tuple[str, tuple]:
    return f"{WHERE} AND code = ANY(%s)", (sorted(context.found),)


def match(row: Row, context: Context) -> dict | None:
    if row["kind"] not in KINDS or row.get("suspect"):
        return None
    found = context.found.get(str(row["code"]))
    return dict(found) if found else None


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return best([n for _, n in members])


def detect(rows, context: Context) -> list[Hit]:
    return authority_day_hits(SLUG, rows, lambda row: match(row, context), _combine)
