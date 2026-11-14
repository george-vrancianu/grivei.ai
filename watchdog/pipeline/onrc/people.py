"""ONRC's people (ticket #177, ADR 0011): the administrators, legal representatives and IF members of the registrations, as the snapshot's two
people files list them (`OD_REPREZENTANTI_LEGALI`, `OD_REPREZENTANTI_IF`; ONRC carries no CNP and no beneficial owner, and no relative).

The rules, all from ADR 0011:

- **Person key** = the normalised name (diacritics, case, hyphens and word order ignored) + the full birth date. Two role rows with one key are one
  person. Name alone, name + county and name + birthplace without a date are never a link.
- **Person id** = HMAC-SHA256 of the key with a secret that lives outside the repo (`GRIVEI_PERSON_ID_SECRET`): deterministic across rebuilds and
  not reversible by brute force over the small space of birth dates. A rebuild that has roles to hash and no secret fails (`PersonSecretError`);
  there is no default.
- **Possible match**: one key whose birthplaces name different counties. It stays out of the graph's served tables and goes to
  `onrc.possible_match`, the review queue. Only an identity override (`[[person_merge]]`) settles it.
- **Unlinked role holder**: a row with no usable birth date. Named on its organisation's page, never linked.
- **PFA/II**: the holder of a sole trader is the registration itself (ADR 0011): its rows are never linked and never served as people.
- Only the birth year is ever served. The birthplace is read to detect possible matches and goes no further than the review queue.

The overrides are `[[person_split]]` and `[[person_merge]]` entries of `identity_overrides.toml` (each a reason and a named reviewer; a merge
needs a cited document), read by `PersonOverrides.load`.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import re
import tomllib
import unicodedata
from collections.abc import Iterator, Mapping
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

import psycopg

from ..archive import Unit
from ..identity import comma_below
from . import read

log = logging.getLogger("pipeline.onrc")

SECRET_ENV = "GRIVEI_PERSON_ID_SECRET"
MIN_SECRET = 16
EARLIEST_BIRTH_YEAR = 1900

# Registrations whose holder is the registration itself (PFA, II): an `F` registration number that is no family enterprise, or a legal form that says so.
# Used in SQL, so accented letters are matched by `.`.
SOLE_TRADER_FORM = r"persoan. fizic. autorizat|intreprindere individual|^pfa$|^ii$"
FAMILY_FORM = r"familial|^if$"


class PersonSecretError(RuntimeError):
    """The person-id secret is missing or too short: a rebuild must not invent ids."""


class PersonOverrideError(ValueError):
    pass


def _fold(text: str) -> str:
    stripped = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))
    return stripped.lower().replace("đ", "d").replace("ł", "l")


def normalise_name(name: str) -> str:
    """The name as compared for a person key: diacritics (cedilla and comma-below alike), case and hyphens ignored, and the order of the words."""
    return " ".join(sorted(re.sub(r"[^a-z0-9]+", " ", _fold(name)).split()))


def parse_birth_date(text: str | None, *, today: date | None = None) -> date | None:
    """`dd/mm/yyyy`, optionally followed by a time of day (the register writes both). A date before 1900 or in the future is no birth date."""
    m = re.match(r"\s*(\d{1,2})/(\d{1,2})/(\d{4})(?:\s|$)", text or "")
    if not m:
        return None
    try:
        d = date(int(m[3]), int(m[2]), int(m[1]))
    except ValueError:
        return None
    return d if EARLIEST_BIRTH_YEAR <= d.year and d <= (today or date.today()) else None


def person_key(name: str, birth_date: date | None) -> str | None:
    """`<normalised name>|<ISO birth date>`; None without a usable name or date (an unlinked role holder has no key)."""
    normalised = normalise_name(name or "")
    return f"{normalised}|{birth_date.isoformat()}" if normalised and birth_date else None


def load_secret(environ: Mapping[str, str] | None = None) -> bytes:
    secret = ((environ if environ is not None else os.environ).get(SECRET_ENV) or "").strip()
    if len(secret) < MIN_SECRET:
        raise PersonSecretError(f"{SECRET_ENV} must be set (at least {MIN_SECRET} characters, kept outside the repo): person ids are a keyed hash (ADR 0011)")
    return secret.encode("utf-8")


def person_id(key: str, secret: bytes) -> str:
    """The stable id of a person page: 32 hex characters of HMAC-SHA256(secret, key)."""
    return hmac.new(secret, key.encode("utf-8"), hashlib.sha256).hexdigest()[:32]


def split_id(key: str, reg_nos: tuple[str, ...], secret: bytes) -> str:
    """The id of the person a split carves out of `key`: the key plus the registrations it takes along."""
    return person_id(f"{key}|split|{','.join(sorted(reg_nos))}", secret)


def birth_area(county: str | None, locality: str | None, country: str | None) -> str | None:
    """Where the holder was born, as far as it can contradict another row: the county (also after the comma of `LOCALITATE_NASTERE`, as the IF file
    writes it), else a foreign country, else nothing. Folded; never served."""
    place = (county or "").strip()
    if not place and "," in (locality or ""):
        place = locality.rsplit(",", 1)[1].strip()  # type: ignore[union-attr]
    folded = re.sub(r"[^a-z0-9]+", " ", _fold(place)).strip()
    if folded:
        return folded
    foreign = re.sub(r"[^a-z0-9]+", " ", _fold(country or "")).strip()
    return foreign if foreign and foreign != "romania" else None


@dataclass(frozen=True)
class RoleRow:
    reg_no: str
    name: str
    role: str  # CALITATE as ONRC publishes it (source data, shown verbatim)
    kind: str  # LEGAL (OD_REPREZENTANTI_LEGALI) or IF (OD_REPREZENTANTI_IF)
    birth_date: date | None
    area: str | None


def read_roles(unit: Unit) -> Iterator[RoleRow]:
    """The role rows of one snapshot (both people files); a row with no registration number or no name is dropped."""
    for path in read._files(unit, "legali"):
        for row in read.rows_of(path):
            name, reg_no = row.get("PERSOANA_IMPUTERNICITA", ""), row.get("COD_INMATRICULARE", "")
            if name and reg_no:
                yield RoleRow(reg_no, name, row.get("CALITATE", ""), "LEGAL", parse_birth_date(row.get("DATA_NASTERE")),
                              birth_area(row.get("JUDET_NASTERE"), row.get("LOCALITATE_NASTERE"), row.get("TARA_NASTERE")))
    for path in read._files(unit, "if"):
        for row in read.rows_of(path):
            name, reg_no = row.get("NUME", ""), row.get("COD_INMATRICULARE", "")
            if name and reg_no:
                yield RoleRow(reg_no, name, row.get("CALITATE", ""), "IF", parse_birth_date(row.get("DATA_NASTERE")),
                              birth_area(row.get("JUDET_NASTERE"), row.get("LOCALITATE_NASTERE"), row.get("TARA_NASTERE")))


def has_people(unit: Unit) -> bool:
    return bool(read._files(unit, "legali") or read._files(unit, "if"))


# ---- the identity overrides for persons ---------------------------------------------------------------------------------------------

_NOT_A_HUMAN = {"claude", "agent", "bot", "ai", "gpt", "llm", "assistant", "copilot", "automation"}
_ID = re.compile(r"^[0-9a-f]{32}$")


@dataclass(frozen=True)
class PersonSplit:
    person: str  # the person id the roles are carved out of
    reg_nos: tuple[str, ...]  # the registrations whose roles move to the new person
    reason: str
    reviewer: str


@dataclass(frozen=True)
class PersonMerge:
    ids: tuple[str, ...]  # person ids or possible-match ids; every role of them takes the first id
    reason: str
    reviewer: str
    document: str  # the cited document that shows the records are one person


@dataclass(frozen=True)
class PersonOverrides:
    splits: tuple[PersonSplit, ...] = ()
    merges: tuple[PersonMerge, ...] = ()

    @classmethod
    def load(cls, path: Path | str | None) -> "PersonOverrides":
        if path is None or not Path(path).is_file():
            return cls()
        data = tomllib.loads(Path(path).read_text(encoding="utf-8"))
        splits, merges = [], []
        for n, entry in enumerate(data.get("person_split", []), start=1):
            where = f"{path}: person_split #{n}"
            _check_entry(where, entry, {"person", "reg_nos", "reason", "reviewer"})
            person = str(entry.get("person", "")).strip().lower()
            reg_nos = entry.get("reg_nos")
            if not _ID.match(person):
                raise PersonOverrideError(f"{where}: `person` is a person id (32 hex characters, from the person's page)")
            if not isinstance(reg_nos, list) or not reg_nos or not all(isinstance(r, str) and r.strip() for r in reg_nos):
                raise PersonOverrideError(f"{where}: `reg_nos` lists the registration numbers whose roles move to the new person")
            splits.append(PersonSplit(person, tuple(sorted({r.strip() for r in reg_nos})), *_reason_and_reviewer(where, entry)))
        for n, entry in enumerate(data.get("person_merge", []), start=1):
            where = f"{path}: person_merge #{n}"
            _check_entry(where, entry, {"ids", "reason", "reviewer", "document"})
            ids = entry.get("ids")
            if not isinstance(ids, list) or not ids or not all(isinstance(i, str) and _ID.match(i.strip().lower()) for i in ids):
                raise PersonOverrideError(f"{where}: `ids` lists person ids or possible-match ids (32 hex characters each)")
            ids = tuple(dict.fromkeys(i.strip().lower() for i in ids))
            document = str(entry.get("document", "")).strip()
            if not document:
                raise PersonOverrideError(f"{where}: a merge needs a cited document that shows the records are one person (ADR 0011)")
            merges.append(PersonMerge(ids, *_reason_and_reviewer(where, entry), document))
        return cls(tuple(splits), tuple(merges))


def _check_entry(where: str, entry: dict, known: set[str]) -> None:
    unknown = set(entry) - known
    if unknown:
        raise PersonOverrideError(f"{where}: unknown field(s) {sorted(unknown)}")


def _reason_and_reviewer(where: str, entry: dict) -> tuple[str, str]:
    reason, reviewer = str(entry.get("reason", "")).strip(), str(entry.get("reviewer", "")).strip()
    if not reason:
        raise PersonOverrideError(f"{where}: a reason is required")
    if not reviewer or set(re.findall(r"[a-z]+", reviewer.lower())) & _NOT_A_HUMAN:
        raise PersonOverrideError(f"{where}: `reviewer` is the named human who reviewed it, never an agent")
    return reason, reviewer


# ---- the rebuild step -----------------------------------------------------------------------------------------------------------------

@dataclass
class PeopleSummary:
    snapshot: date | None = None  # the snapshot the roles are read from
    roles: int = 0
    linked_roles: int = 0
    persons: int = 0
    unlinked: int = 0  # role holders with no birth date
    possible_matches: int = 0  # keys sent to the review queue
    sole_trader_roles: int = 0
    unmatched_overrides: list[str] = field(default_factory=list)

    def line(self) -> str:
        if self.snapshot is None:
            return ""
        return (f"{self.roles} roles ({self.persons} persons, {self.unlinked} unlinked, {self.possible_matches} possible matches in the review queue, "
                f"{self.sole_trader_roles} sole-trader rows never served) from snapshot {self.snapshot}"
                + "".join(f"; override matched nothing: {m}" for m in self.unmatched_overrides))


_STAGE = """CREATE TEMP TABLE onrc_role_raw (reg_no text, holder_name text, role text, kind text, birth_date date, area text, pkey text, person_id text,
                                         link text) ON COMMIT DROP"""


def build_people(cur: psycopg.Cursor, unit: Unit | None, overrides: PersonOverrides | None = None, environ: Mapping[str, str] | None = None) -> PeopleSummary:
    """`onrc.role`, `onrc.person`, `onrc.possible_match` and `onrc.person_override` from the newest held snapshot that carries a people file.

    Needs `GRIVEI_PERSON_ID_SECRET` as soon as there are roles: a missing secret fails the rebuild loudly instead of hashing with a default."""
    summary = PeopleSummary()
    overrides = overrides or PersonOverrides()
    if unit is None or not has_people(unit):
        return summary
    secret = load_secret(environ)
    when = date.fromisoformat(unit.unit)
    summary.snapshot = when
    cur.execute(_STAGE)
    with cur.copy("COPY onrc_role_raw (reg_no, holder_name, role, kind, birth_date, area, pkey, person_id) FROM STDIN") as copy:
        for r in read_roles(unit):
            key = person_key(r.name, r.birth_date)
            copy.write_row((r.reg_no, comma_below(r.name.strip()), r.role.strip(), r.kind, r.birth_date, r.area, key, person_id(key, secret) if key else None))
    # a sole trader's rows are never linked (the holder is the registration itself): out of every person group before anything is compared
    cur.execute("""UPDATE onrc_role_raw r SET link = 'SOLE_TRADER', person_id = NULL
                    FROM onrc.registration g
                   WHERE g.reg_no = r.reg_no
                     AND (lower(coalesce(g.legal_form, '')) ~ %s OR (g.reg_no LIKE 'F%%' AND lower(coalesce(g.legal_form, '')) !~ %s))""", (SOLE_TRADER_FORM, FAMILY_FORM))
    for split in overrides.splits:
        cur.execute("SELECT DISTINCT pkey FROM onrc_role_raw WHERE person_id = %s", (split.person,))
        keys = [k for (k,) in cur.fetchall()]
        moved = 0
        if len(keys) == 1:
            cur.execute("UPDATE onrc_role_raw SET person_id = %s WHERE person_id = %s AND reg_no = ANY(%s)", (split_id(keys[0], split.reg_nos, secret), split.person, list(split.reg_nos)))
            moved = cur.rowcount
        cur.execute("INSERT INTO onrc.person_override (kind, ids, reg_nos, reason, reviewer, matched) VALUES ('SPLIT', %s, %s, %s, %s, %s)",
                    ([split.person], list(split.reg_nos), split.reason, split.reviewer, moved))
        if not moved:
            summary.unmatched_overrides.append(f"person_split {split.person}")
    merged = {i for m in overrides.merges for i in m.ids}
    # possible matches: one id (one key) whose birthplaces name different counties; a merge override settles its ids, so they are not conflicts
    cur.execute("""UPDATE onrc_role_raw r SET link = 'POSSIBLE_MATCH'
                    WHERE r.person_id IN (SELECT person_id FROM onrc_role_raw WHERE person_id IS NOT NULL AND area IS NOT NULL AND NOT person_id = ANY(%s)
                                           GROUP BY person_id HAVING count(DISTINCT area) > 1)""", (list(merged),))
    cur.execute("""INSERT INTO onrc.possible_match (id, holder_name, birth_date, areas, reg_nos, snapshot_date)
                   SELECT person_id, min(holder_name), min(birth_date), array_agg(DISTINCT area) FILTER (WHERE area IS NOT NULL), array_agg(DISTINCT reg_no), %s
                     FROM onrc_role_raw WHERE link = 'POSSIBLE_MATCH' GROUP BY person_id""", (when,))
    summary.possible_matches = cur.rowcount
    for merge in overrides.merges:
        target = merge.ids[0]
        cur.execute("UPDATE onrc_role_raw SET person_id = %s, link = NULL WHERE person_id = ANY(%s)", (target, list(merge.ids)))
        matched = cur.rowcount
        cur.execute("INSERT INTO onrc.person_override (kind, ids, reason, reviewer, document, matched) VALUES ('MERGE', %s, %s, %s, %s, %s)",
                    (list(merge.ids), merge.reason, merge.reviewer, merge.document, matched))
        if not matched:
            summary.unmatched_overrides.append(f"person_merge {', '.join(merge.ids)}")
    # a row with no date is an unlinked role holder
    cur.execute("UPDATE onrc_role_raw SET link = CASE WHEN person_id IS NULL THEN 'UNLINKED' ELSE 'LINKED' END WHERE link IS NULL")
    cur.execute("""INSERT INTO onrc.role (reg_no, holder_name, role, kind, birth_year, link, person_id, snapshot_date)
                   SELECT DISTINCT reg_no, holder_name, role, kind, CASE WHEN link <> 'SOLE_TRADER' THEN extract(year FROM birth_date)::int END, link,
                          CASE WHEN link = 'LINKED' THEN person_id END, %s FROM onrc_role_raw""", (when,))
    cur.execute("""INSERT INTO onrc.person (id, name, birth_year)
                   SELECT person_id, (array_agg(holder_name ORDER BY n DESC, holder_name))[1], min(birth_year)
                     FROM (SELECT person_id, holder_name, extract(year FROM birth_date)::int AS birth_year, count(*) OVER (PARTITION BY person_id, holder_name) AS n
                             FROM onrc_role_raw WHERE link = 'LINKED') t GROUP BY person_id""")
    summary.persons = cur.rowcount
    cur.execute("""SELECT count(*), count(*) FILTER (WHERE link = 'LINKED'), count(*) FILTER (WHERE link = 'UNLINKED'), count(*) FILTER (WHERE link = 'SOLE_TRADER')
                     FROM onrc.role""")
    summary.roles, summary.linked_roles, summary.unlinked, summary.sole_trader_roles = cur.fetchone()
    cur.execute("DROP TABLE IF EXISTS onrc_role_raw")
    return summary
