"""Seam 2 for the data.gov.ro fetch: HTTP stubbed (`requests.get`), tiny hand-written CKAN responses and few-byte files.
Assertions are on the archived files, their manifests and the returned/printed summary. No network, no database,
and the fetch never imports the loader."""
import json
from datetime import datetime, timezone

import pytest

from pipeline import cli, datagov, fetch
from pipeline.archive import Archive

DAY1 = datetime(2026, 11, 1, 8, 0, tzinfo=timezone.utc)
DAY2 = datetime(2026, 11, 8, 8, 0, tzinfo=timezone.utc)
BASE = "https://data.gov.ro/dataset/ds/resource"


def resource(rid, name, filename, *, modified="2026-04-01T07:00:00.000000", size=10, fmt="CSV", hash_="", url=None):
    return {
        "id": rid, "name": name, "format": fmt, "size": size, "hash": hash_, "last_modified": modified,
        "url": f"{BASE}/{rid}/download/{filename}" if url is None else url,
    }


def package(year, *resources):
    return {"success": True, "result": {"name": f"achizitii-publice-{year}", "id": f"id-{year}", "resources": list(resources)}}


class Net:
    """Stands in for `requests.get`: CKAN packages by name, file bodies by URL; records every request."""

    def __init__(self):
        self.packages: dict[str, dict] = {}
        self.bodies: dict[str, bytes] = {}
        self.broken: set[str] = set()
        self.requests: list[str] = []

    def downloads(self):
        return [u for u in self.requests if "/api/3/" not in u]

    def __call__(self, url, **kw):
        self.requests.append(url)
        assert kw.get("timeout") and kw["headers"]["User-Agent"] == fetch.USER_AGENT
        if "/api/3/action/package_show" in url:
            name = url.split("id=")[1]
            if name not in self.packages:
                return Response(404, {"success": False})
            return Response(200, self.packages[name])
        if url in self.broken:
            return Response(200, body=b"abcdef", fail_after=3)
        return Response(200, body=self.bodies[url])


class Response:
    def __init__(self, status, payload=None, body=b"", fail_after=None):
        self.status_code, self.payload, self.body, self.fail_after = status, payload, body, fail_after

    def raise_for_status(self):
        if self.status_code >= 400:
            raise fetch.requests.HTTPError(f"{self.status_code}")

    def json(self):
        return self.payload

    def iter_content(self, chunk_size):
        for i in range(0, len(self.body), 2):
            if self.fail_after is not None and i >= self.fail_after:
                raise ConnectionError("connection reset")
            yield self.body[i : i + 2]


@pytest.fixture
def net(monkeypatch):
    n = Net()
    monkeypatch.setattr(fetch.requests, "get", n)
    return n


@pytest.fixture
def archive(tmp_path):
    return Archive(tmp_path / "archive")


def da_q1(**kw):
    return resource("r-da1", "Achiziții directe 2026 - T1", "raport-achizitii-directe-t1-2026.csv", **kw)


def serve(net, *resources, year=2026):
    net.packages[f"achizitii-publice-{year}"] = package(year, *resources)
    for r in resources:
        net.bodies[r["url"]] = f"body-of-{r['id']}".encode()


def run(archive, now=DAY1, **kw):
    return datagov.fetch_datagov(archive, since_year=2026, now=now, delay=0, **kw)


# ---- new files are archived with manifests ------------------------------------------------------------------

