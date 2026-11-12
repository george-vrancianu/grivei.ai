"""Supplier identity (ADR 0003): tax ids, names and the entity key rules. Pure functions, no I/O.

A winner's tax id as published (`RO 1112975`, `IT08069460015`, `1003600118796`, ...) is classified by `classify_tax_id`:

- `cui`:         a Romanian CUI that passes the check digit (`RO`, whitespace, punctuation, leading zeros stripped);
- `cnp`:         13 digits (also Excel's `1.73E+12`, or 13 digits among text). A person's national id: never stored, never shown (the winner is a
                 natural-person supplier; only the fact that a CNP was published is kept, `Resolved.had_cnp`);
- `foreign_vat`: a VAT id with a known EU country prefix (`BG103029862`, `ATU18379608`): name-only supplier keyed `vat-<id>`;
- `other`:       anything else (a number that fails the check digit, 11-12 digits, `-`): the name decides.

A CUI is only a *candidate* here: it becomes the entity key when ANAF found it too (`resolve_winner`, ADR 0003).

Names: `comma_below` fixes the cedilla letters ANAF writes (`Ş ş Ţ ţ`) to the comma-below ones (`Ș ș Ț ț`), nothing else.
`name_key_text` (case, diacritics, punctuation and spacing folded) is the name-only key; `compare_name` additionally drops
legal-form words (SRL, S.R.L., SA, SC, PFA ...) and is what "SEAP's spelling is unlike ANAF's name" means.
"""
from __future__ import annotations

import hashlib
import re
import tomllib
import unicodedata
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Literal, Mapping

# EU VAT country prefixes (Greece is EL; Northern Ireland XI); `ATU18379608` is AT + `U` + 8 digits
_VAT_PREFIXES = frozenset("AT BE BG CY CZ DE DK EE EL ES FI FR HR HU IE IT LT LU LV MT NL PL PT SE SI SK XI GB".split())
_FOREIGN_VAT = re.compile(r"^([A-Z]{2})([A-Z0-9]{2,14})$")
_SCI_CNP = re.compile(r"^[1-9](\.\d+)?E\+?12$")
_SCI_ANY = re.compile(r"^[+-]?\d+(\.\d+)?E[+-]?\d+$")
_CUI_WEIGHTS = (7, 5, 3, 2, 1, 7, 5, 3, 2)

Kind = Literal["cui", "cnp", "foreign_vat", "other", "none"]


@dataclass(frozen=True)
class TaxId:
    kind: Kind
    value: str | None = None  # `cui`: the normalised CUI digits; `foreign_vat`: the id with its prefix, upper case; else None


def cui_check_digit_ok(cui: str) -> bool:
    """The Romanian CUI check digit: the digits before the last, right-aligned against 753217532, summed, x10 mod 11 (10 -> 0)."""
    if not cui.isdigit() or not 2 <= len(cui) <= 10 or cui[0] == "0":
        return False
    body = cui[:-1].rjust(9, "0")
    total = sum(int(d) * w for d, w in zip(body, _CUI_WEIGHTS))
    return total * 10 % 11 % 10 == int(cui[-1])


def classify_tax_id(raw: str | None) -> TaxId:
    if raw is None:
        return TaxId("none")
    sci = raw.upper().replace(" ", "")
    if _SCI_CNP.match(sci):  # `1.73E+12`: Excel's mangling of a 13-digit number, so of a CNP
        return TaxId("cnp")
    if _SCI_ANY.match(sci):  # any other scientific notation has lost its digits: the name decides
        return TaxId("other")
    s = re.sub(r"[^0-9A-Z]", "", raw.upper())  # whitespace and punctuation go: `RO 1112975`, `RO16728583,`
    if not s:
        return TaxId("none")
    digits = s[2:] if re.fullmatch(r"RO\d+", s) else s
    if digits.isdigit():
        if len(digits) == 13:
            return TaxId("cnp")
        cui = digits.lstrip("0")
        return TaxId("cui", cui) if cui_check_digit_ok(cui) else TaxId("other")
    if re.search(r"(?<!\d)\d{13}(?!\d)", s):  # a CNP among other text (`CNP 1990101123456`)
        return TaxId("cnp")
    m = _FOREIGN_VAT.match(s)
    if m and m[1] in _VAT_PREFIXES and any(c.isdigit() for c in s):
        return TaxId("foreign_vat", s)
    return TaxId("other")


