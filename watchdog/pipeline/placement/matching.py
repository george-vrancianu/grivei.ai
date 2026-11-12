"""The placement rules, pure (no I/O): the one place that knows how ANAF and SEAP spell a locality.

Folding (`fold`): cedilla `Ş Ţ`, comma-below `Ș Ț` and ASCII become one key; `Â` and `Î` both become `I`; dots are dropped and
the spaces around initials with them (`I.L. Caragiale` and `I. L. CARAGIALE` are one key); `-` is a space; case and
repeated spaces do not matter. Names are compared only after this, and only inside one county (a UAT) or one UAT (a village).

ANAF's `sdenumire_Localitate` (`parse_anaf_locality`): `Sat X Com. Y`, `Loc. X Mun. Y`, `Mun. Y`, `Orş. Y`, `Com. Y`,
`Sector n Mun. Bucureşti`. The kind words are stripped, the UAT is resolved first and the village inside it. SIRUTA names carry
`MUNICIPIUL` / `ORAŞ`, which `bare_uat_name` strips. No match never guesses: the county stays, the UAT is unknown.

SEAP's entity view (`place_by_seap`): `(county, folded city)` against UAT and village names; when that is ambiguous the postal
code in `address` (`Cod postal: 507190`) is the tiebreak against SIRUTA's `CODP`.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Iterable, Mapping

# the six sectors' SIRUTA codes: the step between them is not constant, so they are looked up, never computed
SECTOR_SIRUTA = {1: "179141", 2: "179150", 3: "179169", 4: "179178", 5: "179187", 6: "179196"}
SECTOR_OF = {v: k for k, v in SECTOR_SIRUTA.items()}
BUCHAREST = "B"

_I_FOLD = str.maketrans({"Â": "I", "â": "i", "Î": "I", "î": "i"})


def fold(text: str | None) -> str:
    """The matching key of a name (see the module docstring)."""
    if not text:
        return ""
    s = unicodedata.normalize("NFKD", str(text).translate(_I_FOLD))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = re.sub(r"[.\-_,/]", " ", s)
    tokens = s.split()
    out: list[str] = []
    initials = ""
    for token in tokens:  # runs of single letters are initials: `I L CARAGIALE` -> `IL CARAGIALE`
        if len(token) == 1 and token.isalpha():
            initials += token
            continue
        if initials:
            out.append(initials)
            initials = ""
        out.append(token)
    if initials:
        out.append(initials)
    return " ".join(out)


def ascii_fold(text: str | None) -> str:
    """Like `fold` but `Â` stays `A`: SEAP's pick-list is plain ASCII, so a SIRUTA `Râşnov` is `Rasnov` there (and `Î` is `I`)."""
    if not text:
        return ""
    s = unicodedata.normalize("NFKD", str(text).translate(str.maketrans({"Î": "I", "î": "i"})))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return fold(s)


def bare_uat_name(siruta_name: str) -> str:
    """A SIRUTA UAT name without its kind word: `MUNICIPIUL ALBA IULIA` -> `ALBA IULIA`, `ORAŞ AIUD` -> `AIUD`, a commune is bare."""
    key = fold(siruta_name)
    head, _, rest = key.partition(" ")
    return rest if head in {"MUNICIPIUL", "ORAS"} and rest else key


# ---- ANAF's locality string --------------------------------------------------------------------------------------------

@dataclass(frozen=True)
class Locality:
    """What `sdenumire_Localitate` says. `kind` is the UAT's kind word folded (`MUN`, `ORS`, `COM`); `sector` is Bucharest's."""

    uat: str | None = None  # the folded UAT name
    kind: str | None = None
    village: str | None = None  # the folded village name, when ANAF names one
    sector: int | None = None


_SECTOR = re.compile(r"^\s*sector(?:ul)?\s*([1-6])\b", re.IGNORECASE)
_LOCALITY = re.compile(
    r"^\s*(?:(?P<vk>sat|loc)\.?\s+(?P<village>.+)\s+)?(?P<uk>mun|ors|oras|orasul|com|comuna|municipiul)\.?\s+(?P<uat>\S.*?)\s*$",
    re.IGNORECASE,
)


def parse_anaf_locality(text: str | None) -> Locality | None:
    """ANAF's locality string -> UAT, kind, village, sector. None when it is empty or has no kind word (never guessed)."""
    if not text or not text.strip():
        return None
    if m := _SECTOR.match(text):
        return Locality(sector=int(m[1]), kind="MUN", uat="BUCURESTI")
    folded_text = unicodedata.normalize("NFKD", text.translate(_I_FOLD))
    folded_text = "".join(c for c in folded_text if not unicodedata.combining(c))
    m = _LOCALITY.match(folded_text)
    if not m:
        return None
    kind = {"MUNICIPIUL": "MUN", "ORASUL": "ORS", "ORAS": "ORS", "COMUNA": "COM"}.get(m["uk"].upper(), m["uk"].upper())
    return Locality(uat=fold(m["uat"]) or None, kind=kind, village=fold(m["village"]) if m["village"] else None)


