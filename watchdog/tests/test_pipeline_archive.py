"""Seam 2 for the raw archive: a Connector fetch with HTTP stubbed lands unchanged, manifest last (ADR 0004).
Plus the archive's reading rules: only complete units count, a failing file is quarantined with a reason.
No test touches the network or a database."""
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pytest

from pipeline import fetch
from pipeline.archive import Archive, ArchiveError
from pipeline.bulk import InvalidFile, parse_file
from pipeline.rebuild import plan

FIXTURE = Path(__file__).parent / "fixtures" / "archive"
NOW = datetime(2022, 6, 15, 9, 30, tzinfo=timezone.utc)
CSV = "|A|,|B|\r\n|x|,1\r\n".encode("utf-8")


class FakeStream:
    def __init__(self, body: bytes, fail_after: int | None = None):
        self.body, self.fail_after = body, fail_after

    def raise_for_status(self):
        pass

    def iter_content(self, chunk_size):
        for i in range(0, len(self.body), 4):
            if self.fail_after is not None and i >= self.fail_after:
                raise ConnectionError("connection reset")
            yield self.body[i : i + 4]


@pytest.fixture
def archive(tmp_path):
    return Archive(tmp_path / "archive")


@pytest.fixture
def copy_of_fixture(tmp_path):
    root = tmp_path / "fixture-archive"
    shutil.copytree(FIXTURE, root)
    return Archive(root)


def test_a_fetched_file_lands_unchanged_under_a_dated_path(archive, monkeypatch):
    calls = []
    monkeypatch.setattr(fetch.requests, "get", lambda url, **kw: calls.append((url, kw)) or FakeStream(CSV))
    where = fetch.fetch_bulk_file(
        archive, url="https://data.gov.ro/x/download/raport-da-t1.csv", kind="da", unit="2022Q1",
        via="Achiziții directe 2022 - T1", now=NOW,
    )
    assert where == archive.root / "seap/bulk/da/2022Q1/2022-06-15"
    assert (where / "raport-da-t1.csv").read_bytes() == CSV  # byte for byte, CRLF and all
    assert calls[0][0] == "https://data.gov.ro/x/download/raport-da-t1.csv"
    [unit] = archive.units()
    assert (unit.unit, unit.via, unit.fetched_at) == ("2022Q1", "Achiziții directe 2022 - T1", NOW)


def test_the_manifest_is_written_after_the_files(archive):
    where = archive.write_unit(
        source="seap", stream="bulk", kind="da", unit="2022Q1", fetched_at=NOW, files={"a.csv": CSV, "b.csv": CSV},
    )
    manifest, data = where / "manifest.json", [where / "a.csv", where / "b.csv"]
    assert all(manifest.stat().st_mtime_ns >= f.stat().st_mtime_ns for f in data)
    assert not list(where.glob("*.tmp"))
    assert {e["name"] for e in json.loads(manifest.read_text())["files"]} == {"a.csv", "b.csv"}


def test_a_download_that_dies_leaves_no_unit_behind(archive, monkeypatch):
    monkeypatch.setattr(fetch.requests, "get", lambda url, **kw: FakeStream(CSV, fail_after=4))
    with pytest.raises(ConnectionError):
        fetch.fetch_bulk_file(archive, url="https://x/y.csv", kind="da", unit="2022Q1", via="v", now=NOW)
    assert archive.units() == [] and archive.incomplete() == []
    assert list(archive.root.rglob("*.csv")) == [] and not list(archive.root.glob(".download-*"))


def test_an_archived_unit_is_never_overwritten(archive):
    kwargs = dict(source="seap", stream="bulk", kind="da", unit="2022Q1", fetched_at=NOW, files={"a.csv": CSV})
    archive.write_unit(**kwargs)
    with pytest.raises(ArchiveError):
        archive.write_unit(**kwargs)


def test_a_unit_without_a_manifest_or_with_a_changed_file_is_not_complete(copy_of_fixture):
    a = copy_of_fixture
    [good, *_] = [u for u in a.units() if u.unit == "2022Q1"]
    assert [u.unit for u in a.units()] == ["2022Q1", "2022Q2"]
    assert [p.parent.name for p in a.incomplete()] == ["2022Q3"]  # file present, manifest never written
    (good.path / good.files[0]).write_bytes(b"tampered")
    assert [u.unit for u in a.units()] == ["2022Q2"]
    assert sorted(p.parent.name for p in a.incomplete()) == ["2022Q1", "2022Q3"]


def test_the_fixture_file_parses_with_dedup_blank_value_and_cui_cleanup(copy_of_fixture):
    [unit] = [u for u in copy_of_fixture.units() if u.unit == "2022Q1"]
    rows = {r.code: r for r in parse_file("da", unit.unit, unit.file_path(unit.files[0]))}
    assert sorted(rows) == ["DA90000001", "DA90000002", "DA90000003", "DA90000004"]  # the duplicate row is dropped
    assert rows["DA90000001"].value_bani == 120050 and rows["DA90000001"].authority_name.endswith("JUDETUL TEST)")
    assert rows["DA90000001"].awarded_on.isoformat() == "2022-03-30"  # MM/DD/YYYY
    assert rows["DA90000003"].value_bani is None and rows["DA90000003"].supplier_cui == "2000003"
    assert rows["DA90000004"].awarded_on is None and rows["DA90000004"].supplier_cui == "2000002"


@pytest.mark.parametrize(
    "text, why",
    [
        ("|NUMAR_ACHIZITIE|,|DATA|\n|DA1|,|01/01/2022|\n", "headers do not match"),
        ("", "empty"),
    ],
)
def test_a_file_with_wrong_headers_is_invalid(tmp_path, text, why):
    f = tmp_path / "x.csv"
    f.write_text(text)
    with pytest.raises(InvalidFile, match=why):
        parse_file("da", "2022Q1", f)


def test_a_ragged_row_rejects_the_whole_file(tmp_path):
    good = (FIXTURE / "seap/bulk/da/2022Q1/2022-06-15/raport-achizitii-directe-t1-2022.csv").read_text(encoding="utf-8")
    f = tmp_path / "x.csv"
    f.write_text(good + "|DA1|,|01/01/2022|\n", encoding="utf-8")
    with pytest.raises(InvalidFile, match="line 7"):
        parse_file("da", "2022Q1", f)


def test_planning_a_rebuild_quarantines_a_failing_unit_with_a_reason_and_loads_the_rest(copy_of_fixture):
    a = copy_of_fixture
    p = plan(a)
    assert [(u.unit, n, len(rows)) for u, n, rows in p.files] == [("2022Q1", "raport-achizitii-directe-t1-2022.csv", 4)]
    [q] = p.summary.quarantined
    assert q == a.root / "quarantine/seap/bulk/da/2022Q2/2022-09-15"
    reason = json.loads((q / "reason.json").read_text())
    assert "headers do not match" in reason["reason"] and "missing:" in reason["problems"][0]
    assert (q / "raport-achizitii-directe-t2-2022.csv").exists() and (q / "manifest.json").exists()
    assert not (a.root / "seap/bulk/da/2022Q2").exists() or not list((a.root / "seap/bulk/da/2022Q2").iterdir())
    assert a.quarantined() == [q]
    again = plan(a)  # the quarantined unit stays out of later rebuilds
    assert [u.unit for u, _, _ in again.files] == ["2022Q1"] and again.summary.quarantined == []
