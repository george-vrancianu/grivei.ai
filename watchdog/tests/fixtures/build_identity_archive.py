"""Builds `archive-identity/`, the raw-archive fixture for supplier identity (ticket #66, ADR 0003), and the identity override
file that goes with it. Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_identity_archive.py

Every name, code, CUI and CNP is invented. CUIs ending in a valid check digit are in `OK`, one that fails it is `BAD`.
The SEAP files are shaped like the real data.gov.ro exports (pipe CSV, `|text|` fields, MM/DD/YYYY dates); the ANAF
responses are shaped like the real v9 answer (`found` entries with `date_generale`, `stare_inactiv`, `adresa_sediu_social`,
`adresa_domiciliu_fiscal`; `notFound` CUIs), written through the connector's own `archive_batch`.

One Record per identity case (a DA each unless said): see CASES below and the seam 1 / pytest tests that read them.
The output is committed; this script documents how it was made and rebuilds it deterministically.
"""
from __future__ import annotations

import json
import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path

WATCHDOG = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WATCHDOG))

from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

OUT = Path(__file__).parent / "archive-identity"
OVERRIDES = Path(__file__).parent / "identity-overrides.toml"

CNP_DA = "1990101123456"  # invented; 13 digits: a person's id, which must never appear anywhere in the graph or the API
CNP_CONTRACT = "2950202123456"


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def anaf_entry(cui: int, name: str, *, state="INREGISTRAT din data 01.01.2000", inactive=False, locality="Mun. Cluj-Napoca", county="CJ", code="13") -> dict:
    """A `found` entry as ANAF's v9 sends it."""
    return {
        "date_generale": {
            "data": "2026-11-01", "cui": cui, "denumire": name, "adresa": f"JUD. CLUJ, {locality.upper()}, STR. EXEMPLU, NR.1",
            "telefon": "", "fax": "", "codPostal": "400001", "act": "", "stare_inregistrare": state,
            "data_inreg_Reg_RO_e_Factura": "", "organFiscalCompetent": "Administratia Fiscala Exemplu", "forma_de_proprietate": "",
            "forma_organizare": "PERSOANA JURIDICA", "forma_juridica": "", "data_inregistrare": "2000-01-01", "statusRO_e_Factura": False,
            "nrRegCom": "J12/1/2000", "cod_CAEN": "4211", "iban": "",
        },
        "inregistrare_scop_Tva": {"scpTVA": False, "perioade_TVA": []},
        "inregistrare_RTVAI": {"dataInceputTvaInc": "", "dataSfarsitTvaInc": "", "tipActTvaInc": "", "statusTvaIncasare": False, "dataActualizareTvaInc": "", "dataPublicareTvaInc": ""},
        "stare_inactiv": {"dataInactivare": "", "dataReactivare": "", "dataPublicare": "", "dataRadiere": "", "statusInactivi": inactive},
        "inregistrare_SplitTVA": {"statusSplitTVA": False, "dataInceputSplitTVA": "", "dataAnulareSplitTVA": ""},
        "adresa_sediu_social": {"stara": "", "sdenumire_Localitate": locality, "sdenumire_Strada": "Str. Exemplu", "snumar_Strada": "1",
                                "scod_Localitate": "1", "sdenumire_Judet": "CLUJ", "scod_Judet": code, "scod_JudetAuto": county,
                                "sdetalii_Adresa": "", "scod_Postal": "400001"},
        "adresa_domiciliu_fiscal": {"dtara": "", "dnumar_Strada": "1", "dcod_Localitate": "1", "ddenumire_Judet": "CLUJ", "dcod_Judet": code,
                                    "dcod_JudetAuto": county, "ddetalii_Adresa": "", "dcod_Postal": "400001", "ddenumire_Localitate": locality,
                                    "ddenumire_Strada": "Str. Exemplu"},
    }


def anaf_response(found: list[dict], not_found: list[int]) -> bytes:
    return json.dumps({"found": found, "notFound": not_found}, ensure_ascii=False, separators=(",", ":")).encode()


# ---- SEAP: DA 2023 Q1 (pipe CSV) ------------------------------------------------------------------------------------------

