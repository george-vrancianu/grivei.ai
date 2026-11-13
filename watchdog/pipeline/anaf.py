"""The ANAF Reference source connector: the v9 VAT endpoint, for every CUI the graph knows (ADR 0003, ADR 0004).

`pipeline anaf-lookup` collects the CUIs of the raw archive's SEAP files (authority and supplier, normalised, passing the
Romanian check digit), drops those ANAF already answered, and asks ANAF for the rest, 100 per request and at most one request
per second. Every response is archived unchanged before anything uses it; `pipeline rebuild` reads the archived responses and
never calls ANAF.

The endpoint (checked with one request on 2026-11-12, see watchdog/README.md): `POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva`,
body `[{"cui": 54760, "data": "2026-11-12"}, ...]` (JSON, at most 100 entries, `data` = the day the data is as of), answered
synchronously (no polling) with `{"found": [{"date_generale": {...}, "stare_inactiv": {...}, "adresa_sediu_social": {...},
"adresa_domiciliu_fiscal": {...}, ...}], "notFound": [1000001]}`.

Archive layout (a unit = one request): `anaf/vat/v9/<first cui>-<count>/<fetch day>/{request.json, response.json, manifest.json}`.
`request.json` keeps what was asked (the endpoint, the day and the CUI list), for audit; a CUI asked but in neither list of the
response counts as answered, not found; `response.json` is ANAF's body, byte for byte. The files are written under a temporary name and renamed, and the
manifest last (archive.py), so a batch that died half way is invisible: it is asked again on the next run.

Resuming after a kill needs nothing but running the same command: a CUI already present in an archived response (found or
not found) is skipped.
"""
from __future__ import annotations

import json
import logging
import os
import re
import socket
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Iterable, Iterator, Mapping

import requests

from .archive import Archive, Unit, sha256_of
from .identity import classify_tax_id, compare_name
from .progress import _alive, _duration, _iso, effective_state, stamp, write_atomically

log = logging.getLogger("pipeline.anaf")

ENDPOINT = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"
BATCH_SIZE = 100  # ANAF's limit per request
MIN_INTERVAL = 1.0  # seconds between the starts of two requests: ANAF's limit
SOURCE, STREAM, KIND = "anaf", "vat", "v9"
REQUEST_FILE, RESPONSE_FILE = "request.json", "response.json"
DEFAULT_STATUS_NAME = "anaf-progress.json"
USER_AGENT = "grivei-pipeline (+https://grivei.ai)"


class AnafError(Exception):
    """A lookup that cannot go on: a refused request, or a transient failure that did not clear after every retry."""


class AnafUnavailable(AnafError):
    """ANAF stayed down or busy through every retry: not a refusal, so worth trying again on another day."""


class Transient(Exception):
    """One failed attempt worth repeating (5xx, timeout, throttling, an answer that is not a v9 answer)."""


# ---- the HTTP seam ---------------------------------------------------------------------------------------------------

Post = Callable[[str, bytes, float], tuple[int, bytes]]  # (url, body, timeout) -> (HTTP status, response body)


def http_post(url: str, body: bytes, timeout: float) -> tuple[int, bytes]:
    """The only function that touches the network (tests stub `Post`)."""
    response = requests.post(url, data=body, timeout=timeout, headers={"Content-Type": "application/json", "User-Agent": USER_AGENT})
    return response.status_code, response.content


def parse_answer(body: bytes) -> dict:
    """Check that `body` is a v9 answer (`found` and `notFound` lists) and return it. Raises `Transient` otherwise: an HTML
    error page, a throttling answer (`{"cod": 429, "message": ...}`) or a half-sent body is retried, never archived."""
    try:
        data = json.loads(body)
    except ValueError:
        raise Transient("the answer is not JSON") from None
    if not isinstance(data, dict):
        raise Transient("the answer is not a JSON object")
    if "cod" in data and data["cod"] != 200:
        raise Transient(f"ANAF says cod={data['cod']} {data.get('message', '')}".strip())
    if not isinstance(data.get("found"), list) or not isinstance(data.get("notFound"), list):
        raise Transient(f"no `found`/`notFound` in the answer: {str(data)[:120]}")
    return data