# ---- names ---------------------------------------------------------------------------------------------------------

_COMMA_BELOW = str.maketrans({"Ş": "Ș", "ş": "ș", "Ţ": "Ț", "ţ": "ț"})


def comma_below(name: str) -> str:
    """ANAF writes cedilla Ş/ş/Ţ/ţ; the display name uses comma-below Ș/ș/Ț/ț. Nothing else changes (no re-casing)."""
    return name.translate(_COMMA_BELOW)


def _fold(text: str) -> str:
    stripped = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))
    return stripped.lower().replace("đ", "d").replace("ł", "l")


def name_key_text(name: str) -> str:
    """The normalised name of a name-only supplier: diacritics, case, punctuation and spacing folded; legal forms kept."""
    return " ".join(re.sub(r"[^a-z0-9]+", " ", _fold(name).replace(".", "")).split())


_LEGAL_FORMS = frozenset(
    "sc ra scm coop srl sa snc scs sca pfa ii if ltd gmbh spa sas sarl bv ag ood ad eood doo kft zrt llc inc srld sl ab oy as sro se plc nv kg bt uab ou aps vzw".split()
)


_ORG_WORDS = frozenset(
    """asociatia asociere asocierea fundatia consortiul consortium grup grupul societatea compania intreprindere
    primaria consiliul consiliu universitatea spitalul scoala liceul institutul institut directia ministerul
    regia cabinet cabinetul biserica parohia comuna orasul municipiul judetul agentia autoritatea
    cooperativa uniunea federatia sindicatul clubul sportiv international romania group holding trading
    company limited serviciul colegiul casa editura centrul inspectoratul oficiul administratia corporation corp research
    engineering electronics elektronik publishing services service systems solutions software university journal hotel
    media consulting consultancy association network trans avocati avocat avocatura""".split()
)
# Words of company names (Romanian ones published without a legal form, foreign industry words) that the person-shape rule also
# reads as an organisation. Not used against a truncated CNP: that rule keeps `_ORG_WORDS` alone until #66 decides the 12-digit ids.
_COMPANY_WORDS = frozenset(
    """construct constructii constructia impex prodcom comimpex com prod serv servicii invest instal instalatii tehnic tehnica
    exim comert distributie farmacia farmacie medical pharma farma agro auto logistic logistica proiect proiectare expert
    turism travel tour tours energy energie electric electro petrol gaz metal hidro termo soft tech data info net clinica
    laborator dental optica print tipografia mobila studio market magazin shop store office computers computer""".split()
    # foreign industry words: a two-word foreign company name rarely carries a legal form in SEAP's supplier column
    + """technologies technology technik technique techniques tecnologie tecnologia tecnologias industries industry industrie
    industria industrial manufacturing construction constructions costruzioni construcciones impianti ingenieria
    ingegneria engineers medizintechnik elektro elektrotechnik pharmaceuticals pharmaceutical laboratories laboratory labs
    diagnostics diagnostic healthcare scientific instruments equipment machinery maschinenbau chemicals chemical security
    defence defense aerospace aviation automation automotive telecom telecommunications logistics shipping energia
    products produkte prodotti supply supplies partners enterprises ventures sistemi sistemas servicios servizi
    insaat sanayi ticaret""".split()
)
# a word ending in one of these is a company's coined name (`ALFAPROD`, `BETACONSTRUCT`, `GAMATRANS`): never a person's name
_ORG_SUFFIXES = ("impex", "prodcom", "construct", "trans", "serv", "invest", "instal", "soft", "tech", "exim", "prod", "grup")
_MIN_GUARD_WORD = 3  # the word-overlap guard ignores initials and particles (`A`, `DE`, `SI`): they say nothing about a rename
_SOLE_TRADER_FORMS = frozenset("pfa ii if".split())  # a sole trader published with a truncated CNP is still an individual
_MAX_ASKED_DIGITS = 8  # as in anaf.py: a longer number is never confirmed by ANAF
_TRUNCATED_CNP = re.compile(r"[1-8]\d{11}")
_ID_CARD = re.compile(r"\d{6}|[A-Z]{2}\d{6}")


