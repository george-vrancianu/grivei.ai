"""ONRC's people (ticket #177, ADR 0011): the person key's normalisation, the keyed person id, the birth area and the person overrides. No database."""
from datetime import date

import pytest

from pipeline.onrc import people
from pipeline.onrc.people import (PersonOverrideError, PersonOverrides, PersonSecretError, birth_area, load_secret, normalise_name, parse_birth_date, person_id, person_key,
                                  split_id)

SECRET = b"dummy-secret-for-tests-only-0123456789"


@pytest.mark.parametrize("a, b", [
    ("POPESCU ION", "Ion Popescu"),  # word order and case
    ("ȘTEFĂNESCU ANA-MARIA", "STEFANESCU ana maria"),  # diacritics (comma-below and breve) and the hyphen
    ("ȘTEFĂNESCU ANA-MARIA", "ŞTEFĂNESCU ANA MARIA"),  # cedilla and comma-below alike
    ("MERLUSCA ELENA - ADINA", "ADINA ELENA MERLUSCA"),  # a spaced hyphen
    ("  Ion   Popescu ", "POPESCU,ION"),  # spacing and punctuation
    ("ŢURCANU DAN", "TURCANU DAN"),
])
def test_names_that_differ_only_in_order_case_diacritics_or_hyphens_have_one_key(a, b):
    assert normalise_name(a) == normalise_name(b)
    assert person_key(a, date(1980, 1, 2)) == person_key(b, date(1980, 1, 2))


@pytest.mark.parametrize("a, b", [
    ("POPESCU ION", "POPESCU ION VASILE"),  # a partial name is no match
    ("ANA MARIA", "ANAMARIA"),  # a hyphen is a separator, not a deletion
    ("POPESCU ION", "POPESCU IOAN"),
])
def test_different_names_have_different_keys(a, b):
    assert normalise_name(a) != normalise_name(b)


def test_the_key_needs_the_full_birth_date():
    assert person_key("POPESCU ION", date(1980, 1, 2)) != person_key("POPESCU ION", date(1980, 1, 3))
    assert person_key("POPESCU ION", date(1980, 1, 2)) != person_key("POPESCU ION", date(1981, 1, 2))
    assert person_key("POPESCU ION", None) is None  # no date, no key: an unlinked role holder
    assert person_key("  - ", date(1980, 1, 2)) is None
    assert person_key("POPESCU ION", date(1980, 1, 2)) == "ion popescu|1980-01-02"


@pytest.mark.parametrize("text, expected", [
    ("14/12/1984", date(1984, 12, 14)), ("14/12/1984 13:47:14", date(1984, 12, 14)), ("5/3/1971", date(1971, 3, 5)), (" 19/02/1971 15:16:05", date(1971, 2, 19)),
    ("", None), (None, None), ("1984-12-14", None), ("31/02/1980", None), ("01/01/1850", None), ("01/01/2999", None), ("12/1984", None),
])
def test_birth_dates_as_the_register_writes_them(text, expected):
    assert parse_birth_date(text, today=date(2026, 11, 14)) == expected


def test_the_person_id_is_a_keyed_hash_that_is_stable_and_depends_on_the_secret():
    key = person_key("POPESCU ION", date(1980, 1, 2))
    assert person_id(key, SECRET) == person_id(key, SECRET) and len(person_id(key, SECRET)) == 32
    assert person_id(key, SECRET) != person_id(key, b"another-secret-0123456789abcdef")
    assert person_id(key, SECRET) != person_id(person_key("POPESCU ION", date(1980, 1, 3)), SECRET)
    assert "1980" not in person_id(key, SECRET) and key not in person_id(key, SECRET)
    assert split_id(key, ("J40/1/2000",), SECRET) != person_id(key, SECRET)
    assert split_id(key, ("J40/2/2000", "J40/1/2000"), SECRET) == split_id(key, ("J40/1/2000", "J40/2/2000"), SECRET)


def test_a_missing_or_short_secret_fails_loudly_and_has_no_default():
    for environ in ({}, {people.SECRET_ENV: ""}, {people.SECRET_ENV: "   "}, {people.SECRET_ENV: "short"}):
        with pytest.raises(PersonSecretError, match=people.SECRET_ENV):
            load_secret(environ)
    assert load_secret({people.SECRET_ENV: SECRET.decode()}) == SECRET


@pytest.mark.parametrize("county, locality, country, expected", [
    ("Mureş", "Loc. Târgu Mureş", "România", "mures"),
    ("Mureș", "", "", "mures"),  # the same county in the other spelling
    ("", "BISTRA, ALBA", "", "alba"),  # the IF file puts the county after a comma
    ("", "PIATRA NEAMţ,NEAMţ", "", "neamt"),
    ("", "HALIFAX", "Regatul Unit al Marii Britanii şi al Irlandei de Nord", "regatul unit al marii britanii si al irlandei de nord"),
    ("", "Cluj-Napoca", "România", None),  # nothing that could contradict another row
    ("", "", "", None),
])
def test_birth_area_is_the_county_else_a_foreign_country_else_nothing(county, locality, country, expected):
    assert birth_area(county, locality, country) == expected


