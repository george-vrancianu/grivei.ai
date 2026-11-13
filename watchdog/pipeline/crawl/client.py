"""The e-licitatie.ro `api-pub` client of the crawl: polite, retrying, and faithful to what the server said.

Everything the Connector says to the network goes through `EliClient.post`, so the tests stub exactly one thing (the
`post` callable, `requests.post`'s shape) and a fake clock (`sleep`, `clock`). It returns the response body **as
bytes** (what is archived, unchanged) together with the parsed JSON (what the crawl decides on).

Ported from the hardened harvester (`connectors/seap_harvest.py`, spec #13): the `Referer` header api-pub insists on,
a pause between requests, retries with a growing back-off on a transient error (no answer, a timeout, 5xx, 429, the 403
api-pub sometimes returns under load), anything else fails at once.
"""
from __future__ import annotations

import json
import time
from typing import Any, Callable

import requests

BASE = "https://e-licitatie.ro"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "grivei-pipeline (+https://grivei.ai)",
    # api-pub answers 403 "Referrer cannot be null" without it (since ~Nov 2026); the public UI sends this one.
    "Referer": "https://e-licitatie.ro/pub",
}
DELAY = 0.35  # seconds between requests (the harvester's PAUSE)
RETRIES = 3  # retries of one request after a transient error
RETRY_PAUSE = 5  # back-off step in seconds: 5, 10, 15
TIMEOUT = 180  # seconds per request: a 1000-contract page of a big notice took 86 s (notice 100665956, 2480 contracts, Nov 2026)


class CrawlError(RuntimeError):
    """A day (or window) that cannot be completed: it fails, the cursor does not move past it. Never a silent truncation."""


def transient(error: BaseException) -> bool:
    """A request error worth retrying: no answer at all (connection, timeout), a server error (5xx), throttling (429), the 403
    api-pub sometimes returns under load, or a body that is not JSON (an error page). Other HTTP errors would fail the same way again."""
    if isinstance(error, ValueError):  # json.JSONDecodeError
        return True
    if not isinstance(error, requests.HTTPError) or error.response is None:
        return True
    status = error.response.status_code
    return status >= 500 or status in (403, 429)


class EliClient:
    def __init__(
        self,
        *,
        post: Callable[..., Any] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
        delay: float = DELAY,
        retries: int = RETRIES,
        retry_pause: float = RETRY_PAUSE,
        timeout: float = TIMEOUT,
        base: str = BASE,
        log: Callable[[str], None] | None = None,
    ):
        self._post = post or requests.Session().post
        self._sleep, self._clock = sleep, clock
        self.delay, self.retries, self.retry_pause, self.timeout, self.base = delay, retries, retry_pause, timeout, base
        self._log = log or (lambda line: None)
        self._last: float | None = None
        self.requests_made = 0

    def _wait_turn(self) -> None:
        """The polite delay: at least `delay` seconds between the starts of two requests."""
        if self._last is not None:
            remaining = self.delay - (self._clock() - self._last)
            if remaining > 0:
                self._sleep(remaining)
        self._last = self._clock()

    def post(self, path: str, body: dict, what: str) -> tuple[bytes, Any]:
        """POST `body` as JSON to `path`; returns (the raw response bytes, the parsed JSON). Retried on a transient error."""
        for attempt in range(self.retries + 1):
            self._wait_turn()
            self.requests_made += 1
            try:
                response = self._post(self.base + path, json=body, headers=HEADERS, timeout=self.timeout)
                response.raise_for_status()
                raw = response.content
                return raw, json.loads(raw)
            except (requests.RequestException, ValueError) as e:
                if attempt == self.retries or not transient(e):
                    raise CrawlError(f"{what}: {type(e).__name__}: {e}") from e
                self._log(f"retry {attempt + 1}/{self.retries} {what}: {type(e).__name__}: {e}")
                self._sleep(self.retry_pause * (attempt + 1))
        raise AssertionError("unreachable")