def _organisation_word(word: str) -> bool:
    """An organisation word (`ASOCIATIA`, `PRIMARIA`, `CONSTRUCT`, `TECHNOLOGIES` ...) or a coined company word (`ALFAPROD`): a
    whole word of `_ORG_WORDS` or `_COMPANY_WORDS`, or a longer word ending in one of `_ORG_SUFFIXES` (the stem at least 2 letters). Legal forms apart."""
    return word in _ORG_WORDS or word in _COMPANY_WORDS or any(word.endswith(sfx) and len(word) >= len(sfx) + 2 for sfx in _ORG_SUFFIXES)


def _shaped_like_a_person(spelling: str) -> bool:
    """2 to 5 alphabetic words, none a legal form or an organisation word (`PFA`, `ASOCIATIA`, `PRIMARIA`, `IMPEX`, `ALFAPROD` ...)."""
    words = name_key_text(spelling).split()
    return 2 <= len(words) <= 5 and all(w.isalpha() and w not in _LEGAL_FORMS and not _organisation_word(w) for w in words)


def shares_a_word(spelling: str, anaf_name: str) -> bool:
    """The word-overlap guard of a 6-digit id ANAF knows (`Resolver.supplier`): SEAP's spelling and ANAF's name (both `compare_name`d)
    share a word of at least `_MIN_GUARD_WORD` letters, so the spelling is the company renamed or abbreviated (`MONETARIA EXEMPLU` under
    `COMPANIA NATIONALA MONETARIA EXEMPLU`), not a person whose ID card number happens to be a CUI. Initials and short particles
    (`A`, `DE`, `SI`) are ignored: a person `ION A` must not pass as the company `A & B DISTRIBUTIE` because both hold an `A`."""
    def words(name: str) -> set[str]:
        return {w for w in name.split() if len(w) >= _MIN_GUARD_WORD}
    return bool(words(compare_name(spelling)) & words(anaf_name))


_ID_RUN = re.compile(r"\d(?:[.,]\d+)?E\+?\d+|\d(?:[\s./-]*\d){5,}", re.IGNORECASE)  # scientific notation first: `1.90010E+12` is one number


def withheld_name(name: str | None) -> str | None:
    """A natural person's published name as `withheld.natural_person_name` keeps it: every run of six or more digits (a CNP, a
    truncated CNP, an ID card number, also spaced or dotted) and every number in scientific notation removed, blanks collapsed.
    None when nothing is left. The CNP itself is never kept, even when SEAP published it inside the name."""
    text = " ".join(_ID_RUN.sub(" ", name or "").split())
    return text or None


def compare_name(name: str) -> str:
    """The name as compared with ANAF's: `name_key_text` without the legal-form words (SRL, S.R.L., SA, SC, PFA, GmbH ...).

    A deliberately simple rule: it ignores case, diacritics, punctuation and legal forms, nothing smarter. `RCS & RDS` and
    `DIGI ROMANIA` still differ (a rename), `S.C. ALFA S.R.L. SRL` and `ALFA SRL` do not (a doubled legal form).
    """
    return " ".join(t for t in name_key_text(name).split() if t not in _LEGAL_FORMS)


def name_key(name: str) -> str:
    """`name-<slug>` of a name-only supplier. A very long name is cut and given a hash so two long names never share a key."""
    text = name_key_text(name)
    slug = text.replace(" ", "-")
    if len(slug) > 80:
        slug = slug[:70].rstrip("-") + "-" + hashlib.sha1(text.encode()).hexdigest()[:8]
    return f"name-{slug or 'unnamed'}"


def vat_key(vat_id: str) -> str:
    return f"vat-{vat_id.lower()}"


# ---- resolving one party on one Record -------------------------------------------------------------------------------


@dataclass(frozen=True)
class Resolved:
    """One winner on one Record, resolved. A natural person has no key, no entity and no id: nothing of it reaches the graph the API
    reads. Its published name is kept apart, withheld (`withheld.natural_person_name`, ADR 0003 as amended 2026-11-12), with `had_cnp`
    saying whether the published id was a CNP; the CNP itself is never kept."""

    key: str | None
    identity: Literal["CUI", "NAME_ONLY"] | None
    natural_person: bool = False
    cui: str | None = None
    foreign_vat_id: str | None = None
    curated: bool = False
    cui_mismatch: bool = False
    differs_from_anaf: bool = False
    had_cnp: bool = False  # a natural person published with a CNP (the CNP is never kept)