class AnafClient:
    """One request at a time, paced and retried. `clock` and `sleep` are injectable so tests never wait."""

    def __init__(
        self,
        post: Post = http_post,
        *,
        endpoint: str = ENDPOINT,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
        min_interval: float = MIN_INTERVAL,
        retries: int = 6,
        backoff: float = 2.0,
        max_backoff: float = 120.0,
        timeout: float = 60.0,
    ):
        self.post, self.endpoint, self.clock, self.sleep = post, endpoint, clock, sleep
        self.min_interval, self.retries, self.backoff, self.max_backoff, self.timeout = min_interval, retries, backoff, max_backoff, timeout
        self._last_start: float | None = None

    def _pace(self) -> None:
        if self._last_start is not None:
            wait = self._last_start + self.min_interval - self.clock()
            if wait > 0:
                self.sleep(wait)
        self._last_start = self.clock()

    def query(self, cuis: list[int], day: date) -> bytes:
        """One batch (at most 100 CUIs) -> ANAF's response body, unchanged. Retries transient failures with a doubling backoff."""
        if not 0 < len(cuis) <= BATCH_SIZE:
            raise ValueError(f"a request takes 1 to {BATCH_SIZE} CUIs, got {len(cuis)}")
        body = json.dumps([{"cui": c, "data": day.isoformat()} for c in cuis]).encode()
        last = "no attempt"
        for attempt in range(self.retries + 1):
            if attempt:
                self.sleep(min(self.backoff * 2 ** (attempt - 1), self.max_backoff))
            self._pace()
            try:
                status, answer = self.post(self.endpoint, body, self.timeout)
                if status == 429 or status >= 500:
                    raise Transient(f"HTTP {status}")
                if status == 404:  # ANAF answers 404 with a normal body when none of the CUIs asked is found
                    try:
                        parse_answer(answer)
                    except Transient:
                        raise Transient("HTTP 404") from None
                    return answer
                if status != 200:
                    if 400 <= status < 500 and status not in (403, 408):
                        raise AnafError(f"ANAF refused the request: HTTP {status}")
                    raise Transient(f"HTTP {status}")
                parse_answer(answer)
                return answer
            except Transient as e:
                last = str(e)
            except (requests.Timeout, requests.ConnectionError) as e:
                last = f"{type(e).__name__}: {e}"
            log.warning("anaf attempt %d/%d failed (%s)", attempt + 1, self.retries + 1, last)
        raise AnafUnavailable(f"giving up after {self.retries + 1} attempts: {last}")


# ---- the archive -------------------------------------------------------------------------------------------------------


@dataclass(frozen=True)
class Answer:
    found: bool
    fetched_at: datetime
    path: Path


def anaf_units(archive: Archive) -> list[Unit]:
    """Complete ANAF lookup units, oldest fetch first."""
    units = [u for u in archive.units() if (u.source, u.stream, u.kind) == (SOURCE, STREAM, KIND) and RESPONSE_FILE in u.files]
    units.sort(key=lambda u: (u.fetched_at, str(u.path)))
    return units


def normalise_cui_int(value: object) -> int | None:
    """A CUI as ANAF writes it (an integer) or the archive publishes it (`RO 123`) -> the integer, or None. It does not test
    the check digit: ANAF's answer is what confirms a CUI, and the CUIs asked passed the check before."""
    digits = re.sub(r"^RO(?=\d)", "", re.sub(r"[^0-9A-Z]", "", str(value).upper()))
    return int(digits) if digits.isdigit() and 0 < int(digits) < 10**10 else None


MAX_ASKED_DIGITS = 8  # real Romanian CUIs have at most 8 digits today; 9 and 10 digit numbers that pass the check digit are typos


def asked_cui(raw: object) -> int | None:
    """A published tax id -> the CUI to ask ANAF about: only a Romanian CUI that passes the check digit and has at most 8 digits
    (longer ones pass the check digit by chance, ANAF knows none, and a batch of them used to come back as an HTTP 404)."""
    tax = classify_tax_id(None if raw is None else str(raw))
    return int(tax.value) if tax.kind == "cui" and tax.value and len(tax.value) <= MAX_ASKED_DIGITS else None


def response_cuis(data: Mapping) -> tuple[list[dict], list[int]]:
    """(found entries, not-found CUIs) of a parsed v9 answer."""
    found = [e for e in data.get("found", []) if isinstance(e, dict) and isinstance(e.get("date_generale"), dict)]
    return found, [c for c in data.get("notFound", []) if isinstance(c, int)]


