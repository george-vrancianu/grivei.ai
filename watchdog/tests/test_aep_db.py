"""AEP's Mandates, Leadership gaps and Party per Record through a real rebuild (ticket #180): `archive-placement` + `archive-mf` (the placement world and MF's list)
overlaid with `archive-aep` (the minutes, the repeat round, the 2025 partial election, two newer MF snapshots with principal credit holders, and the Records that meet
them). Asserts what the graph says, not how the tables are laid out. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
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
def built(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURES / "archive-placement", root)
    shutil.copytree(FIXTURES / "archive-mf", root, dirs_exist_ok=True)
    shutil.copytree(FIXTURES / "archive-aep", root, dirs_exist_ok=True)
    data = tmp_path / "data"
    shutil.copytree(FIXTURES / "placement-data", data)
    summary = rebuild(Archive(root), db, placement_dir=data, geo_dir=tmp_path / "geo", known_gaps_path=FIXTURES / "mf-known-gaps.csv", today=date(2026, 11, 20))
    return db, summary


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


def party(url, code):
    rows = q(url, "SELECT m.list_name, m.independent, m.member_parties, m.leader_name, p.via_key FROM aep.record_party p JOIN aep.mandate m ON m.id = p.mandate_id WHERE p.record_code = %s", code)
    return rows[0] if rows else None


def test_mandates_with_a_switch_an_alliance_an_independent_and_the_repeat_round(built):
    url, summary = built
    assert summary.aep is not None and summary.aep.skipped == []
    rows = q(url, "SELECT area, leader_name, list_name, independent, member_parties, election_id, start_date, end_date FROM aep.mandate WHERE area IN ('UAT:880001', 'UAT:880010', 'UAT:880060') ORDER BY area, start_date")
    assert rows == [
        ("UAT:880001", "POPESCU ION", "PARTIDUL SOCIAL DEMOCRAT", False, [], "local-2020", date(2020, 10, 27), date(2024, 9, 27)),
        ("UAT:880001", "POPESCU ION", "PARTIDUL NAȚIONAL LIBERAL", False, [], "local-2024", date(2024, 10, 27), None),  # the switch: two mandates, the list as registered each time
        ("UAT:880010", "MARIN ANA", "ALIANȚA USR PLUS", False, ["PARTIDUL USR", "PARTIDUL LIBERTATE UNITATE SI SOLIDARITATE"], "local-2020", date(2020, 10, 27), date(2024, 9, 27)),
        ("UAT:880010", "TOMA LUCIAN", "Independent", True, [], "local-2024", date(2024, 10, 27), None),
        ("UAT:880060", "GHEORGHE TUDOR", "PARTIDUL SOCIAL DEMOCRAT", False, [], "local-2020-repeat", date(2020, 11, 10), date(2024, 9, 27)),  # the tie of September, decided on 11 October
    ]


def test_gaps_are_gaps_and_a_partial_election_cuts_the_old_mandate(built):
    url, _ = built
    assert q(url, "SELECT leader_name, list_name, end_date, end_basis FROM aep.mandate WHERE area = 'UAT:880030' ORDER BY start_date") == [
        ("STAN MIRCEA", "PARTIDUL NAȚIONAL LIBERAL", date(2024, 9, 27), "HANDOVER_START"),
        ("STAN MIRCEA", "PARTIDUL SOCIAL DEMOCRAT", date(2025, 9, 8), "PARTIAL_VACANCY_BOUND"),  # cut 90 days before the partial election
        ("DOBRE SORIN", "PARTIDUL NAȚIONAL LIBERAL", None, None)]
    assert q(url, "SELECT start_date, end_date, reason FROM aep.gap WHERE area = 'UAT:880030' ORDER BY start_date") == [
        (date(2024, 9, 27), date(2024, 10, 27), "HANDOVER_WINDOW"), (date(2025, 9, 8), date(2026, 1, 6), "INTERIM")]
    assert q(url, "SELECT start_date, end_date, reason FROM aep.gap WHERE area = 'UAT:880060' ORDER BY start_date") == [
        (date(2024, 9, 27), date(2024, 10, 27), "HANDOVER_WINDOW"), (date(2024, 10, 27), None, "NO_RESULTS")]  # absent from the 2024 minutes
    assert q(url, "SELECT count(*) FROM aep.mandate WHERE area = 'UAT:990010' AND election_id = 'local-2024'") == [(0,)]  # a tie has no winner


def test_party_per_record_follows_the_authority_and_the_award_date(built):
    url, _ = built
    psd, pnl = "PARTIDUL SOCIAL DEMOCRAT", "PARTIDUL NAȚIONAL LIBERAL"
    assert party(url, "DA95000001") is None  # Brasov, 2024-10-10: the handover window
    assert party(url, "DA95000002")[:2] == (pnl, False)  # Brasov, 2024-11-15: the 2024 mandate
    assert party(url, "DA95000008")[:2] == ("Independent", True)  # Sanpetru 2024: an independent is no party, the list says so
    assert party(url, "DA95000009")[0] == psd  # Apahida 2024
    assert party(url, "DA95000010") is None  # Sinca Noua: no results in 2024
    assert party(url, "DA95000011") is None  # Caragiale: a tie in 2024
    assert party(url, "DA95000012")[0] == psd  # Rasnov, 2025-06-10: the 2024 mandate, before the vacancy bound
    assert party(url, "DA95000013") is None  # Rasnov, 2025-10-15: an interim leader
    assert party(url, "DA95000014")[:4:3] == (pnl, "DOBRE SORIN")  # Rasnov, 2026-02-10: the partial election's winner
    assert party(url, "DA95000006")[0] == pnl  # the county council: its president's list
    assert party(url, "DA95000007")[0] == pnl  # Bucharest's general mayor
    # the 2023 Records of the placement world fall in the 2020 mandates
    assert q(url, "SELECT count(*) FROM aep.record_party p JOIN seap.record r ON r.code = p.record_code WHERE r.award_date < '2024-01-01'")[0][0] > 0


def test_subordinate_bodies_inherit_only_with_exactly_one_principal_that_no_snapshot_contradicts(built):
    url, _ = built
    assert party(url, "DA95000003")[::4] == ("PARTIDUL NAȚIONAL LIBERAL", q(url, "SELECT key FROM core.entity WHERE display_name = 'MUNICIPIUL BRASOV'")[0][0])  # the hospital, via Brasov
    assert q(url, "SELECT snapshot_date, snapshots FROM aep.subordinate s JOIN core.entity e ON e.key = s.entity_key WHERE e.display_name LIKE 'SPITALUL%%'") == [(date(2026, 12, 1), 2)]
    assert party(url, "DA95000004") is None  # the school: the municipality and the ministry
    assert party(url, "DA95000005") is None  # the roads directorate: Rasnov in an older snapshot contradicts Brasov in the newest
    assert q(url, "SELECT count(*) FROM aep.subordinate") == [(1,)]


def test_a_supplier_never_carries_a_party(built):
    url, _ = built
    supplier = "2000007"
    assert q(url, "SELECT count(*) FROM aep.authority WHERE entity_key = %s", supplier) == [(0,)]
    assert q(url, "SELECT count(*) FROM aep.subordinate WHERE entity_key = %s", supplier) == [(0,)]
    # every Party per Record hangs off the Record's AUTHORITY, never off its winners
    assert q(url, "SELECT count(*) FROM aep.record_party p JOIN seap.record r ON r.code = p.record_code WHERE r.authority_key = %s", supplier) == [(0,)]


def test_the_spital_that_is_named_after_a_commune_is_no_town_hall(built):
    url, _ = built
    keys = {r[0] for r in q(url, "SELECT e.display_name FROM aep.authority a JOIN core.entity e ON e.key = a.entity_key")}
    assert "COMUNA UCEA SPITAL ASIMILAT" not in keys and "MUNICIPIUL BRASOV" in keys and "CONSILIUL JUDETEAN CLUJ" in keys and "PRIMARIA SECTORULUI 3" in keys

