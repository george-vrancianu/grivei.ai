"""Contracte and "fara anunt de initiere" files (ticket #64): contract identity, lots, winners and value, header eras,
the quirks of the real files, quarantine. Against the committed fixture archive `fixtures/archive-contracts/`.
No network and no database: precedence across files is in test_bulk_loader_db.py (it lives in SQL)."""
import shutil
from datetime import date
from pathlib import Path

import pytest

from pipeline.archive import Archive
from pipeline.bulk import InvalidFile, parse_file
from pipeline.bulk.headers import CONTRACTE, FARA_ANUNT, resolve
from pipeline.bulk.readers import split_pipe_row
from pipeline.bulk.records import ContractRow, contract_code, contract_value
from pipeline.rebuild import plan

FIXTURE = Path(__file__).parent / "fixtures" / "archive-contracts"
H22 = ("|DENUMIRE_AC|,|CUI_AC|,|COD_NUTS|,|DENUMIRE_NUTS|,|TIP_PROCEDURA|,|INCHEIAT_PRIN|,|MODALITATE_DESFASURARE|,|NUMAR_ANUNT_INITIERE|,"
       "|DATA_ANUNT_INITIERE|,|NUMAR_ANUNT_ATRIBUIRE|,|DATA_ANUNT_ATRIBUIRE|,|NUMAR_LOT|,|NUMAR_CONTRACT|,|DENUMIRE_CONTRACT|,|DATA_CONTRACT|,"
       "|VALOARE_ESTIMATA_RON|,|VALOARE_CONTRACT_RON|,|OFERTANT|,|CUI_OFERTANT|\n")


def line22(notice="CAN1", published="01/05/2022", lot="1", number="C1", title="t", value="100", supplier="ALFA", cui="2000001"):
    return (f"|AC|,|1000001|,|RO1|,|Cluj|,|Licitatie deschisa|,|Fara acord cadru|,|Online|,|CN1|,|09/20/2021|,|{notice}|,|{published}|,"
            f"|{lot}|,|{number}|,|{title}|,|12/27/2021|,{value},{value},|{supplier}|,| {cui}|\n")


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)  # a plan quarantines by moving: never touch the checked-in archive
    return Archive(root)


@pytest.fixture
def planned(archive):
    p = plan(archive)
    by_file = {}
    for unit, _, rows in p.files:
        by_file.setdefault((unit.kind, unit.unit, unit.fetched_at.date().isoformat()), {}).update({r.code: r for r in rows})
    return p, by_file


def first_file(by_file, kind, unit, day=None):
    key = next(k for k in by_file if k[:2] == (kind, unit) and (day is None or k[2] == day))
    return by_file[key]


def parse_text(tmp_path, text, kind="contracte", unit="2022Q1", name="x.csv"):
    f = tmp_path / name
    f.write_text(text, encoding="utf-8")
    return parse_file(kind, unit, f)


# ---- identity: rows of one contract collapse into one Record -------------------------------------------------------------


def test_a_contract_is_one_record_however_many_lot_and_winner_rows_it_has(planned):
    _, by_file = planned
    q1 = first_file(by_file, "contracte", "2022Q1", "2022-06-15")
    # CAN9000001 / C-100: 3 lots x winners = 4 distinct rows plus an exact duplicate, all one Record
    assert sorted(q1) == ["CAN9000001~C-100", "CAN9000002~77/2022", "CAN9000003~5"]
    r = q1["CAN9000001~C-100"]
    assert (r.kind, r.notice_code, r.contract_numbers, r.lot_count) == ("CONTRACT", "CAN9000001", ("C-100",), 3)


def test_the_code_is_the_notice_code_and_the_contract_number(planned):
    _, by_file = planned
    assert contract_code("CAN1069731", "54202") == "CAN1069731~54202"
    x25 = first_file(by_file, "contracte", "2025Q1")
    assert "CAN9000010~1398514/1" in x25  # a number holding `/` is kept as published
    assert "CAN9000011~A 7" in x25
    assert all(c.startswith("CAN") and "~" in c for c in x25)