def read_units(archive: Archive) -> Iterator[tuple[Unit, Path, list[dict], list[int]]]:
    """Walk the archived responses oldest first as `(unit, response path, found entries, not-found CUIs)`. A response that
    cannot be read is logged and skipped."""
    for unit in anaf_units(archive):
        path = unit.file_path(RESPONSE_FILE)
        try:
            found, missing = response_cuis(json.loads(path.read_bytes()))
        except (OSError, ValueError):
            log.warning("anaf: skipped unreadable response %s", path)
            continue
        yield unit, path, found, missing


def _asked(unit: Unit) -> list[int]:
    """The CUIs a unit's `request.json` says were asked ([] when it is missing or unreadable)."""
    try:
        cuis = json.loads(unit.file_path(REQUEST_FILE).read_bytes()).get("cuis", [])
    except (OSError, ValueError, AttributeError):
        return []
    return [c for c in cuis if isinstance(c, int)]


def read_answers(archive: Archive) -> dict[int, Answer]:
    """Every CUI ANAF has answered, found or not, with the latest answer winning. A CUI that was asked (`request.json`) but is
    in neither list of the response counts as answered, not found: it is not asked again on every run."""
    answers: dict[int, Answer] = {}
    for unit, path, found, missing in read_units(archive):
        listed = {c for e in found if (c := normalise_cui_int(e["date_generale"].get("cui"))) is not None} | set(missing)
        for cui in _asked(unit):
            if cui not in listed:
                log.warning("anaf: CUI %s was asked in %s and is in neither list: counted as not found", cui, path)
                answers[cui] = Answer(False, unit.fetched_at, path)
        for cui in missing:
            answers[cui] = Answer(False, unit.fetched_at, path)
        for entry in found:
            if (cui := normalise_cui_int(entry["date_generale"].get("cui"))) is not None:
                answers[cui] = Answer(True, unit.fetched_at, path)
    return answers


def archived_records(archive: Archive) -> Iterator[tuple[int, int, Unit, list | None, str | None]]:
    """The archive's SEAP Records, unit by unit, read the way a rebuild reads them (so they hold the same values), but nothing is
    quarantined: `(index, total, unit, records, None)` per unit (a bulk file whose bytes were already read is skipped), or
    `(index, total, unit, None, reason)` for a unit that does not validate (the next rebuild handles it). Oldest fetch first.
    What `collect_cuis` and the placement lookups (`authority-scope`, `seap-entities`) read instead of a loaded graph."""
    from .bulk import KINDS, InvalidFile, parse_file_stats
    from .crawl import KIND as CRAWL_KIND
    from .crawl.unitdir import BACKFILL_KIND
    from .crawl.records import parse_unit as parse_crawl_unit

    units = [
        u for u in archive.units()
        if u.source == "seap" and ((u.stream == "bulk" and u.kind in KINDS) or (u.stream == "crawl" and u.kind in (CRAWL_KIND, BACKFILL_KIND)))
    ]
    units.sort(key=lambda u: (u.fetched_at, str(u.path)))
    seen: set[tuple[str, str]] = set()
    for index, unit in enumerate(units, start=1):
        if unit.stream == "crawl":  # a day has no single file and the rebuild does not dedup it either
            try:
                yield index, len(units), unit, [r for rs in parse_crawl_unit(unit).records.values() for r in rs], None
            except InvalidFile as e:
                yield index, len(units), unit, None, e.reason
            continue
        for name in unit.files:
            path = unit.file_path(name)
            key = (unit.kind, sha256_of(path))
            if key in seen:
                continue
            seen.add(key)
            try:
                records = parse_file_stats(unit.kind, unit.unit, path).records
            except InvalidFile as e:
                yield index, len(units), unit, None, e.reason
                continue
            yield index, len(units), unit, records, None


def collect_cuis(archive: Archive, say: Callable[[str], None] | None = None) -> set[int]:
    """Every CUI that passes the check digit in the archive's SEAP bulk files and crawled days: contracting authorities and winners.

    Reads each file the way a rebuild does (so it sees the same values) but never quarantines: a unit that does not validate
    is skipped here and handled by the next rebuild. A foreign VAT id, a CNP and anything failing the check digit is not asked."""
    cuis: set[int] = set()
    for index, total, unit, records, skipped in archived_records(archive):
        if records is None:
            if say:
                say(f"anaf scan unit {index}/{total} kind={unit.kind} unit={unit.unit} skipped ({skipped})")
            continue
        before = len(cuis)
        for r in records:
            for raw in (r.authority_cui, *(w.cui for w in r.all_winners)):
                if (cui := asked_cui(raw)) is not None:
                    cuis.add(cui)
        if say:
            say(f"anaf scan unit {index}/{total} kind={unit.kind} unit={unit.unit} records={len(records)} new_cuis={len(cuis) - before}")
    return cuis


