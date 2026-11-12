"""Legacy `.xls` (BIFF) files, read like the `.xlsx` ones: the same header mapping and the same Excel-typed-cell rendering.
The files are built here with xlwt (a dev dependency), small and invented. Real 2021-2023 exports have a title row above
the header (2023) and spill over several sheets of at most 65 536 rows, each repeating the header."""
from datetime import datetime, time

import pytest
import xlwt

from pipeline.bulk import InvalidFile, parse_file

H25 = ["Autoritate contractanta", "CUI autoritate contractanta", "Numar anunt initiere", "Data publicare", "Numar anunt atribuire", "Data publicare",
       "Numar contract", "Valoare contract (RON)", "Ofertant castigator", "CUI ofertant castigator"]


def style(fmt):
    return xlwt.easyxf(num_format_str=fmt)


def contract_row(notice, number, fmt="General", value=5, cui=2000001):
    return ["AC", 1000001, "CN1", (datetime(2021, 1, 1), "dd/mm/yyyy"), notice, (datetime(2025, 1, 2, 13, 0, 48), "dd/mm/yyyy"), (number, fmt), value, "ALFA", cui]


def write(path, sheets, title=None):
    """sheets: a list of row lists; a cell is a value or (value, number format). Each sheet repeats the title and header."""
    wb = xlwt.Workbook()
    for i, rows in enumerate(sheets, start=1):
        ws = wb.add_sheet(f"Sheet {i}")
        out = ([[title]] if title else []) + [H25] + rows
        for r, row in enumerate(out):
            for c, cell in enumerate(row):
                value, fmt = cell if isinstance(cell, tuple) else (cell, None)
                ws.write(r, c, value, style(fmt)) if fmt else ws.write(r, c, value)
    wb.save(str(path))
    return path


def test_an_xls_loads_like_the_xlsx_with_the_same_header_mapping(tmp_path):
    path = write(tmp_path / "q.xls", [[contract_row("CAN1", "C-1", value=7.5), contract_row("CAN1", 9, value=2)]])
    records = {r.code: r for r in parse_file("contracte", "2025Q1", path)}
    assert set(records) == {"CAN1~C-1", "CAN1~9"}
    assert records["CAN1~C-1"].value_bani == 750 and records["CAN1~C-1"].winners[0].cui == "2000001"


def test_title_row_and_several_sheets_are_one_file(tmp_path):
    path = write(tmp_path / "q.xls", [[contract_row("CAN1", "A")], [contract_row("CAN2", "B")], [contract_row("CAN3", "C")]], title="Raport Contracte publicate")
    assert {r.code for r in parse_file("contracte", "2023Q1", path)} == {"CAN1~A", "CAN2~B", "CAN3~C"}


def test_a_later_sheet_with_another_header_is_invalid(tmp_path):
    path = tmp_path / "q.xls"
    wb = xlwt.Workbook()
    for name, header in [("a", H25), ("b", ["x"] + H25[1:])]:
        ws = wb.add_sheet(name)
        for c, h in enumerate(header):
            ws.write(0, c, h)
        for c, v in enumerate(contract_row("CAN1", "A")):
            ws.write(1, c, v[0] if isinstance(v, tuple) else v)
    wb.save(str(path))
    with pytest.raises(InvalidFile, match="sheet 2"):
        parse_file("contracte", "2025Q1", path)


def test_contract_numbers_excel_typed_in_an_xls_keep_the_published_code(tmp_path):
    numbers = [(datetime(8858, 1, 1), "mmm-yy"), (datetime(6006, 5, 21), "mm-dd-yy"), (datetime(2025, 3, 4), "d-mmm"),
               (time(7, 30), "h:mm"), (222.1, "General"), (9, "General")]
    rows = [contract_row("CAN7", n, fmt) for n, fmt in numbers]
    rows.append(contract_row("CAN7", 1.90473619050271e+34, "#,##0"))
    codes = {r.code: r for r in parse_file("contracte", "2025Q1", write(tmp_path / "q.xls", [rows]))}
    assert set(codes) - {"CAN7~1.90473619050271e+34"} == {"CAN7~1/8858", "CAN7~5/21/6006", "CAN7~3/4", "CAN7~7:30", "CAN7~222.1", "CAN7~9"}
    assert "contract_number:excel_typed" in codes["CAN7~1/8858"].notes and "contract_number:excel_typed" in codes["CAN7~7:30"].notes
    assert "contract_number:excel_mangled" in codes["CAN7~1.90473619050271e+34"].notes
    assert not [n for n in codes["CAN7~9"].notes if n.startswith("contract_number")]


def test_a_row_wider_than_the_header_is_invalid(tmp_path):
    path = write(tmp_path / "q.xls", [[contract_row("CAN1", "A") + ["stray"]]])
    with pytest.raises(InvalidFile, match="header has 10"):
        parse_file("contracte", "2025Q1", path)


