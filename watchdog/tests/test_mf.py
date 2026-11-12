"""The MF "Lista entitatilor publice" (#80): the fetch with HTTP stubbed (tiny CKAN answers, few-byte files, no network) and the reader on
the fixture slice `archive-mf/`. No database: the rebuild into Postgres is covered by seam 1 (explorer/packages/api/test/seam1.test.ts)."""
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from pipeline import cli
from pipeline.archive import Archive
from pipeline.mf import fetch as mf_fetch
from pipeline.mf.build import MfError, classify, latest_units, normalise_cui, read_list
from pipeline.placement.matching import Gazetteer, County
from pipeline.placement.scope import Entry

FIXTURE = Path(__file__).parent / "fixtures" / "archive-mf"
NOW1 = datetime(2026, 11, 8, 8, 0, tzinfo=timezone.utc)
NOW2 = datetime(2026, 12, 8, 8, 0, tzinfo=timezone.utc)
XLS = b"\xd0\xcf\x11\xe0 pretend this is a spreadsheet"


def res(rid, name, filename, *, modified="2026-11-06T11:28:26", size=10, fmt="XLS"):
    return {"id": rid, "name": name, "format": fmt, "size": size, "hash": "", "last_modified": modified,
            "url": f"https://data.gov.ro/dataset/x/resource/{rid}/download/{filename}"}


class Response:
    def __init__(self, status=200, payload=None, body=b""):
        self.status_code, self.payload, self.body = status, payload, body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self.payload

    def iter_content(self, chunk_size):
        for i in range(0, len(self.body), 5):
            yield self.body[i:i + 5]


class Net:
    def __init__(self, *resources, bodies=None, fail_package=False):
        self.resources, self.bodies, self.fail_package, self.requests = list(resources), bodies or {}, fail_package, []

    def __call__(self, url, **kw):
        self.requests.append(url)
        assert kw["timeout"] and kw["headers"]["User-Agent"]
        if "package_show" in url:
            assert url.endswith("id=listaentitatipublice")
            if self.fail_package:
                return Response(500)
            return Response(payload={"success": True, "result": {"name": "listaentitatipublice", "id": "ds", "resources": self.resources}})
        return Response(body=self.bodies.get(url, XLS))

    def downloads(self):
        return [u for u in self.requests if "package_show" not in u]


NOV = res("r-nov", None, "lista_ep_portal_01112026.xls")  # the real list has resources with no name: the file name dates them
OCT = res("r-oct", "Lista entităților publice actualizată la data de 01.10.2026", "lista_ep_portal_01102026.xls", modified="2026-10-06T12:38:38")
OLD = res("r-2017", "Lista entitatilor publice", "listaentitatilorpubliceportal02052017.xls", modified="2017-05-09T15:38:34")


# ---- the snapshot date ---------------------------------------------------------------------------------------------------

@pytest.mark.parametrize("resource, expected", [
    (res("a", "Lista entităților publice actualizată la data de 01.02.2026", "x.xls"), date(2026, 2, 1)),  # dd.mm.yyyy in the name
    (res("a", "Lista_EP_portal_01072026.xls", "other.xls"), date(2026, 7, 1)),  # DDMMYYYY in the name
    (res("a", None, "lista_ep_portal_01112026.xls"), date(2026, 11, 1)),  # only the file name
    (res("a", "Lista entitatilor publice", "listaepportal01042018.xls"), date(2018, 4, 1)),
    (res("a", "Lista entitatilor publice", "lista.xls"), None),  # nothing to read
    (res("a", "Lista 31.02.2026", "lista.xls"), None),  # not a date
])
def test_the_snapshot_date_comes_from_the_name_or_the_file_name(resource, expected):
    assert mf_fetch.snapshot_date(resource) == expected


# ---- the fetch -----------------------------------------------------------------------------------------------------------

def test_only_the_newest_snapshot_is_archived_unchanged_with_its_resource_in_the_manifest(tmp_path):
    archive, net = Archive(tmp_path / "a"), Net(OLD, OCT, NOV, bodies={NOV["url"]: XLS + b"nov"})
    summary = mf_fetch.fetch_mf(archive, now=NOW1, http=net)
    assert (summary.archived, summary.superseded, summary.failed) == (["2026-11-01"], 2, [])
    assert net.downloads() == [NOV["url"]]
    [unit] = archive.units()
    assert (unit.source, unit.stream, unit.kind, unit.unit) == ("mf", "list", "entities", "2026-11-01")
    assert unit.path.name == "2026-11-08" and unit.file_path("lista_ep_portal_01112026.xls").read_bytes() == XLS + b"nov"
    assert unit.origin["resourceId"] == "r-nov" and unit.origin["lastModified"] == "2026-11-06T11:28:26" and unit.url == NOV["url"]


def test_a_second_run_with_the_same_file_downloads_nothing_and_a_reupload_is_a_new_dated_unit(tmp_path):
    archive = Archive(tmp_path / "a")
    mf_fetch.fetch_mf(archive, now=NOW1, http=Net(NOV))
    net = Net(NOV)
    assert mf_fetch.fetch_mf(archive, now=NOW1, http=net).unchanged == ["2026-11-01"] and net.downloads() == []
    reuploaded = dict(NOV, last_modified="2026-11-09T09:00:00", size=11)
    again = mf_fetch.fetch_mf(archive, now=NOW1, http=Net(reuploaded))  # same UTC day: `<day>.2`
    assert again.archived == ["2026-11-01"]
    assert sorted(u.path.name for u in archive.units()) == ["2026-11-08", "2026-11-08.2"]


