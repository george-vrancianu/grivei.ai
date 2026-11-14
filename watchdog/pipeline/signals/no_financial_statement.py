"""`no-financial-statement` (story 56): an SRL or SA awarded at least 1M RON in a year with no financial statement for that fiscal year or the year before.

- Legal form: ONRC's `FORMA_JURIDICA` of the supplier's primary registration, read as an SRL or an SA (`reference.company_form`, in full or as the
  abbreviation). Sole traders, public institutions, other forms and a supplier ONRC does not list never trigger (unknown is not a non-filer).
- Awards: the supplier's counted shares (as for `few-employees`: a consortium member's equal share; blank, suspect and ceiling Records add nothing) in the
  calendar year of the Records' award dates, at least 1M RON (exactly 1M RON counts). The Signal's Records are its counted Records of that year.
- No statement: the graph holds no statement of that CUI for the award year Y nor for Y-1 (any release). One of the two is enough to stay out.
- The newest fiscal year is left out until its revised release. MF publishes a year's statements in June of the next year and re-publishes them, corrected
  and completed, a year later: until then a missing statement may only be missing from the first release. The newest fiscal year held counts as complete only
  when its revised release is held too; otherwise award years from it onwards are never evaluated. Award years are also not evaluated unless the year before
  is one the graph holds statements for (the first fiscal year held is 2021, so the first evaluated award year is 2022). The rule is absent (no methodology
  row) when no statement is loaded at all.
- A company registered in the award year, or just before it, may legitimately have no statement yet; a statement may be filed under another CUI after a merger.
  A Signal is a lead.
- Consortia: a Record triggers when any of its keyed winners meets the rule.
- Numbers: `fiscalYear` (the award year), the supplier's `awarded` total for it and its `legalForm` (SRL or SA).
"""
from __future__ import annotations

from dataclasses import dataclass

from .common import Hit, Row, authority_day_hits
from .reference import MILLION_RON, company_form, supplier_where, supplier_year_awards_sql, winner_keys

SLUG = "NO_FINANCIAL_STATEMENT"
KINDS = ("DA", "DAN", "CONTRACT", "AWARD_NOTICE")
WHERE = "NOT suspect AND counted_bani > 0"
AWARDS_BANI = MILLION_RON


@dataclass(frozen=True)
class Context:
    first_year: int  # the first award year evaluated: the first fiscal year held, plus one
    last_year: int  # the last: the newest fiscal year held, or the one before when its revised release is not held
    found: dict[tuple[str, int], tuple[int, str]]  # (CUI, year) -> (awarded in bani, 'SRL' | 'SA')


def base_year(context: Context) -> int:
    return context.last_year


def evaluated_years(years: list[int], newest_has_revised: bool) -> tuple[int, int] | None:
    """(first, last) award year the rule evaluates from the fiscal years held, or None when no year can be."""
    if not years:
        return None
    first, last = min(years) + 1, max(years) if newest_has_revised else max(years) - 1
    return (first, last) if first <= last else None


def load(cur) -> Context | None:
    cur.execute("SELECT EXISTS (SELECT 1 FROM financials.statement)")
    if not cur.fetchone()[0]:
        return None
    cur.execute("SELECT DISTINCT fiscal_year FROM financials.source_file")
    years = [y for (y,) in cur.fetchall()]
    cur.execute("SELECT EXISTS (SELECT 1 FROM financials.source_file WHERE revision = 'REVISED' AND fiscal_year = (SELECT max(fiscal_year) FROM financials.source_file))")
    span = evaluated_years(years, cur.fetchone()[0])
    if span is None:
        return None  # no award year can be evaluated: the rule is absent
    first, last = span
    cur.execute(
        f"""SELECT t.supplier_key, t.award_year, t.awarded, r.legal_form
             FROM ({supplier_year_awards_sql(' AND award_year BETWEEN %s AND %s')}) t
             JOIN onrc.registration r ON r.cui = t.supplier_key AND r.primary_for_cui
            WHERE NOT EXISTS (SELECT 1 FROM financials.statement f WHERE f.cui = t.supplier_key AND f.fiscal_year IN (t.award_year, t.award_year - 1))""",
        (first, last, AWARDS_BANI))
    found = {(cui, year): (awarded, form) for cui, year, awarded, legal in cur.fetchall() if (form := company_form(legal)) is not None}
    return Context(first, last, found)


def where(context: Context) -> tuple[str, tuple]:
    return supplier_where(WHERE, {cui for cui, _ in context.found})


def match(row: Row, context: Context) -> dict | None:
    counted = row.get("counted_bani")
    if row["kind"] not in KINDS or row.get("suspect") or counted is None or int(counted) <= 0:  # type: ignore[call-overload]
        return None
    year = row["award_date"].year  # type: ignore[attr-defined]
    if not context.first_year <= year <= context.last_year:
        return None
    hits = [context.found[(k, year)] for k in winner_keys(row) if (k, year) in context.found]
    if not hits:
        return None
    awarded, form = max(hits)
    return {"fiscalYear": year, "awarded": str(awarded), "legalForm": form}


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return max((n for _, n in members), key=lambda n: (int(n["awarded"]), n["legalForm"]))


def detect(rows, context: Context) -> list[Hit]:
    return authority_day_hits(SLUG, rows, lambda row: match(row, context), _combine)
