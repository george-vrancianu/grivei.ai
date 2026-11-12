"""Release 1 acceptance checks that read what the pipeline left behind (#91): the validation fixture and the unattended week.

- `check_fixture`: the Brasov / Timisoara crawl batches (`watchdog/data/raw/seap_*_2024_2026.json`, the first harvest) against the
  graph a rebuild loaded from bulk. It repeats #5's measurement, recorded in `docs/research/seap-bulk-sources.md` on the branch
  `research/seap-bulk-sources` ("Completeness test against the crawl"): Brasov (CUI 4384206) and Q3 2026 only; DAs go crawl -> graph
  (the 152 "Oferta acceptata" DAs the crawl published in the quarter, each a Record with the same value), contracts go bulk -> crawl
  (the 46 CONTRACT Records a bulk file gave that authority in the quarter, 45 of them in the crawl; `CAN1145000~27030` is the miss).
  A second, wider line compares every crawl item of every batch with the graph where the graph holds a bulk file of its kind and
  quarter (crawl -> graph): informational, it does not decide the result.
- `check_week`: seven consecutive UTC days of refresh runs (the ledger `<archive>/refresh-ledger.json`) with a run on every day and no
  alert. A run that failed on a transient error and raised no alert is reported, and fails only with `strict`.

Pure parts take plain data (`fixture_items`, `compare`, `week_report`); the DB and file reading sit in `check_fixture` / `check_week`.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

from .refresh.ledger import LEDGER_NAME, parse

REFERENCE = {"da": (152, 152), "contracts": (45, 46)}  # matched/total as measured in #5 (Brasov, 2026Q3): DAs crawl -> graph, contracts bulk -> crawl
REFERENCE_QUARTER = "2026Q3"
REFERENCE_AUTHORITY = "4384206"  # Municipiul Brasov
DEFAULT_BATCHES = ("seap_brasov_2024_2026.json", "seap_timisoara_2024_2026.json")
BATCH_DIR = Path(__file__).resolve().parents[1] / "data" / "raw"
ACCEPTED = "Oferta acceptata"  # the DA states a bulk DA file holds (an accepted offer); the batches list every state
KINDS = ("da", "contracts")


def to_bani(value) -> int | None:
    """RON as the batch has it (a JSON number) to integer bani, exactly; None for a missing or zero value (SEAP's "no value")."""
    if value is None:
        return None
    try:
        bani = int((Decimal(str(value)) * 100).to_integral_value())
    except (InvalidOperation, ValueError):
        return None
    return bani or None


def quarter_of(stamp: str) -> str:
    """`2024-05-03T...` -> `2024Q2` (the batch's timestamps carry a local offset: the date part is the published day)."""
    y, m = int(stamp[:4]), int(stamp[5:7])
    return f"{y}Q{(m - 1) // 3 + 1}"


@dataclass(frozen=True)
class Item:
    kind: str  # "da" | "contracts"
    record_kind: str  # the seap.record.kind it must be: DA | CONTRACT | AWARD_NOTICE
    code: str
    quarter: str
    value_bani: int | None


def fixture_items(batch: dict, *, state: str | None = ACCEPTED) -> list[Item]:
    """What a crawl batch says the graph should hold: one Item per DA (state filter), and per contract either the CONTRACT Record
    `<notice>~<contract number>` or, for a notice with no initiation procedure, its AWARD_NOTICE Record (value = the sum of its
    contracts, as the "fara anunt" files give it), once per notice. Contracts of notices outside the batch (subsequent contracts of
    older notices) are CONTRACT Records dated by the contract's own date."""
    items: list[Item] = []
    for d in batch.get("da", []):
        if state and d.get("state") != state:
            continue
        items.append(Item("da", "DA", d["code"], quarter_of(d["pub"]), to_bani(d.get("val"))))
    notices = {n["noticeNo"]: n for n in batch.get("notices", [])}
    sums: dict[str, Decimal] = {}
    for c in batch.get("contracts", []):
        n = notices.get(c["noticeNo"])
        if n is not None and n.get("procedureId") is None:
            sums[c["noticeNo"]] = sums.get(c["noticeNo"], Decimal(0)) + Decimal(str(c.get("valueRon") or 0))
    seen_notices: set[str] = set()
    for c in batch.get("contracts", []):
        n = notices.get(c["noticeNo"])
        if n is not None and n.get("procedureId") is None:
            if c["noticeNo"] in seen_notices:
                continue
            seen_notices.add(c["noticeNo"])
            items.append(Item("contracts", "AWARD_NOTICE", c["noticeNo"], quarter_of(n["date"]), to_bani(sums[c["noticeNo"]])))
        else:
            stamp = (n or {}).get("date") or c["date"]
            items.append(Item("contracts", "CONTRACT", f"{c['noticeNo']}~{c['contractNo']}", quarter_of(stamp), to_bani(c.get("valueRon"))))
    return items


@dataclass
class Comparison:
    total: int = 0
    matched: int = 0
    missing: list[str] = field(default_factory=list)
    different: list[str] = field(default_factory=list)  # present, but another value or kind
    out_of_scope: int = 0  # the graph holds no bulk file of this kind and quarter

    def line(self, name: str) -> str:
        ref = REFERENCE[name]
        return (f"{name}: {self.matched}/{self.total} matched ({len(self.missing)} missing, {len(self.different)} different; "
                f"{self.out_of_scope} outside the loaded bulk quarters); #5 measured {ref[0]}/{ref[1]}")


def compare(items: list[Item], loaded: dict[str, set[str]], graph: dict[str, tuple[str, int | None]]) -> dict[str, Comparison]:
    """`loaded`: record kind -> the quarters with a bulk file in the graph; `graph`: code -> (record kind, value_bani) of every Record
    the items name. An item in a quarter the graph has no bulk file for is out of scope, not a miss."""
    out = {k: Comparison() for k in KINDS}
    for it in items:
        c = out[it.kind]
        if it.quarter not in loaded.get(it.record_kind, set()):
            c.out_of_scope += 1
            continue
        c.total += 1
        got = graph.get(it.code)
        if got is None:
            c.missing.append(it.code)
        elif got[0] != it.record_kind or (it.value_bani is not None and got[1] is not None and got[1] != it.value_bani):
            c.different.append(f"{it.code} (batch {it.record_kind} {it.value_bani}, graph {got[0]} {got[1]})")
        else:
            c.matched += 1
    return out


def contracts_in_batch(graph_codes: list[str], batch_codes: set[str]) -> tuple[int, list[str]]:
    """Bulk -> crawl: how many of the graph's bulk CONTRACT codes the crawl batch also holds, and the ones it lacks (#5: 45 of 46)."""
    missing = sorted(c for c in graph_codes if c not in batch_codes)
    return len(graph_codes) - len(missing), missing


def check_fixture(db_url: str, batches: list[Path], *, quarter: str | None = REFERENCE_QUARTER, authority: str | None = REFERENCE_AUTHORITY, state: str | None = ACCEPTED,
                  allow_missing_da: int = 0, allow_missing_contracts: int = 1) -> tuple[bool, list[str]]:
    """#5's measurement on the graph in `db_url` (see the module docstring); `quarter` / `authority` None = every quarter / every batch.
    Returns (passed, report lines)."""
    import psycopg

    lines: list[str] = []
    batch_data = []
    for path in batches:
        batch = json.loads(Path(path).read_text(encoding="utf-8"))
        batch_data.append((Path(path).name, batch))
        lines.append(f"{Path(path).name}: {batch.get('authority', {}).get('name', '?')} (CUI {batch.get('authority', {}).get('cui', '?')}), {len(batch.get('da', []))} DA(s), {len(batch.get('contracts', []))} contract(s)")
    scope = [(n, b) for n, b in batch_data if authority is None or str(b.get("authority", {}).get("cui", "")).lstrip("0") == authority.lstrip("0")]
    lines.append(f"scope of #5: authority {authority or 'all'}, quarter {quarter or 'all'}")
    if not scope:
        lines.append(f"  FAILED: no batch is of authority {authority}")
        return False, lines
    passed = True
    scope_items = [i for _, b in scope for i in fixture_items(b, state=state)]
    all_items = [i for _, b in batch_data for i in fixture_items(b, state=state)]
    batch_contracts = {f"{c['noticeNo']}~{c['contractNo']}" for _, b in scope for c in b.get("contracts", [])}
    with psycopg.connect(db_url) as conn:
        loaded: dict[str, set[str]] = {}
        for kind, unit in conn.execute("SELECT DISTINCT kind, unit FROM seap.source_file WHERE stream = 'bulk'").fetchall():
            loaded.setdefault(kind, set()).add(unit)
        codes = sorted({i.code for i in all_items})
        graph = {code: (kind, value) for code, kind, value in conn.execute("SELECT code, kind, value_bani FROM seap.record WHERE code = ANY(%s)", (codes,)).fetchall()}
        bulk_contracts = [
            r[0] for r in conn.execute(
                "SELECT r.code FROM seap.record r JOIN seap.source_file f ON f.id = r.source_file_id WHERE r.kind = 'CONTRACT' AND r.via = 'BULK' AND f.stream = 'bulk' "
                "AND (%s::text IS NULL OR r.authority_key = %s) AND (%s::text IS NULL OR f.unit = %s) ORDER BY r.code",
                (authority and authority.lstrip("0"), authority and authority.lstrip("0"), quarter, quarter),
            ).fetchall()
        ]
    # 1. DAs, crawl -> graph, in the scope
    in_scope = [i for i in scope_items if i.kind == "da" and (quarter is None or i.quarter == quarter)]
    da_loaded = {"DA": ({quarter} if quarter else loaded.get("DA", set()))} if _bulk_has(loaded, "DA", quarter) else {}
    da = compare(in_scope, da_loaded, graph)["da"]
    ref = REFERENCE["da"]
    lines.append(f"da (crawl -> graph): {da.matched}/{da.total} matched ({len(da.missing)} missing, {len(da.different)} different); #5 measured {ref[0]}/{ref[1]}")
    lines += [f"  missing: {c}" for c in da.missing[:10]] + [f"  different: {t}" for t in da.different[:10]]
    if not _bulk_has(loaded, "DA", quarter):
        lines.append(f"  FAILED: the graph holds no bulk DA file for {quarter or 'any quarter'}: nothing to compare (is the bulk archive loaded for 2024+?)")
        passed = False
    elif da.total == 0:
        lines.append("  FAILED: no crawl DA in this scope: nothing to compare")
        passed = False
    elif len(da.missing) + len(da.different) > allow_missing_da:
        lines.append(f"  FAILED: {len(da.missing) + len(da.different)} not matched, at most {allow_missing_da} allowed")
        passed = False
    # 2. contracts, bulk -> crawl, in the scope
    found, missing = contracts_in_batch(bulk_contracts, batch_contracts)
    ref = REFERENCE["contracts"]
    lines.append(f"contracts (bulk -> crawl): {found}/{len(bulk_contracts)} of the graph's bulk contracts are in the crawl ({len(missing)} missing); #5 measured {ref[0]}/{ref[1]}")
    lines += [f"  not in the crawl: {c}" for c in missing[:10]]
    if not bulk_contracts:
        lines.append("  FAILED: the graph holds no bulk contract for this scope: nothing to compare (is the bulk archive loaded for 2024+?)")
        passed = False
    elif len(missing) > allow_missing_contracts:
        lines.append(f"  FAILED: {len(missing)} not in the crawl, at most {allow_missing_contracts} allowed")
        passed = False
    # 3. the wider line: every crawl item of every batch, in every quarter the graph has a bulk file for
    wide = compare(all_items, loaded, graph)
    for name in KINDS:
        c = wide[name]
        lines.append(f"also (wider, crawl -> graph, all batches, every loaded quarter) {name}: {c.matched}/{c.total} matched ({len(c.missing)} missing, {len(c.different)} different; {c.out_of_scope} outside the loaded bulk quarters)")
        lines += [f"  missing: {x}" for x in c.missing[:5]] + [f"  different: {x}" for x in c.different[:5]]
    lines.append("validation fixture: " + ("agrees with the bulk-loaded graph" if passed else "FAILED"))
    return passed, lines


def _bulk_has(loaded: dict[str, set[str]], kind: str, quarter: str | None) -> bool:
    return bool(loaded.get(kind)) if quarter is None else quarter in loaded.get(kind, set())


# ---- the unattended week --------------------------------------------------------------------------------------------------------


def week_report(runs: list[dict], through: date, *, days: int = 7, strict: bool = False, timer_only: bool = False) -> tuple[bool, list[str]]:
    """`runs`: the ledger's runs. The window is the `days` UTC days ending on `through` (inclusive). Passes when every day has at
    least one refresh run, no run in the window raised an alert and none is still `running`; with `strict` also when none failed
    or was interrupted (a transient failure that the next run retried raises no alert, so it is only a note otherwise). With
    `timer_only` only runs the timer triggered count (a hand-started run does not make a day of the unattended week). The report
    always prints the mix of triggers of the runs in the window."""
    first = through - timedelta(days=days - 1)
    by_day: dict[date, list[dict]] = {first + timedelta(days=i): [] for i in range(days)}
    triggers: dict[str, int] = {}
    for r in runs:
        if r.get("kind") != "refresh":
            continue
        d = parse(r["started"]).date()
        if d in by_day:
            triggers[r.get("trigger", "?")] = triggers.get(r.get("trigger", "?"), 0) + 1
            if not timer_only or r.get("trigger") == "timer":
                by_day[d].append(r)
    mix = ", ".join(f"{n} {t}" for t, n in sorted(triggers.items())) or "none"
    lines = [f"refresh runs, {first} .. {through} (UTC){' (timer-triggered only)' if timer_only else ''}; triggers in the window: {mix}"]
    problems: list[str] = []
    notes: list[str] = []
    for d, rs in by_day.items():
        if not rs:
            lines.append(f"  {d}: no run")
            problems.append(f"{d}: no refresh run")
            continue
        for r in rs:
            tag = f"  {d}: #{r['id']} {r['status']} ({r.get('trigger', '?')})"
            if r.get("alert"):
                tag += f" ALERT: {r['alert']}"
                problems.append(f"{d}: run #{r['id']} alerted: {r['alert']}")
            elif r["status"] == "running":
                problems.append(f"{d}: run #{r['id']} is still running")
            elif r["status"] in ("failed", "interrupted"):
                msg = f"{d}: run #{r['id']} {r['status']} without an alert (" + "; ".join(f"{s['name']}: {s.get('error')}" for s in r["steps"] if s["status"] in ("failed", "interrupted")) + ")"
                (problems if strict else notes).append(msg)
            lines.append(tag)
            for s in r["steps"]:
                for w in s.get("warnings", []):
                    notes.append(f"{d}: run #{r['id']} {s['name']} warning: {w}")
    lines += [f"note: {n}" for n in notes] + [f"PROBLEM: {p}" for p in problems]
    lines.append(f"{days} consecutive days of refresh runs with no alert: " + ("YES" if not problems else "NO"))
    return not problems, lines


def check_week(archive_root: Path | str, *, through: date | None = None, now: datetime | None = None, days: int = 7, strict: bool = False, timer_only: bool = False, ledger_path: Path | None = None) -> tuple[bool, list[str]]:
    """The ledger of the archive, judged over the `days` UTC days ending `through` (default: yesterday, a day that is over)."""
    now = now or datetime.now(timezone.utc)
    path = Path(ledger_path) if ledger_path else Path(archive_root) / LEDGER_NAME
    if not path.exists():
        return False, [f"no refresh ledger at {path}: the nightly refresh has never run here"]
    try:
        runs = json.loads(path.read_text(encoding="utf-8"))["runs"]  # read only: Ledger() would move a corrupt file aside
    except (OSError, ValueError, KeyError) as e:
        return False, [f"the refresh ledger {path} is unreadable: {e}"]
    return week_report(runs, through or (now.astimezone(timezone.utc).date() - timedelta(days=1)), days=days, strict=strict, timer_only=timer_only)
