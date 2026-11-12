"""Shared plumbing of the two small e-licitatie lookups placement needs (SEAP's entity views, the award notice's buyer type).

Each answer is archived unchanged before the next request (ADR 0004), one unit per CUI, manifest last:

    <root>/seap/lookup/<kind>/<cui>/<fetched on>/{request.json, <responses as sent>, manifest.json}

The rebuild never calls the network: it reads these (`read_units`). `LookupClient` is the crawl's polite client (the `Referer`
api-pub insists on, the delay, the retries) with a GET beside its POST; tests replace `post` and `get` and the clock.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterator, Mapping

import requests

from ..archive import Archive, Unit
from ..crawl.client import HEADERS, CrawlError, EliClient, transient

SOURCE, STREAM = "seap", "lookup"
REQUEST_FILE = "request.json"


class LookupClient(EliClient):
    def __init__(self, *, get: Callable[..., Any] | None = None, **kwargs):
        super().__init__(**kwargs)
        self._get = get or requests.Session().get

    def get(self, path: str, what: str) -> tuple[bytes, Any]:
        """GET `path`; returns (the raw bytes, the parsed JSON). Retried like `post`."""
        for attempt in range(self.retries + 1):
            self._wait_turn()
            self.requests_made += 1
            try:
                response = self._get(self.base + path, headers=HEADERS, timeout=self.timeout)
                response.raise_for_status()
                raw = response.content
                return raw, json.loads(raw)
            except (requests.RequestException, ValueError) as e:
                if attempt == self.retries or not transient(e):
                    raise CrawlError(f"{what}: {type(e).__name__}: {e}") from e
                self._log(f"retry {attempt + 1}/{self.retries} {what}: {type(e).__name__}: {e}")
                self._sleep(self.retry_pause * (attempt + 1))
        raise AssertionError("unreachable")


def archive_lookup(archive: Archive, kind: str, cui: str, request: Mapping, responses: Mapping[str, bytes], fetched_at: datetime) -> Path:
    files: dict[str, bytes | Path] = {REQUEST_FILE: (json.dumps(request, indent=2, ensure_ascii=False) + "\n").encode(), **responses}
    return archive.write_unit(source=SOURCE, stream=STREAM, kind=kind, unit=cui, fetched_at=fetched_at, files=files, same_day=True)


def read_units(archive: Archive, kind: str) -> Iterator[Unit]:
    """Complete units of `kind`, oldest first (the latest answer for a CUI wins)."""
    units = [u for u in archive.units() if (u.source, u.stream, u.kind) == (SOURCE, STREAM, kind)]
    units.sort(key=lambda u: (u.fetched_at, str(u.path)))
    yield from units


def looked_up(archive: Archive, kind: str) -> set[str]:
    return {u.unit for u in read_units(archive, kind)}


def now() -> datetime:
    return datetime.now(timezone.utc)


def pause(seconds: float) -> None:
    time.sleep(seconds)
