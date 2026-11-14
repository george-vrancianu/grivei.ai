"""`few-employees` (story 55): awards of at least 5M RON in a year to a supplier that reports at most one average employee for that fiscal year.

- Awards: what the supplier was awarded as a winner in the calendar year of the Records' award dates (ADR 0002): the sum of its counted shares (a consortium
  member has an equal share of the value; a blank, suspect or ceiling Record adds nothing), the same figure the entity page shows per year. At least 5M RON
  (exactly 5M RON counts). The Signal's Records are the supplier's counted Records of that year.
- Employees: MF's "numar mediu de salariati" (I20) of the same fiscal year as the award year, from the statement the graph holds (the revised release where
  there is one). One or none (0 and 1) counts; a BLANK count is "not reported" and never fires, and no statement for the year means no Signal (an award year
  newer than the newest fiscal year held cannot fire).
- The count is a yearly average that a firm may also keep low by outsourcing or by employing through another company, and a statement may carry a stale or
  mistaken figure: a Signal is a lead.
- Consortia: a Record triggers when any of its keyed winners meets the rule.
- Numbers: `fiscalYear`, the reported `employees` and the supplier's `awarded` total for the year (the largest among the Signal's suppliers).
"""
from __future__ import annotations

from dataclasses import dataclass

from .common import Hit, Row, authority_day_hits
from .reference import FIVE_MILLION_RON, supplier_where, supplier_year_awards_sql, winner_keys

SLUG = "FEW_EMPLOYEES"
KINDS = ("DA", "DAN", "CONTRACT", "AWARD_NOTICE")
WHERE = "NOT suspect AND counted_bani > 0"
AWARDS_BANI = FIVE_MILLION_RON
MAX_EMPLOYEES = 1


def qualifies(awarded: int, employees: int | None) -> bool:
    """A blank employee count (None) never fires."""
    return employees is not None and employees <= MAX_EMPLOYEES and awarded >= AWARDS_BANI


@dataclass(frozen=True)
class Context:
    last_year: int  # the newest fiscal year held: the newest award year the rule can see
    found: dict[tuple[str, int], tuple[int, int]]  # (CUI, year) -> (employees, awarded in bani), for the supplier-years that qualify


def base_year(context: Context) -> int:
    return context.last_year


def load(cur) -> Context | None:
    cur.execute("SELECT max(fiscal_year) FROM financials.statement")
    last = cur.fetchone()[0]
    if last is None:
        return None
    cur.execute(
        f"""SELECT t.supplier_key, t.award_year, f.employees, t.awarded
             FROM ({supplier_year_awards_sql()}) t
             JOIN financials.statement f ON f.cui = t.supplier_key AND f.fiscal_year = t.award_year
            WHERE f.employees IS NOT NULL AND f.employees <= %s""", (AWARDS_BANI, MAX_EMPLOYEES))
    return Context(last, {(cui, year): (employees, awarded) for cui, year, employees, awarded in cur.fetchall() if qualifies(awarded, employees)})


def where(context: Context) -> tuple[str, tuple]:
    return supplier_where(WHERE, {cui for cui, _ in context.found})


def match(row: Row, context: Context) -> dict | None:
    found = context.found
    counted = row.get("counted_bani")
    if row["kind"] not in KINDS or row.get("suspect") or counted is None or int(counted) <= 0:  # type: ignore[call-overload]
        return None
    year = row["award_date"].year  # type: ignore[attr-defined]
    hits = [(found[(k, year)][1], found[(k, year)][0]) for k in winner_keys(row) if (k, year) in found]  # (awarded, employees)
    if not hits:
        return None
    awarded, employees = max(hits)
    return {"fiscalYear": year, "employees": employees, "awarded": str(awarded)}


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return max((n for _, n in members), key=lambda n: (int(n["awarded"]), -n["employees"]))


def detect(rows, context: Context) -> list[Hit]:
    return authority_day_hits(SLUG, rows, lambda row: match(row, context), _combine)