def test_a_contract_number_keeps_its_text_but_runs_of_blanks_collapse(tmp_path):
    [r] = parse_text(tmp_path, H22 + line22(number="  A   7 /b "))
    assert r.code == "CAN1~A 7 /b"
    [r] = parse_text(tmp_path, H22 + line22(number=""))
    assert r.code == "CAN1~" and "contract_number:missing" in r.notes


def test_the_same_contract_number_under_two_notices_is_two_contracts(tmp_path):
    records = parse_text(tmp_path, H22 + line22(notice="CAN1", number="5") + line22(notice="CAN2", number="5"))
    assert sorted(r.code for r in records) == ["CAN1~5", "CAN2~5"]


def test_older_rows_of_a_contract_in_the_same_file_are_a_superseded_version(tmp_path):
    text = H22 + line22(published="03/10/2022", value="999", supplier="OLD") + line22(published="05/20/2022", value="150", supplier="NEW", cui="2000009")
    [r] = parse_text(tmp_path, text)
    assert (r.published_on, r.value_bani, [w.name for w in r.winners]) == (date(2022, 5, 20), 15000, ["NEW"])


# ---- value: once when the lots agree, summed when they differ ------------------------------------------------------------


def row(lot, value, supplier="A"):
    return ContractRow("CAN1", date(2022, 1, 1), None, "AC", "1", "", "", "", "", "5", lot, "", "", "", value, supplier, None, ())


def test_equal_lot_values_count_once(planned):
    _, by_file = planned
    r = first_file(by_file, "contracte", "2022Q1", "2022-06-15")["CAN9000001~C-100"]
    assert r.value_bani == 100000  # 3 lots of 1,000 RON, the value repeated on every lot row and on the second winner
    assert contract_value([row("1", 100), row("2", 100), row("3", 100), row("1", 100, "B")]) == (100, False)


def test_different_lot_values_sum_over_the_lots(planned):
    _, by_file = planned
    r = first_file(by_file, "contracte", "2022Q1", "2022-06-15")["CAN9000002~77/2022"]
    assert r.value_bani == 120025  # 500 + 700.25 RON
    assert contract_value([row("1", 50000), row("2", 70025), row("2", 70025, "B")]) == (120025, False)


def test_value_edge_cases():
    assert contract_value([row("1", None), row("2", None)]) == (None, False)  # no value in SEAP
    assert contract_value([row("1", None), row("2", 100)]) == (100, False)  # a lot without a value adds nothing
    assert contract_value([row("", 100), row("", 100)]) == (100, False)  # no lot numbers: rows are lots of their own, equal -> once
    assert contract_value([row("", 100), row("", 250)]) == (350, False)  # ... and different -> summed
    assert contract_value([row("1", 100), row("1", 300)]) == (100, True)  # one lot, two values: the first is kept and the file says so


def test_a_row_with_no_value_is_no_value_and_a_foreign_supplier_is_kept(planned):
    _, by_file = planned
    d21 = first_file(by_file, "contracte", "2021Q3")
    assert d21["CAN9000020~36181"].value_bani is None
    assert d21["CAN9000020~36181"].title == "Lot 1 – Furtunuri\npt. autospeciale"  # a multi-line quoted title
    assert d21["CAN9000021~43"].value_bani == 8447900 and d21["CAN9000021~43"].winners[0].cui == "2461490647"


# ---- winners in their published order ------------------------------------------------------------------------------------


def test_winners_keep_the_order_of_the_file(planned):
    _, by_file = planned
    q1 = first_file(by_file, "contracte", "2022Q1", "2022-06-15")
    assert [w.name for w in q1["CAN9000002~77/2022"].winners] == ["BETA CHIMIE SRL", "ALFA CHIMIE SRL"]  # not alphabetical
    assert [(w.name, w.cui) for w in q1["CAN9000001~C-100"].winners] == [("ALFA MOBILA SRL", "2000001"), ("GAMMA LEMN SRL", "2000003")]
    fa = first_file(by_file, "fara-anunt", "2025Q1")
    assert [w.name for w in fa["CAN9100002"].winners] == ["CENTRUL TOPMED DEMO", "ASOCIEREA DEMO"]
    assert q1["CAN9000002~77/2022"].supplier_name == "BETA CHIMIE SRL"  # the Record's own supplier columns are the first winner


