"""The DA/DAN bulk loader (ticket #63): header aliases per quarter, validation and quarantine, duplicates and identity,
the two dates, and each known file quirk, against the committed fixture archive `fixtures/archive-bulk/`.
Nothing here touches the network; the database-level checks are in test_bulk_loader_db.py."""
import json
import shutil
from datetime import date
from pathlib import Path

import pytest

from datetime import datetime, timezone

from pipeline.archive import Archive
from pipeline.bulk import InvalidFile, parse_file
from pipeline.bulk.headers import DAN, DA, norm_header, resolve
from pipeline.bulk.readers import split_pipe_row
from pipeline.bulk.values import to_bani, to_date, to_tax_id
from pipeline.rebuild import plan

FIXTURE = Path(__file__).parent / "fixtures" / "archive-bulk"


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)  # a plan quarantines by moving: never touch the checked-in archive
    return Archive(root)


@pytest.fixture
def planned(archive):
    p = plan(archive)
    records = {}
    for _, _, rows in p.files:
        for r in rows:
            records[r.code] = r  # fixture codes are unique across files, or identical
    return p, records


def _file(archive, kind, unit_name):
    [u] = [u for u in archive.units() if u.kind == kind and u.unit == unit_name][:1]
    return u, u.file_path(u.files[0])


# ---- headers: renamed per quarter, unknown ones quarantined -------------------------------------------------------


def test_renamed_headers_load(planned):
    _, records = planned
    # DA 2023 Q1 uses spelled-out column names; DAN 2024 and DAN 2025 each use their own era's names
    assert {"DA91000010", "DA91000011", "DANDA"} & set(records) == {"DA91000010", "DA91000011"}
    assert records["DA91000010"].authority_name == "COMUNA EXEMPLU" and records["DA91000010"].value_bani == 90000
    assert records["DAN9100001"].title == "SERVICII VULCANIZARE" and records["DAN9100001"].supplier_cui == "8499780"
    assert records["DAN9100020"].title == "Achizitie servicii de certificare"  # 2025: `Obiectul achizitiei`


def test_a_file_with_unknown_headers_is_quarantined_and_nothing_from_it_loads(planned, archive):
    p, records = planned
    assert "DA91000099" not in records
    [q] = p.summary.quarantined
    assert q == archive.root / "quarantine/seap/bulk/da/2023Q2/2023-09-15"
    reason = json.loads((q / "reason.json").read_text())
    assert "headers do not match a DA file" in reason["reason"]
    assert any("unexpected: NUMAR, DATA, SUMA" in x for x in reason["problems"]) and any(x.startswith("missing:") for x in reason["problems"])
    assert not (archive.root / "seap/bulk/da/2023Q2").exists() or not list((archive.root / "seap/bulk/da/2023Q2").iterdir())
    assert all(u.unit != "2023Q2" for u in archive.units())  # the others are untouched


def test_a_missing_required_header_or_an_unknown_extra_one_fails_the_file(tmp_path):
    dan = "Autoritate contractanta,CUI ,Numar notificare,Data publicare,Denumire,Cod CPV,Denumire CPV,Valoare atribuita (RON),Ofertant\nA,1,DAN1,01/02/2024,t,c,d,5,O\n"
    f = tmp_path / "x.csv"
    f.write_text(dan)
    with pytest.raises(InvalidFile, match="headers do not match a DAN file") as e:
        parse_file("dan", "2024Q1", f)
    assert "missing: supplier_cui" in e.value.problems
    f.write_text(dan.replace("Ofertant", "Ofertant,CUI ofertant,Colonna noua").replace("t,c,d,5,O", "t,c,d,5,O,1,x"))
    with pytest.raises(InvalidFile) as e:
        parse_file("dan", "2024Q1", f)
    assert "unexpected: Colonna noua" in e.value.problems


def test_the_era_in_force_for_the_quarter_is_tried_first_and_the_union_is_the_fallback():
    h25 = ["Autoritate contractanta", "CUI autoritate contractanta", "Numar notificare ", "Data publicare", "Obiectul achizitiei",
           "Cod CPV", "Denumire CPV", "Valoare achizitie (RON)", "Data finalizare", "Ofertant castigator", "CUI ofertant castigator"]
    assert resolve(DAN, "DAN", "2025Q3", h25)[:3] == ["authority_name", "authority_cui", "code"]
    assert resolve(DAN, "DAN", "2024Q2", h25)[4] == "title"  # a 2025 spelling a quarter early: fallback
    assert resolve(DAN, "DAN", "2021Q1", h25)[7] == "value"  # before the first known era: fallback
    with pytest.raises(InvalidFile):
        resolve(DAN, "DAN", "2025Q3", h25 + ["Surprise"])
    assert norm_header("  DENUMIRE_ACHIZITIE ") == norm_header("Denumire achizitie") == "denumire achizitie"
    assert norm_header("Fonduri comunitare?") == "fonduri comunitare" and norm_header("Denumire în ț") == "denumire in t"
    assert DA.era_for("2022Q1") is not None and DA.era_for("not-a-quarter") is None


