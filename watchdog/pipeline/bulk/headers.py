"""Per-quarter header alias tables: what each canonical field is called in a bulk file, by record kind and quarter.

data.gov.ro's exports rename their columns between quarters and between CSV and XLSX (`Valoare atribuita (RON)` became
`Valoare achizitie (RON)`, the DAN date `Data atribuire` became `Data finalizare`). A table is an `Era`: the quarter it
starts at (`2025Q1`, unit names sort as text), canonical field -> accepted names, and the known columns that are not
loaded. Names are compared after `norm_header` (case, diacritics, underscores, spaces, a trailing `?` and `:` ignored).

Resolution for a file of kind K in quarter Q: first the era in force at Q; if that does not fit, the fallback, the union
of every era of K (a rename that landed one quarter early or late still loads). A file fits when every column is a
known name (an alias or an ignored column) and every required field is present. Nothing else loads: an unknown or
missing header makes the file invalid, so the caller quarantines it. To support a new spelling, add it here.

A name that appears twice in one header (the 2025 Contracte files have two `Data publicare`: the initiation notice's and
the award notice's) is told apart by position: the first keeps its name, the second is `<name>#2`, the third `<name>#3`.
Write those in the tables as such. (The 2026 DA files have two `CUI`: the authority's and the winner's.)
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
    day_first: bool = False  # text dates are `DD/MM/YYYY` (the DA 2021 CSV files) instead of `MM/DD/YYYY`

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
    seen: dict[str, int] = {}
    for h in header:
        key = norm_header(h)
        seen[key] = seen.get(key, 0) + 1
        if seen[key] > 1:
            key = f"{key}#{seen[key]}"  # the same name again: told apart by position
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


def resolve_era(table: HeaderTable, label: str, unit: str, header: list[str]) -> tuple[list[str | None], Era]:
    """The canonical field of each column (None = a known column we ignore) and the era that fitted, or InvalidFile."""
    era = table.era_for(unit)
    attempts = ([era] if era else []) + [table.fallback()]
    failures: list[str] = []
    for attempt in attempts:
        columns, problems = _try(attempt, table.required, header)
        if not problems:
            return columns, attempt
        failures = problems  # the last attempt (the fallback) is the most generous: report its complaints
    raise InvalidFile(f"headers do not match a {label} file", failures)


def resolve(table: HeaderTable, label: str, unit: str, header: list[str]) -> list[str | None]:
    """The canonical field of each column (None = a known column we ignore), or InvalidFile."""
    return resolve_era(table, label, unit, header)[0]


# --- the tables ----------------------------------------------------------------------------------------------------

# DA 2021 Q4 to 2023 Q2: the real shape, checked on the 2022 T1 file (`|NUMAR_ACHIZITIE_DIRECTA|,...`); it holds until DA_2023 (2023 Q1).
# The DA 2023 Q4 and 2024 Q2 pipe-separated CSV files have no era of their own: they resolve through the fallback (the union of
# every era), which is safe because they are month-first like all DA files but the 2021 ones (`Era.day_first`).
DA_2021_Q4 = Era(
    "2021Q4",
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
# DA 2023 T1 (the `.xls` export, checked on the real file): XLSX-style names, `Numar achizite` (sic), no award date column
# (`Data finalizare` stands in, as in the DAN 2025 era), and extra columns we do not load.
DA_2023 = Era(
    "2023Q1",
    {
        "code": ("Numar achizite",),
        "published_on": ("Data publicare",),
        "authority_name": ("Autoritate contractanta",),
        "authority_cui": ("CUI autoritate contractanta",),
        "title": ("Denumire achizitie",),
        "cpv_code": ("COD CPV",),
        "cpv_description": ("Denumire CPV",),
        "contract_type": ("Tip contract",),
        "awarded_on": ("Data finalizare",),
        "value": ("Valoare achizitie (RON)",),
        "supplier_name": ("Ofertant castigator",),
        "supplier_cui": ("CUI ofertant castigator",),
    },
    ignored=("Finantare prin fonduri comunitare?", "Denumire program/ proiect", "Tara ofertant castigator", "Oras ofertant castigator"),
)
# DA 2021 Q1 to Q3 (XLSX and CSV, checked on the real files): the Contracte 2021 layout, one row per purchase. The CSV dates are
# `DD/MM/YYYY` (a first part above 12 is in every file), the only day-first files of the archive. No CPV description, no state.
DA_2021 = Era(
    "2021Q1",
    {
        "code": ("NUMAR_ANUNT",),
        "published_on": ("DATA_ANUNT",),
        "authority_name": ("AUTORITATE_CONTRACTANTA",),
        "authority_cui": ("AUTORITATE_CONTRACTANTA_CUI",),
        "title": ("TITLU_CONTRACT",),
        "cpv_code": ("CPV_CODE",),
        "awarded_on": ("DATA_CONTRACT",),
        "value": ("VALOARE_RON",),
        "supplier_name": ("CASTIGATOR",),
        "supplier_cui": ("CASTIGATOR_CUI",),
    },
    ignored=("CASTIGATOR_TARA", "CASTIGATOR_LOCALITATE", "CASTIGATOR_ADRESA", "TIP_PROCEDURA", "DESCRIERE", "TIP_INCHEIERE_CONTRACT", "NUMAR_CONTRACT",
             "VALOARE", "MONEDA", "VALOARE_EUR", "CPV_CODE_ID"),
    day_first=True,
)
# DA 2023 Q3 CSV: pipe-separated, quoted text, own upper-case names (`NUME_AC`, `NUMAR_ACHIZITIE`, `CASTIGATOR`).
DA_2023_Q3 = Era(
    "2023Q3",
    {
        "code": ("NUMAR_ACHIZITIE",),
        "published_on": ("DATA_PUBLICARE",),
        "authority_name": ("NUME_AC",),
        "authority_cui": ("CUI_AC",),
        "title": ("DENUMIRE",),
        "cpv_code": ("COD_CPV",),
        "cpv_description": ("NUME_CPV",),
        "contract_type": ("TIP_CONTRACT",),
        "awarded_on": ("DATA_FINALIZARE",),
        "value": ("VALOARE_ACHIZITIE",),
        "supplier_name": ("CASTIGATOR",),
        "supplier_cui": ("CUI_CASTIGATOR",),
    },
    ignored=("FONDURI_COMUNITARE", "DENUMIRE_PROGRAM", "TARA_CASTIGATOR", "ORAS_CASTIGATOR"),
)
# DA 2024 Q1 on, `.xls` / `.xlsx` / `.ods` (checked on 2024 Q1 and Q3, 2025 Q3 and 2026 Q2 and Q3): the names change a little from
# quarter to quarter, so one era holds the spellings. The 2026 Q3 file names both CUI columns `CUI` (the second is the winner's).
DA_2024 = Era(
    "2024Q1",
    {
        "code": ("Numar achizitie", "Numar achizitie directa"),
        "published_on": ("Data publicare",),
        "authority_name": ("Autoritate contractanta",),
        "authority_cui": ("CUI autoritate", "CUI autoritate contractanta", "CUI"),
        "title": ("Denumire", "Denumire achizitie"),
        "cpv_code": ("Cod CPV",),
        "cpv_description": ("Denumire CPV",),
        "contract_type": ("Tip contract",),
        "awarded_on": ("Data atribuire", "Data finalizare"),
        "value": ("Valoare atribuita (RON)", "Valoare achizitie (RON)"),
        "supplier_name": ("Ofertant castigator", "Ofertant"),
        "supplier_cui": ("CUI ofertant castigator", "CUI#2"),
    },
    ignored=("Fonduri comunitare?", "Finantare prin fonduri comunitare?", "Cu fonduri europene?", "Denumire program", "Tipul de proiect/ program"),
)
DA = HeaderTable(
    (DA_2021, DA_2021_Q4, DA_2023, DA_2023_Q3, DA_2024),
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
# 2023 T1 `.xls` (checked on the real file): the 2025 layout with `Ofertant` / `CUI ofertant` and `Modalitate de desfasurare`.
DAN_2023 = Era(
    "2023Q1",
    {**DAN_2025.columns, "supplier_name": ("Ofertant",), "supplier_cui": ("CUI ofertant",)},
    ignored=DAN_2025.ignored + ("Modalitate de desfasurare", "Tip de proiect/ program"),
)
# 2023 Q2 `.xls` and Q3 CSV (pipe-separated): the DA 2023 Q3 style, upper-case names; `NAME` is the programme (not loaded).
DAN_2023_Q2 = Era(
    "2023Q2",
    {
        "authority_name": ("AUTORITATE_CONTRACTANTA",),
        "authority_cui": ("CUI_AC",),
        "code": ("NUMAR_NOTIFICARE",),
        "published_on": ("DATA_PUBLICARE",),
        "title": ("OBIECTUL_ACHIZITIEI",),
        "cpv_code": ("COD_CPV",),
        "cpv_description": ("NUME_CPV",),
        "contract_type": ("TIP_CONTRACT",),
        "value": ("VALOARE_ACHIZITIE",),
        "awarded_on": ("DATA_FINALIZARE",),
        "supplier_name": ("OFERTANT",),
        "supplier_cui": ("CUI_OFERTANT",),
    },
    ignored=("MODALITATE_DESFASURARE", "FONDURI_COMUNITARE", "NAME"),
)
# 2023 Q4 CSV: the 2024 layout with `Denumire notificare` and `Data atribuire`, winners as `Ofertant castigator`.
DAN_2023_Q4 = Era(
    "2023Q4",
    {
        **DAN_2024.columns,
        "authority_cui": ("CUI autoritate contractanta",),
        "title": ("Denumire notificare",),
        "supplier_name": ("Ofertant castigator",),
        "supplier_cui": ("CUI ofertant castigator",),
    },
    ignored=DAN_2024.ignored + ("Denumire fond",),
)
DAN = HeaderTable(
    (DAN_2023, DAN_2023_Q2, DAN_2023_Q4, DAN_2024, DAN_2025),
    required=frozenset({"code", "published_on", "authority_name", "authority_cui", "title", "cpv_code", "value", "supplier_name", "supplier_cui"}),
)


# --- Contracte (CAN / SCNA) and "fara anunt de initiere" award notices (#64) ------------------------------------------
# One row per lot x winner of a contract. Checked on the real files: 2021 T3 and T4 (CSV, upper-case names), 2022 T1 (pipe
# CSV), 2025 T1 and T2 (XLSX) and the `.xls` files of 2021 T1 and T2, 2022 T2 to T4 and 2023 T1. A quarter whose names
# differ from all of these falls back to the union of the eras below, and is quarantined until a spelling is added here.

_CONTRACT_REQUIRED = frozenset({"notice_code", "published_on", "authority_name", "authority_cui", "contract_number", "value",
                                "supplier_name", "supplier_cui"})

CONTRACTE_2021 = Era(
    "2021Q3",
    {
        "authority_name": ("AUTORITATE_CONTRACTANTA",),
        "authority_cui": ("AUTORITATE_CONTRACTANTA_CUI",),
        "procedure": ("TIP_PROCEDURA",),
        "concluded_by": ("MODALITATE_CONTRACTARE",),  # `Cu acord cadru` / `Cu acord cadru subsecvent` / `Fara acord cadru`
        "initiation_code": ("NUMAR_ANUNT_PARTICIPARE",),
        "notice_code": ("NUMAR_ANUNT_ATRIBUIRE",),
        "published_on": ("DATA_ANUNT_ATRIBUIRE",),
        "contract_type": ("TIP_CONTRACT",),
        "contract_number": ("NUMAR_CONTRACT",),
        "awarded_on": ("DATA_CONTRACT",),
        "title": ("TITLU_CONTRACT",),
        "value": ("VALOARE_CONTRACT_RON",),
        "cpv_code": ("CPV_CODE",),
        "supplier_name": ("CASTIGATOR",),
        "supplier_cui": ("CASTIGATOR_CUI",),
    },
    ignored=(
        "CASTIGATOR_TARA", "CASTIGAOR_LOCALITATE", "CASTIGATOR_ADRESA", "TIP_ANUNT", "TIP_AUTORITATE", "TIP__ACTIVITATE_AUTORITATE",
        "DATA_ANUNT_PARTICIPARE", "TIP_INCHEIERE_CONTRACT", "TIP_CRITERII_ATRIBUIRE", "CU_LICITATIE_ELECTRONICA", "NUMAR_OFERTE",
        "SUBCONTRACTAT", "CPV_CODE_ID", "VALOARE_ESTIMATA_PARTICIPARE", "MONEDA_VALOARE_ESTIMATA", "FONDURI_COMUNITARE",
        "TIP_FINANTARE", "TIP_LESIGLATIE", "FOND_EUROPEAN", "DEPOZITE_GARANTII", "MODALITATI_FINANTARE",
    ),
)
CONTRACTE_2022 = Era(
    "2022Q1",
    {
        "authority_name": ("DENUMIRE_AC",),
        "authority_cui": ("CUI_AC",),
        "procedure": ("TIP_PROCEDURA",),
        "concluded_by": ("INCHEIAT_PRIN",),
        "initiation_code": ("NUMAR_ANUNT_INITIERE",),
        "notice_code": ("NUMAR_ANUNT_ATRIBUIRE",),
        "published_on": ("DATA_ANUNT_ATRIBUIRE",),
        "lot": ("NUMAR_LOT",),
        "contract_number": ("NUMAR_CONTRACT",),
        "title": ("DENUMIRE_CONTRACT",),
        "awarded_on": ("DATA_CONTRACT",),
        "value": ("VALOARE_CONTRACT_RON",),
        "supplier_name": ("OFERTANT",),
        "supplier_cui": ("CUI_OFERTANT",),
    },
    ignored=("COD_NUTS", "DENUMIRE_NUTS", "MODALITATE_DESFASURARE", "DATA_ANUNT_INITIERE", "VALOARE_ESTIMATA_RON"),
)
# 2024 Q4 on (XLSX and `.ods`, the layout the other eras are written against; the 2025 and 2026 files were checked on the real files).
CONTRACTE_2024_Q4 = Era(
    "2024Q4",
    {
        "authority_name": ("Autoritate contractanta",),
        "authority_cui": ("CUI autoritate contractanta",),
        "procedure": ("Tip procedura",),
        "initiation_code": ("Numar anunt initiere",),
        "contract_type": ("Tip contract",),
        "cpv_code": ("Cod CPV",),
        "cpv_description": ("Denumire CPV",),
        "lot": ("Numar lot",),
        "notice_code": ("Numar anunt atribuire",),
        "published_on": ("Data publicare#2",),  # the second `Data publicare`: the award notice's (the first is the initiation notice's)
        "awarded_on": ("Data contract",),
        "contract_number": ("Numar contract",),
        "concluded_by": ("Incheiat prin",),
        "value": ("Valoare contract (RON)",),
        "supplier_name": ("Ofertant castigator",),
        "supplier_cui": ("CUI ofertant castigator",),
    },
    ignored=("Tip anunt", "Data publicare", "Tip legislatie", "Tip incheiere contract", "Tip criterii de atribuire"),
)
# 2022 T4 `.xls` (checked on the real file): the 2021 layout in mixed-case names (`Catigator`, sic), no lot column.
CONTRACTE_2022_Q4 = Era(
    "2022Q4",
    {
        "authority_name": ("Autoritate contractanta",),
        "authority_cui": ("CUI autoritate conractanta",),  # sic
        "procedure": ("Tip procedura",),
        "concluded_by": ("Modalitate contractare",),
        "initiation_code": ("Numar anunt participare",),
        "notice_code": ("Numar anunt atribuire",),
        "published_on": ("Data anunt atribuire",),
        "contract_type": ("Tip contract",),
        "contract_number": ("Numar contract",),
        "awarded_on": ("Data contract",),
        "title": ("Denumire contract",),
        "value": ("Valoare contract (RON)",),
        "cpv_code": ("Cod CPV",),
        "supplier_name": ("Catigator",),
        "supplier_cui": ("CUI castigator",),
    },
    ignored=(
        "Tara castigator", "Localitate castigator", "Adresa castigator", "Tip anunt", "Tip autoritate contractanta",
        "Tip activitate autoritate contractanta", "Tip incheiere contract", "Tip criteriu de atribuire", "Cu licitatie electronica?",
        "Numar oferte", "Cu subcontractare?", "Data anunt participare", "Valoare estimata", "Moneda",
        "Cu fonduri comunitare?", "Tip finantare", "Tip legislatie", "Fond european", "Depozite si garantii", "Modalitate finantare",
    ),
)
# 2023 T1 `.xls` (checked on the real file): the 2025 layout in one-`Data` form, `Valoare atribuita (RON)`, no title.
CONTRACTE_2023 = Era(
    "2023Q1",
    {
        **{k: v for k, v in CONTRACTE_2024_Q4.columns.items() if k not in ("published_on", "value")},
        "published_on": ("Data anunt atribuire",),
        "value": ("Valoare atribuita (RON)",),
    },
    ignored=(
        "Tip anunt", "Tip legislatie", "Tip autoritate contractanta", "Tip activitate autoritate contractanta", "Tip inchiere contract",
        "Modalitate de desfasurare", "Cu licitatie electronica?", "Tip criteriu de atribuire", "Data anunt initiere", "Oras ofertant", "Tara ofertant",
    ),
)
# 2023 Q2 `.xls` and Q3 CSV (pipe-separated, checked on the real files): upper-case names again (`NUMAR_ANUNT_AI`, `CUI_OF`). The 2025 Q4
# XLSX repeats these names as a second header row, which the reader skips (see `parse_file_stats`).
CONTRACTE_2023_Q2 = Era(
    "2023Q2",
    {
        "authority_name": ("DENUMIRE_AC",),
        "authority_cui": ("CUI_AC",),
        "procedure": ("TIP_PROCEDURA",),
        "initiation_code": ("NUMAR_ANUNT_AI",),
        "contract_type": ("TIP_CONTRACT",),
        "cpv_code": ("CPV_CODE",),
        "cpv_description": ("DENUMIRE_CPV",),
        "lot": ("NUMAR_LOT",),
        "notice_code": ("NUMAR_ANUNT_ATRIBUIRE",),
        "published_on": ("DATA_ANUNT_ATRIBUIRE",),
        "awarded_on": ("DATA_CONTRACT",),
        "contract_number": ("NUMAR_CONTRACT",),
        "concluded_by": ("INCHEIAT_PRIN",),
        "value": ("VALOARE_CONTRACT_RON",),
        "supplier_name": ("OFERTANT",),
        "supplier_cui": ("CUI_OF",),
    },
    ignored=(
        "TIP_ANUNT", "TIP_AUTORITATE", "TIP__ACTIVITATE_AUTORITATE", "TIP_LESIGLATIE", "TIP_INCHEIERE_CONTRACT", "MODALITATE_DESFASURARE",
        "CU_LICITATIE_ELECTRONICA", "TIP_CRITERII_ATRIBUIRE", "DATA_PUBLICARE_AI", "ORAS_CASTIGATOR", "TARA_CASTIGATOR",
    ),
)
# 2023 Q4 CSV: the 2025 layout, but with a date per notice and no `Data publicare` twice: `Data publicare anunt atribuire` is the
# award notice's and `Data publicare contract` the contract's own date.
CONTRACTE_2023_Q4 = Era(
    "2023Q4",
    {
        **{k: v for k, v in CONTRACTE_2024_Q4.columns.items() if k not in ("published_on",)},
        "published_on": ("Data publicare anunt atribuire",),
        "awarded_on": ("Data publicare contract",),
        "value": ("Valoare contract (RON)",),
    },
    ignored=(
        "Tip anunt", "Tip legislatie", "Tip incheiere contract", "Tip criterii de atribuire", "Tip autoritate", "Tip activitate", "Modalitate de desfasurare",
        "Licitatie electronica?", "Criterii de atribuire", "Data publicare anunt initiere", "Oras ofertant", "Tara ofertant",
    ),
)
# 2024 Q1 to Q3 (CSV with BOM and `.xls`, checked on the real files): the 2025 layout with `CUI`, `Ofertant`, `CUI ofertant`, the
# misspelt `Incheiar prin` (the CSV has a trailing space too) and two `Data publicare` (the award notice's is the second).
CONTRACTE_2024_Q1 = Era(
    "2024Q1",
    {
        **CONTRACTE_2024_Q4.columns,
        "authority_cui": ("CUI",),
        "concluded_by": ("Incheiar prin",),
        "supplier_name": ("Ofertant",),
        "supplier_cui": ("CUI ofertant",),
    },
    ignored=CONTRACTE_2024_Q4.ignored + ("Tip autoritate", "Tip activitate", "Modalitate de desfasurare", "Cu licitatie electronica?", "Tip criteriu de atribuire", "Oras", "Tara"),
)
CONTRACTE = HeaderTable((CONTRACTE_2021, CONTRACTE_2022, CONTRACTE_2022_Q4, CONTRACTE_2023, CONTRACTE_2023_Q2, CONTRACTE_2023_Q4, CONTRACTE_2024_Q1, CONTRACTE_2024_Q4), required=_CONTRACT_REQUIRED)

# "Anunturi de atribuire la proceduri fara anunt de initiere": one row per contract x winner, no lots. Checked on the 2025
# T1 and T2 XLSX and the 2023 T1 `.xls`; the 2021, 2022 and 2024 names are unknown.
FARA_ANUNT_2025 = Era(
    "2025Q1",
    {
        "authority_name": ("Autoritate contractanta",),
        "authority_cui": ("CUI autoritate contractanta",),
        "procedure": ("Tip procedura",),
        "notice_code": ("Numar anunt atribuire",),
        "published_on": ("Data publicare",),
        "concluded_by": ("Incheiat prin",),
        "contract_type": ("Tip contract",),
        "cpv_code": ("Cod CPV",),
        "cpv_description": ("Denumire CPV",),
        "awarded_on": ("Data contract",),
        "contract_number": ("Numar contract",),
        "title": ("Denumire contract",),
        "value": ("Valoare atribuita (RON)",),
        "supplier_name": ("Ofertant castigator",),  # the file's header has a trailing space; norm_header strips it
        "supplier_cui": ("CUI ofertant castigator",),
    },
    ignored=("Tip anunt", "Tip legislatie", "Criteriu de atribuire"),
)
# 2023 T1 `.xls` (checked on the real file): `CUI ofertant`, and a few more unloaded columns. The only older file seen.
FARA_ANUNT_2023 = Era(
    "2023Q1",
    {**FARA_ANUNT_2025.columns, "supplier_cui": ("CUI ofertant",)},
    ignored=FARA_ANUNT_2025.ignored + ("Tip autoritate contractanta", "Tip activitate contractanta", "Criteriul de atribuire",
                                       "Oras ofertant castigator", "Tara ofertant castigator"),
)
# 2023 Q3 CSV (pipe-separated, upper-case names, `VALOARE_ATRIBUITA` without `(RON)`).
FARA_ANUNT_2023_Q3 = Era(
    "2023Q3",
    {
        "authority_name": ("DENUMIRE_AC",),
        "authority_cui": ("CUI",),
        "procedure": ("TIP_PROCEDURA",),
        "notice_code": ("NUMAR_ANUNT_ATRIBUIRE",),
        "published_on": ("DATA_ANUNT_ATRIBUIRE",),
        "concluded_by": ("INCHEIAT_PRIN",),
        "contract_type": ("TIP_CONTRACT",),
        "cpv_code": ("COD_CPV",),
        "cpv_description": ("DENUMIRE_CPV",),
        "awarded_on": ("DATA_CONTRACT",),
        "contract_number": ("NUMAR_CONTRACT",),
        "title": ("DENUMIRE_CONTRACT",),
        "value": ("VALOARE_ATRIBUITA",),
        "supplier_name": ("NUME_CASTIGATOR",),
        "supplier_cui": ("CUI_CASTIGATOR",),
    },
    ignored=("TIP_AUTORITATE", "TIP__ACTIVITATE_AUTORITATE", "TIP_ANUNT", "TIP_LEGISLATIE", "CRITERIU_DE_ATRIBUIRE", "ORAS_CASTIGATOR", "TARA_CASTIGATOR"),
)
# 2023 Q4 CSV: `Data publicare anunt`, and the winner's town and country.
FARA_ANUNT_2023_Q4 = Era(
    "2023Q4",
    {**FARA_ANUNT_2025.columns, "authority_cui": ("CUI autoritate contractanta",), "published_on": ("Data publicare anunt",)},
    ignored=FARA_ANUNT_2025.ignored + ("Tip autoritate", "Tip activitate autoritate", "Oras ofertant castigator", "Tara ofertant castigator"),
)
# 2024 Q1 to Q3 (CSV and `.xls`): `CUI`, `Ofertant`, `CUI ofertant`, and the misspelt `Tip lesiglatie` and `Dtaa contract`.
FARA_ANUNT_2024 = Era(
    "2024Q1",
    {**FARA_ANUNT_2025.columns, "authority_cui": ("CUI",), "awarded_on": ("Dtaa contract",), "supplier_name": ("Ofertant",), "supplier_cui": ("CUI ofertant",)},
    ignored=FARA_ANUNT_2025.ignored + ("Tip autoritate", "Tip activitate", "Tip lesiglatie"),
)
FARA_ANUNT = HeaderTable((FARA_ANUNT_2023, FARA_ANUNT_2023_Q3, FARA_ANUNT_2023_Q4, FARA_ANUNT_2024, FARA_ANUNT_2025), required=_CONTRACT_REQUIRED)
