"""ONRC through a real rebuild (ticket #175, ADR 0018): `archive-onrc/` (four snapshots in both layouts, a small SEAP slice, archived ANAF answers; made by
`fixtures/build_onrc_archive.py` with the real fetch) is rebuilt into Postgres and the `onrc` schema and the entities are checked case by case.
Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

sys.path.insert(0, str(Path(__file__).parent / "fixtures"))
from build_onrc_archive import ALFA, AUTH, BETA, DELTA, DUBLA, GAMMA, INVALID, OMEGA, PFA, S1, S2, S3, S4, ZETA  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from pipeline.sources import ONRC  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

ARCHIVE = Path(__file__).parent / "fixtures" / "archive-onrc"


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    return Archive(root)


@pytest.fixture
def built(db, archive):
    summary = rebuild(archive, db)
    return db, summary


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


def spans(url, reg_no, code):
    return q(url, "SELECT first_seen::text, last_seen::text, since_at_least FROM onrc.status_span WHERE reg_no = %s AND code = %s ORDER BY first_seen", reg_no, code)


def test_the_onrc_schema_holds_every_snapshot_and_the_newest_registrations(built):
    url, summary = built
    assert q(url, "SELECT snapshot_date::text, layout, earliest, companies FROM onrc.snapshot ORDER BY 1") == [
        (S1, "legacy", True, 7), (S2, "current", False, 10), (S3, "current", False, 10), (S4, "current", False, 10)]
    assert q(url, "SELECT count(*), count(cui), count(*) FILTER (WHERE primary_for_cui) FROM onrc.registration") == [(10, 8, 8)]  # the PFA (CUI 0) and the bad check digit carry no CUI
    assert q(url, "SELECT DISTINCT snapshot_date::text FROM onrc.registration") == [(S4,)]
    assert q(url, "SELECT code, version FROM onrc.caen WHERE reg_no = %s ORDER BY code", ALFA[2]) == [("4120", 2), ("4211", 2)]
    assert q(url, "SELECT name FROM onrc.status_name WHERE code = 1107") == [("insolvență",)]
    assert summary.onrc.snapshots == 4 and summary.onrc.first == date.fromisoformat(S1) and summary.onrc.latest == date.fromisoformat(S4)


def test_status_first_seen_dates_come_from_comparing_consecutive_snapshots(built):
    url, _ = built
    assert spans(url, ALFA[2], 1048) == [(S1, S4, True)]  # in the earliest snapshot: "since at least"
    assert spans(url, ALFA[2], 1107) == [(S3, S4, False)]  # the status change: insolvency first seen in 2026-04-03
    assert spans(url, GAMMA[2], 1048) == [(S1, S3, True)] and spans(url, GAMMA[2], 1084) == [(S4, S4, False)]  # the strike-off, first seen in the newest snapshot
    assert spans(url, DELTA[2], 1048) == [(S2, S4, False)]  # registered after the earliest snapshot: first seen where it appears
    assert spans(url, OMEGA[2], 1074) == [(S1, S1, True)]  # a status that went away again: it ended, it is not current
    assert q(url, "SELECT code FROM onrc.status_span WHERE reg_no = %s AND last_seen = %s ORDER BY code", ZETA[2], S4) == [(1048,), (2110,)]


def test_names_are_dated_aliases_and_a_rename_is_two_spans(built):
    url, _ = built
    assert q(url, "SELECT name, first_seen::text, last_seen::text, since_at_least FROM onrc.name_span WHERE reg_no = %s ORDER BY first_seen", BETA[2]) == [
        ("BETA VECHI SRL", S1, S2, True), ("BETA NOU SRL", S3, S4, False)]


def test_a_status_that_disappears_and_comes_back_starts_a_new_run(db, tmp_path):
    root = tmp_path / "archive"
    archive = Archive(root)
    for when, codes in (("2026-03-02", "1048,1074"), ("2026-04-03", "1048"), ("2026-05-06", "1048,1074")):
        name = f"firme_{when}.csv"
        body = f"DENUMIRE^CUI^COD_INMATRICULARE^EUID^STARE_FIRMA\nX SRL^0^J40/1/2000^E^{codes}\n".encode()
        archive.write_unit(source="onrc", stream="snapshot", kind="firme", unit=when, fetched_at=datetime(2026, 11, 13, tzinfo=timezone.utc), files={name: body},
                           origin={"system": "data.gov.ro", "layout": "legacy", "resources": [{"role": "legacy", "resourceId": "r", "name": name, "url": f"https://x/{name}"}]})
    rebuild(archive, db)
    assert spans(db, "J40/1/2000", 1074) == [("2026-03-02", "2026-03-02", True), ("2026-05-06", "2026-05-06", False)]
    assert spans(db, "J40/1/2000", 1048) == [("2026-03-02", "2026-05-06", True)]


def test_a_cui_anaf_knows_keeps_anafs_name_and_onrc_names_are_aliases_only(built):
    url, _ = built
    for company in (ALFA, BETA, GAMMA, DUBLA, AUTH):
        assert q(url, "SELECT display_name, provenance_source, provenance_via FROM core.entity WHERE key = %s", str(company[1])) == [(company[0], "ANAF", None)]
    # ONRC calls BETA "BETA NOU SRL" now and "BETA VECHI SRL" before: neither is its display name
    assert q(url, "SELECT count(*) FROM core.alias WHERE entity_key = %s AND name LIKE 'BETA %%' AND name <> 'BETA ONRC SRL'", str(BETA[1])) == [(0,)]


def test_a_cui_anaf_does_not_know_but_onrc_lists_is_an_entity_with_onrc_provenance(built):
    url, _ = built
    key = str(DELTA[1])
    assert q(url, "SELECT identity, cui, display_name, provenance_source, provenance_via, anaf_status FROM core.entity WHERE key = %s", key) == [("CUI", key, DELTA[0], "ONRC", S4, None)]
    # the SEAP Record that names it attaches to the ONRC-keyed entity: no name-only supplier for the same CUI
    assert q(url, "SELECT supplier_cui, winners->0->>'key', winners->0->>'identity' FROM seap.record WHERE code = 'DA95000004'") == [(key, key, "CUI")]
    assert q(url, "SELECT count(*) FROM core.entity WHERE identity = 'NAME_ONLY'") == [(0,)]


def test_an_organisation_only_in_onrc_becomes_an_entity_and_is_placed_by_its_seat_county(built):
    url, summary = built
    assert summary.onrc.entities_only == 2
    for company in (OMEGA, ZETA):
        assert q(url, "SELECT provenance_source, provenance_via FROM core.entity WHERE key = %s", str(company[1])) == [("ONRC", S4)]
        assert q(url, "SELECT count(*) FROM seap.search WHERE supplier_key = %s", str(company[1])) == [(0,)]  # never a SEAP counterparty
    assert q(url, "SELECT county_iso, uat_siruta, placed_by FROM core.placement WHERE entity_key = %s", str(OMEGA[1])) == [("CJ", None, "ONRC")]
    assert q(url, "SELECT count(*) FROM core.placement WHERE entity_key = %s", str(ZETA[1])) == [(0,)]  # no county: the Unplaced tile
    # ANAF's seat places an entity ANAF knows; ONRC places the one ANAF does not know
    assert q(url, "SELECT county_iso, placed_by FROM core.placement WHERE entity_key = %s", str(ALFA[1])) == [("CJ", "ANAF")]
    assert q(url, "SELECT county_iso, placed_by FROM core.placement WHERE entity_key = %s", str(DELTA[1])) == [("BV", "ONRC")]
    assert q(url, "SELECT county_iso FROM core.placement WHERE entity_key = %s", str(BETA[1])) == [("CJ",)]  # ANAF's seat (the stub answers Cluj for every company), not ONRC's Bucharest


def test_a_registration_with_no_valid_cui_is_not_an_entity(built):
    url, _ = built
    assert q(url, "SELECT count(*) FROM core.entity WHERE key IN (%s, '0') OR display_name IN (%s, %s)", str(INVALID[1]), PFA[0], INVALID[0]) == [(0,)]
    assert q(url, "SELECT count(*) FROM onrc.registration WHERE reg_no IN (%s, %s)", PFA[2], INVALID[2]) == [(2,)]  # still a registration


def test_onrc_is_in_the_registry_and_its_data_through_date_is_the_newest_snapshot(built):
    url, _ = built
    assert q(url, "SELECT id, schema_name, record_kinds, landing_status FROM core.source ORDER BY position") == [("SEAP", "seap", ["DA", "DAN", "CONTRACT", "AWARD_NOTICE"], "live"), ("ONRC", "onrc", ["REGISTRATION", "ROLE"], "wip")]
    assert q(url, ONRC.data_through_sql) == [("REGISTRATION", S4)]


def test_a_broken_snapshot_is_set_aside_and_named_and_the_history_is_built_from_the_others(db, archive):
    archive.write_unit(source="onrc", stream="snapshot", kind="firme", unit="2026-06-03", fetched_at=datetime(2026, 11, 13, 5, tzinfo=timezone.utc), files={"junk.csv": b"x\n"},
                       origin={"system": "data.gov.ro", "layout": "current", "resources": []})
    summary = rebuild(archive, db)
    assert any("2026-06-03" in s for s in summary.onrc.skipped) and summary.onrc.snapshots == 4 and summary.onrc.latest == date.fromisoformat(S4)
    assert q(db, "SELECT count(*) FROM onrc.snapshot") == [(4,)] and spans(db, ALFA[2], 1107) == [(S3, S4, False)]
    assert any("onrc: 4 snapshot(s)" in line and "skipped snapshot 2026-06-03" in line for line in summary.lines())


def test_a_rebuild_with_no_onrc_unit_builds_an_empty_onrc_schema(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    shutil.rmtree(root / "onrc")
    summary = rebuild(Archive(root), db)
    assert q(db, "SELECT count(*) FROM onrc.registration") == [(0,)] and summary.onrc.snapshots == 0
    assert q(db, ONRC.data_through_sql) == []
    assert q(db, "SELECT count(*) FROM core.entity WHERE provenance_source = 'ONRC'") == [(0,)]
    assert q(db, "SELECT count(*) FROM core.entity WHERE key = %s", str(DELTA[1])) == [(0,)]  # without ONRC nothing confirms DELTA's CUI: a name-only supplier, as before
