"""`pipeline fetch-aep`: AEP's local-election results into the raw archive (ADR 0004), unchanged and dated (#180).

Units (`<archive>/aep/<stream>/<kind>/<unit>/<fetched on>/...` + manifest):

- `final/local/2020-09-27` and `final/local/2024-06-09`: the final minutes, one JSON per county (`pv_<county>_final.json`, 42 files each).
  2020 comes from AEP's own site (`prezenta.roaep.ro/locale27092020`); AEP's 2024 copy now redirects, so 2024 comes from Code for Romania's
  backup of it (`code4romania/romanian-elections-data`), the same files.
- `repeat/local/2020-10-11`: the October 2020 repeat round in 3 UATs (data.gov.ro, AEP's dataset, two CSVs).
- `partial/local/2025-12-07`: the December 2025 partial elections (Code for Romania's CSV backup, the only place they exist as data). A ONE-OFF
  file set with a stated data-through date (`origin.dataThrough`, the date of the backup's last commit on it). It is never refreshed
  automatically: `check_partial` only asks whether the upstream files changed and says so (an alert), and a person decides whether to archive
  a newer set (`fetch-aep --partial-again`). A data route from AEP itself is out of scope.

A unit that is already archived is `unchanged` (no download). A failed download leaves nothing half-written (the archive writes units atomically).
"""
from __future__ import annotations

import fnmatch
import logging
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import requests

from ..archive import Archive
from ..fetch import USER_AGENT

SOURCE = "aep"
COUNTIES = ("ab ag ar b bc bh bn br bt bv bz cj cl cs ct cv db dj gj gl gr hd hr if il is mh mm ms nt ot ph sb sj sm sv tl tm tr vl vn vs").split()
AEP_2020 = "https://prezenta.roaep.ro/locale27092020/data/json/sicpv/pv/pv_{county}_final.json"
C4R_RAW = "https://raw.githubusercontent.com/code4romania/romanian-elections-data/main/"
C4R_2024 = C4R_RAW + "json/locale09062024/sicpv/pv/pv_{county}_final.json"
DATAGOV_2020 = "https://data.gov.ro/dataset/a9ac2859-b244-479b-a3ab-dd077999babb/resource/"
REPEAT_FILES = {"pv_final_cntry_p_tur2.csv": DATAGOV_2020 + "128c0dde-a961-44ea-9332-72f67ac94ad0/download/pv_final_cntry_p_tur2.csv",
                "bd_p_11.10.2020.csv": DATAGOV_2020 + "8be694cf-b14b-44f5-ad6a-7d87da1ad945/download/bd_p_11.10.2020.csv"}
C4R_API = "https://api.github.com/repos/code4romania/romanian-elections-data/"
PARTIAL_DIR = "csv/pv/LCL-20251207"
PARTIAL_PATTERNS = ("pv_part_uat_p_*.csv", "pv_part_cnty_pcj_*.csv")
PARTIAL_UNIT = "2025-12-07"
log = logging.getLogger("pipeline.aep")


@dataclass
class AepFetchSummary:
    archived: list[str] = field(default_factory=list)
    unchanged: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    alerts: list[str] = field(default_factory=list)

    def lines(self) -> list[str]:
        return ([f"archived: {len(self.archived)}", f"unchanged: {len(self.unchanged)}", f"failed: {len(self.failed)}"] + [f"  archived: {t}" for t in self.archived]
                + [f"  failed: {t}" for t in self.failed] + [f"ALERT: {t}" for t in self.alerts])


def _held_units(archive: Archive, stream: str, unit: str):
    root = archive.root / SOURCE
    return [u for u, _ in archive.survey(keep=lambda d: d.is_relative_to(root)) if u is not None and (u.stream, u.unit) == (stream, unit)]


def _download(http, url: str, directory: Path, timeout: float) -> Path:
    got = http(url, stream=True, timeout=timeout, headers={"User-Agent": USER_AGENT})
    got.raise_for_status()
    with tempfile.NamedTemporaryFile(dir=directory, prefix=".aep-download-", delete=False) as tmp:
        for chunk in got.iter_content(chunk_size=1 << 20):
            tmp.write(chunk)
    return Path(tmp.name)


def _store(archive: Archive, summary: AepFetchSummary, http, *, stream: str, kind: str, unit: str, urls: dict[str, str], via: str, origin: dict, now: datetime, timeout: float) -> None:
    label = f"{stream}/{kind}/{unit}"
    if _held_units(archive, stream, unit):
        summary.unchanged.append(label)
        log.info("unchanged   %s: already archived", label)
        return
    archive.root.mkdir(parents=True, exist_ok=True)
    tmps: dict[str, Path] = {}
    try:
        for name, url in urls.items():
            tmps[name] = _download(http, url, archive.root, timeout)
        archive.write_unit(source=SOURCE, stream=stream, kind=kind, unit=unit, fetched_at=now, files=tmps, url=next(iter(urls.values())), via=via,
                           origin={**origin, "files": urls}, same_day=True)
    except Exception as e:  # noqa: BLE001 - nothing half-written is left in the archive
        summary.failed.append(f"{label}: {str(e) or type(e).__name__}")
        log.warning("failed      %s: %s", label, summary.failed[-1])
        return
    finally:
        for tmp in tmps.values():
            tmp.unlink(missing_ok=True)
    summary.archived.append(label)
    log.info("archived    %s (%d files)", label, len(urls))


