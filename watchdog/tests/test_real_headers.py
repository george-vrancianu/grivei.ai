"""Every header variant seen in the real archive (#64c) loads: a few real rows per variant, in the file format they came in
(`tests/fixtures/real_headers/`: CSV as they are; the spreadsheet variants as JSON, written here to `.xls`, `.xlsx` or `.ods`).
Names and numbers are as published (misspellings included), except that natural persons (winners without a CUI, family
enterprises named after a person) are replaced by `PERSOANA FIZICA <letter>`: no personal name is kept in the repository."""
import json
from datetime import datetime
from pathlib import Path

import pytest
import xlwt
from openpyxl import Workbook

from ods_builder import write_ods
from pipeline.bulk import InvalidFile, SetAside, parse_file, parse_file_stats

FIXTURES = Path(__file__).parent / "fixtures" / "real_headers"
VARIANTS = sorted(p.stem for p in FIXTURES.iterdir())  # `<kind>-<yyyy>q<n>-<format>`; the kind may hold a dash (fara-anunt)


def split(name: str) -> tuple[str, str, str]:
    kind, quarter, *rest = name.replace("fara-anunt", "faraanunt").split("-")
    return kind.replace("faraanunt", "fara-anunt"), quarter[:4].upper() + quarter[4:].upper(), rest[-1]


def cells(raw):
    return [datetime.fromisoformat(c["date"]) if isinstance(c, dict) else c for c in raw]


def materialize(name: str, tmp_path: Path) -> Path:
    kind, quarter, fmt = split(name)
    source = next(FIXTURES.glob(f"{name}.*"))
    if source.suffix == ".csv":
        target = tmp_path / source.name
        target.write_bytes(source.read_bytes())
        return target
    data = json.loads(source.read_text(encoding="utf-8"))
    rows = [data["header"]] + [cells(r) for r in data["rows"]]
    target = tmp_path / f"{name}.{fmt}"
    if fmt == "ods":
        return write_ods(target, [rows])
    if fmt == "xlsx":
        wb = Workbook()
        for row in rows:
            wb.active.append(row)
        wb.save(target)
        return target
    wb = xlwt.Workbook()
    sheet = wb.add_sheet("Sheet1")
    for r, row in enumerate(rows):
        for c, v in enumerate(row):
            if v is None:
                continue
            sheet.write(r, c, v, xlwt.easyxf(num_format_str="yyyy-mm-dd hh:mm:ss")) if isinstance(v, datetime) else sheet.write(r, c, v)
    wb.save(str(target))
    return target


@pytest.mark.parametrize("name", VARIANTS)
def test_the_real_header_variant_loads(name, tmp_path):
    kind, quarter, _ = split(name)
    records = parse_file(kind, quarter, materialize(name, tmp_path))
    assert records
    for r in records:
        assert r.authority_name and r.authority_cui and r.code and r.published_on.year >= 2021
        assert r.value_bani is None or r.value_bani >= 0
        assert r.supplier_name or r.supplier_cui


def test_all_kinds_and_formats_are_covered():
    seen = {split(n)[0] for n in VARIANTS}, {split(n)[2] for n in VARIANTS}
    assert seen == ({"da", "dan", "contracte", "fara-anunt"}, {"xls", "xlsx", "ods", "csv"})


def only(records, code):
    [r] = [r for r in records if r.code == code]
    return r


def test_the_two_data_publicare_of_a_2024_contracte_are_told_apart(tmp_path):
    r = only(parse_file("contracte", "2024Q1", materialize("contracte-2024q1-csv", tmp_path)), "CAN1063800~2029")
    assert r.published_on.isoformat() == "2024-03-25" and r.initiation_code == "CN1027691" and r.concluded_by == "Cu acord cadru subsecvent"
    assert r.value_bani == 12312600 and r.winners[0].cui == "RO 9693687" and r.awarded_on.isoformat() == "2022-01-20"


