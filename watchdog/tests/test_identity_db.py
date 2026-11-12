"""Supplier identity through a real rebuild (ticket #66, ADR 0003): the committed fixture `archive-identity/` (SEAP DA and
Contracte files plus archived ANAF answers) is rebuilt into Postgres and the resulting entities, aliases and Record
badges are checked case by case. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.identity import OverrideError  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

FIXTURES = Path(__file__).parent / "fixtures"
ARCHIVE = FIXTURES / "archive-identity"
OVERRIDES = FIXTURES / "identity-overrides.toml"
CNPS = ("1990101123456", "2950202123456")
PEOPLE = ("POPESCU ION FICTIV", "IONESCU MARIA FICTIV", "POPESCU X FICTIV", "POPESCU Y FICTIV")  # invented


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    return Archive(root)


@pytest.fixture
def built(db, archive):
    rebuild(archive, db, overrides_path=OVERRIDES)
    return db


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


def entity(url, key):
    [row] = q(url, "SELECT identity, cui, foreign_vat_id, display_name, anaf_status, identity_curated, provenance_source FROM core.entity WHERE key = %s", key)
    return row


def winner_keys(url, code):
    [(winners,)] = q(url, "SELECT winners FROM seap.record WHERE code = %s", code)
    return [w["key"] for w in winners]


def badges(url, code):
    [(b,)] = q(url, "SELECT badges FROM seap.record WHERE code = %s", code)
    return b


def test_an_anaf_confirmed_cui_is_the_key_with_anafs_name_comma_below_and_every_spelling_as_an_alias(built):
    # ANAF's name is written with cedilla letters; the display name is comma-below and not re-cased
    assert entity(built, "2000007") == ("CUI", "2000007", None, "ȘANTIERUL ȚARA DEMO SRL", "ACTIV", False, "ANAF")
    aliases = sorted(q(built, "SELECT name, records, first_date, last_date, differs_from_anaf FROM core.alias WHERE entity_key = '2000007'"))
    assert aliases == [
        ("S.C. SANTIERUL TARA DEMO S.R.L.", 1, date(2023, 3, 11), date(2023, 3, 11), False),  # case, punctuation, legal form: the same name
        ("SANTIERUL TARA DEMO SRL", 3, date(2023, 2, 20), date(2023, 3, 26), False),  # DA93000001, DA93000017 and the contract
        ("TARA VECHE CONSTRUCT SA", 1, date(2023, 3, 12), date(2023, 3, 12), True),  # the company's old name
    ]
    assert winner_keys(built, "DA93000001") == winner_keys(built, "DA93000002") == winner_keys(built, "DA93000003") == ["2000007"]
    assert badges(built, "DA93000001") == [] and badges(built, "DA93000003") == ["NAME_DIFFERS_FROM_ANAF"]


def test_the_latest_archived_anaf_answer_wins(built):
    # the older answer (2026-10-01) named the company TARA VECHE CONSTRUCT SA; the newer one (2026-11-01) is the one in use
    assert entity(built, "2000007")[3] == "ȘANTIERUL ȚARA DEMO SRL"
    assert q(built, "SELECT archive_path FROM core.anaf_company WHERE cui = '2000007'") == [("anaf/vat/v9/0001000009-10/2026-11-01/response.json",)]


def test_a_later_not_found_removes_an_earlier_found(db, archive):
    archive_batch(archive, [2000023], date(2026, 11, 5), b'{"found":[],"notFound":[2000023]}', datetime(2026, 11, 5, 8, tzinfo=timezone.utc))
    rebuild(archive, db, overrides_path=OVERRIDES)
    assert q(db, "SELECT count(*) FROM core.anaf_company WHERE cui = '2000023'") == [(0,)]
    assert winner_keys(db, "DA93000010") == ["name-rcs-rds-demo-sa"]  # no longer confirmed: name-only, and no badge to attach


def test_an_unknown_cui_a_bad_check_digit_a_foreign_vat_id_and_a_name_are_name_only_suppliers(built):
    assert winner_keys(built, "DA93000004") == ["name-furnizor-necunoscut-srl"]  # passes the check digit, ANAF notFound
    assert winner_keys(built, "DA93000005") == ["name-cifra-gresita-srl"]  # fails the check digit
    assert winner_keys(built, "DA93000006") == ["vat-bg103029862"]
    assert winner_keys(built, "DA93000007") == ["name-servicii-fara-cui-srl"]
    assert entity(built, "vat-bg103029862") == ("NAME_ONLY", None, "BG103029862", "BALKAN TRADING OOD", None, False, "SEAP")
    assert entity(built, "name-furnizor-necunoscut-srl")[0:3] == ("NAME_ONLY", None, None)
    # the foreign firm is one entity across the DA and the contract
    assert q(built, "SELECT records FROM core.alias WHERE entity_key = 'vat-bg103029862'") == [(2,)]


def test_a_name_unlike_anafs_under_a_confirmed_cui_stays_attached_with_the_badge(built):
    assert winner_keys(built, "DA93000010") == ["2000023"]
    assert badges(built, "DA93000010") == ["NAME_DIFFERS_FROM_ANAF"]
    assert q(built, "SELECT name, differs_from_anaf FROM core.alias WHERE entity_key = '2000023'") == [("RCS & RDS DEMO SA", True)]
    assert entity(built, "2000023")[3] == "DIGI DEMO ROMANIA SA"


def test_a_supplier_cui_equal_to_the_authoritys_is_unresolved_and_the_record_is_badged(built):
    assert winner_keys(built, "DA93000009") == ["name-primaria-comuna-exemplu"]
    assert badges(built, "DA93000009") == ["CUI_MISMATCH"]
    assert q(built, "SELECT authority_key FROM seap.record WHERE code = 'DA93000009'") == [("1000009",)]  # the authority side still counts


def test_the_anaf_status_is_stored(built):
    assert entity(built, "2000031")[4] == "RADIERE"
    assert q(built, "SELECT status, registration FROM core.anaf_company WHERE cui = '2000031'") == [("RADIERE", "RADIERE din data 10.03.2022")]
    assert entity(built, "2000007")[4] == "ACTIV"


def test_homonyms_with_different_cuis_stay_two_entities(built):
    assert winner_keys(built, "DA93000014") == ["2000074"] and winner_keys(built, "DA93000015") == ["2000082"]
    assert q(built, "SELECT count(*) FROM core.entity WHERE display_name = 'DRUM CONSTRUCT DEMO SRL'") == [(2,)]


def test_one_entity_has_both_roles(built):
    # SPITALUL EXEMPLU buys (DA93000017 and the contract) and sells (DA93000016): one entity, keyed by its CUI
    assert q(built, "SELECT count(*) FROM core.entity WHERE key = '1000017'") == [(1,)]
    assert q(built, "SELECT count(*) FROM seap.record WHERE authority_key = '1000017'") == [(2,)]
    assert q(built, "SELECT count(*) FROM seap.search WHERE supplier_key = '1000017'") == [(1,)]


def test_the_override_file_pins_keys_maps_a_wrong_cui_and_marks_the_entities_curated(built):
    assert winner_keys(built, "DA93000012") == ["consortium-podul-exemplu"]
    assert entity(built, "consortium-podul-exemplu") == ("NAME_ONLY", None, None, "Asocierea pentru Podul Exemplu", None, True, "SEAP")
    assert badges(built, "DA93000012") == ["IDENTITY_CURATED"]
    assert winner_keys(built, "DA93000013") == ["2000066"]  # the wrong CUI 2000058 mapped to the entity it really is
    assert entity(built, "2000066")[5] is True
    assert "IDENTITY_CURATED" in badges(built, "DA93000013")
    assert entity(built, "2000074")[5] is False  # an entity no entry touches


def test_a_cnp_winner_is_a_natural_person_and_the_record_still_counts_for_its_authority(built):
    [(winners, supplier_name, supplier_cui, authority)] = q(built, "SELECT winners, supplier_name, supplier_cui, authority_key FROM seap.record WHERE code = 'DA93000008'")
    assert winners == [{"name": None, "key": None, "identity": None, "naturalPerson": True, "curated": False, "differsFromAnaf": False, "cuiMismatch": False}]
    assert (supplier_name, supplier_cui, authority) == (None, None, "1000009")
    assert q(built, "SELECT supplier_key, supplier_spelling, supplier_cui, supplier_vat FROM seap.search WHERE record_code = 'DA93000008'") == [(None, None, None, None)]
    # within a consortium the person is one winner among three and the others keep their entities, in file order
    [(winners,)] = q(built, "SELECT winners FROM seap.record WHERE code = 'CAN9700001~C-1'")
    assert [(w["key"], w["naturalPerson"], w["name"]) for w in winners] == [("2000007", False, "SANTIERUL TARA DEMO SRL"), (None, True, None), ("vat-bg103029862", False, "BALKAN TRADING OOD")]


def test_a_cnp_mangled_into_scientific_notation_is_a_natural_person_with_nothing_kept(built):
    [(winners, supplier_name, supplier_cui)] = q(built, "SELECT winners, supplier_name, supplier_cui FROM seap.record WHERE code = 'DA93000018'")
    assert winners == [{"name": None, "key": None, "identity": None, "naturalPerson": True, "curated": False, "differsFromAnaf": False, "cuiMismatch": False}]
    assert (supplier_name, supplier_cui) == (None, None)
    assert q(built, "SELECT supplier_key, supplier_spelling FROM seap.search WHERE record_code = 'DA93000018'") == [(None, None)]
    assert q(built, "SELECT count(*) FROM core.entity WHERE key = 'name-popescu-x-fictiv'") == [(0,)]


def test_the_lookups_behind_entity_roles_are_indexed(built):
    names = {r[0] for r in q(built, "SELECT indexname FROM pg_indexes WHERE schemaname = 'seap'")}
    assert {"record_authority_key_idx", "search_supplier_key_idx"} <= names


def test_no_cnp_anywhere_and_no_natural_persons_name_outside_the_withheld_schema(built):
    """Every row of every table in the shared core, in `seap` (the winners jsonb, load notes, search rows and the folded text,
    aliases) and in `withheld` is scanned as text. A CNP is nowhere; a natural person's name only in `withheld` (ADR 0003 as
    amended 2026-11-12), which the API never reads. The raw archive keeps the files as they were; the graph must not."""
    with psycopg.connect(built) as c:
        tables = c.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('core', 'seap', 'withheld') AND table_type = 'BASE TABLE'").fetchall()
        assert len(tables) >= 7 and ("withheld", "natural_person_name") in tables
        for schema, name in tables:
            needles = (*CNPS, "199010112", "295020212", "1.99E+12") + (() if schema == "withheld" else PEOPLE)
            for (row,) in c.execute(f'SELECT t::text FROM "{schema}"."{name}" t').fetchall():
                for needle in needles:
                    assert needle not in row, f"{needle} in {schema}.{name}: {row[:200]}"


def test_natural_persons_names_are_stored_withheld_linked_to_the_record_and_winner_slot_never_with_a_cnp(built):
    assert q(built, "SELECT record_code, winner_position, name, had_cnp FROM withheld.natural_person_name ORDER BY 1, 2") == [
        ("CAN9700001~C-1", 2, "IONESCU MARIA FICTIV", True),  # the consortium's second winner
        ("DA93000008", 1, "POPESCU ION FICTIV", True),
        ("DA93000018", 1, "POPESCU X FICTIV", True),  # the CNP Excel mangled: still a CNP
        ("DA93000019", 1, "POPESCU Y FICTIV", False),  # no CNP: paid under the authority's own CUI
    ]
    # every withheld slot is a natural-person slot of its Record's winners, which stays nameless
    for code, position in q(built, "SELECT record_code, winner_position FROM withheld.natural_person_name"):
        [(winners,)] = q(built, "SELECT winners FROM seap.record WHERE code = %s", code)
        assert winners[position - 1]["naturalPerson"] is True and winners[position - 1]["name"] is None


def test_a_natural_person_with_the_authoritys_own_cui_keeps_the_cui_mismatch_badge_and_nothing_else(built):
    [(winners, supplier_name, supplier_cui, authority)] = q(built, "SELECT winners, supplier_name, supplier_cui, authority_key FROM seap.record WHERE code = 'DA93000019'")
    assert winners == [{"name": None, "key": None, "identity": None, "naturalPerson": True, "curated": False, "differsFromAnaf": False, "cuiMismatch": True}]
    assert (supplier_name, supplier_cui, authority) == (None, None, "1000009")
    assert badges(built, "DA93000019") == ["CUI_MISMATCH"]
    assert q(built, "SELECT supplier_key, supplier_spelling, supplier_cui, badges FROM seap.search WHERE record_code = 'DA93000019'") == [(None, None, None, ["CUI_MISMATCH"])]
    assert q(built, "SELECT count(*) FROM core.entity WHERE key = 'name-popescu-y-fictiv'") == [(0,)]


def test_the_rebuild_never_calls_anaf_and_gives_the_same_graph_twice(db, archive, monkeypatch):
    def refuse(*a, **k):
        raise AssertionError("a rebuild must not call ANAF")

    monkeypatch.setattr("requests.sessions.Session.request", refuse)
    monkeypatch.setattr("pipeline.anaf.http_post", refuse)
    dump = lambda: [q(db, f"SELECT t::text FROM {t} t ORDER BY 1") for t in ("core.entity", "core.alias", "core.anaf_company", "seap.record", "seap.search", "withheld.natural_person_name")]
    rebuild(archive, db, overrides_path=OVERRIDES)
    first = dump()
    rebuild(archive, db, overrides_path=OVERRIDES)  # and over the same database
    assert dump() == first


def test_the_anaf_address_is_stored_as_sent_for_the_placement_ticket(built):
    [(address, seat, postal)] = q(built, "SELECT address, seat, postal_code FROM core.anaf_company WHERE cui = '1000009'")
    assert seat["sdenumire_Localitate"] == "Com. Exemplu" and seat["scod_JudetAuto"] == "CJ" and seat["scod_Judet"] == "13" and seat["scod_Postal"] == "400001"
    assert address == "JUD. CLUJ, COM. EXEMPLU, STR. EXEMPLU, NR.1" and postal == "400001"


def test_a_bad_override_file_stops_the_rebuild_before_it_touches_the_database(db, archive, tmp_path):
    bad = tmp_path / "bad.toml"
    bad.write_text('[[override]]\nname = "X"\nkey = "ok-key"\n')  # no reason
    with pytest.raises(OverrideError):
        rebuild(archive, db, overrides_path=bad)
    assert q(db, "SELECT count(*) FROM information_schema.schemata WHERE schema_name IN ('seap', 'core')") == [(0,)]