# ---- award notices: identified by their code -----------------------------------------------------------------------------


def test_an_award_notice_is_identified_by_its_code_and_its_contracts_add_up(planned):
    _, by_file = planned
    fa = first_file(by_file, "fara-anunt", "2025Q1")
    assert sorted(fa) == ["CAN9100001", "CAN9100002"]
    n1, n2 = fa["CAN9100001"], fa["CAN9100002"]
    assert (n1.kind, n1.channel if hasattr(n1, "channel") else None) == ("AWARD_NOTICE", None)
    assert n1.contract_numbers == ("1398423", "1398514/1") and n1.value_bani == 3519212 + 28846  # two contracts: values add
    assert n2.contract_numbers == ("77",) and n2.value_bani == 9880000  # one contract, two winners, the value repeated: once
    assert n1.published_on == date(2025, 1, 3) and n1.award_date == date(2024, 11, 11)


# ---- headers: eras, a repeated column name, quarantine -------------------------------------------------------------------


def test_the_2025_header_has_two_publication_dates_told_apart_by_position(planned):
    _, by_file = planned
    x25 = first_file(by_file, "contracte", "2025Q1")["CAN9000010~21"]
    assert x25.published_on == date(2025, 1, 2)  # the award notice's `Data publicare`, not the initiation notice's (2024-10-12)
    assert x25.initiation_code == "CN9900010" and x25.award_date == date(2025, 1, 10)  # the contract date
    header = [c for c in CONTRACTE.era_for("2025Q1").columns["notice_code"]]
    assert header == ["Numar anunt atribuire"]
    cols = resolve(CONTRACTE, "CONTRACT", "2025Q1", ["Tip anunt", "Data publicare", "Numar anunt atribuire", "Data publicare"] + [
        "Autoritate contractanta", "CUI autoritate contractanta", "Numar contract", "Valoare contract (RON)", "Ofertant castigator", "CUI ofertant castigator"])
    assert cols[1] is None and cols[3] == "published_on"


def test_each_real_header_era_is_known():
    real_2021 = ("CASTIGATOR,CASTIGATOR_CUI,CASTIGATOR_TARA,CASTIGAOR_LOCALITATE,CASTIGATOR_ADRESA,TIP_ANUNT,TIP_CONTRACT,TIP_PROCEDURA,"
                 "AUTORITATE_CONTRACTANTA,AUTORITATE_CONTRACTANTA_CUI,TIP_AUTORITATE,TIP__ACTIVITATE_AUTORITATE,NUMAR_ANUNT_ATRIBUIRE,"
                 "DATA_ANUNT_ATRIBUIRE,TIP_INCHEIERE_CONTRACT,MODALITATE_CONTRACTARE,TIP_CRITERII_ATRIBUIRE,CU_LICITATIE_ELECTRONICA,NUMAR_OFERTE,"
                 "SUBCONTRACTAT,NUMAR_CONTRACT,DATA_CONTRACT,TITLU_CONTRACT,VALOARE_CONTRACT_RON,CPV_CODE_ID,CPV_CODE,NUMAR_ANUNT_PARTICIPARE,"
                 "DATA_ANUNT_PARTICIPARE,VALOARE_ESTIMATA_PARTICIPARE,MONEDA_VALOARE_ESTIMATA,FONDURI_COMUNITARE,TIP_FINANTARE,TIP_LESIGLATIE,"
                 "FOND_EUROPEAN,DEPOZITE_GARANTII,MODALITATI_FINANTARE").split(",")
    cols = resolve(CONTRACTE, "CONTRACT", "2021Q4", real_2021)
    assert {"notice_code", "contract_number", "value", "supplier_cui", "concluded_by"} <= set(cols)
    cols = resolve(CONTRACTE, "CONTRACT", "2022Q1", split_pipe_row(H22.strip()))
    assert cols.count("lot") == 1 and "initiation_code" in cols and cols[cols.index("value")] == "value"
    fa = ["Autoritate contractanta", "CUI autoritate contractanta", "Tip anunt", "Tip procedura", "Numar anunt atribuire", "Data publicare",
          "Tip legislatie", "Incheiat prin", "Tip contract", "Criteriu de atribuire", "Cod CPV", "Denumire CPV", "Data contract",
          "Numar contract", "Denumire contract", "Valoare atribuita (RON)", "Ofertant castigator ", "CUI ofertant castigator"]
    assert "published_on" in resolve(FARA_ANUNT, "AWARD_NOTICE", "2025Q2", fa)


