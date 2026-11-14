"""The ONRC Connector's fetch half (#175) against a stub data.gov.ro in the shape of the real one (tests/fixtures/build_onrc_archive.py): which
snapshots are wanted, the unit written per snapshot with the resource identity in its manifest, change detection, the failure classes, `pipeline status`."""
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent / "fixtures"))  # the archive builders
from build_onrc_archive import FETCHED, S1, S2, S3, S4, ckan, datasets  # noqa: E402
from pipeline import cli  # noqa: E402
from pipeline.archive import Archive
from pipeline.onrc import read
from pipeline.onrc.fetch import fetch_onrc, held_snapshots, layout_files, snapshot_date, wanted
from pipeline.onrc.status import describe, missing_months
from pipeline.refresh import DeterministicError, TransientError
from pipeline.refresh.steps import Impl, ONRC_STALE_AFTER_DAYS


@pytest.fixture
def world():
    return datasets()


@pytest.fixture
def archive(tmp_path):
    return Archive(tmp_path / "archive")


def test_snapshot_dates_are_read_from_the_title_in_either_form_or_the_dataset_name():
    assert snapshot_date({"title": "Firme înregistrate la Registrul Comerțului până la data de 04.11.2026", "name": "x"}) == date(2026, 11, 4)
    assert snapshot_date({"title": "Firme înregistrate la Registrul Comerțului până la data de 04 mai 2021"}) == date(2021, 5, 4)
    assert snapshot_date({"title": "Firme", "name": "firme-19-10-2026"}) == date(2026, 10, 19)
    assert snapshot_date({"title": "Firme", "name": "firme-inregistrate-la-registrul-comertului-pana-la-data-de-07-aprilie-2024"}) == date(2024, 4, 7)
    assert snapshot_date({"title": "Firme", "name": "nothing"}) is None


def test_wanted_is_every_month_since_march_2026_and_the_last_snapshot_of_each_earlier_quarter_back_to_2021():
    held = [date(2020, 12, 8), date(2021, 2, 8), date(2021, 5, 4), date(2021, 9, 10), date(2021, 12, 9), date(2025, 10, 6), date(2025, 11, 13), date(2025, 12, 8), date(2026, 1, 9),
            date(2026, 2, 3), date(2026, 3, 2), date(2026, 4, 3), date(2026, 11, 4)]
    assert wanted(held) == [date(2026, 11, 4), date(2026, 4, 3), date(2026, 3, 2), date(2025, 12, 8), date(2021, 12, 9), date(2021, 9, 10), date(2021, 5, 4), date(2021, 2, 8)]
    # 2020 is before the quarterly window; October and November 2025 and January and February 2026 are not the last snapshot of their quarter


def test_both_layouts_are_recognised_by_the_resource_names(world):
    packages, _ = world
    layout, files = layout_files(packages["firme-02-03-2026"])
    assert (layout, [role for role, _ in files]) == ("current", ["firme", "stare", "caen"])
    layout, files = layout_files(packages["firme-inregistrate-la-registrul-comertului-pana-la-data-de-18-martie-2025"])
    assert layout == "legacy" and [role for role, _ in files].count("legacy") == 4 and ("nomenclature" in [role for role, _ in files])
    assert layout_files({"resources": [{"id": "a", "name": "something else.csv", "url": "u"}]}) is None


