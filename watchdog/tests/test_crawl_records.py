"""Crawled Records (#77): an archived crawl day read into Records at rebuild time, against the committed fixture archive
`fixtures/archive-crawl/` (rebuilt by `fixtures/build_crawl_archive.py`) and small days written through the crawl's archive writer.
No network and no database: bulk-vs-crawl precedence lives in SQL (test_bulk_loader_db.py, seam 1)."""
import json
import shutil
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from pipeline.archive import Archive
from pipeline.crawl.records import notice_url, parse_unit
from pipeline.crawl.unitdir import UnitWriter
from pipeline.rebuild import plan

FIXTURE = Path(__file__).parent / "fixtures" / "archive-crawl"
NOW = datetime(2026, 11, 12, 9, 0, tzinfo=timezone.utc)


@pytest.fixture
def fixture_plan(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)  # a plan quarantines by moving: never touch the checked-in archive
    p = plan(Archive(root))
    crawled = {}
    for unit, label, rows in p.files:
        if unit.stream == "crawl":
            for r in rows:
                crawled[(unit.unit, unit.path.name, r.code)] = r
    return p, crawled


def day_unit(tmp_path, notices, contracts, day="2026-10-01"):
    """One complete crawl day with the given list rows and contracts (by caNoticeId), as the Archive reads it."""
    archive = Archive(tmp_path / "a")
    w = UnitWriter.open(archive, day, NOW)
    w.put(f"notices-{day}_{day}-p0000.json", json.dumps({"items": notices, "total": len(notices), "searchTooLong": False}).encode())
    for n in notices:
        w.put(f"contracts-{n['caNoticeId']}-s00000.json", json.dumps({"items": contracts.get(n["caNoticeId"], []), "total": len(contracts.get(n["caNoticeId"], []))}).encode())
    w.commit(NOW, "u", {})
    return archive, archive.units()[0]


def notice(i=1, procedure=7, **kw):
    return {"caNoticeId": i, "noticeNo": f"CAN{i}", "procedureId": procedure, "sysNoticeTypeId": 3, "sysNoticeVersionId": 2,
            "noticeStateDate": "2026-10-01T10:00:00+03:00", "contractTitle": "Titlu", "contractingAuthorityNameAndFN": "1000001 - AUTORITATE EXEMPLU", **kw}


def contract(i, number="C1", value=100, **kw):
    return {"caNoticeContractId": i, "contractNo": number, "contractDate": "2026-09-28T00:00:00+03:00", "defaultCurrencyContractValue": value,
            "winners": [{"name": "FIRMA SRL", "fiscalNumber": "RO 2000001"}], **kw}


def test_a_notice_with_a_procedure_becomes_one_contract_per_number_and_one_without_becomes_an_award_notice(fixture_plan):
    _, crawled = fixture_plan
    day = {code: r for (unit, fetch, code), r in crawled.items() if unit == "2026-04-01" and fetch == "2026-11-11"}
    assert sorted(day) == ["CAN9200003~9/2026", "CAN9200005", "SCNA9200004~S-1"]
    assert (day["CAN9200003~9/2026"].kind, day["SCNA9200004~S-1"].kind, day["CAN9200005"].kind) == ("CONTRACT", "CONTRACT", "AWARD_NOTICE")
    notice_ = day["CAN9200005"]  # procedureId null: its two contracts add and are its attributes
    assert notice_.value_bani == 350050 and notice_.contract_numbers == ("J-1", "J-2") and notice_.title == "Servicii juridice"


def test_a_crawled_record_carries_its_provenance_and_the_public_url_built_at_load_time(fixture_plan):
    _, crawled = fixture_plan
    r = crawled[("2026-04-01", "2026-11-11", "CAN9200003~9/2026")]
    assert (r.via, r.ca_notice_id, r.sys_notice_type_id, r.sys_notice_version_id) == ("CRAWL", 92000013, 3, 2)
    assert r.url == "https://e-licitatie.ro/pub/notices/ca-notices/view-c/92000013"
    assert crawled[("2026-04-01", "2026-11-11", "SCNA9200004~S-1")].url == "https://e-licitatie.ro/pub/notices/ca-notices/view-rfq/92000014"
    # two dates (ADR 0002): the notice's publication date assigns the quarter, the contract date is the award date
    assert (r.published_on, r.awarded_on, r.quarter) == (date(2026, 4, 1), date(2026, 3, 30), "2026Q2")
    assert (r.authority_cui, r.authority_name, r.notice_code, r.contract_numbers) == ("1000001", "SPITALUL EXEMPLU", "CAN9200003", ("9/2026",))
    assert (r.procedure, r.contract_type, r.cpv_code, r.cpv_description) == ("Licitatie deschisa", "Servicii", "90910000-9", "Servicii de curatenie (Rev.2)")
    assert [(w.name, w.cui) for w in r.winners] == [("CONSTRUCT DEMO SRL", "2000013")]


