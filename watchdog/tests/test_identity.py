"""Supplier identity rules (ADR 0003, ticket #66), as pure functions: tax ids, names, entity keys, the override file.
Every CUI here is invented; `CHECK_OK` / `CHECK_BAD` pass / fail the Romanian check digit."""
import pytest

from pipeline.identity import (
    NATURAL_PERSON, Overrides, OverrideError, Resolver, classify_tax_id, comma_below, compare_name, cui_check_digit_ok, name_key,
    name_key_text, resolve_authority,
)

CHECK_OK = ["2000007", "1000009", "18308578", "54760", "3286536", "16310091"]
CHECK_BAD = ["2000001", "1000001", "18308579", "12345678"]


@pytest.mark.parametrize("cui", CHECK_OK)
def test_cui_check_digit_accepts_valid_codes(cui):
    assert cui_check_digit_ok(cui)


@pytest.mark.parametrize("cui", CHECK_BAD + ["", "1", "0", "12345678901", "abc"])
def test_cui_check_digit_refuses_bad_codes(cui):
    assert not cui_check_digit_ok(cui)


@pytest.mark.parametrize(
    "raw, kind, value",
    [
        ("RO 2000007", "cui", "2000007"), ("ro2000007", "cui", "2000007"), ("RO  2000007", "cui", "2000007"),
        ("RO2000007,", "cui", "2000007"), ("0002000007", "cui", "2000007"), ("2000007", "cui", "2000007"), ("2000 007", "cui", "2000007"),
        ("2000001", "other", None),  # fails the check digit
        ("92008650480", "other", None),  # 11 digits: neither a CUI nor a CNP
        ("1003600118796", "cnp", None), ("RO1003600118796", "cnp", None), ("5 000101 123456", "cnp", None),
        ("BG103029862", "foreign_vat", "BG103029862"), ("IT08069460015", "foreign_vat", "IT08069460015"),
        ("ATU 18379608", "foreign_vat", "ATU18379608"), ("de 123456789", "foreign_vat", "DE123456789"),
        ("1.73E+12", "cnp", None), ("1.00761E+12", "cnp", None), ("1,99E+12", "other", None), ("1.5E+3", "other", None), ("2.5E+9", "other", None),
        ("CNP 1990101123456", "cnp", None), ("1.73 E+12", "cnp", None),
        ("-", "none", None), ("", "none", None), (None, "none", None), ("N/A", "other", None), ("XX123", "other", None),
    ],
)
def test_a_published_tax_id_is_classified(raw, kind, value):
    tax = classify_tax_id(raw)
    assert (tax.kind, tax.value) == (kind, value)


def test_a_foreign_id_is_never_turned_into_a_digit_string():
    # the retired normalisation turned `BG103029862` into `103029862`, a CUI-shaped string that could meet a real Romanian CUI
    assert classify_tax_id("BG103029862").kind == "foreign_vat"
    assert classify_tax_id("BG103029862").value != "103029862"


def test_cedilla_letters_become_comma_below_and_nothing_else_changes():
    assert comma_below("DRUMURI MUNICIPALE TIMIŞOARA ŞI ŢARA") == "DRUMURI MUNICIPALE TIMIȘOARA ȘI ȚARA"
    assert comma_below("Şoseaua ţărănească") == "Șoseaua țărănească"
    assert comma_below("Digi Romania SA") == "Digi Romania SA"  # no re-casing


def test_name_key_folds_case_diacritics_punctuation_and_spacing_but_keeps_legal_forms():
    assert name_key("S.C. ȘANTIER  Ţara-Nouă S.R.L.") == "name-sc-santier-tara-noua-srl"
    assert name_key("Șantier") == name_key("SANTIER") == "name-santier"
    assert name_key("ALFA SRL") != name_key("ALFA")  # legal forms are kept in a key: it only folds spelling noise
    long = "A" * 200
    assert name_key(long) != name_key("A" * 201) and len(name_key(long)) < 100


@pytest.mark.parametrize(
    "seap, anaf, same",
    [
        ("S.C. DRUMURI DEMO S.R.L.", "DRUMURI DEMO SRL", True),
        ("drumuri demo srl", "DRUMURI DEMO S.R.L.", True),
        ("ȘANTIER EXEMPLU SA", "SANTIER EXEMPLU S.A.", True),
        ("S.C. TRANS SPED S.A. SA", "TRANS SPED SA", True),  # DAN's doubled legal form
        ("RCS & RDS SA", "DIGI ROMANIA SA", False),  # a rename
        ("ALFA CONSTRUCT SRL", "ALFA CONSTRUCTII SRL", False),
    ],
)
def test_a_name_differs_from_anafs_only_beyond_case_diacritics_punctuation_and_legal_forms(seap, anaf, same):
    assert (compare_name(seap) == compare_name(anaf)) is same