def test_a_file_of_the_wrong_kind_is_invalid(archive):
    _, da_file = _file(archive, "da", "2022Q1")
    with pytest.raises(InvalidFile, match="headers do not match a DAN file"):
        parse_file("dan", "2022Q1", da_file)


@pytest.mark.parametrize("name, data", [("a.ods", b"x"), ("a.doc", b"x"), ("a.xlsx", b"not a zip"), ("a.csv", b"\xff\xfe\x00"), ("a.csv", b"  \n")])
def test_unreadable_or_unsupported_files_are_invalid(tmp_path, name, data):
    f = tmp_path / name
    f.write_bytes(data)
    with pytest.raises(InvalidFile):
        parse_file("dan", "2025Q1", f)


def test_a_bad_row_rejects_the_whole_file(archive, tmp_path):
    _, good = _file(archive, "dan", "2024Q1")
    f = tmp_path / "x.csv"
    for bad in ("COMUNA,1,DAN5,13/45/2024,t,c,d,Servicii,Offline,5,Nu,,,O,2\n",  # no such date
                "COMUNA,1,DAN5,01/02/2024,t,c,d,Servicii,Offline,5.5.5,Nu,,,O,2\n",  # not an amount
                "COMUNA,1,DAN5,01/02/2024,t,c,d,Servicii,Offline,5,Nu\n",  # ragged
                "COMUNA,1,,01/02/2024,t,c,d,Servicii,Offline,5,Nu,,,O,2\n"):  # no public code
        f.write_text(good.read_text(encoding="utf-8") + bad, encoding="utf-8")
        with pytest.raises(InvalidFile, match="line"):
            parse_file("dan", "2024Q1", f)


# ---- duplicates and identity --------------------------------------------------------------------------------------


def test_exact_duplicates_count_once(planned, archive):
    p, records = planned
    _, da22 = _file(archive, "da", "2022Q1")
    rows = parse_file("da", "2022Q1", da22)
    assert sorted(r.code for r in rows) == ["DA91000001", "DA91000002", "DA91000003", "DA91000004"]  # the repeated row is gone
    # DAN9100002 is in both the 2024 Q1 and Q2 files: one Record; the whole fixture holds 4+2+2+3+2 distinct codes
    assert len(records) == 4 + 2 + 2 + 3 + 2 and sum(1 for _, _, rows in p.files for r in rows if r.code == "DAN9100002") == 2


def test_the_same_file_again_is_skipped(planned):
    p, _ = planned
    assert [x.parent.name for x in p.summary.duplicate_files] == ["2022-07-20"]
    assert [u.fetched_at.date().isoformat() for u, name, _ in p.files if u.unit == "2022Q1"] == ["2022-06-15"]


def test_the_same_code_in_one_file_keeps_the_later_publication(tmp_path):
    head = "Autoritate contractanta,CUI ,Numar notificare,Data publicare,Denumire,Cod CPV,Denumire CPV,Valoare atribuita (RON),Ofertant,CUI ofertant\n"
    f = tmp_path / "x.csv"
    f.write_text(head + "A,1,DAN7,01/05/2024,first,c,d,10,O,2\nA,1,DAN7,01/09/2024,second,c,d,20,O,2\nA,1,DAN7,01/09/2024,third,c,d,30,O,2\n")
    [r] = parse_file("dan", "2024Q1", f)
    assert (r.title, r.value_bani) == ("third", 3000)  # later publication wins; a tie goes to the later row
    f.write_text(head + "A,1,DAN7,01/09/2024,second,c,d,20,O,2\nA,1,DAN7,01/05/2024,older,c,d,10,O,2\n")
    [r] = parse_file("dan", "2024Q1", f)
    assert r.title == "second"


# ---- two dates ----------------------------------------------------------------------------------------------------


