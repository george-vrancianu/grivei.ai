"""MF's annual financial statements (ticket #179), no database: the reader (blank = None, never 0), the connector against a stub of data.gov.ro's CKAN
(never the network; FY2021 on; first releases and `actualizat` re-publications as separate units; unchanged / failed / invalid), the archive it writes,
`pipeline status` and the isolated refresh step."""
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pytest

from pipeline.archive import Archive
from pipeline.financials.build import held_units
from pipeline.financials.fetch import classify, fetch_financials
from pipeline.financials.read import FinancialsError, ReadStats, check_file, read_statements
from pipeline.financials.status import data_through_year, describe

from fixtures.build_financials_archive import DATASETS, FILES, HEADER, ckan_stub, dataset, resource, row, table

FIXTURE = Path(__file__).parent / "fixtures" / "archive-financials"
NOW = datetime(2026, 11, 14, 9, 0, tzinfo=timezone.utc)
UNITS = FIXTURE / "financials/statements/bl-bs-sl"


def test_the_reader_keeps_blank_cells_as_none_and_a_reported_zero_as_zero(tmp_path):
    path = tmp_path / "f.txt"
    path.write_bytes(table(
        row("2000007", turnover=4_000_000, profit=200_000, loss=0, debts=1_000_000, equity=900_000, employees=""),
        row("RO 0002000", turnover=-5, profit=0, loss=70, employees=0),  # an RO prefix and leading zeros are not part of the CUI; a loss is a negative result
        row("2000015", turnover="12.6", profit="", loss="", debts="x", employees=""),  # a decimal rounds; a blank result is None; junk is blank (counted)
        row("", turnover=1),  # no CUI: dropped
    ))
    stats = ReadStats()
    rows = {s.cui: s for s in read_statements(path, stats)}
    assert sorted(rows) == ["2000", "2000007", "2000015"]
    alfa = rows["2000007"]
    assert (alfa.turnover, alfa.profit_loss, alfa.debts, alfa.equity, alfa.employees) == (4_000_000, 200_000, 1_000_000, 900_000, None)  # blank employees: None, not 0
    assert (rows["2000"].turnover, rows["2000"].profit_loss, rows["2000"].employees) == (-5, -70, 0)
    assert (rows["2000015"].turnover, rows["2000015"].profit_loss, rows["2000015"].debts, rows["2000015"].employees) == (13, None, None, None)
    assert (stats.rows, stats.bad_cui, stats.bad_values) == (4, 1, 1)


def test_a_file_that_is_not_the_statements_layout_is_refused(tmp_path):
    for body in (b"<html>error</html>\r\n", b"", f"{HEADER}\r\n".encode(), b"CUI,CAEN,I1\r\n1,2,3\r\n", f"{HEADER}\r\n,4120\r\n".encode()):
        path = tmp_path / "f.txt"
        path.write_bytes(body)
        with pytest.raises(FinancialsError):
            check_file(path)
    path.write_bytes(table(row("5")))
    check_file(path)


def test_classify_takes_the_three_company_kinds_from_2021_and_sees_revisions():
    plain, actualizat = dataset("d", "Situații financiare 2023"), dataset("situatii_financiare_2024_actualizat", "Situatii financiare 2024 actualizat iunie 2026")
    r = lambda name, url=None: {"id": "r", "name": name, "url": url or f"https://x/{name.lower().replace(' ', '')}.txt"}  # noqa: E731
    assert classify(plain, r("WEB_BL_BS_SL_AN2023.txt")) == ("bl-bs-sl", 2023, "first")
    assert classify(plain, r("WEB_BL_BS_SL_AN2023 - actualizat")) == ("bl-bs-sl", 2023, "revised")  # the 2023 dataset names its re-publication so
    assert classify(actualizat, r("WEB_UU_AN2024.txt")) == ("uu", 2024, "revised")  # 2024's is a dataset of its own
    assert classify(plain, r("WEB_IR_2023.txt")) == ("ir", 2023, "first") and classify(plain, r("WEB_IR_AN2025.txt")) == ("ir", 2025, "first")
    assert classify(plain, r("WEB_BL_BS_SL_AN2020.txt")) is None  # before FY2021
    assert classify(plain, r("WEB_BL_BS_SL_AN2023.csv", "https://x/web_bl_bs_sl_an2023.csv")) is None  # MF's column list
    for other in ("WEB_ONG_AN2023.txt", "WEBASIG2023.txt", "WEB_VM_2023.txt", "WEB_Inst_de_credit_2023.txt"):
        assert classify(plain, r(other)) is None  # other reporters: other columns