# ---- the resolver -----------------------------------------------------------------------------------------------------

ANAF = {"2000007": compare_name("DRUMURI DEMO SRL"), "1000009": compare_name("COMUNA EXEMPLU")}


def test_a_cui_counts_only_when_it_passes_the_check_digit_and_anaf_found_it():
    r = Resolver(ANAF)
    confirmed = r.supplier("S.C. Drumuri Demo S.R.L.", "RO 2000007")
    assert (confirmed.key, confirmed.identity, confirmed.cui, confirmed.differs_from_anaf) == ("2000007", "CUI", "2000007", False)
    unknown = r.supplier("ALFA SRL", "2000015")  # passes the check digit, ANAF does not know it
    assert (unknown.key, unknown.identity, unknown.cui) == ("name-alfa-srl", "NAME_ONLY", None)
    bad = r.supplier("BETA SRL", "2000001")  # fails the check digit
    assert (bad.key, bad.identity) == ("name-beta-srl", "NAME_ONLY")


def test_homonyms_with_different_cuis_stay_two_entities_and_a_name_never_merges_a_romanian_supplier():
    r = Resolver({"2000007": compare_name("DRUM CONSTRUCT SRL"), "1000009": compare_name("DRUM CONSTRUCT SRL")})
    assert r.supplier("DRUM CONSTRUCT SRL", "2000007").key == "2000007"
    assert r.supplier("DRUM CONSTRUCT SRL", "1000009").key == "1000009"
    # and the same name with no CUI at all does not attach to either
    assert r.supplier("DRUM CONSTRUCT SRL", None).key == "name-drum-construct-srl"


def test_a_confirmed_cui_with_another_spelling_stays_attached_and_is_flagged():
    got = Resolver(ANAF).supplier("RCS & RDS", "2000007")
    assert (got.key, got.differs_from_anaf) == ("2000007", True)


def test_a_foreign_vat_id_keys_a_name_only_supplier():
    got = Resolver(ANAF).supplier("Barely digital GmbH", "BG 103029862")
    assert (got.key, got.identity, got.foreign_vat_id) == ("vat-bg103029862", "NAME_ONLY", "BG103029862")


def test_a_cnp_is_a_natural_person_with_nothing_kept():
    got = Resolver(ANAF).supplier("POPESCU ION", "1003600118796")
    assert got is NATURAL_PERSON and got.key is None and got.natural_person and got.cui is None
    assert not got.differs_from_anaf and not got.curated


def test_a_supplier_cui_equal_to_the_authoritys_is_unresolved_and_flagged():
    got = Resolver(ANAF).supplier("COMUNA EXEMPLU", "RO 1000009", authority_raw_cui="1000009")
    assert (got.key, got.identity, got.cui_mismatch) == ("name-comuna-exemplu", "NAME_ONLY", True)


def test_a_winner_with_no_name_and_no_usable_id_has_no_entity():
    got = Resolver(ANAF).supplier("", "-")
    assert got.key is None and got.identity is None and not got.natural_person


def test_an_authority_is_keyed_by_its_cui_when_it_passes_the_check_digit():
    assert resolve_authority("RO1000009", "COMUNA EXEMPLU").key == "1000009"
    assert resolve_authority("1000001", "COMUNA EXEMPLU").key == "name-comuna-exemplu"


# ---- the override file ------------------------------------------------------------------------------------------------


def _file(tmp_path, text):
    p = tmp_path / "overrides.toml"
    p.write_text(text, encoding="utf-8")
    return p


def test_an_override_maps_a_name_or_a_wrong_cui_to_a_key_and_marks_it_curated(tmp_path):
    overrides = Overrides.load(_file(tmp_path, '''
[[override]]
reason = "fictional: the winner is published without a CUI"
name = "Asocierea Exemplu Alfa-Beta"
key = "consortium-exemplu-alfa-beta"
display_name = "Asocierea Exemplu Alfa-Beta"

[[override]]
reason = "fictional: the CUI is a typo for Drumuri Demo's"
published_id = "2000001"
key = "2000007"
'''))
    r = Resolver(ANAF, overrides)
    consortium = r.supplier("ASOCIEREA EXEMPLU ALFA BETA", None)  # folds to the same name
    assert (consortium.key, consortium.identity, consortium.curated) == ("consortium-exemplu-alfa-beta", "NAME_ONLY", True)
    fixed = r.supplier("DRUMURI DEMO SRL", "2000001")
    assert (fixed.key, fixed.identity, fixed.cui, fixed.curated) == ("2000007", "CUI", "2000007", True)
    assert not r.supplier("DRUMURI DEMO SRL", "2000007").curated  # an entry touches only what it names