def test_publication_assigns_the_quarter_and_the_award_date_falls_back_to_it(planned):
    _, records = planned
    late = records["DA91000011"]  # published 12/30/2022, but in the 2023 Q1 file
    assert (late.published_on, late.quarter, late.awarded_on, late.award_date) == (date(2022, 12, 30), "2022Q4", None, date(2022, 12, 30))
    dan = records["DAN9100001"]
    assert (dan.published_on, dan.quarter, dan.award_date) == (date(2024, 1, 2), "2024Q1", date(2024, 1, 2))
    assert records["DA91000001"].awarded_on == date(2022, 3, 30) and records["DA91000001"].quarter == "2022Q1"
    assert records["DAN9100011"].quarter == "2024Q2" and records["DAN9100011"].awarded_on is None  # blank award date


# ---- quirks, each with a fixture ----------------------------------------------------------------------------------


def test_quirk_comma_thousands_separators_in_dan_csv(planned):
    _, records = planned
    assert records["DAN9100001"].value_bani == 508900  # "5,089"
    assert records["DAN9100010"].value_bani == 123456750  # "1,234,567.50"
    assert records["DAN9100011"].value_bani == 1200000  # "12,000"
    assert records["DAN9100002"].value_bani == 43500 and records["DAN9100002"].title == "DISTRIBUITOR HIDRAULIC\nFILTRU HIDRAULIC"


def test_quirk_pipe_inside_da_fields(planned):
    _, records = planned
    assert records["DA91000002"].title == "Tub PVC 3|4 toli"
    assert records["DA91000003"].title == "Lot A|,B pixuri"  # a `|,` inside a field: the header width settles the split
    assert records["DA91000003"].value_bani == 7525 and records["DA91000003"].supplier_cui == "2000001"
    assert split_pipe_row("|a|b|,|c|", 2) == ["a|b", "c"]
    assert split_pipe_row("|a|,|b|,|c|", 2) == ["a", "b|,|c"]  # truly ambiguous: the shortest first field wins
    assert split_pipe_row("|a|,,|c|") == ["a", "", "c"] and split_pipe_row("|a|,") == ["a", ""]
    with pytest.raises(ValueError):
        split_pipe_row("|a|,|b|", 3)


def test_quirk_numeric_cuis_in_xlsx_come_out_as_digits(planned):
    _, records = planned
    assert records["DAN9100020"].authority_cui == "18308578" and records["DAN9100020"].supplier_cui == "12458924"
    assert records["DAN9100021"].authority_cui == "18308578"  # a float cell 18308578.0: no `.0`
    assert records["DAN9100021"].supplier_cui == "RO46832143"  # text with the RO prefix: kept as published, identity.py normalises it
    for r in (records["DAN9100020"], records["DAN9100021"]):
        assert r.authority_cui.isdigit() and r.supplier_cui.removeprefix("RO").isdigit()
    # XLSX dates: a date cell and an Excel serial (45658.6228 = 2025-01-01)
    assert records["DAN9100020"].published_on == date(2025, 1, 1) and records["DAN9100021"].awarded_on == date(2025, 1, 1)
    assert records["DAN9100020"].value_bani == 37313 and records["DAN9100020"].quarter == "2025Q1"


def test_quirk_excel_mangled_numbers(planned):
    _, records = planned
    r = records["DAN9100022"]
    assert r.supplier_cui == "1.00761E+12" and "supplier_cui:scientific_notation" in r.notes  # digits already lost: kept as written, flagged
    assert r.value_bani == 150000 and "value:scientific_notation" in r.notes  # "1.5E+3" read as written (1,500 RON), flagged
    assert records["DAN9100020"].notes == ()


@pytest.mark.parametrize(
    "cell, expected",
    [("1200.5", (120050, False)), ("5,089", (508900, False)), ("1,234,567.50", (123456750, False)), (373.13, (37313, False)),
     (3000, (300000, False)), ("1.00761E+12", (100761000000000, True)), (" 12 ", (1200, False)), ("", (None, False)), (None, (None, False)),
     ("0", (0, False)), (0.1 + 0.2, (30, False))],
)
def test_money_is_integer_bani(cell, expected):
    assert to_bani(cell) == expected


@pytest.mark.parametrize("cell", ["5,5", "1.234,56", "12,34", "abc", "1,2345", True, "--5"])
def test_ambiguous_or_unreadable_money_is_an_error(cell):
    with pytest.raises(ValueError):
        to_bani(cell)


