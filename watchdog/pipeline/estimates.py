"""The estimated-value lookup (#65): a Connector for the counting rule's check of mega-contracts (counting.py).

A contract or award notice of 1 bn RON or more is checked against the notice's estimated value, which only e-licitatie has.
`pipeline estimates` asks for it, one request per notice, and archives each answer unchanged before the next request (ADR 0004).
The rebuild never calls the network: it reads the archived answers (`read_estimates`).

    <root>/seap/estimates/notice-value/<notice code>/<fetched on>/{request.json, response.json, manifest.json}

The request is the public notice list filtered by the notice's number, the same call the public site's search makes:
`POST /api-pub/NoticeCommon/GetCANoticeList/` with `{"number": "<code>", "pageSize": 10, ...}` and the `Referer` header api-pub
insists on (the crawl's client, `crawl.client.EliClient`, supplies it, the polite delay and the retries). The row whose `noticeNo`
is the code carries `estimatedValueExport` ("18625192,67 RON": Romanian decimal comma, the currency after the number) and
`currencyCode`. An estimate that is blank, zero, not in RON or absent (no such notice) is "no estimate": the answer is archived
all the same, so the notice is not asked again.

Candidates (the notices whose Records are 1 bn RON or more) come from the loaded graph, so the order is
`rebuild` -> `estimates` -> `rebuild`: the first rebuild loads the Records (a mega-contract not yet looked up is counted and
noted `estimate:not_fetched`), `estimates` fetches what is missing, the second rebuild applies the rule from the archive.
Resumable: a notice that already has an archived answer is skipped, so a killed run is rerun with the same command.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Callable, Iterable

from .archive import MANIFEST, MANIFEST_VERSION, Archive, _parse_time, sha256_of
from .counting import RON, Estimate
from .progress import stamp

SOURCE, STREAM, KIND = "seap", "estimates", "notice-value"
REQUEST_FILE, RESPONSE_FILE = "request.json", "response.json"
LIST_PATH = "/api-pub/NoticeCommon/GetCANoticeList/"
PAGE_SIZE = 10


def request_body(code: str) -> dict:
    return {"sysNoticeTypeIds": [], "sortProperties": [], "pageIndex": 0, "pageSize": PAGE_SIZE, "number": code,
            "startPublicationDate": None, "endPublicationDate": None}


def parse_amount(text: str) -> Decimal | None:
    """`estimatedValueExport` text as a number: `838435 RON` and `820640680,86 RON` (decimal comma) are what was seen; a
    thousands dot (`1.234.567,89`) is tolerated, a lone dot is a decimal point. Returns None for anything else."""
    m = re.fullmatch(r"\s*([0-9][0-9.,\s]*?)\s*[A-Za-z]{3}\s*", text or "")
    if not m:
        return None
    number = re.sub(r"\s", "", m[1])
    if "," in number:
        number = number.replace(".", "").replace(",", ".")
    elif number.count(".") > 1 or re.fullmatch(r"\d{1,3}(\.\d{3})+", number):
        number = number.replace(".", "")
    try:
        return Decimal(number)
    except InvalidOperation:
        return None


def parse_estimate(raw: bytes, code: str) -> Estimate:
    """What an archived answer says about notice `code`: its estimate in bani, or no usable estimate (see the module docstring)."""
    try:
        payload = json.loads(raw)
    except ValueError:
        return Estimate(None)
    rows = [r for r in (payload.get("items") if isinstance(payload, dict) else None) or [] if isinstance(r, dict) and r.get("noticeNo") == code]
    if not rows:
        return Estimate(None)
    row = rows[0]
    text = str(row.get("estimatedValueExport") or "")
    currency = re.search(r"([A-Za-z]{3})\s*$", text)
    amount = parse_amount(text)
    if amount is None or amount <= 0 or (currency and currency[1].upper() != "RON") or str(row.get("currencyCode") or "RON").upper() != "RON":
        return Estimate(None)
    return Estimate(int((amount * RON).to_integral_value(rounding=ROUND_HALF_UP)))


def _complete(directory: Path) -> dict | None:
    """The manifest of one fetch directory when it is complete (it parses and its files match), else None."""
    try:
        m = json.loads((directory / MANIFEST).read_text(encoding="utf-8"))
        if m["version"] != MANIFEST_VERSION or RESPONSE_FILE not in {e["name"] for e in m["files"]}:
            return None
        for entry in m["files"]:
            if sha256_of(directory / entry["name"]) != entry["sha256"]:
                return None
        return m
    except (OSError, ValueError, KeyError, TypeError):
        return None


def read_estimates(archive: Archive) -> dict[str, Estimate]:
    """Every archived answer as notice code -> Estimate, the latest answer winning. Reads the small estimate directory only
    (never hashes the SEAP files) and never touches the network. A notice that was looked up and has no estimate is present
    with `bani` None; a notice that was never looked up is absent."""
    base = archive.root / SOURCE / STREAM / KIND
    found: list[tuple[datetime, str, str, Estimate]] = []
    for directory in sorted(base.glob("*/*")) if base.is_dir() else []:
        manifest = _complete(directory) if directory.is_dir() else None
        if manifest is None:
            continue
        code = manifest["unit"]
        estimate = parse_estimate((directory / RESPONSE_FILE).read_bytes(), code)
        found.append((_parse_time(manifest["fetchedAt"]), str(directory), code, estimate))
    out: dict[str, Estimate] = {}
    for _, _, code, estimate in sorted(found, key=lambda t: (t[0], t[1])):
        out[code] = estimate
    return out


def archive_answer(archive: Archive, code: str, raw: bytes, fetched_at: datetime, base: str = "https://e-licitatie.ro") -> Path:
    """One answer: the request (what was asked) and the response (e-licitatie's bytes, unchanged), then the manifest last;
    each file is written under a temporary name and renamed (`Archive.write_unit`)."""
    request = {"endpoint": base + LIST_PATH, "body": request_body(code)}
    return archive.write_unit(
        source=SOURCE, stream=STREAM, kind=KIND, unit=code, fetched_at=fetched_at,
        files={REQUEST_FILE: (json.dumps(request, indent=2) + "\n").encode(), RESPONSE_FILE: raw},
        url=base + LIST_PATH, via="e-licitatie notice list", same_day=True,
    )


@dataclass
class EstimatesSummary:
    asked: int = 0
    skipped: int = 0  # already archived
    with_estimate: int = 0
    without_estimate: int = 0
    archived: list[Path] = field(default_factory=list)


def lookup(
    archive: Archive,
    codes: Iterable[str],
    client: Any,
    say: Callable[[str], None] = print,
    *,
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    max_notices: int | None = None,
) -> EstimatesSummary:
    """Ask e-licitatie about every notice in `codes` the archive has no answer for, archiving each answer before the next request.
    `client` is a `crawl.client.EliClient` (Referer, polite delay, retries). Raises `CrawlError` when a request cannot be
    completed; everything archived so far stays, and the same command resumes."""
    wanted = sorted(set(codes))
    answered = read_estimates(archive)
    todo = [c for c in wanted if c not in answered]
    if max_notices is not None:
        todo = todo[:max_notices]
    summary = EstimatesSummary(skipped=sum(1 for c in wanted if c in answered))
    say(f"{stamp(now())} estimates start notices={len(todo)} already_archived={summary.skipped} archive={archive.root}")
    started = now()
    for index, code in enumerate(todo, start=1):
        raw, _ = client.post(LIST_PATH, request_body(code), f"estimate of notice {code}")
        path = archive_answer(archive, code, raw, now(), client.base)
        estimate = parse_estimate(raw, code)
        summary.asked += 1
        summary.archived.append(path)
        if estimate.bani is None:
            summary.without_estimate += 1
        else:
            summary.with_estimate += 1
        shown = "none" if estimate.bani is None else f"{Decimal(estimate.bani) / RON} RON"
        say(f"{stamp(now())} estimates notice {index}/{len(todo)} {code} estimate={shown} archived={path.relative_to(archive.root)}")
    say(f"{stamp(now())} estimates done notices={summary.asked} with_estimate={summary.with_estimate} without_estimate={summary.without_estimate} "
        f"already_archived={summary.skipped} in {str(now() - started).split('.')[0]}")
    return summary


# The notices a rebuild has seen a Record of 1 bn RON or more in (the candidates `pipeline estimates` asks about).
CANDIDATES_SQL = """
SELECT DISTINCT notice_code FROM seap.record
 WHERE kind IN ('CONTRACT', 'AWARD_NOTICE') AND notice_code IS NOT NULL AND value_bani >= %s ORDER BY 1"""


def candidates(db_url: str) -> list[str]:
    """The notice codes of the loaded Records at the check threshold, from the graph the last rebuild wrote."""
    import psycopg

    from .counting import CONTRACT_CHECK_FROM

    with psycopg.connect(db_url) as conn:
        return [r[0] for r in conn.execute(CANDIDATES_SQL, (CONTRACT_CHECK_FROM,)).fetchall()]
