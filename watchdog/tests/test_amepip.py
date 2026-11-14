"""AMEPIP's public-enterprise list (ticket #183), no database: the reader on the committed workbook and on a CSV, the connector against a stub of
data.gov.ro's CKAN (never the network), and the archive it writes (manifest last, resource identity, unchanged / superseded / failed)."""
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pytest

pytest.importorskip("openpyxl")

from pipeline.amepip.build import latest_units, newest_list  # noqa: E402
from pipeline.amepip.fetch import fetch_amepip  # noqa: E402
from pipeline.amepip.read import AmepipError, read_list  # noqa: E402
from pipeline.amepip.status import describe  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

FIXTURE = Path(__file__).parent / "fixtures" / "archive-amepip"
UNIT = FIXTURE / "amepip/list/enterprises/2026-01-13/2026-11-14"
NOW = datetime(2026, 11, 14, 9, 0, tzinfo=timezone.utc)


def test_the_reader_makes_one_enterprise_per_cui_from_every_sheet_that_has_one():
    rows = {r.cui: r for r in read_list(UNIT / "datecompanii_ind-finnefin.xlsx")}
    assert sorted(rows) == ["2000007", "2000031", "4300011", "4300029"]  # RO and a number cell normalised; the row with no CUI and the kpi sheet dropped
    alfa = rows["2000007"]
    assert (alfa.name, alfa.registration_number, alfa.status, alfa.first_year, alfa.last_year) == ("ALFA DEMO SRL", "J40/1/2005", "funcţiune", 2022, 2023)  # the newest year's spelling
    assert rows["2000031"].status == "este sub incidenţa Legii nr. 85/2014, insolvenţă"
    assert (rows["4300029"].status, rows["4300029"].first_year) == (None, 2023)  # only in the form sheet: no status column there


def test_the_reader_reads_the_csv_export_and_refuses_a_file_with_no_cui_column(tmp_path):
    csv = tmp_path / "data_2023.csv"
    csv.write_text("﻿an,cui,name,registration_number\n2023,54760,COMPANIA DE APA ORADEA SA,J05/14/1991\n2023,0063483,ORADEA TRANSPORT LOCAL SA,J05/1/1991\n", encoding="utf-8")
    assert [(r.cui, r.name, r.last_year) for r in read_list(csv)] == [("54760", "COMPANIA DE APA ORADEA SA", 2023), ("63483", "ORADEA TRANSPORT LOCAL SA", 2023)]
    bad = tmp_path / "bad.csv"
    bad.write_text("a,b\n1,2\n", encoding="utf-8")
    with pytest.raises(AmepipError):
        read_list(bad)


class Stub:
    """CKAN's package_search answer plus the files; counts the downloads."""

    def __init__(self, datasets, files):
        self.datasets, self.files, self.downloads = datasets, files, []

    def __call__(self, url, **kwargs):
        stub = self

        class Response:
            def raise_for_status(self):
                if isinstance(stub.files.get(url), Exception):
                    raise stub.files[url]

            def json(self):
                return {"success": True, "result": {"results": stub.datasets}}

            def iter_content(self, chunk_size):
                stub.downloads.append(url)
                yield stub.files[url]

        if "package_search" in url:
            assert "agentia-pentru-monitorizarea" in url  # the organisation is the filter
            return Response()
        if url not in self.files:
            raise AssertionError(f"unexpected request {url}")
        return Response()


def dataset(name, title, resources):
    return {"id": f"id-{name}", "name": name, "title": title, "license_id": "CC-BY-4.0", "resources": resources}


def resource(rid, last_modified, url=None, name="list"):
    return {"id": rid, "name": name, "url": url or f"https://data.gov.ro/{rid}/download/{rid}.csv", "last_modified": last_modified, "size": 10, "hash": "", "format": "CSV"}


CSV = b"an,cui,name\n2023,2000007,ALFA DEMO SRL\n"