def test_an_override_never_splits_a_joint_venture_it_matches_the_whole_name(tmp_path):
    overrides = Overrides.load(_file(tmp_path, '[[override]]\nreason = "r"\nname = "ALFA SRL"\nkey = "alfa-pinned"\n'))
    r = Resolver(ANAF, overrides)
    assert r.supplier("ALFA SRL", None).key == "alfa-pinned"
    assert r.supplier("ALFA SRL - BETA SRL (asociere)", None).key == "name-alfa-srl-beta-srl-asociere"


@pytest.mark.parametrize(
    "entry",
    [
        'name = "A"\nkey = "ok-key"',  # no reason
        'reason = "r"\nname = "A"\npublished_id = "2000001"\nkey = "ok-key"',  # both
        'reason = "r"\nname = "A"\nkey = "2000001"',  # a CUI key that fails the check digit
        'reason = "r"\nname = "A"\nkey = "Bad Key"',
        'reason = "r"\nname = "A"\nkey = "vat-bg1"',  # reserved prefix
        'reason = "r"\npublished_id = "1003600118796"\nkey = "ok-key"',  # a CNP never goes in the graph
        'reason = "r"\nname = "A"\nkey = "ok-key"\nextra = 1',
        'reason = "r"\nname = "A"\nkey = "2000007"\ndisplay_name = "Other"',  # a CUI's name is ANAF's
    ],
)
def test_a_bad_override_entry_is_refused(tmp_path, entry):
    with pytest.raises(OverrideError):
        Overrides.load(_file(tmp_path, f"[[override]]\n{entry}\n"))


def test_the_shipped_override_file_is_valid_and_has_a_reason_per_entry():
    from pipeline.identity import DEFAULT_OVERRIDES

    overrides = Overrides.load(DEFAULT_OVERRIDES)
    assert all(o.reason for o in (*overrides.by_id.values(), *overrides.by_name.values()))


@pytest.mark.parametrize(
    "raw_id",
    [None, "", "-", "123456", "654321", "AB123456", "ab 123456", "199010112345", "RO 345678"],
    ids=["none", "blank", "dash", "6-digit", "6-digit-b", "id-card-series", "id-card-lower", "truncated-cnp", "ro-6-digit"],
)
def test_an_individual_published_without_a_cnp_is_a_natural_person_too(raw_id):
    got = Resolver(ANAF).supplier("PERSOANA FIZICA A", raw_id)
    assert got is NATURAL_PERSON


def test_a_truncated_cnp_is_a_natural_person_whatever_the_name_looks_like():
    assert Resolver(ANAF).supplier("ALFA 2000 &", "199010112345") is NATURAL_PERSON


@pytest.mark.parametrize(
    "name, raw_id",
    [
        ("ALFA CONSTRUCT SRL", None),
        ("ALFA CONSTRUCT SRL", "123456"),
        ("PFA PERSOANA FIZICA A", None),
        ("ASOCIATIA EXEMPLU", ""),
        ("PRIMARIA ORASULUI EXEMPLU", "-"),
        ("Siemens", None),  # one word
        ("ALFA 2000 BETA", None),  # a digit: no person's name
        ("ASOCIERE ALFA - BETA - GAMA", None),
    ],
)
def test_an_organisation_with_no_usable_id_stays_a_name_only_supplier(name, raw_id):
    got = Resolver(ANAF).supplier(name, raw_id)
    assert got.identity == "NAME_ONLY" and not got.natural_person


def test_a_six_digit_cui_anaf_knows_is_a_company_not_an_id_card():
    got = Resolver({"100000": compare_name("ALFA SRL")}).supplier("ALFA SRL", "100000")
    assert got.identity == "CUI" and got.cui == "100000"


def test_an_override_pins_a_misclassified_company_before_the_person_rule(tmp_path):
    f = tmp_path / "o.toml"
    f.write_text('[[override]]\nname = "Ion Exemplu"\nkey = "company-ion-exemplu"\nreason = "a company published by a person-like name"\n')
    got = Resolver(ANAF, Overrides.load(f)).supplier("Ion Exemplu", None)
    assert got.identity == "NAME_ONLY" and got.curated and not got.natural_person