def partial_listing(http, timeout: float = 60) -> tuple[dict[str, dict], str]:
    """(name -> {sha, url}, data-through date) of the 2025 partial files upstream: the GitHub contents listing and the last commit on the directory."""
    headers = {"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"}
    listing = http(C4R_API + "contents/" + PARTIAL_DIR, timeout=timeout, headers=headers)
    listing.raise_for_status()
    files = {e["name"]: {"sha": e["sha"], "url": e["download_url"]} for e in listing.json()
             if e.get("type") == "file" and " (" not in e["name"] and any(fnmatch.fnmatch(e["name"], p) for p in PARTIAL_PATTERNS)}
    commits = http(C4R_API + "commits?per_page=1&path=" + PARTIAL_DIR, timeout=timeout, headers=headers)
    commits.raise_for_status()
    through = commits.json()[0]["commit"]["committer"]["date"][:10]
    return files, through


def check_partial(archive: Archive, *, http=requests.get, timeout: float = 60) -> list[str]:
    """The refresh step's whole job for the one-off 2025 file: compare the upstream listing with the archived unit and return alerts (never downloads)."""
    held_units = _held_units(archive, "partial", PARTIAL_UNIT)
    try:
        files, through = partial_listing(http, timeout)
    except Exception as e:  # noqa: BLE001
        return [f"AEP 2025 partial elections: the upstream check failed: {e}"]
    if not held_units:
        return ["AEP 2025 partial elections: no file archived yet (run `pipeline fetch-aep`)"]
    known = (max(held_units, key=lambda u: u.fetched_at).origin or {}).get("upstream") or {}
    changed = sorted(n for n, f in files.items() if known.get(n) != f["sha"]) + sorted(n for n in known if n not in files)
    if changed:
        return [f"AEP 2025 partial elections: a newer upstream file set exists (data through {through}; {len(changed)} file(s) differ, e.g. {changed[0]}); "
                "review it and archive it with `pipeline fetch-aep --partial-again`"]
    return []


def fetch_aep(archive: Archive, *, now: datetime | None = None, timeout: float = 300, http=requests.get, counties=COUNTIES, partial_again: bool = False) -> AepFetchSummary:
    """Archive what is not archived yet. `http` is `requests.get` (tests pass a stub)."""
    now = now or datetime.now(timezone.utc)
    summary = AepFetchSummary()
    for stale in archive.root.glob(".aep-download-*") if archive.root.is_dir() else []:
        stale.unlink(missing_ok=True)
    common = {"system": "AEP"}
    _store(archive, summary, http, stream="final", kind="local", unit="2020-09-27", via="AEP final minutes, local elections 27 September 2020",
           urls={f"pv_{c}_final.json": AEP_2020.format(county=c) for c in counties}, origin={**common, "site": "prezenta.roaep.ro/locale27092020"}, now=now, timeout=timeout)
    _store(archive, summary, http, stream="final", kind="local", unit="2024-06-09", via="AEP final minutes, local elections 9 June 2024 (Code for Romania backup)",
           urls={f"pv_{c}_final.json": C4R_2024.format(county=c) for c in counties},
           origin={**common, "site": "github.com/code4romania/romanian-elections-data", "note": "AEP's own copy redirects"}, now=now, timeout=timeout)
    _store(archive, summary, http, stream="repeat", kind="local", unit="2020-10-11", via="AEP repeat round, 11 October 2020 (data.gov.ro, CC BY 4.0)",
           urls=dict(REPEAT_FILES), origin={**common, "system": "data.gov.ro", "dataset": "alegeri-pentru-autoritatile-administratiei-publice-locale-2020"}, now=now, timeout=timeout)
    if partial_again or not _held_units(archive, "partial", PARTIAL_UNIT):
        try:
            files, through = partial_listing(http)
        except Exception as e:  # noqa: BLE001
            summary.failed.append(f"partial/local/{PARTIAL_UNIT}: listing failed: {e}")
            return summary
        if partial_again:
            summary.alerts.append("a second copy of the one-off 2025 file set is archived beside the first; the build reads the newest")
        _store_partial(archive, summary, http, files, through, now, timeout, partial_again)
    else:
        summary.unchanged.append(f"partial/local/{PARTIAL_UNIT}")
    return summary


def _store_partial(archive, summary, http, files, through, now, timeout, again) -> None:
    label = f"partial/local/{PARTIAL_UNIT}"
    archive.root.mkdir(parents=True, exist_ok=True)
    tmps: dict[str, Path] = {}
    try:
        for name, f in files.items():
            tmps[name] = _download(http, f["url"], archive.root, timeout)
        archive.write_unit(source=SOURCE, stream="partial", kind="local", unit=PARTIAL_UNIT, fetched_at=now, files=tmps, url=C4R_RAW + PARTIAL_DIR,
                           via="AEP partial elections, December 2025 (Code for Romania backup): one-off file, partial counts", same_day=True,
                           origin={"system": "AEP", "site": "github.com/code4romania/romanian-elections-data", "dataThrough": through,
                                   "upstream": {n: f["sha"] for n, f in files.items()}, "oneOff": True})
    except Exception as e:  # noqa: BLE001
        summary.failed.append(f"{label}: {str(e) or type(e).__name__}")
        return
    finally:
        for tmp in tmps.values():
            tmp.unlink(missing_ok=True)
    summary.archived.append(label)