def test_every_wanted_file_is_archived_unchanged_with_a_manifest_naming_its_resource(net, archive):
    serve(
        net,
        da_q1(),
        resource("r-dan", "Notificări de atribuire la cumpărarea directă 2026 - T1", "raport-notificari-t1-2026.csv"),
        resource("r-con", "Contracte 2026 T1", "raport-contracte-t1-2026.csv", fmt="XLSX"),
        resource("r-fai", "Anunțuri de atribuire la proceduri fără anunț de inițiere 2026 - T1", "raport-fara-anunt-t1-2026.xlsx"),
    )
    summary = run(archive)
    assert sorted((a.kind, a.unit) for a in summary.archived) == [
        ("contracte", "2026Q1"), ("da", "2026Q1"), ("dan", "2026Q1"), ("fara-anunt", "2026Q1"),
    ]
    da = archive.root / "seap/bulk/da/2026Q1/2026-11-01"
    assert (da / "raport-achizitii-directe-t1-2026.csv").read_bytes() == b"body-of-r-da1"
    manifest = json.loads((da / "manifest.json").read_text())
    assert manifest["origin"] == {
        "system": "data.gov.ro", "dataset": "achizitii-publice-2026", "datasetId": "id-2026", "resourceId": "r-da1",
        "resourceName": "Achiziții directe 2026 - T1", "url": da_q1()["url"], "lastModified": "2026-04-01T07:00:00.000000",
        "size": 10, "hash": "", "format": "CSV",
    }
    assert (archive.root / "seap/bulk/fara-anunt/2026Q1/2026-11-01/raport-fara-anunt-t1-2026.xlsx").is_file()
    assert len(archive.units()) == 4 and sorted(summary.touched) == sorted(u.path for u in archive.units())
    assert summary.counts() == {"archived": 4, "unchanged": 0, "ignored": 0, "unclassified": 0, "failed": 0}


def test_unwanted_kinds_are_ignored_and_unrecognisable_ones_are_reported_not_fatal(net, archive):
    serve(
        net,
        da_q1(),
        resource("r-init", "Anunțuri de inițiere 2026 - T1", "raport-anunturi-de-initiere-t1-2026.xls"),
        resource("r-mod", "Date din modificare contract T1 2026.xlsx", "raport-date-din-modificare-contract-t1-2026.xlsx"),
        resource("r-new", "Ceva nou 2026 - T1", "ceva-nou-t1-2026.csv"),
        resource("r-noq", "Contracte 2026", "raport-contracte-2026.csv"),
        resource("r-nourl", "Achiziții directe 2026 - T2", "x.csv", url=""),
    )
    summary = run(archive)
    assert [a.kind for a in summary.archived] == ["da"]
    assert sorted(i.resource_id for i in summary.ignored) == ["r-init", "r-mod"]
    assert sorted(u.resource_id for u in summary.unclassified) == ["r-new", "r-noq", "r-nourl"]
    assert len(net.downloads()) == 1
    text = "\n".join(summary.lines())
    assert "Ceva nou 2026 - T1" in text and "unclassified" in text


def test_a_resource_whose_name_and_url_disagree_is_not_archived_under_either_kind(net, archive):
    """The Q2 2025 DAN resource really points at the 'fără anunț' file (research): do not file it as DAN."""
    serve(
        net,
        resource("r-bad", "Notificări de atribuire la cumpărarea directă 2026 - T2", "raport-fara-anunt-t2-2026.xlsx"),
    )
    summary = run(archive)
    assert summary.archived == [] and [u.resource_id for u in summary.unclassified] == ["r-bad"]
    assert net.downloads() == []


def test_only_datasets_from_the_start_year_are_asked_for_and_a_missing_one_is_reported(net, archive):
    serve(net, da_q1())
    summary = datagov.fetch_datagov(archive, since_year=2025, now=DAY1, delay=0)
    asked = [u.split("id=")[1] for u in net.requests if "package_show" in u]
    assert asked == ["achizitii-publice-2025", "achizitii-publice-2026"]
    assert summary.missing_datasets == ["achizitii-publice-2025"] and len(summary.archived) == 1


def test_a_second_csv_and_xls_of_the_same_quarter_do_not_collide(net, archive):
    serve(
        net,
        da_q1(),
        resource("r-da1x", "Achiziții directe 2026 - T1 (xls)", "raport-achizitii-directe-t1-2026.xls", fmt="XLS"),
    )
    summary = run(archive)
    assert [a.resource_id for a in summary.archived] == ["r-da1"]  # CSV preferred
    assert [i.resource_id for i in summary.ignored] == ["r-da1x"]


# ---- later runs ---------------------------------------------------------------------------------------------

