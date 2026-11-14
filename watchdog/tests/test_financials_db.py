"""MF's annual financial statements through a real rebuild (ticket #179): `archive-financials/` on top of `archive-identity/` is rebuilt into Postgres. One row
per CUI per fiscal year; a CUI the revised file holds takes the revised row, the others keep their first release; a blank is NULL (never 0); a loss is
negative; money is bani. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
from datetime import date
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURES / "archive-identity", root)
    shutil.copytree(FIXTURES / "archive-financials", root, dirs_exist_ok=True)
    return Archive(root)


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


def test_one_row_per_cui_and_year_with_the_revision_kept_and_blanks_left_null(db, archive):
    summary = rebuild(archive, db, overrides_path=FIXTURES / "identity-overrides.toml")
    assert summary.financials is not None and summary.financials.fiscal_years == [2022, 2023, 2024, 2025] and summary.financials.files == 7
    assert summary.incomplete == [] and summary.financials.skipped == [] and summary.financials.incomplete == []
    assert "financials: fiscal years 2022-2025, 7 files, 10 statements" in summary.lines()
    rows = q(db, "SELECT cui, fiscal_year, revision, turnover_bani, profit_loss_bani, debts_bani, equity_bani, employees FROM financials.statement ORDER BY cui, fiscal_year")
    assert rows == [
        ("2000007", 2022, "FIRST", 400_000_000, 20_000_000, 100_000_000, 90_000_000, None),  # blank employees: NULL
        ("2000007", 2023, "REVISED", 1_200_000_000, -15_000_000, 210_000_000, 135_000_000, 41),  # the revised file's row, a loss
        ("2000007", 2024, "FIRST", 2_000_000_000, 100_000_000, 300_000_000, 250_000_000, 0),  # a revised file exists but does not hold it; a reported 0
        ("2000007", 2025, "FIRST", 3_000_000_000, 90_000_000, None, 300_000_000, None),  # blank debts and employees
        ("2000015", 2024, "REVISED", 800_000_000, 35_000_000, 110_000_000, 85_000_000, 26),
        ("2000015", 2025, "FIRST", None, 10_000_000, 50_000_000, 40_000_000, 12),  # the UU file; blank turnover
        ("2000023", 2022, "FIRST", -25_000_000, 0, -100_000, 500_000, 1),  # a negative turnover and debts are kept as they are
        ("2000023", 2023, "FIRST", 0, 0, 1_000_000, 500_000, 1),
        ("2000031", 2023, "FIRST", 10_000_000_000, 500_000_000, 3_000_000_000, 6_000_000_000, 3000),
        ("4300011", 2023, "REVISED", 100_000_000, 100_000, 10_000, 90_000, 5),
    ]
    sources = q(db, "SELECT s.fiscal_year, s.revision, s.kind, s.file_name, s.archive_path, s.dataset_url, s.published, s.license FROM financials.statement t "
                    "JOIN financials.source_file s ON s.id = t.source_file_id WHERE t.cui = '2000007' ORDER BY t.fiscal_year")
    assert sources[1] == (2023, "REVISED", "bl-bs-sl", "web_bl_bs_sl_an2023.txt", "financials/statements/bl-bs-sl/2023-revised/2026-11-14/web_bl_bs_sl_an2023.txt",
                          "https://data.gov.ro/dataset/situatii_financiare2023", date(2025, 7, 27), "CC-BY-4.0")  # each figure cites MF's dataset and its file
    assert sources[2][:2] == (2024, "FIRST") and sources[0][5] == "https://data.gov.ro/dataset/situatii_financiare_2022"
    assert q(db, "SELECT max(fiscal_year) FROM financials.source_file") == [(2025,)]


def test_a_rebuild_without_statements_has_an_empty_schema_and_says_so(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURES / "archive-identity", root)
    summary = rebuild(Archive(root), db, overrides_path=FIXTURES / "identity-overrides.toml")
    assert summary.financials.files == 0 and "financials: none archived" in summary.financials.line()
    assert q(db, "SELECT count(*) FROM financials.statement") == [(0,)]


def test_a_file_that_does_not_parse_is_named_and_the_other_release_of_the_year_still_counts(db, archive):
    bad = archive.root / "financials/statements/bl-bs-sl/2023-revised/2026-11-14"
    name = next(p.name for p in bad.iterdir() if p.name != "manifest.json")
    archive.write_unit(source="financials", stream="statements", kind="bl-bs-sl", unit="2023-revised", fetched_at=__import__("datetime").datetime(2026, 12, 1, tzinfo=__import__("datetime").timezone.utc),
                       files={name: b"<html>not statements</html>\r\n"})
    summary = rebuild(archive, db, overrides_path=FIXTURES / "identity-overrides.toml")
    assert len(summary.financials.skipped) == 1 and "2023-revised/2026-12-01" in summary.financials.skipped[0]
    assert q(db, "SELECT revision, turnover_bani FROM financials.statement WHERE cui = '2000007' AND fiscal_year = 2023") == [("FIRST", 1_100_000_000)]  # the first release stands in
