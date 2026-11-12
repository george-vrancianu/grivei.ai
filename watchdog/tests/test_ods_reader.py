"""`.ods` (OpenDocument, 2026 Q2 files) is read like the `.xlsx`: streamed, typed cells, the same header mapping (#64c)."""
from datetime import datetime

import pytest

from ods_builder import row_xml, write_ods, write_ods_raw
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


def test_rows_inside_header_rows_and_row_groups_are_read(tmp_path):
    body = ("<table:table-header-rows>" + row_xml(H) + "</table:table-header-rows>"
            "<table:table-row-group>" + row_xml(row("CAN1", "A")) + "<table:table-row-group>" + row_xml(row("CAN2", "B"))
            + "</table:table-row-group></table:table-row-group>" + row_xml(row("CAN3", "C")))
    records = {r.code for r in parse_file("fara-anunt", "2026Q2", write_ods_raw(tmp_path / "q.ods", body))}
    assert records == {"CAN1", "CAN2", "CAN3"}


@pytest.mark.parametrize(
    "bad_cell",
    [
        '<table:table-cell office:value-type="float"><text:p>1</text:p></table:table-cell>',  # no office:value
        '<table:table-cell office:value-type="time" office:time-value="P1DT02H00M00S"><text:p>x</text:p></table:table-cell>',  # a day part
    ],
    ids=["float-without-value", "time-with-days"],
)
def test_a_cell_the_reader_cannot_take_makes_the_file_invalid_not_a_crash(tmp_path, bad_cell):
    body = row_xml(H) + "<table:table-row>" + bad_cell + "</table:table-row>"
    with pytest.raises(InvalidFile, match="not a readable ODS"):
        parse_file("fara-anunt", "2026Q2", write_ods_raw(tmp_path / "q.ods", body))