def test_an_unchanged_resource_is_skipped_without_a_download_request(net, archive):
    serve(net, da_q1())
    run(archive)
    before = {p: p.read_bytes() for p in archive.root.rglob("*") if p.is_file()}
    net.requests.clear()
    summary = run(archive, now=DAY2)
    assert net.downloads() == [] and len(net.requests) == 1  # only the package_show
    assert [u.resource_id for u in summary.unchanged] == ["r-da1"] and summary.archived == [] and summary.touched == []
    assert {p: p.read_bytes() for p in archive.root.rglob("*") if p.is_file()} == before  # nothing new, nothing changed


def test_a_reuploaded_resource_is_archived_beside_the_old_one_which_stays_byte_identical(net, archive):
    serve(net, da_q1())
    run(archive)
    old = archive.root / "seap/bulk/da/2026Q1/2026-11-01"
    old_files = {p.name: p.read_bytes() for p in old.iterdir()}
    net.bodies[da_q1()["url"]] = b"corrected body"
    net.packages["achizitii-publice-2026"] = package(2026, da_q1(modified="2026-11-05T10:00:00.000000", size=14))
    summary = run(archive, now=DAY2)
    new = archive.root / "seap/bulk/da/2026Q1/2026-11-08"
    assert [a.path for a in summary.archived] == [new]
    assert (new / "raport-achizitii-directe-t1-2026.csv").read_bytes() == b"corrected body"
    assert {p.name: p.read_bytes() for p in old.iterdir()} == old_files
    assert len(archive.units()) == 2
    # and now that one is the latest, a further run skips it
    net.requests.clear()
    assert len(run(archive, now=DAY2).unchanged) == 1 and net.downloads() == []


def test_a_replacement_resource_for_the_same_quarter_is_also_archived_as_new(net, archive):
    serve(net, da_q1())
    run(archive)
    serve(net, resource("r-da1-v2", "Achiziții directe 2026 - T1", "raport-achizitii-directe-t1-2026-v2.csv"))
    summary = run(archive, now=DAY2)
    assert [a.resource_id for a in summary.archived] == ["r-da1-v2"] and len(archive.units()) == 2


def test_a_reupload_on_the_same_day_gets_its_own_directory_and_never_overwrites(net, archive):
    serve(net, da_q1())
    run(archive)
    first = archive.root / "seap/bulk/da/2026Q1/2026-11-01"
    first_bytes = (first / "raport-achizitii-directe-t1-2026.csv").read_bytes()
    net.bodies[da_q1()["url"]] = b"second"
    net.packages["achizitii-publice-2026"] = package(2026, da_q1(modified="2026-11-01T09:00:00.000000"))
    summary = run(archive, now=DAY1.replace(hour=12))
    assert [a.path for a in summary.archived] == [archive.root / "seap/bulk/da/2026Q1/2026-11-01.2"]
    assert (first / "raport-achizitii-directe-t1-2026.csv").read_bytes() == first_bytes
    assert len(archive.units()) == 2


# ---- failures and politeness --------------------------------------------------------------------------------

def test_a_failed_download_leaves_no_unit_and_does_not_stop_the_others(net, archive):
    q2 = resource("r-da2", "Achiziții directe 2026 - T2", "raport-achizitii-directe-t2-2026.csv")
    serve(net, da_q1(), q2)
    net.broken.add(da_q1()["url"])
    summary = run(archive)
    assert [a.resource_id for a in summary.archived] == ["r-da2"]
    [failure] = summary.failed
    assert failure.resource_id == "r-da1" and "connection reset" in failure.reason
    assert not (archive.root / "seap/bulk/da/2026Q1").exists() and archive.incomplete() == []
    assert not list(archive.root.glob(".download-*"))
    net.broken.clear()  # next run retries it
    assert [a.resource_id for a in run(archive, now=DAY2).archived] == ["r-da1"]


def test_a_failing_dataset_request_is_a_failure_not_a_crash(archive, monkeypatch):
    def boom(url, **kw):
        raise fetch.requests.ConnectionError("no route")

    monkeypatch.setattr(fetch.requests, "get", boom)
    summary = run(archive)
    assert [f.resource_id for f in summary.failed] == [None] and "achizitii-publice-2026" in summary.failed[0].dataset