def test_a_contract_file_with_unknown_headers_is_quarantined_and_loads_nothing(planned, archive):
    p, by_file = planned
    assert not any("CAN9000099" in codes for codes in by_file.values())
    [q] = p.summary.quarantined
    assert q == archive.root / "quarantine/seap/bulk/contracte/2023Q1/2023-06-15"
    assert "headers do not match a CONTRACT file" in (q / "reason.json").read_text()


def test_a_contract_file_of_the_wrong_kind_is_invalid(archive):
    [u] = [u for u in archive.units() if u.kind == "contracte" and u.unit == "2021Q3"]
    with pytest.raises(InvalidFile, match="headers do not match a AWARD_NOTICE file"):
        parse_file("fara-anunt", "2021Q3", u.file_path(u.files[0]))


def test_a_bad_row_rejects_the_whole_contract_file(tmp_path):
    for bad in (line22(published="13/45/2022"), line22(value="12.3.4"), line22(notice="")):
        with pytest.raises(InvalidFile, match="line"):
            parse_text(tmp_path, H22 + line22() + bad)


# ---- quirks of the real files, each with a fixture ------------------------------------------------------------------------


def test_quirk_a_pipe_field_spanning_lines_is_one_field(tmp_path):
    # a real title spans 60 lines, mostly blank, holds commas, and here begins with `,,` (which fakes a field boundary)
    title = ",,Modernizare drumuri, sat X,\n\n\nDrum local strada Y; si\nDC 155"
    text = H22 + line22(number="1").replace("|t|", "|" + title + "|") + line22(number="2")
    [a, b] = parse_text(tmp_path, text)
    assert a.title == title and a.value_bani == 10000 and a.code == "CAN1~1"
    assert b.code == "CAN1~2"


def test_quirk_a_repeated_header_line_is_skipped(tmp_path):
    [r] = parse_text(tmp_path, H22 + line22() + H22.strip() + "\n")
    assert r.code == "CAN1~C1"


def test_quirk_numeric_bare_fields_when_a_line_was_joined():
    line = "|a|,|1|,|b,\nc|,12.5,,|d|"
    assert split_pipe_row(line, 6, numeric_bare=True) == ["a", "1", "b,\nc", "12.5", "", "d"]
    with pytest.raises(ValueError):
        split_pipe_row("|a|,|,,x,\ny|,|d|", 4, numeric_bare=True)


def test_quirk_numeric_cuis_dates_and_mangled_cuis_in_the_xlsx(planned):
    _, by_file = planned
    x25 = first_file(by_file, "contracte", "2025Q1")
    assert x25["CAN9000010~21"].authority_cui == "4267117" and x25["CAN9000010~21"].winners[0].cui == "18165761"
    assert x25["CAN9000010~133"].winners[0].cui == "18165761"  # text `RO 18165761`
    assert x25["CAN9000010~133"].value_bani == 62183650  # a float cell 621836.5 RON
    assert x25["CAN9000011~A 7"].winners[0].cui is None and "supplier_cui:scientific_notation" in x25["CAN9000011~A 7"].notes


def test_framework_columns_are_kept_for_the_counting_rule(planned):
    _, by_file = planned
    x25 = first_file(by_file, "contracte", "2025Q1")
    assert x25["CAN9000010~21"].concluded_by == "Cu acord cadru"
    assert x25["CAN9000010~133"].concluded_by == "Cu acord cadru subsecvent"
    assert x25["CAN9000010~133"].notice_code == "CAN9000010"  # the notice a subsequent contract links to its framework by
    assert first_file(by_file, "fara-anunt", "2025Q1")["CAN9100001"].procedure == "Norme proprii (Anexa 2B)"