NATURAL_PERSON = Resolved(key=None, identity=None, natural_person=True)
NATURAL_PERSON_WITH_CNP = Resolved(key=None, identity=None, natural_person=True, had_cnp=True)


def resolve_authority(raw_cui: str | None, name: str) -> Resolved:
    """A contracting authority: its CUI when it passes the check digit (SEAP registers authorities itself; ANAF adds the
    name and status), else name-only. It never loses its Record to a person-shaped id."""
    tax = classify_tax_id(raw_cui)
    if tax.kind == "cui" and tax.value:
        return Resolved(key=tax.value, identity="CUI", cui=tax.value)
    return Resolved(key=name_key(name), identity="NAME_ONLY")


# ---- the reviewed identity override file -----------------------------------------------------------------------------

DEFAULT_OVERRIDES = Path(__file__).with_name("identity_overrides.toml")
_PINNED_KEY = re.compile(r"^[a-z][a-z0-9-]*$")


class OverrideError(ValueError):
    pass


@dataclass(frozen=True)
class Override:
    reason: str
    key: str
    display_name: str | None = None


@dataclass(frozen=True)
class Overrides:
    """The reviewed identity overrides (ADR 0003). Two kinds of entry, both with a reason:

    - `published_id`: a CUI as published that is wrong (or a foreign id) -> the entity it really is;
    - `name`: a supplier published without a usable CUI -> an entity. Matches on `name_key_text` of the whole published
      name, so a joint venture's name (one name) stays one supplier: an override never splits a consortium.

    `key` is a CUI (the entity that CUI is) or a pinned key (`[a-z][a-z0-9-]*`) for a name-only entity.
    """

    by_id: Mapping[str, Override] = field(default_factory=dict)
    by_name: Mapping[str, Override] = field(default_factory=dict)

    @classmethod
    def load(cls, path: Path | str | None) -> "Overrides":
        if path is None or not Path(path).is_file():
            return cls()
        data = tomllib.loads(Path(path).read_text(encoding="utf-8"))
        by_id: dict[str, Override] = {}
        by_name: dict[str, Override] = {}
        for n, entry in enumerate(data.get("override", []), start=1):
            where = f"{path}: override #{n}"
            unknown = set(entry) - {"reason", "published_id", "name", "key", "display_name"}
            if unknown:
                raise OverrideError(f"{where}: unknown field(s) {sorted(unknown)}")
            reason, key = str(entry.get("reason", "")).strip(), str(entry.get("key", "")).strip()
            if not reason:
                raise OverrideError(f"{where}: a reason is required")
            if ("published_id" in entry) == ("name" in entry):
                raise OverrideError(f"{where}: exactly one of published_id and name")
            if key.isdigit():
                if not cui_check_digit_ok(key):
                    raise OverrideError(f"{where}: key {key} is not a CUI that passes the check digit")
            elif not _PINNED_KEY.match(key) or key.startswith(("vat-", "name-")):
                raise OverrideError(f"{where}: key {key!r} must be a CUI or a pinned key like `consortium-example`")
            value = entry.get("published_id") or entry.get("name") or ""
            if re.search(r"\d{13}", re.sub(r"\D", "", str(value))) or classify_tax_id(str(value)).kind == "cnp":
                raise OverrideError(f"{where}: a 13-digit id (CNP) never goes in the graph")
            if key.isdigit() and entry.get("display_name"):
                raise OverrideError(f"{where}: display_name is for a pinned name-only key; a CUI's name is ANAF's")
            override = Override(reason, key, entry.get("display_name"))
            if "published_id" in entry:
                tax = classify_tax_id(str(entry["published_id"]))
                ident = tax.value if tax.value else _loose_id(str(entry["published_id"]))
                if not ident:
                    raise OverrideError(f"{where}: published_id has no usable id")
                if ident in by_id:
                    raise OverrideError(f"{where}: published_id {ident} listed twice")
                by_id[ident] = override
            else:
                name = name_key_text(str(entry["name"]))
                if not name or name in by_name:
                    raise OverrideError(f"{where}: name empty or listed twice")
                by_name[name] = override
        return cls(by_id, by_name)


def _loose_id(raw: str) -> str:
    """A published id that is no valid CUI (that is why it is overridden): digits without `RO` and leading zeros."""
    s = re.sub(r"[^0-9A-Z]", "", raw.upper())
    s = s[2:] if re.fullmatch(r"RO\d+", s) else s
    return s.lstrip("0") if s.isdigit() else s