DA_HEADER = ("|NUMAR_ACHIZITIE_DIRECTA|,|DATA_PUBLICARE_ACHIZITIE|,|STARE_ACHIZITIE|,|DENUMIRE_AC|,|CUI_AC|,|DENUMIRE_ACHIZITIE|,"
             "|COD_CPV|,|DENUMIRE_CPV|,|DATA_ATRIBUIRE_ACHIZITIE|,|VALOARE_ESTIMATA_RON|,|VALOARE_ATRIBUITA_RON|,|OFERTANT|,|CUI_OFERTANT|")
COMUNA = ("COMUNA EXEMPLU (PRIMARIA COMUNEI EXEMPLU,JUDETUL TEST)", "1000009")
SPITAL = ("SPITALUL EXEMPLU", "1000017")


def da_row(code, day, supplier, cui, authority=COMUNA, value="1000"):
    return (f"|{code}|,|03/{day:02d}/2023|,|Oferta acceptata|,|{authority[0]}|,|{authority[1]}|,|Achizitie {code}|,|30197000-6|,"
            f"|Articole de papetarie (Rev.2)|,|03/{day:02d}/2023|,{value},{value},|{supplier}|,|{cui}|")


# code, what it shows
CASES = [
    ("DA93000001", "SANTIERUL TARA DEMO SRL", "RO 2000007", COMUNA),  # ANAF-confirmed CUI (renamed company, current spelling)
    ("DA93000002", "S.C. SANTIERUL TARA DEMO S.R.L.", "2000007", COMUNA),  # a second spelling of the same name
    ("DA93000003", "TARA VECHE CONSTRUCT SA", "2000007", COMUNA),  # the old name: stays attached, NAME_DIFFERS_FROM_ANAF
    ("DA93000004", "FURNIZOR NECUNOSCUT SRL", "2000015", COMUNA),  # passes the check digit, ANAF says notFound
    ("DA93000005", "CIFRA GRESITA SRL", "2000001", COMUNA),  # fails the check digit
    ("DA93000006", "BALKAN TRADING OOD", "BG 103029862", COMUNA),  # foreign VAT id
    ("DA93000007", "SERVICII FARA CUI SRL", "", COMUNA),  # name only
    ("DA93000008", "POPESCU ION FICTIV", CNP_DA, COMUNA),  # a CNP: a natural person
    ("DA93000009", "PRIMARIA COMUNA EXEMPLU", "1000009", COMUNA),  # the supplier's CUI is the authority's own
    ("DA93000010", "RCS & RDS DEMO SA", "2000023", COMUNA),  # ANAF's name is another: NAME_DIFFERS_FROM_ANAF
    ("DA93000011", "FIRMA RADIATA DEMO SRL", "2000031", COMUNA),  # ANAF status RADIERE
    ("DA93000012", "ASOCIEREA PENTRU PODUL EXEMPLU", "", COMUNA),  # override file: a pinned name-only key
    ("DA93000013", "DESTINATAR GRESIT SRL", "2000058", COMUNA),  # override file: a wrong CUI mapped to 2000066
    ("DA93000014", "DRUM CONSTRUCT DEMO SRL", "2000074", COMUNA),  # homonym 1
    ("DA93000015", "DRUM CONSTRUCT DEMO SRL", "2000082", COMUNA),  # homonym 2: another CUI, so another entity
    ("DA93000016", "SPITALUL EXEMPLU", "1000017", COMUNA),  # an authority that is also a supplier: one entity, two roles
    ("DA93000017", "SANTIERUL TARA DEMO SRL", "2000007", SPITAL),  # bought by that authority
]

# ---- SEAP: Contracte 2023 Q1 (pipe CSV): a consortium of a company, a person (CNP) and a foreign firm -------------------------------

H22 = ("|DENUMIRE_AC|,|CUI_AC|,|COD_NUTS|,|DENUMIRE_NUTS|,|TIP_PROCEDURA|,|INCHEIAT_PRIN|,|MODALITATE_DESFASURARE|,|NUMAR_ANUNT_INITIERE|,"
       "|DATA_ANUNT_INITIERE|,|NUMAR_ANUNT_ATRIBUIRE|,|DATA_ANUNT_ATRIBUIRE|,|NUMAR_LOT|,|NUMAR_CONTRACT|,|DENUMIRE_CONTRACT|,|DATA_CONTRACT|,"
       "|VALOARE_ESTIMATA_RON|,|VALOARE_CONTRACT_RON|,|OFERTANT|,|CUI_OFERTANT|")