def test_the_newest_list_is_archived_with_its_resource_identity_and_manifest_last(tmp_path):
    old, new = resource("r-old", "2024-08-14T08:08:00"), resource("r-new", "2026-01-13T14:23:50")
    docs = resource("r-doc", "2026-02-01T00:00:00", url="https://data.gov.ro/doc/readme.pdf")  # not a table: never a candidate
    other = resource("r-other", "2026-03-01T00:00:00")  # a newer file of a dataset that is no indicators dataset: ignored
    http = Stub([dataset("old", "AMEPIP - Indicatori iunie 2024", [old]), dataset("new", "AMEPIP - Indicatori ian 2026", [new, docs]), dataset("x", "AMEPIP - Rapoarte", [other])],
                {new["url"]: CSV})
    archive = Archive(tmp_path / "archive")
    summary = fetch_amepip(archive, now=NOW, http=http)
    assert (summary.archived, summary.superseded, summary.failed) == (["2026-01-13"], 1, [])
    assert http.downloads == [new["url"]]  # only the newest
    [unit] = [u for u in archive.units() if u.source == "amepip"]
    assert (unit.stream, unit.kind, unit.unit, unit.via) == ("list", "enterprises", "2026-01-13", "list")
    assert unit.origin["resourceId"] == "r-new" and unit.origin["license"] == "CC-BY-4.0" and unit.origin["datasetUrl"] == "https://data.gov.ro/dataset/new"
    assert (unit.path / "manifest.json").is_file() and json.loads((unit.path / "manifest.json").read_text())["files"][0]["name"] == "r-new.csv"
    assert [u.unit for u in latest_units(archive)] == ["2026-01-13"]


def test_an_unchanged_resource_is_not_downloaded_again_but_a_changed_one_is_a_new_unit(tmp_path):
    r = resource("r1", "2026-01-13T14:23:50")
    http = Stub([dataset("d", "AMEPIP - Indicatori", [r])], {r["url"]: CSV})
    archive = Archive(tmp_path / "archive")
    fetch_amepip(archive, now=NOW, http=http)
    again = fetch_amepip(archive, now=NOW, http=http)
    assert (again.archived, again.unchanged, len(http.downloads)) == ([], ["2026-01-13"], 1)
    r["last_modified"] = "2026-06-01T10:00:00"  # AMEPIP re-uploaded the file
    changed = fetch_amepip(archive, now=NOW, http=http)
    assert changed.archived == ["2026-06-01"] and len(http.downloads) == 2
    assert [u.unit for u in latest_units(archive)] == ["2026-06-01", "2026-01-13"]  # the older one is kept beside it (a list is a snapshot, both are raw)


def test_failures_leave_nothing_in_the_archive(tmp_path):
    archive = Archive(tmp_path / "archive")
    r = resource("r1", "2026-01-13T14:23:50")
    html = Stub([dataset("d", "AMEPIP - Indicatori", [r])], {r["url"]: b"<html>error page</html>"})
    assert "not a list of public enterprises" in fetch_amepip(archive, now=NOW, http=html).failed[0]
    down = Stub([dataset("d", "AMEPIP - Indicatori", [r])], {r["url"]: ConnectionError("down")})
    assert "down" in fetch_amepip(archive, now=NOW, http=down).failed[0]
    assert fetch_amepip(archive, now=NOW, http=Stub([], {})).failed == ["no .xlsx, .xls or .csv resource in an AMEPIP indicators dataset"]
    def broken(url, **kwargs):
        raise ConnectionError("portal down")
    assert "portal down" in fetch_amepip(archive, now=NOW, http=broken).failed[0]
    assert not list(archive.root.rglob("manifest.json")) and not list(archive.root.glob(".amepip-download-*"))


