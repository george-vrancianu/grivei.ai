"""The pinned inputs (ticket #292): what a build fixes at its start, and the archive view that shows only that set. No database."""
import hashlib
import json
from datetime import date, datetime, timezone
from pathlib import Path

from pipeline.archive import Archive
from pipeline.pins import code_files, code_version, compute_pins, pin_extra, schema_files, unit_checksums
from pipeline.crawl.unitdir import fetches, kind_dir, last_bulk_quarter_end
from pipeline.estimates import RESPONSE_FILE, read_estimates


def _unit(archive: Archive, unit: str, day: int) -> Path:
    return archive.write_unit(source="seap", stream="bulk", kind="dan", unit=unit, fetched_at=datetime(2026, 1, day, 9, tzinfo=timezone.utc),
                              files={"f.csv": b"a,b\n"}, via="v")


def test_the_pins_list_every_fetch_directory_by_relative_path_with_its_manifest_checksum(tmp_path):
    a = Archive(tmp_path)
    done = _unit(a, "2024Q1", 1)
    half = tmp_path / "seap/bulk/dan/2024Q2/2026-01-02"
    half.mkdir(parents=True)  # a fetch with no manifest yet
    pins = unit_checksums(a)
    assert set(pins) == {"seap/bulk/dan/2024Q1/2026-01-01", "seap/bulk/dan/2024Q2/2026-01-02"}
    assert pins["seap/bulk/dan/2024Q2/2026-01-02"] is None and len(pins["seap/bulk/dan/2024Q1/2026-01-01"]) == 64
    assert done.exists()


def test_a_pinned_view_does_not_see_a_unit_that_lands_later_or_one_that_completes_later(tmp_path):
    a = Archive(tmp_path)
    _unit(a, "2024Q1", 1)
    half = tmp_path / "seap/bulk/dan/2024Q2/2026-01-02"
    half.mkdir(parents=True)
    view = a.pinned(unit_checksums(a), set())
    _unit(a, "2024Q3", 3)  # lands after the pin
    (half / "f.csv").write_bytes(b"a,b\n")  # the half-fetched one completes after the pin
    manifest = {"version": 1, "source": "seap", "stream": "bulk", "kind": "dan", "unit": "2024Q2", "fetchedAt": "2026-01-02T09:00:00Z", "url": None,
                "via": "v", "files": [{"name": "f.csv", "sha256": __import__("hashlib").sha256(b"a,b\n").hexdigest(), "bytes": 4}]}
    (half / "manifest.json").write_text(json.dumps(manifest))
    assert [u.unit for u in a.units("seap")] == ["2024Q1", "2024Q2", "2024Q3"]
    assert [u.unit for u in view.units("seap")] == ["2024Q1"]  # the third is unpinned, the second was incomplete at the pin
    assert [p.name for p in view.incomplete()] == ["2026-01-02"]
    assert len(list(view.fetch_dirs())) == 2


def test_a_directory_pinned_without_a_manifest_stays_incomplete_for_the_readers_that_bypass_the_survey(tmp_path):
    a = Archive(tmp_path)
    crawl = kind_dir(a) / "2026-04-01" / "2026-05-01"
    bulk = tmp_path / "seap/bulk/contracte/2026Q1/2026-05-01"
    estimate = tmp_path / "seap/estimates/notice-value/n1/2026-05-01"
    dirs = [(crawl, "x.json"), (bulk, "x.json"), (estimate, RESPONSE_FILE)]
    for d, _ in dirs:
        d.mkdir(parents=True)  # mid-write at pin time: no manifest yet
    view = a.pinned(unit_checksums(a), set())
    for d, name in dirs:  # the writers finish after the pin
        (d / name).write_bytes(b"{}")
        (d / "manifest.json").write_text(json.dumps({"version": 1, "source": "seap", "stream": "s", "kind": "k", "unit": "u", "fetchedAt": "2026-05-01T09:00:00Z",
                                                   "files": [{"name": name, "sha256": hashlib.sha256(b"{}").hexdigest(), "bytes": 2}]}))
    assert fetches(a, "2026-04-01")[0][1] is not None  # the plain archive sees it complete
    assert [m for _, m in fetches(view, "2026-04-01")] == [None]  # the pinned view lists the directory but still as incomplete
    assert last_bulk_quarter_end(a) is not None and last_bulk_quarter_end(view) is None
    assert a.complete_at_pin(estimate) and not view.complete_at_pin(estimate)
    assert read_estimates(a) != {} and read_estimates(view) == {}


