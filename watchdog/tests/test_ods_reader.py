"""`.ods` (OpenDocument, 2026 Q2 files) is read like the `.xlsx`: streamed, typed cells, the same header mapping (#64c)."""
from datetime import datetime

import pytest

from ods_builder import write_ods
from pipeline.bulk import InvalidFile, parse_file
from pipeline.bulk.readers import read_file

H = ["Autoritate contractanta", "CUI autoritate contractanta", "Tip anunt", "Tip procedura", "Numar anunt atribuire", "Data publicare", "Tip legislatie",
     "Incheiat prin", "Tip contract", "Criteriu de atribuire", "Cod CPV", "Denumire CPV", "Data contract", "Numar contract", "Denumire contract",
     "Valoare atribuita (RON)", "Ofertant castigator ", "CUI ofertant castigator"]


def row(notice, number, value=8252.59):
    return ["Jandarmi Sibiu", 4240995, "Anunt de atribuire", "Negociere", notice, datetime(2026, 4, 1, 8, 22, 29), "Legea 98", "Fara acord cadru", "Furnizare", "Pretul",
            "09310000-5", "Electricitate", datetime(2026, 3, 5), number, "Contract\nsubsecvent", value, "ELECTRICA", "RO 28909028"]


def test_an_ods_loads_like_an_xlsx_with_typed_cells_and_trailing_blanks_ignored(tmp_path):
    path = write_ods(tmp_path / "q.ods", [[H, row("CAN1", 4061240), row("CAN2", "A-7")]])
    records = {r.code: r for r in parse_file("fara-anunt", "2026Q2", path)}
    assert set(records) == {"CAN1", "CAN2"}
    one = records["CAN1"]
    assert one.value_bani == 825259 and one.winners[0].cui == "RO 28909028" and one.published_on.isoformat() == "2026-04-01"
    assert one.contract_numbers == ("4061240",) and one.title == "Contract\nsubsecvent"


def test_the_header_and_rows_come_back_trimmed_of_the_repeated_empty_cells(tmp_path):
    header, rows = read_file(write_ods(tmp_path / "q.ods", [[H, row("CAN1", "A")]]))
    assert header == [h.strip() for h in H]
    assert [n for n, _ in rows] == [2]


def test_a_title_row_and_several_sheets_are_one_file(tmp_path):
    path = write_ods(tmp_path / "q.ods", [[["Raport"], H, row("CAN1", "A")], [["Raport"], H, row("CAN2", "B")]])
    assert {r.code for r in parse_file("fara-anunt", "2026Q2", path)} == {"CAN1", "CAN2"}


def test_a_later_sheet_with_another_header_is_invalid(tmp_path):
    path = write_ods(tmp_path / "q.ods", [[H, row("CAN1", "A")], [["x"] + H[1:], row("CAN2", "B")]])
    with pytest.raises(InvalidFile, match="sheet 2"):
        parse_file("fara-anunt", "2026Q2", path)


def test_a_file_that_is_not_an_ods_is_invalid(tmp_path):
    path = tmp_path / "q.ods"
    path.write_bytes(b"nope")
    with pytest.raises(InvalidFile, match="not a readable ODS"):
        parse_file("fara-anunt", "2026Q2", path)
