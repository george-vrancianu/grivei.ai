"""Fetching a bulk file into the raw archive (the Connector's first half; loading is `rebuild`'s job).

The body is streamed to disk and stored unchanged; the manifest is written last. Only `requests.get` touches the network,
which is what the tests stub.
"""
from __future__ import annotations

import posixpath
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

import requests

from .archive import Archive

USER_AGENT = "grivei-pipeline (+https://grivei.ai)"


def fetch_bulk_file(
    archive: Archive,
    *,
    url: str,
    kind: str,
    unit: str,
    via: str,
    now: datetime | None = None,
    timeout: float = 120,
) -> Path:
    """Download `url` and archive it as `seap/bulk/<kind>/<unit>/<today>/<file name from the URL>`."""
    fetched_at = now or datetime.now(timezone.utc)
    name = posixpath.basename(unquote(urlparse(url).path)) or "download"
    response = requests.get(url, stream=True, timeout=timeout, headers={"User-Agent": USER_AGENT})
    response.raise_for_status()
    # the scratch file lives beside the archive, on the same disk, so a failed download leaves no unit behind
    archive.root.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=archive.root, prefix=".download-", delete=False) as tmp:
        tmp_path = Path(tmp.name)
        try:
            for chunk in response.iter_content(chunk_size=1 << 20):
                tmp.write(chunk)
        except BaseException:
            tmp.close()
            tmp_path.unlink(missing_ok=True)
            raise
    try:
        return archive.write_unit(
            source="seap", stream="bulk", kind=kind, unit=unit, fetched_at=fetched_at,
            files={name: tmp_path}, url=url, via=via,
        )
    finally:
        tmp_path.unlink(missing_ok=True)