def test_a_fetch_archives_one_unit_per_wanted_snapshot_with_the_resource_identity_and_row_counts(archive, world):
    summary = fetch_onrc(archive, now=FETCHED, http=ckan(*world))
    assert summary.archived == [S4, S3, S2, S1]  # newest first
    assert summary.not_wanted == 1 and not summary.failed and not summary.invalid  # the February 2025 snapshot is not the last of its quarter
    units = {u.unit: u for u in archive.units("onrc")}
    assert sorted(units) == [S1, S2, S3, S4]
    current = units[S2]
    assert sorted(current.files) == ["n_stare_firma.csv", "od_caen_autorizat.csv", "od_firme.csv", "od_stare_firma.csv"]  # the nomenclature comes from its own dataset
    origin = current.origin
    assert origin["system"] == "data.gov.ro" and origin["layout"] == "current" and origin["dataset"] == "firme-02-03-2026" and origin["snapshot"] == S2
    by_role = {r["role"]: r for r in origin["resources"]}
    assert set(by_role) == {"firme", "stare", "caen", "nomenclature"}
    assert by_role["firme"]["resourceId"] and by_role["firme"]["url"].endswith("od_firme.csv") and by_role["firme"]["rows"] == 10
    assert units[S1].origin["layout"] == "legacy"
    # manifest last: every unit's manifest verifies, nothing else is left behind
    assert not list(archive.root.glob(".onrc-download-*")) and not archive.incomplete("onrc")


def test_a_second_fetch_downloads_nothing_and_a_re_upload_is_archived_beside_the_old_unit(archive, world):
    packages, bodies = world
    fetch_onrc(archive, now=FETCHED, http=ckan(packages, bodies))
    again = fetch_onrc(archive, now=FETCHED + timedelta(days=1), http=ckan(packages, bodies))
    assert again.archived == [] and sorted(again.unchanged) == [S1, S2, S3, S4]
    # ONRC re-uploads the 2026-04-03 company file: same resource id, a new marker
    for r in packages["firme-03-04-2026"]["resources"]:
        r["last_modified"] = "2026-11-20T00:00:00"
    changed = fetch_onrc(archive, now=FETCHED + timedelta(days=2), http=ckan(packages, bodies))
    assert changed.archived == [S3]
    assert len(held_snapshots(archive)[S3]) == 2
    assert len([u for u in archive.units("onrc") if u.unit == S3]) == 2


def test_a_network_failure_is_transient_and_leaves_nothing_half_written(archive, world):
    summary = fetch_onrc(archive, now=FETCHED, http=ckan(*world, fail_on=("od_stare_firma.csv",)))
    assert summary.failed and not summary.invalid
    assert not list(archive.root.glob(".onrc-download-*"))
    assert archive.units("onrc") == [] and "stopped after 3 failures in a row" in summary.failed  # three snapshots failed in a row: the run stops, the next resumes
    resumed = fetch_onrc(archive, now=FETCHED + timedelta(days=1), http=ckan(*world))
    assert sorted(resumed.archived) == [S1, S2, S3, S4] and not resumed.failed


def test_a_file_that_is_not_the_expected_csv_is_invalid_and_never_archived(archive, world):
    packages, bodies = world
    url = next(r["url"] for r in packages["firme-03-04-2026"]["resources"] if r["name"] == "OD_FIRME.CSV")
    bodies[url] = "<html><body>Service unavailable</body></html>"
    summary = fetch_onrc(archive, now=FETCHED, http=ckan(packages, bodies))
    assert len(summary.invalid) == 1 and S3 in summary.invalid[0] and not summary.failed
    assert S3 not in {u.unit for u in archive.units("onrc")} and len(summary.archived) == 3


def test_a_snapshot_far_smaller_than_the_one_before_is_a_warning_not_a_failure(archive, world):
    packages, bodies = world
    fetch_onrc(archive, now=FETCHED, http=ckan(packages, bodies), limit=0)  # nothing downloaded
    url = next(r["url"] for r in packages["firme-06-05-2026"]["resources"] if r["name"] == "OD_FIRME.CSV")
    head = bodies[url].split("\n")[0]
    bodies[url] = head + "\n" + "\n".join(bodies[url].split("\n")[1:3]) + "\n"  # two companies instead of eight
    summary = fetch_onrc(archive, now=FETCHED, http=ckan(packages, bodies))
    assert any("far fewer" in w and S4 in w for w in summary.warnings) and not summary.failed