def row22(notice, number, title, value, supplier, cui, authority=SPITAL):
    return (f"|{authority[0]}|,|{authority[1]}|,|RO113|,|Cluj|,|Licitatie deschisa|,|Fara acord cadru|,|Online|,|CN9900001|,|01/20/2023|,|{notice}|,"
            f"|02/10/2023|,|1|,|{number}|,|{title}|,|02/20/2023|,{value},{value},|{supplier}|,| {cui}|")


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)

    da = "\n".join([DA_HEADER, *(da_row(code, 10 + i, supplier, cui, authority) for i, (code, supplier, cui, authority) in enumerate(CASES))]) + "\n"
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2023Q1", fetched_at=at(2023, 6, 15), files={"raport-achizitii-directe-t1-2023.csv": da.encode()},
                 via="Achizitii directe 2023 - T1", url="https://data.gov.ro/fixture/raport-achizitii-directe-t1-2023.csv")
    contracts = "\n".join([
        H22,
        row22("CAN9700001", "C-1", "Reabilitare corp B", 500000, "SANTIERUL TARA DEMO SRL", "2000007"),
        row22("CAN9700001", "C-1", "Reabilitare corp B", 500000, "IONESCU MARIA FICTIV", CNP_CONTRACT),
        row22("CAN9700001", "C-1", "Reabilitare corp B", 500000, "BALKAN TRADING OOD", "BG103029862"),
    ]) + "\n"
    a.write_unit(source="seap", stream="bulk", kind="contracte", unit="2023Q1", fetched_at=at(2023, 6, 20), files={"raport-contracte-t1-2023.csv": contracts.encode()},
                 via="Contracte 2023 - T1", url="https://data.gov.ro/fixture/raport-contracte-t1-2023.csv")

    # ANAF answers: an older one that still has the company's old name, then the current one (the latest answer wins)
    archive_batch(a, [2000007], date(2026, 10, 1), anaf_response([anaf_entry(2000007, "TARA VECHE CONSTRUCT SA")], []), at(2026, 10, 1, 8))
    found = [
        anaf_entry(1000009, "COMUNA EXEMPLU", locality="Com. Exemplu"),
        anaf_entry(1000017, "SPITALUL EXEMPLU"),
        anaf_entry(2000007, "ŞANTIERUL ŢARA DEMO SRL"),  # ANAF writes the cedilla letters
        anaf_entry(2000023, "DIGI DEMO ROMANIA SA"),
        anaf_entry(2000031, "FIRMA RADIATA DEMO SRL", state="RADIERE din data 10.03.2022", inactive=True),
        anaf_entry(2000066, "DESTINATAR DEMO SRL"),
        anaf_entry(2000074, "DRUM CONSTRUCT DEMO SRL"),
        anaf_entry(2000082, "DRUM CONSTRUCT DEMO SRL"),
    ]
    asked = sorted([e["date_generale"]["cui"] for e in found] + [2000015, 2000058])
    archive_batch(a, asked, date(2026, 11, 1), anaf_response(found, [2000015, 2000058]), at(2026, 11, 1, 8))

    OVERRIDES.write_text('''# Fictional overrides for the seam 1 / pytest identity fixture (never the shipped file).

[[override]]
reason = "Fictional: the winner of DA93000012 is published without a CUI; the notice names this association."
name = "ASOCIEREA PENTRU PODUL EXEMPLU"
key = "consortium-podul-exemplu"
display_name = "Asocierea pentru Podul Exemplu"

[[override]]
reason = "Fictional: the CUI published on DA93000013 is a typo for Destinatar Demo's."
published_id = "2000058"
key = "2000066"
''', encoding="utf-8")


if __name__ == "__main__":
    build()
    print(f"wrote {OUT} and {OVERRIDES}")