def test_a_pinned_view_lists_the_quarantine_of_the_pin_plus_what_it_quarantines_itself(tmp_path):
    a = Archive(tmp_path)
    old = _unit(a, "2024Q1", 1)
    unit = next(u for u in a.units("seap"))
    a.quarantine(unit, "bad", [])
    view = a.pinned(unit_checksums(a), {p.relative_to(tmp_path / "quarantine").as_posix() for p in a.quarantined()})
    later = _unit(a, "2024Q2", 2)
    a.quarantine(next(u for u in a.units("seap")), "bad too", [])  # moved by somebody else after the pin
    assert [p.name for p in a.quarantined()] == ["2026-01-01", "2026-01-02"] and [str(p.relative_to(tmp_path)) for p in view.quarantined()] == ["quarantine/seap/bulk/dan/2024Q1/2026-01-01"]
    assert not old.exists() and not later.exists()


def test_crawl_and_estimate_readers_see_only_the_pinned_directories(tmp_path):
    a = Archive(tmp_path)
    a.write_unit(source="seap", stream="crawl", kind="award-notices", unit="2026-04-01", fetched_at=datetime(2026, 5, 1, tzinfo=timezone.utc), files={"x.json": b"{}"})
    view = a.pinned(unit_checksums(a), set())
    a.write_unit(source="seap", stream="crawl", kind="award-notices", unit="2026-04-01", fetched_at=datetime(2026, 5, 2, tzinfo=timezone.utc), files={"x.json": b"{}"})
    assert len(fetches(a, "2026-04-01")) == 2 and len(fetches(view, "2026-04-01")) == 1
    assert read_estimates(view) == {}


def test_the_code_version_is_a_content_hash_of_the_package_without_its_caches(tmp_path):
    (tmp_path / "sql").mkdir()
    (tmp_path / "a.py").write_text("x = 1\n")
    (tmp_path / "sql" / "s.sql").write_text("SELECT 1;\n")
    base = code_version(package=tmp_path)
    (tmp_path / "__pycache__").mkdir()
    (tmp_path / "__pycache__" / "a.cpython-312.pyc").write_bytes(b"junk")
    assert code_version(package=tmp_path) == base
    (tmp_path / "sql" / "s.sql").write_text("SELECT 2;\n")
    assert code_version(package=tmp_path) != base


def test_an_input_file_from_outside_the_package_is_folded_into_the_code_version(tmp_path):
    (tmp_path / "pkg").mkdir()
    (tmp_path / "pkg" / "a.py").write_text("x = 1\n")
    overrides = tmp_path / "overrides.toml"
    overrides.write_text("a = 1\n")
    v1 = code_version(pin_extra(overrides, None, None), package=tmp_path / "pkg")
    assert v1 != code_version(pin_extra(None, None, None), package=tmp_path / "pkg")
    overrides.write_text("a = 2\n")
    assert code_version(pin_extra(overrides, None, None), package=tmp_path / "pkg") != v1


def test_the_schema_files_are_recorded_by_name_and_compute_pins_carries_the_day(tmp_path):
    assert "build_schema.sql" in schema_files() and "core_schema.sql" in schema_files()
    pins = compute_pins(Archive(tmp_path), date(2026, 11, 20))
    assert pins.today == date(2026, 11, 20) and pins.units == {} and pins.schema_files == schema_files()


def test_code_files_is_the_per_file_form_of_the_code_version(tmp_path):
    pkg, outside = tmp_path / "pkg", tmp_path / "outside"
    (pkg / "sql").mkdir(parents=True)
    (pkg / "__pycache__").mkdir()
    (pkg / "__pycache__" / "a.cpython-312.pyc").write_bytes(b"junk")
    (pkg / "a.py").write_text("x = 1\n")
    (pkg / "sql" / "s.sql").write_text("SELECT 1;\n")
    (outside / "d").mkdir(parents=True)
    (outside / "d" / "t.csv").write_text("1\n")
    (tmp_path / "o.toml").write_text("a = 1\n")
    extra = {"identity-overrides": tmp_path / "o.toml", "placement-data": outside, "known-gaps": None}
    files = code_files(extra, pkg)
    assert set(files) == {"a.py", "sql/s.sql", "extra:identity-overrides", "extra:placement-data/d/t.csv"}
    assert files["a.py"] == hashlib.sha256(b"x = 1\n").hexdigest()
    before = code_version(extra, pkg)
    (pkg / "a.py").write_text("x = 2\n")
    assert code_files(extra, pkg)["a.py"] != files["a.py"] and code_version(extra, pkg) != before  # both move together


def test_compute_pins_carries_the_code_files_of_the_package_it_is_given(tmp_path):
    (tmp_path / "pkg").mkdir()
    (tmp_path / "pkg" / "a.py").write_text("x = 1\n")
    pins = compute_pins(Archive(tmp_path / "a"), date(2026, 11, 20), package=tmp_path / "pkg")
    assert set(pins.code_files) == {"a.py"} and pins.code_version == code_version(package=tmp_path / "pkg")