def _is_person(spelling: str, raw_id: str | None, kind: str, unusable_cui: bool = False) -> bool:
    """A winner no CUI ANAF knows and no VAT id resolves, that is an individual all the same (an override, checked before, pins
    a misclassified company): a truncated CNP (12 digits starting 1-8) unless the name has a legal form or an organisation word
    (a PFA still counts); an ID card number (6 digits) or series (`XX123456`) or no usable id at all with a name shaped like a
    person's (see `_shaped_like_a_person`). A CUI is unusable when it is the authority's own (`unusable_cui`) or longer than
    ANAF is ever asked about."""
    s = re.sub(r"[^0-9A-Z]", "", (raw_id or "").upper())
    if kind == "cui" and (unusable_cui or len(s.removeprefix("RO")) > _MAX_ASKED_DIGITS):
        kind = "other"
    if kind in ("none", "other") and _TRUNCATED_CNP.fullmatch(s):
        words = set(name_key_text(spelling).split())
        return not (words & (_LEGAL_FORMS | _ORG_WORDS) - _SOLE_TRADER_FORMS)  # unchanged until #66 decides (not the wider company words)
    if not _shaped_like_a_person(spelling):
        return False
    return kind in ("none", "other") or (kind == "cui" and _ID_CARD.fullmatch(s) is not None)


class Resolver:
    """Turns a winner (spelling + published id) into its entity. `anaf` maps a CUI ANAF found to its `compare_name`."""

    def __init__(self, anaf: Mapping[str, str] | None = None, overrides: Overrides | None = None):
        self.anaf = anaf if anaf is not None else {}
        self.overrides = overrides or Overrides()

    def supplier(self, name: str | None, raw_id: str | None, authority_raw_cui: str | None = None) -> Resolved:
        tax = classify_tax_id(raw_id)
        if tax.kind == "cnp":
            return NATURAL_PERSON_WITH_CNP  # before anything else: the id is neither matched nor kept
        spelling = (name or "").strip()
        published = tax.value if tax.kind in ("cui", "foreign_vat") else (_loose_id(raw_id) if raw_id and tax.kind == "other" else None)
        if published and (o := self.overrides.by_id.get(published)):
            return self._overridden(o, spelling)
        mismatch = False
        if tax.kind == "cui" and tax.value:
            if tax.value == classify_tax_id(authority_raw_cui).value:
                mismatch = True  # the supplier carries the authority's own CUI: unresolved (ADR 0003)
            elif (anaf_name := self.anaf.get(tax.value)) is not None:
                differs = bool(spelling) and compare_name(spelling) != anaf_name
                if (
                    differs
                    and len(tax.value) == 6
                    and _shaped_like_a_person(spelling)
                    and not shares_a_word(spelling, anaf_name)  # a renamed company shares a word
                ):
                    return NATURAL_PERSON  # an ID card number ANAF happens to know, under a person's name: never named
                return Resolved(key=tax.value, identity="CUI", cui=tax.value, differs_from_anaf=differs)
        if spelling and (o := self.overrides.by_name.get(name_key_text(spelling))):
            return replace(self._overridden(o, spelling), cui_mismatch=mismatch)
        if tax.kind == "foreign_vat" and tax.value:
            return Resolved(key=vat_key(tax.value), identity="NAME_ONLY", foreign_vat_id=tax.value)
        if spelling and name_key_text(spelling) and _is_person(spelling, raw_id, tax.kind, mismatch):
            return replace(NATURAL_PERSON, cui_mismatch=True) if mismatch else NATURAL_PERSON  # an individual without a CNP: never named either (ADR 0003); the badge is a Record fact
        if spelling and name_key_text(spelling):
            return Resolved(key=name_key(spelling), identity="NAME_ONLY", cui_mismatch=mismatch)
        return Resolved(key=None, identity=None, cui_mismatch=mismatch)  # no name and no usable id: nobody to link

    def _overridden(self, o: Override, spelling: str) -> Resolved:
        if o.key.isdigit():
            differs = bool(spelling) and o.key in self.anaf and compare_name(spelling) != self.anaf[o.key]
            return Resolved(key=o.key, identity="CUI", cui=o.key, curated=True, differs_from_anaf=differs)
        return Resolved(key=o.key, identity="NAME_ONLY", curated=True)