def toml(tmp_path, body):
    path = tmp_path / "overrides.toml"
    path.write_text(body, encoding="utf-8")
    return path


ID_A, ID_B = "a" * 32, "b" * 32


def test_person_overrides_load_splits_and_merges_with_a_reason_and_a_named_reviewer(tmp_path):
    loaded = PersonOverrides.load(toml(tmp_path, f'''
[[override]]
reason = "an identity override of the other kind is none of this loader's business"
name = "X"
key = "consortium-x"

[[person_split]]
person = "{ID_A}"
reg_nos = ["J40/2/2000", "J40/1/2000"]
reason = "A credible request: two people share the name and date."
reviewer = "Maria Ionescu"

[[person_merge]]
ids = ["{ID_A}", "{ID_B}"]
reason = "The same person under two spellings."
reviewer = "Maria Ionescu"
document = "Court decision 123/2026, https://example.org/doc"
'''))
    assert [(s.person, s.reg_nos, s.reviewer) for s in loaded.splits] == [(ID_A, ("J40/1/2000", "J40/2/2000"), "Maria Ionescu")]
    assert [(m.ids, m.document) for m in loaded.merges] == [((ID_A, ID_B), "Court decision 123/2026, https://example.org/doc")]
    assert PersonOverrides.load(None) == PersonOverrides() and PersonOverrides.load(tmp_path / "nothing.toml") == PersonOverrides()


@pytest.mark.parametrize("body, fragment", [
    (f'[[person_merge]]\nids = ["{ID_A}"]\nreason = "r"\nreviewer = "Maria Ionescu"\n', "cited document"),  # a merge needs a cited document
    (f'[[person_merge]]\nids = ["{ID_A}"]\nreason = "r"\nreviewer = "Maria Ionescu"\ndocument = "  "\n', "cited document"),
    (f'[[person_merge]]\nids = ["{ID_A}"]\nreviewer = "Maria Ionescu"\ndocument = "d"\n', "reason"),
    (f'[[person_split]]\nperson = "{ID_A}"\nreg_nos = ["J1/1/2000"]\nreason = "r"\n', "reviewer"),
    (f'[[person_split]]\nperson = "{ID_A}"\nreg_nos = ["J1/1/2000"]\nreason = "r"\nreviewer = "Claude"\n', "never an agent"),
    (f'[[person_split]]\nperson = "{ID_A}"\nreg_nos = ["J1/1/2000"]\nreason = "r"\nreviewer = "an AI agent"\n', "never an agent"),
    (f'[[person_split]]\nperson = "not an id"\nreg_nos = ["J1/1/2000"]\nreason = "r"\nreviewer = "M I"\n', "person id"),
    (f'[[person_split]]\nperson = "{ID_A}"\nreg_nos = []\nreason = "r"\nreviewer = "M I"\n', "reg_nos"),
    (f'[[person_split]]\nperson = "{ID_A}"\nreg_nos = ["J1/1/2000"]\nreason = "r"\nreviewer = "M I"\nname = "Ion Popescu"\n', "unknown"),
    (f'[[person_merge]]\nids = ["nope"]\nreason = "r"\nreviewer = "M I"\ndocument = "d"\n', "ids"),
])
def test_a_person_override_without_its_reason_reviewer_or_document_is_refused(tmp_path, body, fragment):
    with pytest.raises(PersonOverrideError, match=fragment):
        PersonOverrides.load(toml(tmp_path, body))


def test_the_checked_in_override_file_has_no_person_entry_and_the_identity_loader_ignores_them(tmp_path):
    from pipeline.identity import DEFAULT_OVERRIDES, Overrides

    assert PersonOverrides.load(DEFAULT_OVERRIDES) == PersonOverrides()
    path = toml(tmp_path, f'[[person_split]]\nperson = "{ID_A}"\nreg_nos = ["J1/1/2000"]\nreason = "r"\nreviewer = "M I"\n')
    assert Overrides.load(path) == Overrides()


def test_the_people_fixture_archives_both_people_files_with_the_real_file_names_and_reads_them():
    from pathlib import Path

    from pipeline.archive import Archive
    from pipeline.onrc.fetch import KIND, SOURCE, STREAM

    archive = Archive(Path(__file__).parent / "fixtures" / "archive-onrc-people")
    unit = next(u for u in archive.units(SOURCE) if (u.stream, u.kind, u.unit) == (STREAM, KIND, "2026-05-06"))
    assert {r["role"] for r in unit.origin["resources"]} >= {"legali", "if"} and people.has_people(unit)
    roles = list(people.read_roles(unit))
    assert len(roles) == 16 and {r.kind for r in roles} == {"LEGAL", "IF"}
    alfa = [r for r in roles if r.name == "IONESCU MARIA"][0]
    assert alfa.birth_date == date(1980, 5, 5) and alfa.area == "iasi"  # a time of day after the date is dropped
    assert [r.area for r in roles if r.name == "TOMA ELENA"] == ["cluj"]  # the IF file: the county after the comma
    older = next(u for u in archive.units(SOURCE) if (u.stream, u.kind, u.unit) == (STREAM, KIND, "2025-03-18"))
    assert not people.has_people(older)  # the legacy snapshot has none