def fetch(tmp_path, http=None, **kw):
    archive = Archive(tmp_path / "archive")
    return archive, fetch_financials(archive, now=NOW, http=http or ckan_stub(), **kw)


def test_it_archives_first_releases_and_revised_files_as_separate_units_with_their_identity(tmp_path):
    archive, summary = fetch(tmp_path)
    assert sorted(summary.archived) == ["bl-bs-sl 2022 first", "bl-bs-sl 2023 first", "bl-bs-sl 2023 revised", "bl-bs-sl 2024 first", "bl-bs-sl 2024 revised",
                                        "bl-bs-sl 2025 first", "uu 2025 first"]
    assert (summary.failed, summary.invalid, summary.unclassified) == ([], [], [])  # the older year, the column list and the bank's file are no candidates
    units = {(u.kind, u.unit): u for u in archive.units("financials")}
    assert sorted(units) == [("bl-bs-sl", "2022-first"), ("bl-bs-sl", "2023-first"), ("bl-bs-sl", "2023-revised"), ("bl-bs-sl", "2024-first"),
                             ("bl-bs-sl", "2024-revised"), ("bl-bs-sl", "2025-first"), ("uu", "2025-first")]
    revised = units[("bl-bs-sl", "2024-revised")]  # the separate dataset
    assert revised.origin["datasetUrl"] == "https://data.gov.ro/dataset/situatii_financiare_2024_actualizat" and revised.origin["license"] == "CC-BY-4.0"
    assert revised.origin["lastModified"].startswith("2026-06-24") and (revised.path / "manifest.json").is_file()
    assert json.loads((revised.path / "manifest.json").read_text())["files"][0]["name"] == "web_bl_bs_sl_an2024.txt"
    assert units[("bl-bs-sl", "2023-revised")].origin["resourceName"] == "WEB_BL_BS_SL_AN2023 - actualizat"


def test_an_unchanged_resource_is_not_downloaded_again_but_a_republished_one_is_a_new_unit(tmp_path):
    archive, first = fetch(tmp_path)
    counted = []
    inner = ckan_stub()
    http = lambda url, **kw: (counted.append(url) if "package_search" not in url else None) or inner(url, **kw)  # noqa: E731
    again = fetch_financials(archive, now=NOW, http=http)
    assert (again.archived, len(again.unchanged), counted) == ([], 7, [])
    other = [dict(d, resources=[dict(r) for r in d["resources"]]) for d in DATASETS]
    for d in other:
        for r in d["resources"]:
            if r["id"] == "r2025bl":
                r["last_modified"] = "2026-09-01T10:00:00"  # MF re-uploaded the newest year's file
    changed = fetch_financials(archive, now=NOW, http=ckan_stub(other, FILES))
    assert changed.archived == ["bl-bs-sl 2025 first"] and len(changed.unchanged) == 6
    assert len([u for u in archive.units("financials") if u.unit == "2025-first" and u.kind == "bl-bs-sl"]) == 2  # both raw copies kept; the newest fetch is the one read
    held, incomplete = held_units(archive)
    assert incomplete == [] and len([1 for u, y, rel in held if (u.kind, y, rel) == ("bl-bs-sl", 2025, "first")]) == 1