def test_the_identity_is_the_one_the_bulk_uses_so_the_bulk_can_supersede_it(fixture_plan):
    p, crawled = fixture_plan
    bulk = {r.code: r for u, _, rows in p.files if u.stream == "bulk" for r in rows}
    assert "CAN9200001~C-1" in bulk and ("2026-02-10", "2026-11-11", "CAN9200001~C-1") in crawled  # the same Record from both


def test_a_day_without_a_manifest_is_never_read(fixture_plan):
    p, crawled = fixture_plan
    assert not any(code == "CAN9200009~G-1" for _, _, code in crawled)
    assert any(path.name == "2026-11-12" and "2026-04-03" in str(path) for path in p.summary.incomplete)


def test_money_is_exact_integer_bani_never_a_float(tmp_path):
    _, unit = day_unit(tmp_path, [notice()], {1: [contract(1, "A", 19.99), contract(2, "B", 1234567.89), contract(3, "C", 0.1), contract(4, "D", None)]})
    values = {r.contract_numbers[0]: r.value_bani for r in parse_unit(unit).records["CONTRACT"]}
    assert values == {"A": 1999, "B": 123456789, "C": 10, "D": None}


def test_contracts_sharing_a_number_become_one_record_whose_value_adds(tmp_path):
    _, unit = day_unit(tmp_path, [notice()], {1: [contract(1, "X", 100), contract(2, "X", 50.5), contract(3, "", 7)]})
    records = {r.code: r for r in parse_unit(unit).records["CONTRACT"]}
    assert records["CAN1~X"].value_bani == 15050 and "value:contracts_share_number" in records["CAN1~X"].notes
    assert "contract_number:missing" in records["CAN1~"].notes


def test_winner_tax_ids_are_kept_as_published_and_a_notice_without_contracts_yields_nothing(tmp_path):
    _, unit = day_unit(tmp_path, [notice(1), notice(2)], {1: [contract(1)]})
    parsed = parse_unit(unit)
    assert parsed.rows == 2 and [r.code for r in parsed.records["CONTRACT"]] == ["CAN1~C1"]
    assert [(w.name, w.cui) for w in parsed.records["CONTRACT"][0].winners] == [("FIRMA SRL", "RO 2000001")]  # as published: identity.py reads the RO prefix (ADR 0003)


@pytest.mark.parametrize("type_id, version, path", [
    (3, 2, "ca-notices/view-c/"), (3, 1, "ca-notices/view-c/v1/"), (18, 2, "ca-notices/view-rfq/"), (18, 1, "ca-notices/view-scn/v1/"),
    (13, 2, "ca-notices/view-rfq/"), (20, 1, "ca-notices/view-rfq/v1/"), (16, 2, "ca-notices-pc/view/"), (16, 1, "ca-notices/view-pc/v1/"),
    (8, 2, "ca-notices-dc/view/"), (8, 1, "ca-notices/view-dc/v1/"), (3, None, "ca-notices/view-c/"),
])
def test_the_notice_url_follows_type_and_version(type_id, version, path):
    assert notice_url(type_id, version, 900) == f"https://e-licitatie.ro/pub/notices/{path}900"


def test_a_notice_type_without_a_known_route_gets_no_url_rather_than_a_wrong_one():
    assert notice_url(99, 2, 900) is None and notice_url(None, 2, 900) is None


def test_a_crawled_day_that_is_not_readable_is_quarantined_whole(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)
    archive = Archive(root)
    day = next((root / "seap/crawl/award-notices/2026-02-10").iterdir())
    (day / "contracts-92000012-s00000.json").write_text("{ not json")
    manifest = json.loads((day / "manifest.json").read_text())
    for f in manifest["files"]:
        if f["name"] == "contracts-92000012-s00000.json":
            f["bytes"] = len("{ not json")
            f["sha256"] = __import__("hashlib").sha256(b"{ not json").hexdigest()
    (day / "manifest.json").write_text(json.dumps(manifest))
    p = plan(archive)
    assert [q.name for q in p.summary.quarantined] == ["2026-11-11"] and "2026-02-10" in str(p.summary.quarantined[0])
    assert (p.summary.quarantined[0] / "reason.json").is_file()
    assert not any(code in ("CAN9200002~C-7",) for _, _, rows in p.files for code in (r.code for r in rows))  # nothing of that day loads