def test_a_2025_q4_file_with_a_second_header_row_of_technical_names_skips_it(tmp_path):
    records = parse_file("contracte", "2025Q4", materialize("contracte-2025q4-xlsx", tmp_path))
    assert records and all(r.notice_code.startswith("SCNA") for r in records)


def test_2021_da_csv_dates_are_day_first(tmp_path):
    records = parse_file("da", "2021Q2", materialize("da-2021q2-csv", tmp_path))
    assert only(records, "DA27697871").published_on.isoformat() == "2021-04-01"  # 1/4/2021
    assert only(records, "DA27757512").published_on.isoformat() == "2021-04-13"
    assert only(records, "DA27757512").value_bani == 86700


def test_12_hour_clock_stamps_of_the_2023_q3_csv_are_dates(tmp_path):
    r = only(parse_file("da", "2023Q3", materialize("da-2023q3-pipe-csv", tmp_path)), "DA33571051")
    assert r.published_on.isoformat() == "2023-07-01" and r.awarded_on.isoformat() == "2023-07-03" and r.value_bani == 114000


_DA_HEAD = ("|NUMAR_ACHIZITIE_DIRECTA|,|DATA_PUBLICARE_ACHIZITIE|,|STARE_ACHIZITIE|,|DENUMIRE_AC|,|CUI_AC|,|DENUMIRE_ACHIZITIE|,|COD_CPV|,|DENUMIRE_CPV|,"
            "|DATA_ATRIBUIRE_ACHIZITIE|,|VALOARE_ESTIMATA_RON|,|VALOARE_ATRIBUITA_RON|,|OFERTANT|,|CUI_OFERTANT|\n")
_DA_ROW = "|DA30722448|,|05/30/2022|,|Oferta acceptata|,|SCOALA GIRISU|,|20272301|,|Lemne de foc|,|03413000-8|,|Lemn de foc (Rev.2)|,|05/31/2022|,18600,18600,|DOREA|,|42858310|\n"
_DA_ROW_2 = "|DA30722449|,|05/31/2022|,|Oferta acceptata|,|SCOALA GIRISU|,|20272301|,|Lemne|,|03413000-8|,|Lemn de foc (Rev.2)|,|05/31/2022|,100,100,|DOREA|,|42858310|\n"
_CONTRACTE_HEAD = ("|DENUMIRE_AC|,|CUI_AC|,|COD_NUTS|,|DENUMIRE_NUTS|,|TIP_PROCEDURA|,|INCHEIAT_PRIN|,|MODALITATE_DESFASURARE|,|NUMAR_ANUNT_INITIERE|,|DATA_ANUNT_INITIERE|,"
                   "|NUMAR_ANUNT_ATRIBUIRE|,|DATA_ANUNT_ATRIBUIRE|,|NUMAR_LOT|,|NUMAR_CONTRACT|,|DENUMIRE_CONTRACT|,|DATA_CONTRACT|,|VALOARE_ESTIMATA_RON|,|VALOARE_CONTRACT_RON|,|OFERTANT|,|CUI_OFERTANT|\n")
_CONTRACTE_ROWS = ("|UNITATEA MILITARA 02648|,|4265868|,|RO321|,|Bucuresti|,|Procedura simplificata|,|Fara acord cadru|,|Online|,|SCN1105090|,|04/14/2022|,|SCNA1070596|,|06/01/2022|,|1|,|A2-623|,|Contract de produse|,|05/27/2022|,294117,117247,|PRO HVAC SERVICES|,|40938545|\n"
                   "|Ministerul Sanatatii|,|4266456|,|RO321|,|Bucuresti|,|Licitatie deschisa|,|Cu acord cadru|,|Online|,|CN1039610|,|02/23/2022|,|CAN1079948|,|06/01/2022|,|1|,|263|,|Acord cadru transport aerian|,|05/05/2022|,2115831,255,|ALFA TURISM|,| 30394080|\n")


