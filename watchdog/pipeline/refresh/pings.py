"""healthchecks.io pings: a success ping after every run that did not fail, a `/fail` ping with a one-line reason. No URL = no pings.

The URL is the check's ping URL (env `PIPELINE_HEALTHCHECK_URL`). A ping that cannot be sent is logged and never fails the run:
the dead-man's switch (3 days without a success ping) covers exactly that.
"""
from __future__ import annotations

import logging
from typing import Callable

import requests

log = logging.getLogger("pipeline.refresh")
MAX_BODY = 8000


class Pinger:
    def __init__(self, url: str | None, post: Callable | None = None, timeout: float = 15):
        self.url, self._post, self._timeout = (url or "").rstrip("/") or None, post, timeout

    def _send(self, suffix: str, body: str) -> None:
        if not self.url:
            log.info("no PIPELINE_HEALTHCHECK_URL set: not pinging (%s)", suffix.strip("/") or "success")
            return
        try:
            (self._post or requests.post)(self.url + suffix, data=body[:MAX_BODY].encode("utf-8"), timeout=self._timeout)
        except Exception as e:  # noqa: BLE001 - a ping is best effort
            log.warning("ping %s failed: %s", suffix or "/", e)

    def success(self, body: str = "") -> None:
        self._send("", body)

    def fail(self, reason: str) -> None:
        self._send("/fail", reason)
