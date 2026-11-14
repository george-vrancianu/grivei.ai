"""BaniPartide's firm donations (ticket #182), no database: the reader (CUI-keyed firms only, dirty dates and amounts read conservatively), the connector against a
stub of db.banipartide.ro's Datasette (never the network; one-off; the personal column stripped; failures leave nothing), the check that only reports a newer
upstream database, `pipeline status` and the isolated refresh step."""
import csv
import shutil
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from pipeline.archive import Archive
from pipeline.banipartide.build import is_sole_trader
from pipeline.banipartide.fetch import FILE_NAME, check_banipartide, fetch_banipartide, held_manifests
from pipeline.banipartide.read import BaniPartideError, ReadStats, check_file, parse_amount, parse_date, read_donations
from pipeline.banipartide.status import data_through_year, describe

from fixtures.build_banipartide_archive import DB_HASH, HEADER, REPRESENTATIVE, datasette_stub, export

FIXTURE = Path(__file__).parent / "fixtures" / "archive-banipartide"
NOW = datetime(2026, 11, 14, 9, 0, tzinfo=timezone.utc)
FILE = FIXTURE / "banipartide/donors/firms/a27b538b1895/2026-11-14" / FILE_NAME


def test_the_reader_keeps_only_cui_keyed_firms_and_counts_what_it_drops():
    stats = ReadStats()
    rows = {d.row_id: d for d in read_donations(FILE, stats)}
    assert sorted(rows) == [1, 2, 3, 4, 5]
    assert (stats.rows, stats.firms, stats.no_cui, stats.bad_amount, stats.unknown_kind) == (10, 5, 3, 1, 1)  # the truncated CNP, the empty id and `n/a2`: not firms
    alfa, loan, beta, cnair, orphan = (rows[i] for i in (1, 2, 3, 4, 5))
    assert (alfa.cui, alfa.party, alfa.year, alfa.date, alfa.amount_bani, alfa.kind) == ("2000007", "PNL", 2023, date(2023, 3, 15), 5_000_000, "DONATION")
    assert (loan.kind, loan.amount_bani, loan.date, loan.date_text) == ("LOAN", 25_000_050, None, "20.01.2024; 15.05.2024")  # two dates in the cell: none is set, the text stays
    assert (beta.date, beta.amount_bani) == (date(2022, 10, 4), 800_536)
    assert (cnair.cui, cnair.party, cnair.date) == ("2000031", "PSD+PC", date(2021, 6, 9))  # `RO 2000031` is the CUI; the party is exactly as published
    assert (orphan.cui, orphan.date, orphan.date_text) == ("5443785", None, "")  # a no-break space after the CUI is not part of it; a blank date stays blank
    assert not any(hasattr(d, "name") for d in rows.values())  # the donor's published name is not read at all


def test_dirty_dates_set_a_date_only_when_one_date_explains_the_cell_and_the_year():
    cases = [("29.01.2009", 2009, date(2009, 1, 29)), ("8.11.2021", None, date(2021, 11, 8)), ("4102019", 2019, date(2019, 10, 4)), ("18102019", 2019, date(2019, 10, 18)),
             ("25 martie 2009", 2009, date(2009, 3, 25)), ("39622", 2008, date(2008, 6, 23)),
             ("11.10.2019; 13.11.2019", 2019, None), ("23.07; 13.11.2009", 2009, None),  # the cell lists several donation dates
             ("1112019", 2019, None),  # 1.11 or 11.1: ambiguous
             ("16 iunie 2008", 2009, None),  # a date outside the row's year: one of the two is a typo
             ("0329.10.2008", 2008, None), ("2009", 2009, None), ("", 2009, None), ("25.Aug.09", 2009, None)]
    for text, year, want in cases:
        assert parse_date(text, year) == want, text


def test_amounts_are_lei_with_a_decimal_point_or_comma_and_nothing_else_is_a_donation():
    assert [parse_amount(t) for t in ("30000", "8005.36", "17417,6", "24.06", "1.234,56", "1 500\u00a0")] == [3_000_000, 800_536, 1_741_760, 2406, 123_456, 150_000]
    assert [parse_amount(t) for t in ("0", "-5", "abc", "", "12,345")] == [None] * 5