def test_a_new_monthly_file_is_picked_up_beside_the_old_one(tmp_path):
    archive = Archive(tmp_path / "a")
    mf_fetch.fetch_mf(archive, now=NOW1, http=Net(NOV))
    dec = res("r-dec", None, "lista_ep_portal_01122026.xls", modified="2026-12-06T10:00:00")
    summary = mf_fetch.fetch_mf(archive, now=NOW2, http=Net(NOV, dec))
    assert summary.archived == ["2026-12-01"] and summary.superseded == 1
    assert [u.unit for u in latest_units(archive)] == ["2026-12-01", "2026-11-01"]


def test_a_download_that_is_not_a_spreadsheet_or_dies_leaves_nothing_and_is_retried_by_running_again(tmp_path):
    archive = Archive(tmp_path / "a")
    summary = mf_fetch.fetch_mf(archive, now=NOW1, http=Net(NOV, bodies={NOV["url"]: b"<html>error page</html>"}))
    assert summary.archived == [] and "not a spreadsheet" in summary.failed[0]
    assert archive.units() == [] and not list(archive.root.glob(".download-*")) and not (archive.root / "mf").exists()
    assert mf_fetch.fetch_mf(archive, now=NOW1, http=Net(NOV)).archived == ["2026-11-01"]  # the rerun is the resume


def test_a_dataset_request_that_fails_is_a_failure_and_undated_resources_are_reported_never_archived(tmp_path):
    archive = Archive(tmp_path / "a")
    assert mf_fetch.fetch_mf(archive, now=NOW1, http=Net(fail_package=True)).failed
    undated = res("r-x", "Lista entitatilor publice", "lista.xls")
    summary = mf_fetch.fetch_mf(archive, now=NOW1, http=Net(undated, NOV))
    assert summary.archived == ["2026-11-01"] and len(summary.unclassified) == 1
    assert mf_fetch.fetch_mf(Archive(tmp_path / "b"), now=NOW1, http=Net(undated)).failed == ["no resource with a readable snapshot date"]


def test_the_cli_verb_prints_the_summary_and_exits_1_on_a_failure(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(mf_fetch.requests, "get", Net(NOV))
    monkeypatch.setattr(cli, "fetch_mf", lambda archive: mf_fetch.fetch_mf(archive, now=NOW1, http=Net(NOV)))
    assert cli.main(["--archive", str(tmp_path / "a"), "fetch-mf"]) == 0
    assert "archived: 1" in capsys.readouterr().out
    monkeypatch.setattr(cli, "fetch_mf", lambda archive: mf_fetch.fetch_mf(archive, now=NOW1, http=Net(fail_package=True)))
    assert cli.main(["--archive", str(tmp_path / "b"), "fetch-mf"]) == 1


# ---- the reader and the classification ------------------------------------------------------------------------------------

def fixture_path():
    [unit] = Archive(FIXTURE).units()
    return unit.file_path(unit.files[0] if unit.files[0].endswith(".xls") else unit.files[1])


def test_the_fixture_slice_reads_with_normalised_cuis_and_the_county_as_written():
    rows = read_list(fixture_path())
    assert len(rows) == 16
    assert rows[0].county == "Brasov" and rows[0].name == "MUNICIPIUL BRASOV" and rows[0].uat == "Municipiul Brasov"
    assert all(r.cui.isdigit() and not r.cui.startswith("0") for r in rows)


@pytest.mark.parametrize("value, expected", [("1767070", "1767070"), (1767070.0, "1767070"), ("RO 1767070", "1767070"), ("01767070", "1767070"), ("", ""), (None, ""), ("n/a", "")])
def test_cuis_are_normalised_like_an_authoritys_key(value, expected):
    assert normalise_cui(value) == expected


def test_a_file_without_the_expected_columns_is_an_error(tmp_path):
    import xlwt

    book = xlwt.Workbook()
    sheet = book.add_sheet("S")
    sheet.write(0, 0, "Something else")
    path = tmp_path / "x.xls"
    book.save(str(path))
    with pytest.raises(MfError):
        read_list(path)


def test_classification_puts_a_national_authority_in_no_county_and_counts_the_rest():
    gaz = Gazetteer(counties=[County("BV", "8", "Brașov"), County("B", "40", "București")])
    rows = read_list(fixture_path())
    ministry = next(r for r in rows if r.name == "MINISTERUL EXEMPLULUI")
    data, summary = classify(rows, gaz, {}, {ministry.cui: Entry(ministry.cui, True, False, "", "fixture")})
    by_cui = {d[0]: d for d in data}
    assert by_cui[ministry.cui][2:] == ("B", "Sectorul 1 al Municipiului Bucuresti", True, "file")  # MF's county is kept; `national` is what moves it
    assert summary.entities == 15 and summary.duplicates == 1 and summary.national == 1
    assert summary.no_county == 5  # Cluj is not in this two-county gazetteer (4 entities) and the foreign mission (1)
