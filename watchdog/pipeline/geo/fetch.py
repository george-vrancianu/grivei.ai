"""`pipeline geo-fetch`: the three geography Reference sources into the raw archive, unchanged and dated (ADR 0004).

    geo/siruta/csv/<dataset>/<day>/<siruta csv as published>          INS SIRUTA on data.gov.ro (CC BY 4.0), found through CKAN
    geo/ancpi/uat-polygons/layer-1/<day>/page-NNNN.geojson            ANCPI UAT polygons, ArcGIS feature service, WGS84 GeoJSON (CC BY 4.0)
    geo/wikidata/siruta-points/p843-p625/<day>/{points.json,query.sparql}   Wikidata SIRUTA (P843) and coordinate (P625) (CC0)

Each unit is written file by file under temporary names and renamed, manifest last (`Archive.write_unit`). A source whose bytes
are identical to its latest archived fetch is `unchanged`: nothing is written. Only `http` touches the network (tests stub it):
`http(url, params, headers) -> bytes`.

ANCPI answers in pages (`resultOffset`, `resultRecordCount`, `exceededTransferLimit`); the service generalises the lines by
`maxAllowableOffset` degrees (default 0.0005, about 50 m: enough for a county map, small enough to hold in memory). That is a
parameter of the request, recorded in the manifest, not an edit of the answer.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Mapping

import requests

from ..archive import Archive, sha256_of

USER_AGENT = "grivei-pipeline (+https://grivei.ai)"
CKAN = "https://data.gov.ro/api/3/action/package_show"
SIRUTA_DATASET = "siruta_s1-2026"
ANCPI_QUERY = "https://services-eu1.arcgis.com/tt6hwS9xmcvnRjQC/arcgis/rest/services/AU_Unități_administrative/FeatureServer/1/query"
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
SPARQL = "SELECT ?item ?siruta ?coord WHERE { ?item wdt:P843 ?siruta . OPTIONAL { ?item wdt:P625 ?coord } }"
PAGE_SIZE = 200
MAX_PAGES = 200
OFFSET = 0.0005

Http = Callable[[str, Mapping[str, str] | None, Mapping[str, str] | None], bytes]


def http_get(url: str, params: Mapping[str, str] | None = None, headers: Mapping[str, str] | None = None) -> bytes:
    last: Exception | None = None
    for attempt in range(3):
        try:
            response = requests.get(url, params=params, headers={"User-Agent": USER_AGENT, **(headers or {})}, timeout=180)
            response.raise_for_status()
            return response.content
        except requests.RequestException as e:
            last = e
            time.sleep(5 * (attempt + 1))
    raise GeoFetchError(f"{url}: {last}") from last


class GeoFetchError(RuntimeError):
    pass


@dataclass
class GeoFetchSummary:
    archived: list[str] = field(default_factory=list)
    unchanged: list[str] = field(default_factory=list)

    def lines(self) -> list[str]:
        return [f"geo-fetch archived {p}" for p in self.archived] + [f"geo-fetch unchanged {p}" for p in self.unchanged]


def _latest(archive: Archive, source: str, stream: str, kind: str, unit: str):
    units = [u for u in archive.units() if (u.source, u.stream, u.kind, u.unit) == (source, stream, kind, unit)]
    return max(units, key=lambda u: (u.fetched_at, str(u.path)), default=None)


def _store(archive: Archive, summary: GeoFetchSummary, *, source: str, stream: str, kind: str, unit: str, files: Mapping[str, bytes],
           url: str, origin: Mapping, now: datetime) -> None:
    prior = _latest(archive, source, stream, kind, unit)
    if prior is not None:
        import hashlib

        same = {n: hashlib.sha256(b).hexdigest() for n, b in files.items()}
        if same == {n: sha256_of(prior.file_path(n)) for n in prior.files}:
            summary.unchanged.append(f"{source}/{stream}/{kind}/{unit} (same as {prior.path.relative_to(archive.root)})")
            return
    path = archive.write_unit(source=source, stream=stream, kind=kind, unit=unit, fetched_at=now, files=dict(files), url=url,
                              origin=origin, same_day=True)
    summary.archived.append(str(path.relative_to(archive.root)))


def fetch_siruta(archive: Archive, http: Http, summary: GeoFetchSummary, now: datetime, dataset: str = SIRUTA_DATASET, url: str | None = None) -> None:
    """The SIRUTA CSV of `dataset` (a data.gov.ro dataset id such as `siruta_s1-2026`; a new semester is a new id)."""
    name = None
    if url is None:
        package = json.loads(http(CKAN, {"id": dataset}, None))["result"]
        csvs = [r for r in package["resources"] if str(r.get("format", "")).lower() == "csv" or str(r.get("url", "")).lower().endswith(".csv")]
        if not csvs:
            raise GeoFetchError(f"dataset {dataset} has no CSV resource")
        url, name = csvs[0]["url"], csvs[0].get("name")
    file_name = re.sub(r"[^A-Za-z0-9._-]", "_", url.rsplit("/", 1)[-1] or "siruta.csv")
    body = http(url, None, None)
    _store(archive, summary, source="geo", stream="siruta", kind="csv", unit=dataset, files={file_name: body}, url=url,
           origin={"system": "data.gov.ro", "dataset": dataset, "resourceName": name, "licence": "CC BY 4.0 (INS SIRUTA)"}, now=now)


def fetch_ancpi(archive: Archive, http: Http, summary: GeoFetchSummary, now: datetime, query_url: str = ANCPI_QUERY, offset: float = OFFSET,
                page_size: int = PAGE_SIZE, delay: float = 1.0, sleep: Callable[[float], None] = time.sleep, say: Callable[[str], None] = lambda _: None) -> None:
    """Every page of the ANCPI UAT layer. Nothing is archived unless the last page was read (a half layer is not a snapshot)."""
    pages: dict[str, bytes] = {}
    for n in range(MAX_PAGES):
        params = {"where": "1=1", "outFields": "*", "outSR": "4326", "f": "geojson", "orderByFields": "OBJECTID",
                  "resultOffset": str(n * page_size), "resultRecordCount": str(page_size),
                  "maxAllowableOffset": str(offset), "geometryPrecision": "5"}
        body = http(query_url, params, None)
        try:
            doc = json.loads(body)
        except ValueError as e:
            raise GeoFetchError(f"ANCPI page {n}: not JSON") from e
        if "error" in doc:
            raise GeoFetchError(f"ANCPI page {n}: {doc['error']}")
        features = doc.get("features") or []
        if features:
            pages[f"page-{n:04d}.geojson"] = body
            say(f"geo-fetch ancpi page {n + 1}: {len(features)} features")
        more = (doc.get("properties") or {}).get("exceededTransferLimit") or doc.get("exceededTransferLimit")
        if not features or (len(features) < page_size and not more):
            break
        sleep(delay)
    else:
        raise GeoFetchError(f"ANCPI: more than {MAX_PAGES} pages")
    if not pages:
        raise GeoFetchError("ANCPI: no features")
    _store(archive, summary, source="geo", stream="ancpi", kind="uat-polygons", unit="layer-1", files=pages, url=query_url,
           origin={"system": "ANCPI ArcGIS feature service", "layer": query_url, "pageSize": page_size, "maxAllowableOffset": offset,
                   "outSR": 4326, "licence": "CC BY 4.0 (ANCPI)"}, now=now)


def fetch_wikidata(archive: Archive, http: Http, summary: GeoFetchSummary, now: datetime, endpoint: str = WIKIDATA_SPARQL) -> None:
    body = http(endpoint, {"query": SPARQL, "format": "json"}, {"Accept": "application/sparql-results+json"})
    try:
        json.loads(body)["results"]["bindings"]
    except (ValueError, KeyError, TypeError) as e:
        raise GeoFetchError("Wikidata: not a SPARQL JSON result") from e
    _store(archive, summary, source="geo", stream="wikidata", kind="siruta-points", unit="p843-p625",
           files={"points.json": body, "query.sparql": (SPARQL + "\n").encode()}, url=endpoint,
           origin={"system": "Wikidata Query Service", "licence": "CC0"}, now=now)


SOURCES = ("siruta", "ancpi", "wikidata")


def geo_fetch(archive: Archive, only: tuple[str, ...] = SOURCES, http: Http = http_get, now: datetime | None = None, *, siruta_dataset: str = SIRUTA_DATASET,
              siruta_url: str | None = None, ancpi_url: str = ANCPI_QUERY, delay: float = 1.0, sleep: Callable[[float], None] = time.sleep,
              say: Callable[[str], None] = lambda _: None) -> GeoFetchSummary:
    now = now or datetime.now(timezone.utc)
    summary = GeoFetchSummary()
    if "siruta" in only:
        fetch_siruta(archive, http, summary, now, siruta_dataset, siruta_url)
    if "wikidata" in only:
        fetch_wikidata(archive, http, summary, now)
    if "ancpi" in only:
        fetch_ancpi(archive, http, summary, now, ancpi_url, delay=delay, sleep=sleep, say=say)
    return summary