def confirmed_cuis(archive: Archive) -> set[str] | None:
    """The CUIs the archived ANAF answers confirm, as a rebuild's `core.anaf_company` would hold them (the latest answer per CUI wins,
    so a later "not found" removes a CUI). None when the archive holds no ANAF answer at all (`pipeline anaf-lookup` has not run)."""
    found: set[str] = set()
    any_answer = False
    for company, not_found in iter_companies(archive):
        any_answer = True
        if company:
            found.add(company.cui)
        elif not_found is not None:
            found.discard(str(not_found))
    return found if any_answer else None


def pending(cuis: Iterable[int], answers: Mapping[int, Answer], *, today: date, recheck_after_days: int | None = None) -> list[int]:
    """The CUIs still to ask, in ascending order: never answered, or (when `recheck_after_days` is set) answered longer ago than that."""
    cutoff = None if recheck_after_days is None else datetime.combine(today, datetime.min.time(), timezone.utc) - timedelta(days=recheck_after_days)
    out = []
    for cui in sorted(set(cuis)):
        a = answers.get(cui)
        if a is None or (cutoff is not None and a.fetched_at < cutoff):
            out.append(cui)
    return out


def batches(cuis: list[int], size: int = BATCH_SIZE) -> list[list[int]]:
    return [cuis[i : i + size] for i in range(0, len(cuis), size)]


def archive_batch(archive: Archive, cuis: list[int], day: date, body: bytes, fetched_at: datetime, endpoint: str = ENDPOINT) -> Path:
    """Write one batch: the request (what was asked) and the response (ANAF's bytes), then the manifest."""
    request = {"endpoint": endpoint, "date": day.isoformat(), "cuis": cuis}
    return archive.write_unit(
        source=SOURCE, stream=STREAM, kind=KIND, unit=f"{cuis[0]:010d}-{len(cuis)}", fetched_at=fetched_at,
        files={REQUEST_FILE: (json.dumps(request, indent=2) + "\n").encode(), RESPONSE_FILE: body},
        url=endpoint, via="ANAF VAT v9", same_day=True,
    )


# ---- what the rebuild takes from ANAF ----------------------------------------------------------------------------------

_STATE_WORDS = [
    ("RADIE", "RADIERE"), ("FUZIUNE", "FUZIUNE"), ("DIVIZ", "DIVIZARE"), ("DIZOLV", "DIZOLVARE"), ("LICHIDARE", "LICHIDARE"),
    ("FALIMENT", "INSOLVENTA"), ("INSOLV", "INSOLVENTA"), ("SUSPEND", "SUSPENDARE"), ("DESFIINT", "DESFIINTARE"),
]


def status_of(entry: Mapping) -> str:
    """ANAF's status of a company as one upper-case word for the badge. `stare_inregistrare` (`INREGISTRAT din data
    26.11.1992`, `RADIERE din data 11.10.2022`, ...) gives it: a known word anywhere in it (RADIERE, FUZIUNE, DIVIZARE,
    DIZOLVARE, SUSPENDARE ...) wins; plain INREGISTRAT is ACTIV, or INACTIV when ANAF lists the company as inactive
    (`stare_inactiv.statusInactivi`); any other text is kept as its leading words, upper case (the raw text is stored too)."""
    general = entry.get("date_generale") or {}
    text = " ".join(re.sub(r"[^A-Z ]", " ", str(general.get("stare_inregistrare") or "").upper()).split())
    if not text:
        return "ACTIV"
    for stem, label in _STATE_WORDS:
        if stem in text:
            return label
    if text.startswith("INREGISTRAT"):
        return "INACTIV" if (entry.get("stare_inactiv") or {}).get("statusInactivi") is True else "ACTIV"
    return text.split(" DIN ")[0].strip() or "ACTIV"


@dataclass(frozen=True)
class Company:
    cui: str
    name: str  # as ANAF sent it
    status: str
    registration: str | None
    address: str | None
    postal_code: str | None
    seat: dict
    fiscal_domicile: dict
    fetched_at: datetime
    archive_path: str


