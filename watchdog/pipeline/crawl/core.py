"""The crawl Connector's core (Seam 2): one unit of national award notices (CAN and SCNA) with their contracts, archived.

`Crawler.crawl_unit(unit, first, last)` crawls the notices published between two days (a single day for the nightly crawl;
any window for #78's backfill, whose `keep` hook decides which list rows get their contracts fetched) and archives every
response unchanged, manifest last (unitdir.py). Ported from the hardened harvester (`connectors/seap_harvest.py`):

- the list endpoint (`GetCANoticeList`, `pageSize` 1000) is capped at 3,000 rows per query and says so with
  `searchTooLong`; the window is then split in halves down to one day. A single day over the cap is not truncated: it fails;
- the list is unsorted, so a page may repeat rows of an earlier one: only the number of *unique* rows reaching `total`
  proves a window complete; an empty page before that fails;
- contracts come one notice at a time (`GetCANoticeContracts`), paged with `skip`/`take`, under the same two checks.

Anything that fails raises `CrawlError`: the unit is not completed (no manifest), so the cursor does not move past it.
Files already in an interrupted unit's directory are reused instead of fetched again (the resume).
No direct purchases: the DA list is capped at 2,000 per day nationally and cannot be crawled by date (research #12).
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from ..archive import Archive
from .client import BASE, CrawlError, EliClient
from .unitdir import KIND, UnitWriter

NOTICE_LIST = "/api-pub/NoticeCommon/GetCANoticeList/"
CONTRACTS = "/api-pub/C_PUBLIC_CANotice/GetCANoticeContracts"
PAGE_SIZE = 1000  # rows per page of the list endpoint
NOTICE_CAP = 3000  # CaNotice_MaxListItems in the /pub page config
CONTRACTS_TAKE = 1000  # contracts per GetCANoticeContracts page
BATCH = 25  # a contracts progress line every this many notices


def keep_all(row: dict) -> bool:
    return True


@dataclass
class UnitResult:
    unit: str
    path: Path
    notices: int  # unique list rows
    kept: int  # rows whose contracts were fetched
    list_pages: int
    contract_pages: int
    contracts: int  # unique contracts
    requests: int  # requests sent for this unit (reused files cost none)
    resumed: bool

    @property
    def pages(self) -> int:
        return self.list_pages


def _iso(day: date, end: bool = False) -> str:
    # as the harvester: the server filters by day only and ignores the time part (research #12)
    return f"{day}T23:59:59+03:00" if end else f"{day}T00:00:00+02:00"


class Crawler:
    def __init__(
        self,
        archive: Archive,
        client: EliClient,
        *,
        now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
        note: Callable[[str], None] | None = None,
        keep: Callable[[dict], bool] = keep_all,
        kind: str = KIND,
    ):
        self.archive, self.client, self.now, self.keep, self.kind = archive, client, now, keep, kind
        self._note = note or (lambda text: None)

    # ---- one unit -------------------------------------------------------------------------------------------

    def crawl_unit(self, unit: str, first: date, last: date) -> UnitResult:
        writer = UnitWriter.open(self.archive, unit, self.now(), self.kind)
        resumed = writer.resumed
        before = self.client.requests_made
        label = f"day {unit}" if first == last else f"unit {unit}"
        rows: dict[Any, dict] = {}
        stats = {"list_pages": 0, "contract_pages": 0}
        self._window(writer, label, first, last, rows, stats)
        kept = [r for r in rows.values() if self.keep(r)]
        contracts = 0
        for k, notice in enumerate(kept, 1):
            contracts += self._contracts(writer, label, notice, stats)
            if k % BATCH == 0 and k < len(kept):
                self._note(f"{label} contracts {k}/{len(kept)} notices")
        extra = {
            "window": [first.isoformat(), last.isoformat()], "notices": len(rows), "kept": len(kept), "listPages": stats["list_pages"],
            "contractPages": stats["contract_pages"], "contracts": contracts, "keep": getattr(self.keep, "__name__", "custom"),
        }
        path = writer.commit(self.now(), BASE + NOTICE_LIST, extra)  # the manifest, LAST
        return UnitResult(unit, path, len(rows), len(kept), stats["list_pages"], stats["contract_pages"], contracts,
                          self.client.requests_made - before, resumed)

    # ---- the notice list ------------------------------------------------------------------------------------

    def _fetch(self, writer: UnitWriter, name: str, path: str, body: dict, what: str) -> Any:
        """A response from the archive when an interrupted fetch already has it, else from the server (and archived at once)."""
        if writer.has(name):
            return json.loads(writer.read(name))
        raw, parsed = self.client.post(path, body, what)
        writer.put(name, raw)
        return parsed

    def _window(self, writer: UnitWriter, label: str, a: date, b: date, rows: dict, stats: dict) -> None:
        """Every list row published between two days (inclusive) into `rows`, splitting a window the server capped."""
        got, page, seen = 0, 0, set()
        while True:
            body = {"sysNoticeTypeIds": [], "sortProperties": [], "pageIndex": page, "pageSize": PAGE_SIZE,
                    "contractingAuthorityId": None, "startPublicationDate": _iso(a), "endPublicationDate": _iso(b, True)}
            j = self._fetch(writer, f"notices-{a}_{b}-p{page:04d}.json", NOTICE_LIST, body, f"notice list {a}..{b} page {page}")
            stats["list_pages"] += 1
            total = j.get("total")
            if not isinstance(total, int):
                raise CrawlError(f"notice list {a}..{b} page {page}: no total in the answer")
            if j.get("searchTooLong") or total >= NOTICE_CAP:
                if page:
                    raise CrawlError(f"notice list {a}..{b}: hit the {NOTICE_CAP} cap on page {page}")
                # also fires for a single day with total == cap and no searchTooLong: that day may well be complete, but a
                # capped answer looks the same and cannot be split to tell
                if a == b:
                    raise CrawlError(f"notice list {a}: one day is over the {NOTICE_CAP} result cap; cannot split further")
                mid = a + (b - a) // 2
                self._note(f"{label} notices {a}..{b} over the cap, splitting at {mid}")
                self._window(writer, label, a, mid, rows, stats)
                self._window(writer, label, mid + timedelta(days=1), b, rows, stats)
                return
            for item in j.get("items") or []:
                if "caNoticeId" not in item:
                    raise CrawlError(f"notice list {a}..{b} page {page}: a row without caNoticeId")
                rows[item["caNoticeId"]] = item
                seen.add(item["caNoticeId"])
            got += len(j.get("items") or [])
            self._note(f"{label} notices page {page + 1} window={a}..{b} rows={got}/{total}")
            if got >= total:
                # the list is unsorted: a page may repeat rows, so the raw count reaches total while some rows were never sent
                if len(seen) < total:
                    raise CrawlError(f"notice list {a}..{b}: {len(seen)} unique of {total} rows; pages repeated rows, the rest were never sent")
                return
            if not j.get("items"):
                raise CrawlError(f"notice list {a}..{b}: empty page {page} at {got}, total {total}")
            page += 1

    # ---- the contracts of one notice ------------------------------------------------------------------------

    def _contracts(self, writer: UnitWriter, label: str, notice: dict, stats: dict) -> int:
        """All the contracts of one notice, paged with skip/take until `total`; fails unless `total` distinct contracts came back."""
        notice_id = notice["caNoticeId"]
        items: list[dict] = []
        while True:
            skip = len(items)
            body = {
                "caNoticeId": notice_id, "contractNo": None, "winnerTitle": None, "winnerFiscalNumber": None,
                "contractDate": {"from": None, "to": None}, "contractValue": {"from": None, "to": None},
                "contractMinOffer": {"from": None, "to": None}, "contractMaxOffer": {"from": None, "to": None},
                "contractTitle": None, "lots": None, "sortOrder": [], "sysContractFrameworkType": {}, "skip": skip, "take": CONTRACTS_TAKE,
            }
            j = self._fetch(writer, f"contracts-{notice_id}-s{skip:05d}.json", CONTRACTS, body, f"contracts of notice {notice_id} skip {skip}")
            stats["contract_pages"] += 1
            total = j.get("total")
            if not isinstance(total, int):
                raise CrawlError(f"contracts of notice {notice_id}: no total in the answer")
            page = j.get("items") or []
            items += page
            if len(items) >= total:
                unique = {c.get("caNoticeContractId"): c for c in items}
                if len(unique) < total:  # sortOrder is empty, so a page may repeat a contract of an earlier one
                    raise CrawlError(f"contracts of notice {notice_id}: {len(unique)} unique of {total}; pages repeated contracts, the rest were never sent")
                return len(unique)
            if not page:
                raise CrawlError(f"contracts of notice {notice_id}: empty page at skip {len(items)}, total {total}")