def test_limit_caps_how_many_snapshots_one_run_downloads(archive, world):
    summary = fetch_onrc(archive, now=FETCHED, http=ckan(*world), limit=2)
    assert len(summary.archived) == 2 and summary.archived == [S4, S3]  # newest first


def test_the_snapshot_readers_give_both_layouts_the_same_rows(archive, world):
    fetch_onrc(archive, now=FETCHED, http=ckan(*world))
    units = {u.unit: u for u in archive.units("onrc")}
    old, new = {c.reg_no: c for c in read.read_companies(units[S1])}, {c.reg_no: c for c in read.read_companies(units[S2])}
    assert old["J40/1001/2015"].states == (1048,) and new["J40/1001/2015"].states == (1048,)
    assert old["J40/1001/2015"].registration_date is None and new["J40/1001/2015"].registration_date == date(2015, 3, 10)
    assert new["F40/1009/2019"].cui is None and new["J40/1010/2017"].cui is None  # CUI 0 and a CUI that fails the check digit are no CUI
    assert new["J05/1004/2018"].cui and new["J99/1008/2021"].county is None
    assert read.read_status_names(units[S1])[1107] == "insolvență" and read.read_status_names(units[S2])[1084] == "radiată"
    assert ("J40/1001/2015", "4211", 2) in set(read.read_caen(units[S2]))


def test_pipeline_status_shows_counts_data_through_and_known_gaps(archive, world, capsys):
    fetch_onrc(archive, now=FETCHED, http=ckan(*world))
    lines = describe(archive)
    text = "\n".join(lines)
    assert "4 snapshot(s) held (3 monthly since 2026-03, 1 earlier quarterly)" in text
    assert f"data through {S4}; the newest snapshot lists 10 registrations" in text
    assert missing_months([date.fromisoformat(d) for d in (S2, S3, S4)]) == []
    assert missing_months([date(2026, 3, 2), date(2026, 5, 6)]) == ["2026-04"]
    cli.main(["--archive", str(archive.root), "status"])
    out = capsys.readouterr().out
    assert "onrc: 4 snapshot(s) held" in out and f"onrc: data through {S4}" in out


def _impl(archive, fetch):
    return Impl(archive, print, None, None, None, None, lambda: None, fetch_onrc=fetch, now=lambda: FETCHED)


def test_the_refresh_step_maps_the_failure_classes_and_warns_on_a_stale_register(archive, world):
    summary = fetch_onrc(archive, now=FETCHED, http=ckan(*world))
    assert summary.archived
    held = lambda a: fetch_onrc(a, now=FETCHED, http=ckan(*world))  # noqa: E731
    assert _impl(archive, held).onrc().counts == {"archived": 0, "unchanged": 4}
    late = Impl(archive, print, None, None, None, None, lambda: None, fetch_onrc=held,
                now=lambda: datetime.combine(date.fromisoformat(S4) + timedelta(days=ONRC_STALE_AFTER_DAYS + 1), datetime.min.time(), tzinfo=timezone.utc))
    assert any("stopped publishing" in w for w in late.onrc().warnings)
    down = lambda a: fetch_onrc(a, now=FETCHED, http=ckan(*world, fail_on=("package_search",)))  # noqa: E731
    with pytest.raises(TransientError):
        _impl(archive, down).onrc()
    packages, bodies = world
    url = next(r["url"] for r in packages["firme-06-05-2026"]["resources"] if r["name"] == "OD_FIRME.CSV")
    bodies[url] = "not a csv"
    for r in packages["firme-06-05-2026"]["resources"]:
        r["last_modified"] = "2026-12-01T00:00:00"  # a new marker: the changed file is fetched again, and is not a CSV
    with pytest.raises(DeterministicError):
        _impl(archive, lambda a: fetch_onrc(a, now=FETCHED, http=ckan(packages, bodies))).onrc()
