"""ONRC's people through a real rebuild (ticket #177, ADR 0011): `archive-onrc-people/` (made by `fixtures/build_onrc_people_archive.py`) is rebuilt into Postgres and the
`onrc` role tables are checked case by case: the same person in two companies, namesakes, a birthplace conflict (a possible match), a holder with no birth date, a PFA,
an IF, an ONRC-only company, the person-id secret and the identity overrides. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
import sys
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

sys.path.insert(0, str(Path(__file__).parent / "fixtures"))
from build_onrc_people_archive import ALFA, BETA, DELTA, DUBLA, FAM, GAMMA, OMEGA, PFA, PFA2  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.onrc.people import SECRET_ENV, PersonSecretError, person_id, person_key, split_id  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from datetime import date  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

ARCHIVE = Path(__file__).parent / "fixtures" / "archive-onrc-people"
SECRET = "dummy-secret-for-tests-only-0123456789"


@pytest.fixture(autouse=True)
def secret(monkeypatch):
    monkeypatch.setenv(SECRET_ENV, SECRET)


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


def pid(name, born):
    return person_id(person_key(name, date.fromisoformat(born)), SECRET.encode())


POPESCU, RADU, TOMA, DUMITRESCU, POPESCU_NAMESAKE = pid("Ion Popescu", "1975-03-12"), pid("Radu Gheorghe", "1968-06-15"), pid("Toma Gheorghe", "1965-02-02"), pid("Dumitrescu Stefan Vlad", "1970-02-01"), pid("Popescu Ion", "1962-08-20")


def roles_of(url, reg_no):
    return q(url, "SELECT holder_name, role, kind, birth_year, link, person_id FROM onrc.role WHERE reg_no = %s ORDER BY holder_name, role", reg_no)


def test_the_same_person_in_two_companies_is_one_person_id_whatever_the_word_order(built):
    url, summary = built
    alfa, beta = dict((r[0], r) for r in roles_of(url, ALFA[2])), dict((r[0], r) for r in roles_of(url, BETA[2]))
    assert alfa["POPESCU ION"][4:] == ("LINKED", POPESCU) and beta["ION POPESCU"][4:] == ("LINKED", POPESCU)
    assert alfa["POPESCU ION"][3] == 1975  # only the birth year is stored
    assert q(url, "SELECT birth_year FROM onrc.person WHERE id = %s", POPESCU) == [(1975,)]
    assert summary.onrc.people.persons == q(url, "SELECT count(*) FROM onrc.person")[0][0]


def test_namesakes_with_different_birth_dates_are_different_people(built):
    url, _ = built
    assert roles_of(url, GAMMA[2])[0][4:] == ("LINKED", POPESCU_NAMESAKE) and POPESCU_NAMESAKE != POPESCU


def test_a_diacritic_hyphen_and_order_variant_across_a_company_and_an_onrc_only_company_is_one_person(built):
    url, _ = built
    assert roles_of(url, DUBLA[2])[0][4:] == ("LINKED", DUMITRESCU) and roles_of(url, OMEGA[2])[0][4:] == ("LINKED", DUMITRESCU)
    assert roles_of(url, DUBLA[2])[0][0] == "DUMITRESCU ȘTEFAN-VLAD"  # shown as ONRC writes it, comma-below letters


def test_a_birthplace_conflict_is_a_possible_match_in_the_review_queue_and_in_no_role_with_an_id(built):
    url, summary = built
    assert q(url, "SELECT id, holder_name, birth_date::text, areas, reg_nos FROM onrc.possible_match") == [(RADU, "RADU GHEORGHE", "1968-06-15", ["bihor", "cluj"], sorted([ALFA[2], DELTA[2]]))]
    assert summary.onrc.people.possible_matches == 1
    rows = q(url, "SELECT reg_no, link, person_id, birth_year FROM onrc.role WHERE holder_name = 'RADU GHEORGHE' ORDER BY reg_no")
    assert rows == [(DELTA[2], "POSSIBLE_MATCH", None, 1968), (ALFA[2], "POSSIBLE_MATCH", None, 1968)]  # J05 sorts before J40
    assert q(url, "SELECT count(*) FROM onrc.person WHERE id = %s", RADU) == [(0,)]


def test_a_holder_with_no_birth_date_is_unlinked_and_has_no_id_or_year(built):
    url, _ = built
    assert q(url, "SELECT link, person_id, birth_year FROM onrc.role WHERE holder_name = 'NEGRU TUDOR'") == [("UNLINKED", None, None)]
    assert q(url, "SELECT link, person_id FROM onrc.role WHERE holder_name LIKE 'SC SERVICII%%'") == [("UNLINKED", None)]


def test_a_pfa_holder_is_never_linked_and_carries_no_year(built):
    url, summary = built
    for company in (PFA, PFA2):
        assert q(url, "SELECT link, person_id, birth_year FROM onrc.role WHERE reg_no = %s", company[2]) == [("SOLE_TRADER", None, None)]
    assert q(url, "SELECT count(*) FROM onrc.person WHERE name LIKE '%%DEMO%%'") == [(0,)]
    assert summary.onrc.people.sole_trader_roles == 2


def test_if_members_link_like_administrators(built):
    url, _ = built
    assert q(url, "SELECT holder_name, kind, link, person_id, birth_year FROM onrc.role WHERE reg_no = %s ORDER BY holder_name", FAM[2]) == [
        ("TOMA ELENA", "IF", "LINKED", pid("Toma Elena", "1967-03-03"), 1967), ("TOMA GHEORGHE", "IF", "LINKED", TOMA, 1965)]
    assert q(url, "SELECT link, person_id FROM onrc.role WHERE reg_no = %s AND holder_name = 'TOMA GHEORGHE'", BETA[2]) == [("LINKED", TOMA)]  # the IF member is BETA's administrator too
    assert roles_of(url, FAM[2])[0][1] == "membru întreprindere familiala"  # the role as ONRC publishes it


def test_no_birthplace_birth_date_or_cnp_column_in_the_served_tables(built):
    url, _ = built
    columns = {c for (c,) in q(url, "SELECT column_name FROM information_schema.columns WHERE table_schema = 'onrc' AND table_name IN ('role', 'person')")}
    assert columns == {"reg_no", "holder_name", "role", "kind", "birth_year", "link", "person_id", "snapshot_date", "id", "name"}


def test_the_roles_come_from_the_newest_snapshot_with_a_people_file(built):
    url, summary = built
    assert q(url, "SELECT DISTINCT snapshot_date::text FROM onrc.role") == [("2026-05-06",)]
    assert str(summary.onrc.people.snapshot) == "2026-05-06"
    assert any("13 roles" in line or "roles (" in line for line in summary.lines())


def test_a_rebuild_with_roles_and_no_secret_fails_loudly(db, archive, monkeypatch):
    monkeypatch.delenv(SECRET_ENV)
    with pytest.raises(PersonSecretError, match=SECRET_ENV):
        rebuild(archive, db)


def test_a_rebuild_without_people_files_needs_no_secret(db, tmp_path, monkeypatch):
    monkeypatch.delenv(SECRET_ENV)
    root = tmp_path / "archive"
    shutil.copytree(Path(__file__).parent / "fixtures" / "archive-onrc", root)
    summary = rebuild(Archive(root), db)
    assert q(db, "SELECT count(*) FROM onrc.role") == [(0,)] and summary.onrc.people.snapshot is None


def toml(tmp_path, body):
    path = tmp_path / "overrides.toml"
    path.write_text(body, encoding="utf-8")
    return path


def test_a_person_split_changes_the_result_after_a_rebuild(db, archive, tmp_path):
    path = toml(tmp_path, f'[[person_split]]\nperson = "{POPESCU}"\nreg_nos = ["{BETA[2]}"]\nreason = "A credible request: two people share the name and date."\nreviewer = "Maria Ionescu"\n')
    summary = rebuild(archive, db, overrides_path=path)
    carved = split_id(person_key("Ion Popescu", date(1975, 3, 12)), (BETA[2],), SECRET.encode())
    assert q(db, "SELECT person_id FROM onrc.role WHERE reg_no = %s AND holder_name = 'POPESCU ION'", ALFA[2]) == [(POPESCU,)]
    assert q(db, "SELECT person_id FROM onrc.role WHERE reg_no = %s AND holder_name = 'ION POPESCU'", BETA[2]) == [(carved,)]
    assert q(db, "SELECT count(*) FROM onrc.person WHERE id IN (%s, %s)", POPESCU, carved) == [(2,)]
    assert q(db, "SELECT kind, reviewer, matched FROM onrc.person_override") == [("SPLIT", "Maria Ionescu", 1)]
    assert summary.onrc.people.unmatched_overrides == []


def test_a_person_merge_settles_a_possible_match_and_needs_its_document(db, archive, tmp_path):
    path = toml(tmp_path, f'[[person_merge]]\nids = ["{RADU}"]\nreason = "Same person: the register lists both counties for one birth."\nreviewer = "Maria Ionescu"\n'
                          'document = "Court decision 1/2026"\n')
    rebuild(archive, db, overrides_path=path)
    assert q(db, "SELECT reg_no, link, person_id FROM onrc.role WHERE holder_name = 'RADU GHEORGHE' ORDER BY reg_no") == [(DELTA[2], "LINKED", RADU), (ALFA[2], "LINKED", RADU)]
    assert q(db, "SELECT count(*) FROM onrc.possible_match") == [(0,)]
    assert q(db, "SELECT kind, document, matched FROM onrc.person_override") == [("MERGE", "Court decision 1/2026", 2)]


def test_a_merge_of_two_confirmed_persons_gives_them_one_id(db, archive, tmp_path):
    path = toml(tmp_path, f'[[person_merge]]\nids = ["{POPESCU}", "{POPESCU_NAMESAKE}"]\nreason = "r"\nreviewer = "Maria Ionescu"\ndocument = "Birth certificate copy, file 9"\n')
    rebuild(archive, db, overrides_path=path)
    assert q(db, "SELECT count(DISTINCT person_id) FROM onrc.role WHERE holder_name IN ('POPESCU ION', 'ION POPESCU')") == [(1,)]
    assert q(db, "SELECT count(*) FROM onrc.person WHERE id = %s", POPESCU_NAMESAKE) == [(0,)]


def test_an_override_that_matches_nothing_is_reported_not_applied(db, archive, tmp_path):
    path = toml(tmp_path, f'[[person_split]]\nperson = "{"c" * 32}"\nreg_nos = ["{BETA[2]}"]\nreason = "r"\nreviewer = "Maria Ionescu"\n')
    summary = rebuild(archive, db, overrides_path=path)
    assert summary.onrc.people.unmatched_overrides == [f"person_split {'c' * 32}"]
    assert any("override matched nothing" in line for line in summary.lines())
    assert q(db, "SELECT matched FROM onrc.person_override") == [(0,)]