@pytest.mark.parametrize(
    "cell, expected",
    [(18308578, ("18308578", None)), (18308578.0, ("18308578", None)), ("RO 2000002", ("RO 2000002", None)), ("ro46832143", ("ro46832143", None)),
     ("18308578.0", ("18308578", None)), ("1.00761E+12", ("1.00761E+12", "scientific_notation")), ("", (None, None)), (None, (None, None)),
     ("-", ("-", None)), (1.5, (None, "unusable")), ("12 345", ("12 345", None)),
     # a foreign VAT id and a person's 13 digits are kept as published: pipeline.identity decides what they are (ADR 0003)
     ("BG103029862", ("BG103029862", None)), ("ATU 18379608", ("ATU 18379608", None)), ("1003600118796", ("1003600118796", None))],
)
def test_a_tax_id_is_kept_as_published_not_turned_into_digits(cell, expected):
    assert to_tax_id(cell) == expected


@pytest.mark.parametrize("cell, expected", [("03/28/2022", date(2022, 3, 28)), ("01/02/2024 22:03:37", date(2024, 1, 2)), ("2024-01-02T10:00:00Z", date(2024, 1, 2)), (45658.6, date(2025, 1, 1)), ("", None)])
def test_dates(cell, expected):
    assert to_date(cell) == expected


# ---- fixes from review ---------------------------------------------------------------------------------------------


def test_a_stray_form_feed_or_nel_inside_a_da_field_does_not_split_the_line(archive, tmp_path):
    _, da22 = _file(archive, "da", "2022Q1")
    f = tmp_path / "x.csv"
    f.write_text(da22.read_text(encoding="utf-8").replace("Hartie A4", "Hartie\x0c A4\x85 alba"), encoding="utf-8", newline="")
    rows = {r.code: r for r in parse_file("da", "2022Q1", f)}
    assert rows["DA91000001"].title == "Hartie\x0c A4\x85 alba" and len(rows) == 4


def test_a_unit_that_fails_leaves_its_files_free_to_load_from_a_later_unit(tmp_path):
    a = Archive(tmp_path / "a")
    t = lambda m: datetime(2024, m, 1, 9, tzinfo=timezone.utc)
    _, good = _file(Archive(FIXTURE), "dan", "2024Q1")
    head = good.read_text(encoding="utf-8").splitlines()[0]
    first = good.read_bytes()
    # one unit holding two files, the second bad: the whole unit is quarantined ...
    a.write_unit(source="seap", stream="bulk", kind="dan", unit="2024Q1", fetched_at=t(5), files={"a.csv": first, "b.csv": (head + "\nonly,three,fields\n").encode()}, via="v")
    # ... so the same bytes as its first file, in a later unit, still load
    a.write_unit(source="seap", stream="bulk", kind="dan", unit="2024Q1", fetched_at=t(6), files={"a.csv": first}, via="v")
    p = plan(a)
    assert len(p.summary.quarantined) == 1 and p.summary.duplicate_files == []
    assert [(u.fetched_at.month, name) for u, name, _ in p.files] == [(6, "a.csv")]


# ---- the layout #62 fetch-datagov writes is the layout the loader reads --------------------------------------------

def test_an_archive_written_by_fetch_datagov_loads(tmp_path, monkeypatch):
    from pipeline import datagov, fetch

    src = FIXTURE / "seap/bulk/da/2022Q1/2022-06-15/raport-achizitii-directe-t1-2022.csv"
    url = "https://data.gov.ro/dataset/ds/resource/r-da/download/raport-achizitii-directe-t1-2022.csv"

    class Resp:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return {"success": True, "result": {"name": "achizitii-publice-2022", "id": "id-2022", "resources": [
                {"id": "r-da", "name": "Achizitii directe 2022 T1", "format": "CSV", "size": 1, "hash": "",
                 "last_modified": "2022-06-01T00:00:00.000000", "url": url}]}}

        def iter_content(self, chunk_size):
            yield src.read_bytes()

    monkeypatch.setattr(fetch.requests, "get", lambda u, **kw: Resp())
    archive = Archive(tmp_path / "archive")
    datagov.fetch_datagov(archive, since_year=2022, now=datetime(2026, 11, 1, tzinfo=timezone.utc), delay=0)
    assert (archive.root / "seap/bulk/da/2022Q1").is_dir()
    p = plan(archive)
    assert p.summary.quarantined == [] and p.summary.files_loaded == 0
    assert sum(len(rows) for _, _, rows in p.files) > 0
    assert {unit.kind for unit, _, _ in p.files} == {"da"}