def test_the_title_falls_back_to_the_cpv_description_then_the_notice_code(planned, tmp_path):
    _, by_file = planned
    assert first_file(by_file, "contracte", "2025Q1")["CAN9000011~A 7"].title.startswith("Servicii de reparare")  # the 2025 Contracte have no title
    text = H22.replace("|DENUMIRE_CONTRACT|,", "") + "|AC|,|1|,|R|,|C|,|P|,|F|,|O|,|CN1|,|09/20/2021|,|CAN5|,|01/05/2022|,|1|,|9|,|12/27/2021|,1,1,|A|,|2|\n"
    [r] = parse_text(tmp_path, text)
    assert r.title == "CAN5"


# ---- Excel-typed contract numbers (review 1) -----------------------------------------------------------------------------


def test_contract_numbers_excel_turned_into_dates_floats_and_times_keep_the_published_code(tmp_path):
    from datetime import datetime, time

    from openpyxl import Workbook

    # an earlier quarter's CSV: the published texts
    csv = H22 + "".join(line22("CAN7", number=n, value=str(i)) for i, n in enumerate(["1/8858", "5/21/6006", "3/4", "5/2000", "7:30", "222.10", "9"], 1))
    csv_codes = {r.code: r for r in parse_text(tmp_path, csv)}
    assert set(csv_codes) == {f"CAN7~{n}" for n in ["1/8858", "5/21/6006", "3/4", "5/2000", "7:30", "222.10", "9"]}

    wb = Workbook()
    ws = wb.active
    ws.append(["Autoritate contractanta", "CUI autoritate contractanta", "Numar anunt initiere", "Data publicare", "Numar anunt atribuire", "Data publicare",
               "Numar contract", "Valoare contract (RON)", "Ofertant castigator", "CUI ofertant castigator"])
    for number, fmt in [(datetime(8858, 1, 1), "mmm-yy"), (datetime(6006, 5, 21), "mm-dd-yy"), (datetime(2025, 3, 4), "d-mmm"),
                        (datetime(2000, 5, 1), "mmm-yy"), (time(7, 30), "h:mm"), (222.1, "General"), (9, "General")]:
        ws.append(["AC", 1000001, "CN1", datetime(2021, 1, 1), "CAN7", datetime(2025, 1, 2, 13, 0, 48), number, 5, "ALFA", 2000001])
        ws.cell(ws.max_row, 7).number_format = fmt
    ws.append(["AC", 1000001, "CN1", datetime(2021, 1, 1), "CAN7", datetime(2025, 1, 2), 1.90473619050271e+34, 5, "ALFA", 2000001])
    ws.cell(ws.max_row, 7).number_format = "#,##0"
    path = tmp_path / "q.xlsx"
    wb.save(path)
    codes = {r.code: r for r in parse_file("contracte", "2025Q1", path)}
    assert set(codes) - {"CAN7~1.90473619050271e+34"} == {"CAN7~1/8858", "CAN7~5/21/6006", "CAN7~3/4", "CAN7~5/2000", "CAN7~7:30", "CAN7~222.1", "CAN7~9"}
    assert not any("00:00:00" in c or " " in c for c in codes)
    assert "contract_number:excel_typed" in codes["CAN7~1/8858"].notes and "contract_number:excel_typed" in codes["CAN7~7:30"].notes
    assert "contract_number:excel_mangled" in codes["CAN7~1.90473619050271e+34"].notes
    assert not [n for n in codes["CAN7~9"].notes if n.startswith("contract_number")]
    # the typed contracts are the same Records the CSV quarter published (222.10 -> 222.1 is the one known gap)
    assert (set(codes) & set(csv_codes)) == {f"CAN7~{n}" for n in ["1/8858", "5/21/6006", "3/4", "5/2000", "7:30", "9"]}