# ---- the tables ---------------------------------------------------------------------------------------------------------

@dataclass(frozen=True)
class County:
    iso: str
    siruta_jud: str
    name: str


@dataclass(frozen=True)
class Uat:
    siruta: str
    county_iso: str
    tip: str
    name: str
    folded: str  # the bare folded name (no MUNICIPIUL / ORAŞ)


@dataclass(frozen=True)
class Village:
    siruta: str
    uat: str  # the UAT's SIRUTA
    name: str
    folded: str
    postal_code: str | None


KIND_TIPS = {"MUN": {"1", "4"}, "ORS": {"2"}, "COM": {"3"}}  # SIRUTA TIP by ANAF's kind word


@dataclass
class Gazetteer:
    """The reference tables indexed for matching: counties by ISO, SIRUTA JUD code and folded name; UATs by (county, bare name);
    villages by parent UAT. `aliases` maps (county, folded ANAF name) to the folded name SIRUTA uses (reviewed typo fixes)."""

    counties: list[County] = field(default_factory=list)
    uats: list[Uat] = field(default_factory=list)
    villages: list[Village] = field(default_factory=list)
    aliases: Mapping[tuple[str, str], str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.county_by_iso = {c.iso: c for c in self.counties}
        self.iso_by_jud = {c.siruta_jud: c.iso for c in self.counties}
        self.iso_by_name = {fold(c.name): c.iso for c in self.counties}
        self.uat_by_siruta = {u.siruta: u for u in self.uats}
        self.uats_by_name: dict[tuple[str, str], list[Uat]] = {}
        for u in self.uats:
            if u.siruta not in SECTOR_OF:  # a sector is not found by a name: `Sector n` is a lookup
                self.uats_by_name.setdefault((u.county_iso, u.folded), []).append(u)
        self.uats_by_ascii: dict[tuple[str, str], list[Uat]] = {}
        for u in self.uats:
            if u.siruta not in SECTOR_OF:
                self.uats_by_ascii.setdefault((u.county_iso, ascii_fold(u.name)), []).append(u)
        self.villages_by_ascii: dict[tuple[str, str], list[Village]] = {}
        self.villages_of: dict[str, list[Village]] = {}
        self.villages_by_name: dict[tuple[str, str], list[Village]] = {}
        for v in self.villages:
            self.villages_of.setdefault(v.uat, []).append(v)
            if (parent := self.uat_by_siruta.get(v.uat)) is not None:
                self.villages_by_name.setdefault((parent.county_iso, v.folded), []).append(v)
                self.villages_by_ascii.setdefault((parent.county_iso, ascii_fold(v.name)), []).append(v)

    def county_iso(self, auto: str | None, jud: str | None = None) -> str | None:
        """The ISO code from ANAF's `scod_JudetAuto`, else from `scod_Judet` (SIRUTA's JUD), else None."""
        if auto and auto.strip().upper() in self.county_by_iso:
            return auto.strip().upper()
        if jud and str(jud).strip().lstrip("0") in self.iso_by_jud:
            return self.iso_by_jud[str(jud).strip().lstrip("0")]
        return None

    def county_of_name(self, text: str | None) -> str | None:
        """A county from SEAP's ASCII name (`Bucuresti`, `Bistrita-Nasaud`, `Judetul Brasov`)."""
        key = fold(text)
        key = re.sub(r"^(JUDETUL|JUD)\s+", "", key)
        if key in {"BUCURESTI", "MUNICIPIUL BUCURESTI", "BUCHAREST"}:
            return BUCHAREST
        return self.iso_by_name.get(key)


@dataclass(frozen=True)
class Place:
    """A match. `uat` is None when the county is all that is known; `village` is stored, not plotted; `sector` is Bucharest's."""

    county: str | None
    uat: str | None = None
    village: str | None = None
    sector: int | None = None
    why: str | None = None  # why the UAT is unknown (for the log line)


def _pick_uat(g: Gazetteer, county: str, loc: Locality) -> tuple[Uat | None, str | None]:
    name = g.aliases.get((county, loc.uat or ""), loc.uat or "")
    found = g.uats_by_name.get((county, name), [])
    if len(found) > 1 and loc.kind in KIND_TIPS:  # two UATs of one folded name: the kind word decides
        found = [u for u in found if u.tip in KIND_TIPS[loc.kind]] or found
    if len(found) == 1:
        return found[0], None
    return None, f"no UAT {loc.uat!r} in {county}" if not found else f"UAT {loc.uat!r} is ambiguous in {county}"


def _pick_village(g: Gazetteer, uat: Uat, name: str, postal: str | None) -> Village | None:
    name = g.aliases.get((uat.county_iso, name), name)
    found = [v for v in g.villages_of.get(uat.siruta, []) if v.folded == name]
    if len(found) > 1 and postal:
        found = [v for v in found if v.postal_code == postal]
    return found[0] if len(found) == 1 else None


def place_by_anaf(g: Gazetteer, *, county_auto: str | None, county_jud: str | None, locality: str | None, postal: str | None = None) -> Place | None:
    """ANAF's seat -> Place. None when not even the county is known; otherwise at least the county."""
    county = g.county_iso(county_auto, county_jud)
    if county is None:
        return None
    loc = parse_anaf_locality(locality)
    if loc is None:
        return Place(county, why=f"locality {locality!r} not understood")
    if loc.sector is not None:
        if county != BUCHAREST:
            return Place(county, why=f"sector in {county}")
        return Place(county, uat=SECTOR_SIRUTA[loc.sector], sector=loc.sector)
    if county == BUCHAREST:  # `Mun. Bucureşti` without a sector: no UAT of its own to plot at
        return Place(county, why="Bucharest without a sector")
    uat, why = _pick_uat(g, county, loc)
    if uat is None:
        return Place(county, why=why)
    village = _pick_village(g, uat, loc.village, postal) if loc.village else None
    return Place(county, uat=uat.siruta, village=village.siruta if village else None)


_POSTAL = re.compile(r"cod\s*postal\s*:?\s*(\d{6})", re.IGNORECASE)
_SECTOR_ADDR = re.compile(r"sector\s*:?\s*([1-6])\b", re.IGNORECASE)


def postal_code_of(address: str | None) -> str | None:
    """`Cod postal: 507190` in SEAP's address string."""
    m = _POSTAL.search(unicodedata.normalize("NFKD", address or ""))
    return m[1] if m else None


def place_by_seap(g: Gazetteer, *, city: str | None, county: str | None, address: str | None = None, postal_code: str | None = None) -> Place | None:
    """SEAP's entity view -> Place (the fallback for CUIs ANAF misses). `(county, folded city)` against UAT and village names;
    several UATs: the postal code against SIRUTA's `CODP`; still several: a name that is a UAT's own; else the county only."""
    iso = g.county_of_name(county)
    if iso is None:
        return None
    if iso == BUCHAREST:
        m = _SECTOR_ADDR.search(address or "")
        if m:
            return Place(iso, uat=SECTOR_SIRUTA[int(m[1])], sector=int(m[1]))
        return Place(iso, why="Bucharest without a sector")
    key = g.aliases.get((iso, fold(city)), fold(city))
    postal = postal_code_of(address) or (postal_code.strip() if postal_code else None)
    ascii_key = ascii_fold(city)  # SEAP's list is ASCII: a SIRUTA `Â` is an `A` there, while ANAF-style spellings fold `Â` to `I`
    uats = list({u.siruta: u for u in (*g.uats_by_name.get((iso, key), []), *g.uats_by_ascii.get((iso, ascii_key), []))}.values())
    villages = list({v.siruta: v for v in (*g.villages_by_name.get((iso, key), []), *g.villages_by_ascii.get((iso, ascii_key), []))}.values())
    by_uat: dict[str, list[Village]] = {u.siruta: [] for u in uats}
    for v in villages:
        by_uat.setdefault(v.uat, []).append(v)
    if not by_uat:
        return Place(iso, why=f"no locality {key!r} in {iso}")
    if len(by_uat) > 1 and postal:
        hit = {s for s, vs in by_uat.items() if any(v.postal_code == postal for v in vs)}
        if len(hit) == 1:
            by_uat = {s: [v for v in by_uat[s] if v.postal_code == postal] for s in hit}
    if len(by_uat) > 1:
        own = [u.siruta for u in uats]
        if len(own) == 1:  # the name is a UAT's own: the UAT, as the research's rule says
            by_uat = {own[0]: by_uat[own[0]]}
    if len(by_uat) != 1:
        return Place(iso, why=f"{key!r} is ambiguous in {iso} ({len(by_uat)} UATs)")
    siruta, vs = next(iter(by_uat.items()))
    pick = [v for v in vs if postal and v.postal_code == postal] or vs
    return Place(iso, uat=siruta, village=pick[0].siruta if len(pick) == 1 else None)


def display_name(siruta_name: str) -> str:
    """A SIRUTA name for display: kind word dropped, comma-below diacritics, title case (`MUNICIPIUL TÂRGU MUREŞ` -> `Târgu Mureș`)."""
    text = siruta_name.translate(str.maketrans({"Ş": "Ș", "ş": "ș", "Ţ": "Ț", "ţ": "ț"})).strip()
    words = text.split()
    if words and fold(words[0]) in {"MUNICIPIUL", "ORAS"} and len(words) > 1:
        words = words[1:]
    small = {"de", "la", "din", "pe", "cu", "sub", "peste", "lui", "si", "și"}
    out = []
    for i, w in enumerate(words):
        low = w.lower()
        parts = [p[:1].upper() + p[1:] for p in low.split("-")]
        out.append(low if i and low in small and "-" not in low else "-".join(parts))
    return " ".join(out)
