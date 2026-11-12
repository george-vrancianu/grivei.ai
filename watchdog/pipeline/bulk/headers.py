"""Per-quarter header alias tables: what each canonical field is called in a bulk file, by record kind and quarter.

data.gov.ro's exports rename their columns between quarters and between CSV and XLSX (`Valoare atribuita (RON)` became
`Valoare achizitie (RON)`, the DAN date `Data atribuire` became `Data finalizare`). A table is an `Era`: the quarter it
starts at (`2025Q1`, unit names sort as text), canonical field -> accepted names, and the known columns that are not
loaded. Names are compared after `norm_header` (case, diacritics, underscores, spaces, a trailing `?` and `:` ignored).

Resolution for a file of kind K in quarter Q: first the era in force at Q; if that does not fit, the fallback, the union
of every era of K (a rename that landed one quarter early or late still loads). A file fits when every column is a
known name (an alias or an ignored column) and every required field is present. Nothing else loads: an unknown or
missing header makes the file invalid, so the caller quarantines it. To support a new spelling, add it here.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from .errors import InvalidFile


def norm_header(name: str) -> str:
    stripped = "".join(c for c in unicodedata.normalize("NFKD", name) if not unicodedata.combining(c))
    s = re.sub(r"[_\s]+", " ", stripped.lower().replace("﻿", "")).strip()
    return re.sub(r"[?:]+$", "", s).strip()


@dataclass(frozen=True)
class Era:
    """The header names in force from `from_quarter` until the next era of the same kind."""

    from_quarter: str
    columns: dict[str, tuple[str, ...]]  # canonical field -> accepted header names
    ignored: tuple[str, ...] = ()  # known columns we do not load

    def lookup(self) -> dict[str, str | None]:
        table: dict[str, str | None] = {norm_header(n): None for n in self.ignored}
        for canonical, names in self.columns.items():
            for n in names:
                table[norm_header(n)] = canonical
        return table


@dataclass(frozen=True)
class HeaderTable:
    """Everything the headers of one record kind can be."""

    eras: tuple[Era, ...]
    required: frozenset[str]

    def era_for(self, unit: str) -> Era | None:
        in_force = [e for e in self.eras if e.from_quarter <= unit]
        return max(in_force, key=lambda e: e.from_quarter) if in_force and re.fullmatch(r"\d{4}Q[1-4]", unit) else None

    def fallback(self) -> Era:
        columns: dict[str, list[str]] = {}
        ignored: list[str] = []
        for era in self.eras:
            for canonical, names in era.columns.items():
                columns.setdefault(canonical, []).extend(names)
            ignored.extend(era.ignored)
        return Era("0000Q1", {k: tuple(v) for k, v in columns.items()}, tuple(ignored))


def _try(era: Era, required: frozenset[str], header: list[str]) -> tuple[list[str | None], list[str]]:
    """Map the header through one era: (canonical or None per column, problems). No problems = it fits."""
    lookup = era.lookup()
    columns: list[str | None] = []
    unknown: list[str] = []
    for h in header:
        key = norm_header(h)
        if key in lookup:
            columns.append(lookup[key])
        else:
            columns.append(None)
            unknown.append(h)
    present = [c for c in columns if c]
    missing = sorted(required - set(present))
    duplicates = sorted({c for c in present if present.count(c) > 1})
    problems = []
    if missing:
        problems.append(f"missing: {', '.join(missing)}")
    if unknown:
        problems.append(f"unexpected: {', '.join(unknown)}")
    if duplicates:
        problems.append(f"repeated: {', '.join(duplicates)}")
    return columns, problems


def resolve(table: HeaderTable, label: str, unit: str, header: list[str]) -> list[str | None]:
    """The canonical field of each column (None = a known column we ignore), or InvalidFile."""
    era = table.era_for(unit)
    attempts = ([era] if era else []) + [table.fallback()]
    failures: list[str] = []
    for attempt in attempts:
        columns, problems = _try(attempt, table.required, header)
        if not problems:
            return columns
        failures = problems  # the last attempt (the fallback) is the most generous: report its complaints
    raise InvalidFile(f"headers do not match a {label} file", failures)


# --- the tables ----------------------------------------------------------------------------------------------------

# DA: the real shape, checked on the 2022 T1 file (`|NUMAR_ACHIZITIE_DIRECTA|,...`). Later DA files were not inspected:
# one era for all quarters until a real file says otherwise (the fallback covers a rename).
DA_ERA = Era(
    "2021Q1",
    {
        "code": ("NUMAR_ACHIZITIE_DIRECTA", "Numar achizitie directa"),
        "published_on": ("DATA_PUBLICARE_ACHIZITIE", "Data publicare achizitie"),
        "state": ("STARE_ACHIZITIE", "Stare achizitie"),
        "authority_name": ("DENUMIRE_AC", "Denumire autoritate contractanta"),
        "authority_cui": ("CUI_AC", "CUI autoritate contractanta"),
        "title": ("DENUMIRE_ACHIZITIE", "Denumire achizitie", "Obiectul achizitiei"),
        "cpv_code": ("COD_CPV", "Cod CPV"),
        "cpv_description": ("DENUMIRE_CPV", "Denumire CPV"),
        "awarded_on": ("DATA_ATRIBUIRE_ACHIZITIE", "Data atribuire achizitie", "Data atribuire"),
        "estimated": ("VALOARE_ESTIMATA_RON", "Valoare estimata (RON)"),
        "value": ("VALOARE_ATRIBUITA_RON", "Valoare atribuita (RON)"),
        "supplier_name": ("OFERTANT", "Ofertant castigator"),
        "supplier_cui": ("CUI_OFERTANT", "CUI ofertant", "CUI ofertant castigator"),
    },
)
DA = HeaderTable(
    (DA_ERA,),
    required=frozenset({"code", "published_on", "authority_name", "authority_cui", "title", "cpv_code", "value", "supplier_name", "supplier_cui"}),
)

# DAN (notificare de atribuire la cumpararea directa). Headers checked on the 2024 T1 CSV and the 2025 T1 XLSX.
DAN_2024 = Era(
    "2024Q1",
    {
        "authority_name": ("Autoritate contractanta",),
        "authority_cui": ("CUI",),
        "code": ("Numar notificare",),
        "published_on": ("Data publicare",),
        "title": ("Denumire",),
        "cpv_code": ("Cod CPV",),
        "cpv_description": ("Denumire CPV",),
        "contract_type": ("Tip contract",),
        "value": ("Valoare atribuita (RON)",),
        "awarded_on": ("Data atribuire",),
        "supplier_name": ("Ofertant",),
        "supplier_cui": ("CUI ofertant",),
    },
    ignored=("Modalitate desfasurare", "Fonduri comunitare?", "Denumire program"),
)
DAN_2025 = Era(
    "2025Q1",
    {
        "authority_name": ("Autoritate contractanta",),
        "authority_cui": ("CUI autoritate contractanta",),
        "code": ("Numar notificare",),
        "published_on": ("Data publicare",),
        "title": ("Obiectul achizitiei",),
        "cpv_code": ("Cod CPV",),
        "cpv_description": ("Denumire CPV",),
        "contract_type": ("Tip contract",),
        "value": ("Valoare achizitie (RON)",),
        # the 2025 export has no award date column; `Data finalizare` carries the same moment the 2024 `Data atribuire`
        # did (seconds before the publication stamp in the rows checked). A spec default: see the ticket report.
        "awarded_on": ("Data finalizare",),
        "supplier_name": ("Ofertant castigator",),
        "supplier_cui": ("CUI ofertant castigator",),
    },
    ignored=("Finantare prin fonduri comunitare?", "Tipul de proiect/ program"),
)
DAN = HeaderTable(
    (DAN_2024, DAN_2025),
    required=frozenset({"code", "published_on", "authority_name", "authority_cui", "title", "cpv_code", "value", "supplier_name", "supplier_cui"}),
)