def test_downloads_are_spaced_by_the_configured_delay(net, archive, monkeypatch):
    slept = []
    monkeypatch.setattr(datagov.time, "sleep", slept.append)
    serve(net, da_q1(), resource("r-da2", "Achiziții directe 2026 - T2", "raport-achizitii-directe-t2-2026.csv"))
    datagov.fetch_datagov(archive, since_year=2026, now=DAY1, delay=0.5)
    assert slept.count(0.5) >= 2


# ---- written before any load, never modified ----------------------------------------------------------------

def test_fetching_never_loads_and_never_modifies_what_is_archived(net, archive):
    serve(net, da_q1())
    run(archive)
    snapshot = {p: (p.read_bytes(), p.stat().st_mtime_ns) for p in archive.root.rglob("*") if p.is_file()}
    run(archive, now=DAY2)
    run(archive, now=DAY2)
    assert {p: (p.read_bytes(), p.stat().st_mtime_ns) for p in archive.root.rglob("*") if p.is_file()} == snapshot
    assert not (archive.root / "quarantine").exists()  # fetching validates and loads nothing


# ---- the CLI ------------------------------------------------------------------------------------------------

def test_the_cli_verb_prints_a_summary(net, tmp_path, capsys, monkeypatch):
    serve(net, da_q1(), resource("r-new", "Ceva nou 2026 - T1", "ceva.csv"))
    monkeypatch.setattr(datagov.time, "sleep", lambda s: None)
    code = cli.main(["--archive", str(tmp_path / "a"), "fetch-datagov", "--since-year", "2026", "--delay", "0"])
    out = capsys.readouterr().out
    assert code == 0
    assert "archived: 1" in out and "unclassified: 1" in out and "unchanged: 0" in out and "failed: 0" in out
    assert (tmp_path / "a/seap/bulk/da/2026Q1").is_dir()


# ---- review fixes -------------------------------------------------------------------------------------------

def test_an_unchanged_quarantined_resource_is_not_downloaded_again(net, archive):
    serve(net, da_q1())
    run(archive)
    [unit] = archive.units()
    archive.quarantine(unit, "bad headers")
    net.requests.clear()
    summary = run(archive, now=DAY2)
    assert net.downloads() == [] and summary.archived == [] and len(summary.unchanged) == 1
    assert len(archive.units()) == 0 and len(archive.quarantined()) == 1
    # a real re-upload of the quarantined file is still fetched
    net.packages["achizitii-publice-2026"] = package(2026, da_q1(modified="2026-11-05T10:00:00.000000"))
    assert len(run(archive, now=DAY2).archived) == 1


def test_a_resource_without_an_id_or_not_a_dict_is_reported_and_the_others_still_run(net, archive):
    good = da_q1()
    noid = resource("x", "Achiziții directe 2026 - T2", "raport-achizitii-directe-t2-2026.csv")
    del noid["id"]
    blank = resource("", "Contracte 2026 - T1", "raport-contracte-t1-2026.csv")
    serve(net, good)
    net.packages["achizitii-publice-2026"] = package(2026, noid, "junk", None, blank, good)
    summary = run(archive)
    assert [a.resource_id for a in summary.archived] == ["r-da1"]
    assert len(summary.unclassified) == 4 and all("no id" in u.reason or "not a resource" in u.reason for u in summary.unclassified)
    assert summary.failed == []


def test_a_corrected_csv_listed_beside_the_old_one_is_fetched_whatever_the_api_order(net, archive):
    old = da_q1()
    new = resource("r-da1-new", "Achiziții directe 2026 - T1", "raport-achizitii-directe-t1-2026-corectat.csv",
                   modified="2026-11-05T10:00:00.000000")
    for order in ((old, new), (new, old)):
        a = Archive(archive.root.parent / f"a{order[0]['id']}")
        serve(net, *order)
        summary = run(a)
        assert [x.resource_id for x in summary.archived] == ["r-da1-new"]
        [ignored] = summary.ignored
        assert ignored.resource_id == "r-da1" and "older resource" in ignored.reason