def company_of(entry: Mapping, fetched_at: datetime, archive_path: str) -> Company | None:
    general = entry["date_generale"]
    cui = normalise_cui_int(general.get("cui"))
    name = str(general.get("denumire") or "").strip()
    if cui is None or not name:
        return None
    return Company(
        cui=str(cui), name=name, status=status_of(entry), registration=general.get("stare_inregistrare") or None,
        address=general.get("adresa") or None, postal_code=general.get("codPostal") or None,
        seat=dict(entry.get("adresa_sediu_social") or {}), fiscal_domicile=dict(entry.get("adresa_domiciliu_fiscal") or {}),
        fetched_at=fetched_at, archive_path=archive_path,
    )


def iter_companies(archive: Archive) -> Iterator[tuple[Company | None, int | None]]:
    """Walk the archived responses oldest first: `(company, None)` for a found CUI, `(None, cui)` for a not-found one. The
    consumer applies them in order, so the latest answer for a CUI wins."""
    for unit, path, found, missing in read_units(archive):
        rel = str(path.relative_to(archive.root))
        for entry in found:
            company = company_of(entry, unit.fetched_at, rel)
            if company:
                yield company, None
        for cui in missing:
            yield None, cui


# ---- progress ----------------------------------------------------------------------------------------------------------

STATUS_VERSION = 1


class AnafProgress:
    """Timestamped lines on stdout and a status file for `pipeline status`, like the rebuild's (progress.py):

        2026-11-12T10:15:02+0200 anaf start cuis=41200 batches=412 already_archived=3800 archive=/home/me/grivei-data/raw pid=4242
        2026-11-12T10:15:03+0200 anaf batch 37/412 cuis=100 found=97 notfound=3 archived=/home/me/grivei-data/raw/anaf/vat/v9/0000054760-100/2026-11-12
        2026-11-12T10:15:05+0200 anaf done batches=412 cuis=41200 found=38000 notfound=3200 in 0:07:05
    """

    def __init__(self, status_file: Path | None = None, out: Callable[[str], None] | None = None,
                 now: Callable[[], datetime] = lambda: datetime.now(timezone.utc)):
        self.status_file, self._now = status_file, now
        self._out = out or (lambda line: print(line, flush=True))
        self._started = now()
        self.state: dict = {
            "version": STATUS_VERSION, "pid": os.getpid(), "host": socket.gethostname(), "state": "starting",
            "startedAt": _iso(now()), "updatedAt": _iso(now()), "batchesTotal": 0, "batchesDone": 0, "cuisTotal": 0, "cuisDone": 0,
            "found": 0, "notFound": 0, "alreadyArchived": 0, "last": None, "error": None,
        }

    def start(self, cuis: int, batches_total: int, already_archived: int, archive: Path | str) -> None:
        self.state.update(state="running", cuisTotal=cuis, batchesTotal=batches_total, alreadyArchived=already_archived)
        self._line(f"anaf start cuis={cuis} batches={batches_total} already_archived={already_archived} archive={archive} pid={os.getpid()}")

    def note(self, line: str) -> None:
        """A step before the first request (the archive scan): shown by `status`, not printed again."""
        self.state.update(state="scanning", last=line)
        self._write()

    def batch_done(self, index: int, total: int, cuis: int, found: int, not_found: int, archived: Path | str) -> None:
        s = self.state
        s.update(batchesDone=index, cuisDone=s["cuisDone"] + cuis, found=s["found"] + found, notFound=s["notFound"] + not_found)
        self._line(f"anaf batch {index}/{total} cuis={cuis} found={found} notfound={not_found} archived={archived}")

    def batch_failed(self, index: int, total: int, cuis: int, error: BaseException) -> None:
        self.state["batchesFailed"] = self.state.get("batchesFailed", 0) + 1
        self._line(f"anaf batch {index}/{total} cuis={cuis} SKIPPED ({error}); its CUIs stay pending for the next run")

    def finish(self) -> None:
        s = self.state
        s["state"] = "finished"
        took = _duration((self._now() - self._started).total_seconds())
        skipped = f" skipped_batches={s['batchesFailed']}" if s.get("batchesFailed") else ""
        self._line(f"anaf done batches={s['batchesDone']}{skipped} cuis={s['cuisDone']} found={s['found']} notfound={s['notFound']} in {took}")

    def fail(self, error: BaseException) -> None:
        s = self.state
        s.update(state="failed", error=f"{type(error).__name__}: {error}".strip(": "))
        try:
            self._line(f"anaf FAILED after {s['batchesDone']}/{s['batchesTotal']} batches: {s['error']}; every finished batch is archived, rerun the same command to resume")
        except OSError:
            pass

    def _line(self, text: str) -> None:
        line = f"{stamp(self._now())} {text}"
        self.state["last"] = line
        self._out(line)
        self._write()

    def _write(self) -> None:
        self.state["updatedAt"] = _iso(self._now())
        if self.status_file:
            write_atomically(self.status_file, json.dumps(self.state, indent=2, ensure_ascii=False) + "\n")