def test_failures_leave_nothing_in_the_archive_and_are_classified(tmp_path):
    archive = Archive(tmp_path / "archive")
    html = dict(FILES)
    html[next(u for u in FILES if u.endswith("web_bl_bs_sl_an2025.txt"))] = b"<html>an error page</html>"
    invalid = fetch_financials(archive, now=NOW, http=ckan_stub(DATASETS, html))
    assert len(invalid.invalid) == 1 and "bl-bs-sl 2025 first" in invalid.invalid[0] and invalid.failed == []  # deterministic: the same file again
    assert len(invalid.archived) == 6  # the others are fine

    broken = Archive(tmp_path / "broken")

    def down(url, **kw):
        if "package_search" in url:
            return ckan_stub()(url, **kw)
        raise ConnectionError("portal down")
    summary = fetch_financials(broken, now=NOW, http=down)
    assert len(summary.failed) == 7 and "portal down" in summary.failed[0] and summary.invalid == []  # transient
    assert not list(broken.root.rglob("manifest.json")) and not list(broken.root.glob(".financials-download-*"))

    def no_portal(url, **kw):
        raise ConnectionError("no portal")
    assert "no portal" in fetch_financials(Archive(tmp_path / "x"), now=NOW, http=no_portal).failed[0]
    assert "no statements file" in fetch_financials(Archive(tmp_path / "y"), now=NOW, http=ckan_stub([], {})).failed[0]


def test_the_fixture_archive_reads_back_as_the_graph_will_see_it():
    archive = Archive(FIXTURE)
    held, incomplete = held_units(archive)
    assert incomplete == [] and sorted((u.kind, y, rel) for u, y, rel in held) == [
        ("bl-bs-sl", 2022, "first"), ("bl-bs-sl", 2023, "first"), ("bl-bs-sl", 2023, "revised"), ("bl-bs-sl", 2024, "first"), ("bl-bs-sl", 2024, "revised"),
        ("bl-bs-sl", 2025, "first"), ("uu", 2025, "first")]
    assert data_through_year(archive) == 2025


def test_pipeline_status_shows_the_files_and_the_data_through_year(tmp_path, capsys):
    from pipeline import cli

    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)
    assert describe(Archive(tmp_path / "empty")) == []  # nothing held: no section
    assert cli.main(["--archive", str(root), "status"]) in (0, 1)
    out = capsys.readouterr().out
    assert "financial statements (MF, annual bulk files): 7 file(s) held, fiscal years 2022-2025" in out
    assert "data through fiscal year 2025 (end 2025-12-31); the newest year is a first release that MF may revise" in out
    assert "FY2023: bl-bs-sl first (published 2024-07-12), bl-bs-sl revised (published 2025-07-27)" in out


def test_the_refresh_has_its_own_isolated_financials_step_only_when_wired(tmp_path):
    from pipeline.refresh.engine import DeterministicError, TransientError, refresh_steps
    from pipeline.refresh.steps import Impl, StepResult

    archive = Archive(tmp_path / "archive")
    wired = Impl(archive, print, None, None, None, None, lambda: StepResult(), fetch_financials=lambda a: fetch_financials(a, now=NOW, http=ckan_stub()))
    assert [s.name for s in refresh_steps(archive, wired)] == ["crawl", "datagov", "onrc", "financials", "anaf", "load", "backup", "pgdump"]
    assert wired.financials().counts == {"archived": 7, "unchanged": 0}
    assert wired.financials().counts == {"archived": 0, "unchanged": 7}
    down = Impl(archive, print, None, None, None, None, lambda: StepResult(), fetch_financials=lambda a: fetch_financials(a, now=NOW, http=ckan_stub([], {})))
    with pytest.raises(TransientError):
        down.financials()  # a failing portal fails this step only; the engine isolates it from the others
    bad = dict(FILES)
    bad[next(u for u in FILES if u.endswith("web_bl_bs_sl_an2025.txt"))] = b"nope"
    refused = Impl(Archive(tmp_path / "other"), print, None, None, None, None, lambda: StepResult(),
                   fetch_financials=lambda a: fetch_financials(a, now=NOW, http=ckan_stub(DATASETS, bad)))
    with pytest.raises(DeterministicError):
        refused.financials()
    unwired = Impl(archive, print, None, None, None, None, lambda: StepResult())
    assert "financials" not in [s.name for s in refresh_steps(archive, unwired)]