def test_a_da_file_that_switches_to_a_contracte_export_keeps_its_da_rows_and_sets_the_rest_aside(tmp_path):
    """The real DA 2022 Q2 file: a Contracte export (its own header line, then its rows) was pasted after the purchases. The purchases load;
    the pasted part is counted and reported, never loaded, never silently dropped."""
    path = tmp_path / "da.csv"
    path.write_text(_DA_HEAD + _DA_ROW + _DA_ROW_2 + _CONTRACTE_HEAD + _CONTRACTE_ROWS, encoding="utf-8")
    parsed = parse_file_stats("da", "2022Q2", path)
    assert [r.code for r in parsed.records] == ["DA30722448", "DA30722449"] and {r.kind for r in parsed.records} == {"DA"}
    assert parsed.rows == 2
    assert parsed.set_aside == SetAside(line=4, kind="CONTRACT", rows=2, last_published=datetime(2022, 5, 31).date())
    assert parsed.set_aside.note() == "set_aside:CONTRACT:from_line_4:2_rows"


def test_a_file_whose_own_kind_comes_back_after_the_switch_is_still_rejected(tmp_path):
    path = tmp_path / "da.csv"
    path.write_text(_DA_HEAD + _DA_ROW + _CONTRACTE_HEAD + _CONTRACTE_ROWS + _DA_ROW_2, encoding="utf-8")
    with pytest.raises(InvalidFile, match="DA rows again after the CONTRACT part that starts at line 3: the file mixes kinds"):
        parse_file("da", "2022Q2", path)
    path.write_text(_DA_HEAD + _DA_ROW + _CONTRACTE_HEAD + _CONTRACTE_ROWS + _DA_HEAD + _DA_ROW_2, encoding="utf-8")
    with pytest.raises(InvalidFile, match="the file mixes kinds"):
        parse_file("da", "2022Q2", path)


def test_another_kinds_header_before_any_row_of_the_files_own_kind_is_rejected(tmp_path):
    path = tmp_path / "da.csv"
    path.write_text(_DA_HEAD + _CONTRACTE_HEAD + _CONTRACTE_ROWS, encoding="utf-8")
    with pytest.raises(InvalidFile, match="a CONTRACT header before any DA row: the file mixes kinds"):
        parse_file("da", "2022Q2", path)


def test_a_csv_that_is_not_utf_8_is_read_as_windows_1250(tmp_path):
    """The real contracte 2023 Q4 CSV: `ţ`, `ş`, `ă` and the en dash as single cp1250 bytes (it is plain ASCII to `file`, but not UTF-8)."""
    text = (FIXTURES / "contracte-2023q4-csv.csv").read_text(encoding="utf-8")
    text = text.replace("Servicii de reparare", "Ţară şi ăsta – servicii de reparare", 1)
    path = tmp_path / "q4.csv"
    path.write_bytes(text.encode("cp1250"))
    [r, *_] = parse_file("contracte", "2023Q4", path)
    assert "Ţară şi ăsta – servicii de reparare" in r.cpv_description


def test_a_csv_that_is_neither_utf_8_nor_windows_1250_is_invalid(tmp_path):
    path = tmp_path / "q4.csv"
    path.write_bytes((FIXTURES / "contracte-2023q4-csv.csv").read_bytes() + b"\x81\x8d\n")
    with pytest.raises(InvalidFile, match="not UTF-8"):
        parse_file("contracte", "2023Q4", path)


@pytest.mark.parametrize("name", VARIANTS)
def test_the_real_header_variant_matches_its_own_era_not_the_fallback(name, tmp_path, monkeypatch):
    """`day_first` comes only from the matched era, so a file that only fits the union fallback could be read with the wrong date order."""
    from pipeline.bulk import headers

    kind, quarter, _ = split(name)
    fitted = []
    original = headers.resolve_era

    def spy(table, label, unit, header):
        columns, era = original(table, label, unit, header)
        fitted.append((era, table.era_for(unit)))
        return columns, era

    monkeypatch.setattr(headers, "resolve_era", spy)
    parse_file(kind, quarter, materialize(name, tmp_path))
    era, expected = fitted[0]  # the file's own header (later calls are for rows that might be a second header row)
    assert expected is not None and era is expected, f"{name}: fell back to the union of eras"