def test_a_newer_resource_that_does_not_validate_falls_back_to_the_next_newest(tmp_path):
    kpi, good, older = resource("r-kpi", "2026-03-01T00:00:00"), resource("r-good", "2026-01-13T14:23:50"), resource("r-older", "2024-08-14T08:08:00")
    http = Stub([dataset("d", "AMEPIP - Indicatori ian 2026", [kpi, good]), dataset("o", "AMEPIP - Indicatori 2024", [older])],
                {kpi["url"]: b"indicator,value\nx,1\n", good["url"]: CSV, older["url"]: CSV})
    archive = Archive(tmp_path / "archive")
    summary = fetch_amepip(archive, now=NOW, http=http)
    assert (summary.archived, summary.superseded, summary.failed) == (["2026-01-13"], 1, [])  # the broken newest is only a log warning
    assert http.downloads == [kpi["url"], good["url"]]  # the older one is never downloaded
    assert [u.unit for u in latest_units(archive)] == ["2026-01-13"] and not list(archive.root.glob(".amepip-download-*"))
    again = fetch_amepip(archive, now=NOW, http=http)  # the weekly run: the broken one is looked at again, the good one is unchanged
    assert (again.archived, again.unchanged, again.failed) == ([], ["2026-01-13"], [])
    only_bad = Stub([dataset("d", "AMEPIP - Indicatori", [kpi])], {kpi["url"]: b"indicator,value\nx,1\n"})
    failed = fetch_amepip(Archive(tmp_path / "other"), now=NOW, http=only_bad).failed
    assert len(failed) == 1 and "not a list of public enterprises" in failed[0]


def test_the_newest_unit_that_parses_wins_and_a_broken_newer_one_is_named(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)
    archive = Archive(root)
    archive.write_unit(source="amepip", stream="list", kind="enterprises", unit="2026-06-01", fetched_at=NOW, files={"x.csv": b"a,b\n1,2\n"})
    unit, name, rows, skipped = newest_list(archive)
    assert (unit.unit, name, len(rows)) == ("2026-01-13", "datecompanii_ind-finnefin.xlsx", 4)
    assert len(skipped) == 1 and "2026-06-01" in skipped[0]


def test_pipeline_status_shows_the_counts_and_the_data_through_date(tmp_path, capsys):
    from pipeline import cli

    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)
    assert describe(Archive(tmp_path / "empty")) == []  # nothing held: no section
    assert cli.main(["--archive", str(root), "status"]) in (0, 1)
    out = capsys.readouterr().out
    assert "amepip list (public enterprises, OUG 109/2011): 1 snapshot(s) held" in out
    assert "data through 2026-01-13 (published by AMEPIP), fetched 2026-11-14: 4 public enterprises (CUIs)" in out
    assert "financial years 2021-2023" in out and "by ONRC status: funcţiune 2" in out


def test_the_refresh_has_its_own_isolated_amepip_step_only_when_wired(tmp_path):
    from pipeline.refresh.engine import TransientError, refresh_steps
    from pipeline.refresh.steps import Impl, StepResult

    archive = Archive(tmp_path / "archive")
    r = resource("r1", "2026-01-13T14:23:50")
    http = Stub([dataset("d", "AMEPIP - Indicatori", [r])], {r["url"]: CSV})
    wired = Impl(archive, print, None, None, None, None, lambda: StepResult(), fetch_amepip=lambda a: fetch_amepip(a, now=NOW, http=http))
    assert [s.name for s in refresh_steps(archive, wired)] == ["crawl", "datagov", "onrc", "amepip", "anaf", "load", "backup", "pgdump"]
    assert wired.amepip().counts == {"archived": 1, "unchanged": 0}
    assert wired.amepip().counts == {"archived": 0, "unchanged": 1}
    down = Impl(archive, print, None, None, None, None, lambda: StepResult(), fetch_amepip=lambda a: fetch_amepip(a, now=NOW, http=Stub([], {})))
    with pytest.raises(TransientError):
        down.amepip()  # a failing portal fails this step only; the engine isolates it from the others
    unwired = Impl(archive, print, None, None, None, None, lambda: StepResult())
    assert "amepip" not in [s.name for s in refresh_steps(archive, unwired)]