def test_garbage_named_xls_is_invalid(tmp_path):
    f = tmp_path / "a.xls"
    f.write_bytes(b"not a workbook")
    with pytest.raises(InvalidFile, match="not a readable XLS"):
        parse_file("contracte", "2025Q1", f)


# The header rows of the real `.xls` exports (names only, no data), checked read-only on the 2023 files.
REAL_HEADERS = {
    "contracte 2022Q4": ("Catigator|CUI castigator|Tara castigator|Localitate castigator|Adresa castigator|Tip anunt|Tip contract|Tip procedura|"
        "Autoritate contractanta|CUI autoritate conractanta|Tip autoritate contractanta|Tip activitate autoritate contractanta|Numar anunt atribuire|"
        "Data anunt atribuire|Tip incheiere contract|Modalitate contractare|Tip criteriu de atribuire|Cu licitatie electronica?|Numar oferte|"
        "Cu subcontractare?|Numar contract|Data contract|Denumire contract|Valoare contract (RON)|Cod CPV|Numar anunt participare|"
        "Data anunt participare|Valoare estimata|Moneda|Cu fonduri comunitare?|Tip finantare|Tip legislatie|Fond european|Depozite si garantii|"
        "Modalitate finantare"),
    "contracte 2023Q1": ("Autoritate contractanta|CUI autoritate contractanta|Tip autoritate contractanta|Tip activitate autoritate contractanta|"
        "Tip anunt|Tip procedura|Tip legislatie|Tip inchiere contract|Tip contract|Modalitate de desfasurare|Cu licitatie electronica?|"
        "Tip criteriu de atribuire|Cod CPV|Denumire CPV|Numar anunt initiere|Data anunt initiere|Numar lot|Numar anunt atribuire|"
        "Data anunt atribuire|Data contract|Numar contract|Incheiat prin|Valoare atribuita (RON)|Ofertant castigator|CUI ofertant castigator|"
        "Oras ofertant|Tara ofertant"),
    "da 2023Q1": ("Autoritate contractanta|CUI autoritate contractanta|Numar achizite|Data publicare|Denumire achizitie|COD CPV|Denumire CPV|"
        "Tip contract|Finantare prin fonduri comunitare?|Denumire program/ proiect|Data finalizare|Valoare achizitie (RON)|Ofertant castigator|"
        "CUI ofertant castigator|Tara ofertant castigator|Oras ofertant castigator"),
    "dan 2023Q1": ("Autoritate contractanta|CUI autoritate contractanta|Numar notificare|Data publicare|Obiectul achizitiei|Cod CPV|Denumire CPV|"
        "Tip contract|Modalitate de desfasurare|Valoare achizitie (RON)|Finantare prin fonduri comunitare?|Tip de proiect/ program|Data finalizare|"
        "Ofertant|CUI ofertant"),
    "fara-anunt 2023Q1": ("Autoritate contractanta|CUI autoritate contractanta|Tip autoritate contractanta|Tip activitate contractanta|Tip anunt|"
        "Tip procedura|Numar anunt atribuire|Data publicare|Tip legislatie|Incheiat prin|Tip contract|Criteriul de atribuire|Cod CPV|Denumire CPV|"
        "Data contract|Numar contract|Denumire contract|Valoare atribuita (RON)|Ofertant castigator|CUI ofertant|Oras ofertant castigator|"
        "Tara ofertant castigator"),
}


@pytest.mark.parametrize("name", REAL_HEADERS)
def test_the_real_xls_header_eras_resolve(name):
    from pipeline.bulk.headers import CONTRACTE, DA, DAN, FARA_ANUNT, resolve

    kind, unit = name.split()
    table = {"contracte": CONTRACTE, "da": DA, "dan": DAN, "fara-anunt": FARA_ANUNT}[kind]
    columns = resolve(table, kind, unit, REAL_HEADERS[name].split("|"))
    assert {"authority_cui", "value", "supplier_cui"} <= set(columns)


def test_requeue_moves_quarantined_units_back_so_a_rebuild_reads_them_again(tmp_path):
    from datetime import timezone

    from pipeline.archive import Archive
    from pipeline.cli import main

    archive = Archive(tmp_path / "a")
    data = write(tmp_path / "q.xls", [[contract_row("CAN1", "A")]]).read_bytes()
    for quarter in ("2023Q1", "2023Q2"):
        archive.write_unit(source="seap", stream="bulk", kind="contracte", unit=quarter, fetched_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                           files={f"{quarter}.xls": data + quarter.encode()}, via="t", url="https://x/")
    [unit, other] = archive.units()
    archive.quarantine(unit, "unsupported file format .xls", ["a.xls: only .csv and .xlsx are read"])
    archive.quarantine(other, "headers do not match a CONTRACT file")
    assert main(["--archive", str(archive.root), "requeue", "--match", "unsupported file format"]) == 0
    assert [u.unit for u in archive.units()] == [unit.unit]
    assert len(archive.quarantined()) == 1
    assert main(["--archive", str(archive.root), "requeue"]) == 0 and len(archive.units()) == 2 and not archive.quarantined()