def test_an_amount_is_never_scaled_by_a_guessed_thousands_separator():
    # One separator then exactly three digits reads as a decimal point or as thousands grouping: ambiguous, so it is not a donation (counted, never guessed).
    assert [parse_amount(t) for t in ("30.000", "1,500", "24.060", "0,500", "999.999")] == [None] * 5
    # Repeated separators of one kind, or both kinds, are unambiguous grouping; the last of two kinds is the decimal one.
    assert [parse_amount(t) for t in ("1.000.000", "1,000,000", "1.234,56", "1,234.56", "12.345.678,9")] == [100_000_000, 100_000_000, 123_456, 123_456, 1_234_567_890]
    # Misplaced grouping and other shapes that are not an amount.
    assert [parse_amount(t) for t in ("1.00.000", "1,2345,678", "1.234,5.6", ".500", "1.5.0")] == [None] * 5
    # Fewer or more than three digits after one separator are decimals.
    assert [parse_amount(t) for t in ("1,5", "1.50", "250000,50", "100.5")] == [150, 150, 25_000_050, 10_050]


def test_a_file_that_is_not_the_firm_table_is_refused(tmp_path):
    for body in (b"<html>error</html>\n", b"", b"rowid,Nume\n1,x\n"):
        path = tmp_path / "f.csv"
        path.write_bytes(body)
        with pytest.raises(BaniPartideError):
            check_file(path)
    check_file(FILE)


def test_a_sole_trader_is_told_by_its_onrc_legal_form_or_its_name():
    assert is_sole_trader("POPESCU ION PERSOANĂ FIZICĂ AUTORIZATĂ", None) and is_sole_trader("ION POPESCU PFA", None) and is_sole_trader("P.F.A. DEMO", None)
    assert is_sole_trader("DEMO ÎNTREPRINDERE INDIVIDUALĂ", None) and is_sole_trader("DEMO I.I.", None) and is_sole_trader("DEMO INTREPRINDERE FAMILIALA", None)
    assert is_sole_trader("DEMO", "PERSOANA FIZICA AUTORIZATA") and is_sole_trader("DEMO", "INTREPRINDERE INDIVIDUALA")
    assert not is_sole_trader("ALFA DEMO SRL", "SRL") and not is_sole_trader("DEMO II SRL", None) and not is_sole_trader(None, None)


def test_the_table_is_archived_once_without_the_personal_column_and_with_its_origin(tmp_path):
    archive = Archive(tmp_path / "archive")
    requested: list[str] = []
    summary = fetch_banipartide(archive, now=NOW, http=datasette_stub(requested=requested))
    assert summary.archived == [DB_HASH[:12]] and not summary.failed and not summary.invalid
    assert not any("fizice" in u for u in requested)  # the individual donors' table is never asked for
    (unit,) = archive.units("banipartide")
    assert unit.path.relative_to(archive.root).as_posix() == "banipartide/donors/firms/a27b538b1895/2026-11-14" and archive.incomplete() == []
    held = (unit.path / FILE_NAME).read_text(encoding="utf-8")
    assert REPRESENTATIVE not in held and "Reprezentant societate" not in held  # the declared personal field is stripped at fetch
    assert "ZAMFIR ADRIAN" in held  # rows are archived as published; the reader drops the individuals (read.py), the graph never gets them
    o = unit.origin
    assert (o["license"], o["licenseUrl"], o["source"], o["databaseHash"], o["strippedFields"], o["rows"]) == (
        "CC Attribution 4.0 License", "http://creativecommons.org/licenses/by/4.0/", "Expert Forum", DB_HASH, ["Reprezentant societate"], 10)
    assert len(o["upstreamSha256"]) == 64 and o["upstreamBytes"] == len(export()) and "Monitorul Oficial" in o["underlying"]
    with (unit.path / FILE_NAME).open(encoding="utf-8", newline="") as f:
        assert next(csv.reader(f)) == [c for c in HEADER if c != "Reprezentant societate"]  # nothing else changes


def test_the_load_is_one_off_a_held_copy_is_not_fetched_again_unless_asked(tmp_path):
    archive = Archive(tmp_path / "archive")
    fetch_banipartide(archive, now=NOW, http=datasette_stub())
    requested: list[str] = []
    again = fetch_banipartide(archive, now=NOW, http=datasette_stub(requested=requested))
    assert again.held and not again.archived and requested == []  # not even the metadata is asked for
    newer = fetch_banipartide(archive, now=NOW, again=True, http=datasette_stub(db_hash="b" * 64))
    assert newer.archived == ["b" * 12] and len(held_manifests(archive)) == 2


