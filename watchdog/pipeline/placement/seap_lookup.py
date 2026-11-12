"""SEAP's entity views as the fallback for CUIs ANAF does not know (#67).

`pipeline seap-entities` asks e-licitatie about every authority CUI in the raw archive's SEAP files that the archived ANAF answers
do not confirm (no graph needed: it runs after `anaf-lookup` and before the one national load):
`POST /api-pub/Entity/getSUEntityByCIF/` (body: the CUI as a JSON string), and, when that names an entity but carries no city,
`GET /api-pub/Entity/getCAEntityView/{entityId}`. Both answers are archived unchanged (`lookup.py`). The view has an ASCII `city`
from SEAP's own pick-list, `county` (ASCII), `country` and an `address` string with `Sector: n` and `Cod postal: 507190`.

Checked 2026-11-12 on `getCAEntityView/12617`: `postalCode` is null there, the postal code is only inside `address`. Not checked:
that the by-CIF route answers for an authority (it is documented for suppliers); the view by entity id is the sure route, and the
operator may feed ids another way (see watchdog/README.md).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Mapping

from ..archive import Archive
from ..crawl.client import CrawlError
from ..identity import resolve_authority
from . import lookup

KIND = "entity-location"
BY_CIF_PATH = "/api-pub/Entity/getSUEntityByCIF/"
VIEW_PATH = "/api-pub/Entity/getCAEntityView/{id}"
BY_CIF_FILE, VIEW_FILE = "by-cif.json", "view.json"



class NoAnafAnswers(Exception):
    """The archive holds no ANAF answer: every authority would look unknown to ANAF. Run `pipeline anaf-lookup` first."""


def candidates(archive: Archive, say: Callable[[str], None] | None = None) -> list[str]:
    """Authority CUIs in the raw archive's SEAP files (bulk and crawled, as a rebuild reads them) that pass the check digit and that
    the archived ANAF answers do not confirm (the latest answer per CUI wins, as in a rebuild's `core.anaf_company`). In CUI order.
    Raises NoAnafAnswers when the archive has no ANAF answer at all."""
    from ..anaf import archived_records, confirmed_cuis

    confirmed = confirmed_cuis(archive)
    if confirmed is None:
        raise NoAnafAnswers("no archived ANAF answer: run `pipeline anaf-lookup` first, or every authority is asked about")
    out: set[str] = set()
    for index, total, unit, records, skipped in archived_records(archive):
        if records is None:
            if say:
                say(f"seap-entities scan unit {index}/{total} kind={unit.kind} unit={unit.unit} skipped ({skipped})")
            continue
        for r in records:
            authority = resolve_authority(r.authority_cui, r.authority_name)
            if authority.identity == "CUI" and authority.cui and authority.cui not in confirmed:
                out.add(authority.cui)
    return sorted(out)


@dataclass(frozen=True)
class SeapLocation:
    cui: str
    city: str | None
    county: str | None
    address: str | None
    postal_code: str | None
    country: str | None
    fetched_at: datetime
    archive_path: str


def _text(value) -> str | None:
    return str(value).strip() or None if value is not None else None


def parse_location(cui: str, parsed: Mapping | None, fetched_at: datetime, archive_path: str) -> SeapLocation | None:
    """A SEAP entity (`getCAEntityView` shape; `getSUEntityByCIF` has the same field names) -> its location, or None when it is
    another company's, foreign, or has no county."""
    if not isinstance(parsed, Mapping):
        return None
    fiscal = re.sub(r"\D", "", str(parsed.get("fiscalNumber") or parsed.get("numericFiscalNumber") or ""))
    if fiscal and fiscal.lstrip("0") != cui.lstrip("0"):
        return None
    country, county = _text(parsed.get("country")), _text(parsed.get("county"))
    if (country and country.lower() not in {"romania", "românia", "ro"}) or not county or county.upper() == "NA":
        return None
    return SeapLocation(cui, _text(parsed.get("city")), county, _text(parsed.get("address")), _text(parsed.get("postalCode")),
                        country, fetched_at, archive_path)


def lookup_locations(archive: Archive, client: lookup.LookupClient, cuis: list[str], note: Callable[[str], None] = print) -> tuple[int, int]:
    """Ask about each CUI not yet answered. Returns (archived, failed). A failure is logged and does not stop the run."""
    done = lookup.looked_up(archive, KIND)
    todo = [c for c in cuis if c not in done]
    note(f"seap-entities {len(todo)} CUIs to ask ({len(cuis) - len(todo)} already archived)")
    archived = failed = 0
    for i, cui in enumerate(todo, start=1):
        try:
            raw, parsed = client.post(BY_CIF_PATH, cui, f"entity by CIF {cui}")
            responses = {BY_CIF_FILE: raw}
            request = {"byCif": {"path": BY_CIF_PATH, "body": cui}}
            entity_id = parsed.get("entityId") if isinstance(parsed, Mapping) else None
            if entity_id and not (isinstance(parsed, Mapping) and parsed.get("city")):
                path = VIEW_PATH.format(id=entity_id)
                view_raw, _ = client.get(path, f"entity view {entity_id}")
                responses[VIEW_FILE] = view_raw
                request["view"] = {"path": path}
            where = lookup.archive_lookup(archive, KIND, cui, request, responses, lookup.now())
        except CrawlError as e:
            failed += 1
            note(f"seap-entities {i}/{len(todo)} cui={cui} failed: {e}")
            continue
        archived += 1
        note(f"seap-entities {i}/{len(todo)} cui={cui} archived {where.relative_to(archive.root)}")
    note(f"seap-entities done archived={archived} failed={failed}")
    return archived, failed


def read_locations(archive: Archive) -> dict[str, SeapLocation]:
    """The latest archived answer per CUI that places it (a later answer without a county removes it). Never touches the network."""
    import json

    out: dict[str, SeapLocation] = {}
    for unit in lookup.read_units(archive, KIND):
        parsed = None
        for name in (VIEW_FILE, BY_CIF_FILE):  # the view carries the address when the by-CIF answer lacks it
            if name in unit.files:
                try:
                    candidate = json.loads(unit.file_path(name).read_bytes())
                except (OSError, ValueError):
                    continue
                if isinstance(candidate, Mapping) and candidate.get("county"):
                    parsed = candidate
                    break
        rel = str(unit.path.relative_to(archive.root))
        loc = parse_location(unit.unit, parsed, unit.fetched_at, rel)
        if loc:
            out[unit.unit] = loc
        else:
            out.pop(unit.unit, None)
    return out