def describe_anaf(status: dict, alive: Callable[[int], bool] = _alive, host: str | None = None) -> list[str]:
    """The lines `pipeline status` prints for an ANAF lookup."""
    state = effective_state(status, alive, host)
    lines = [
        f"anaf lookup state: {state if state != 'unknown' else 'running? (cannot see the process from here)'}",
        f"batches: {status.get('batchesDone', 0)}/{status.get('batchesTotal', 0)} done; cuis: {status.get('cuisDone', 0)}/{status.get('cuisTotal', 0)} "
        f"({status.get('found', 0)} found, {status.get('notFound', 0)} not found); {status.get('alreadyArchived', 0)} were archived before this run",
        f"started: {status.get('startedAt')}",
        f"updated: {status.get('updatedAt')} (pid {status.get('pid')} on {status.get('host', 'an unknown host')})",
    ]
    if status.get("last"):
        lines.append(f"last line: {status['last']}")
    if state == "interrupted":
        lines.append("the lookup is not running and did not finish: every finished batch is archived; rerun the same command to resume")
    if state == "failed":
        lines.append(f"error: {status.get('error')}")
    return lines


# ---- the command -------------------------------------------------------------------------------------------------------


@dataclass
class LookupSummary:
    batches: int = 0
    cuis: int = 0
    found: int = 0
    not_found: int = 0
    failed_batches: int = 0  # batches ANAF stayed unavailable for; their CUIs are not archived, so still pending
    failed_cuis: int = 0
    archived: list[Path] = field(default_factory=list)


def lookup(
    archive: Archive,
    cuis: Iterable[int],
    client: AnafClient,
    progress: AnafProgress | None = None,
    *,
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    recheck_after_days: int | None = None,
    max_batches: int | None = None,
    max_consecutive_failures: int = 3,
) -> LookupSummary:
    """Ask ANAF for the CUIs the archive has no answer for yet, archiving every response before the next request. A batch ANAF
    stays unavailable for (every retry failed) is logged and skipped, its CUIs stay pending for the next run; after
    `max_consecutive_failures` such batches in a row ANAF is taken to be down and the lookup stops with the error."""
    today = now().date()
    answers = read_answers(archive)
    wanted = sorted(set(cuis))
    todo = pending(wanted, answers, today=today, recheck_after_days=recheck_after_days)
    groups = batches(todo)
    if max_batches is not None:
        groups = groups[:max_batches]
    summary = LookupSummary()
    if progress:
        progress.start(sum(len(g) for g in groups), len(groups), len(wanted) - len(todo), archive.root)
    consecutive = 0
    try:
        for index, group in enumerate(groups, start=1):
            day = now().date()
            try:
                body = client.query(group, day)
            except AnafUnavailable as e:
                summary.failed_batches += 1
                summary.failed_cuis += len(group)
                consecutive += 1
                log.warning("anaf batch %d/%d skipped, its %d CUIs stay pending: %s", index, len(groups), len(group), e)
                if progress:
                    progress.batch_failed(index, len(groups), len(group), e)
                if consecutive >= max_consecutive_failures or (index == len(groups) and not summary.batches):
                    raise  # ANAF looks down: three in a row, or nothing at all answered in this run
                continue
            consecutive = 0
            found, missing = response_cuis(json.loads(body))
            path = archive_batch(archive, group, day, body, now(), client.endpoint)
            summary.batches += 1
            summary.cuis += len(group)
            summary.found += len(found)
            summary.not_found += len(missing)
            summary.archived.append(path)
            if progress:
                progress.batch_done(index, len(groups), len(group), len(found), len(missing), path)
    except BaseException as e:  # incl. SIGTERM turned into SystemExit: the archived batches stay, the status file says so
        if progress:
            progress.fail(e)
        raise
    if progress:
        progress.finish()
    return summary