def test_failures_leave_nothing_in_the_archive(tmp_path):
    archive = Archive(tmp_path / "archive")

    def down(url, **kwargs):
        raise ConnectionError("portal down")

    failed = fetch_banipartide(archive, now=NOW, http=down)
    assert failed.failed and not failed.archived and held_manifests(archive) == [] and not (archive.root / "banipartide").exists()
    html = fetch_banipartide(archive, now=NOW, http=datasette_stub(body=b"<html>maintenance</html>"))
    assert html.invalid and not html.failed and not (archive.root / "banipartide").exists()  # a deterministic failure: retrying fetches the same page
    assert fetch_banipartide(archive, now=NOW, http=datasette_stub(body=b"rowid,Nume\n1,x\n")).invalid


def test_the_check_reports_a_newer_upstream_database_and_downloads_nothing(tmp_path):
    archive = Archive(tmp_path / "archive")
    assert check_banipartide(archive, http=datasette_stub()).state == "nothing held"
    fetch_banipartide(archive, now=NOW, http=datasette_stub())
    requested: list[str] = []
    assert check_banipartide(archive, http=datasette_stub(requested=requested)).state == "current"
    assert not any(".csv" in u for u in requested)  # two small JSON documents, never the table
    newer = check_banipartide(archive, http=datasette_stub(db_hash="c" * 64, requested=requested))
    assert newer.state == "newer" and newer.upstream_hash == "c" * 64 and "fetch-banipartide --again" in newer.detail
    assert not any(".csv" in u for u in requested) and len(held_manifests(archive)) == 1  # it reports, it never loads

    def down(url, **kwargs):
        raise ConnectionError("portal down")

    assert check_banipartide(archive, http=down).state == "failed"


def test_pipeline_status_shows_the_counts_and_the_data_through_year(tmp_path, capsys):
    from pipeline import cli

    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)
    assert describe(Archive(tmp_path / "empty")) == [] and data_through_year(Archive(root)) == 2024
    assert cli.main(["--archive", str(root), "status"]) in (0, 1)
    out = capsys.readouterr().out
    assert "banipartide firm donations (Expert Forum, CC Attribution 4.0 License): one-off archived load, refresh only checks for a newer upstream file" in out
    assert "10 rows, 5 CUI-keyed firm donations and loans, 3 not CUI-keyed (never loaded)" in out
    assert "data through 2024 (end 2024-12-31); years 2020-2024" in out
    assert "ZAMFIR" not in out and "POPA" not in out  # no individual's name is ever printed


def test_the_refresh_has_its_own_check_only_step_only_when_wired(tmp_path):
    from pipeline.refresh.engine import TransientError, refresh_steps
    from pipeline.refresh.steps import Impl, StepResult

    archive = Archive(tmp_path / "archive")
    fetch_banipartide(archive, now=NOW, http=datasette_stub())
    wired = Impl(archive, print, None, None, None, None, lambda: StepResult(), check_banipartide=lambda a: check_banipartide(a, http=datasette_stub()))
    assert [s.name for s in refresh_steps(archive, wired)] == ["crawl", "datagov", "onrc", "banipartide", "anaf", "load", "backup", "pgdump"]
    assert wired.banipartide().warnings == []
    newer = Impl(archive, print, None, None, None, None, lambda: StepResult(), check_banipartide=lambda a: check_banipartide(a, http=datasette_stub(db_hash="d" * 64)))
    result = newer.banipartide()
    assert result.counts == {"state": "newer"} and len(result.warnings) == 1 and "newer database" in result.warnings[0]  # the warning is the alert
    assert len(held_manifests(archive)) == 1  # a check never loads

    def down(url, **kwargs):
        raise ConnectionError("portal down")

    with pytest.raises(TransientError):
        Impl(archive, print, None, None, None, None, lambda: StepResult(), check_banipartide=lambda a: check_banipartide(a, http=down)).banipartide()
    unwired = Impl(archive, print, None, None, None, None, lambda: StepResult())
    assert "banipartide" not in [s.name for s in refresh_steps(archive, unwired)]
