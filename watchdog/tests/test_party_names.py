"""The party-name equivalence table of the donor-to-Party Signal (#185): its shape, its policy (predecessor parties are not merged) and the match it supports."""
import textwrap
from pathlib import Path

import pytest

from pipeline.aep.read import alliances, key
from pipeline.signals import party_names
from pipeline.signals.party_names import PartyNamesError, load, matches, table

PSD, PNL = "PARTIDUL SOCIAL DEMOCRAT", "PARTIDUL NAȚIONAL LIBERAL"
ALLIANCE = "ALIANȚA USR PLUS"
MEMBERS = ["PARTIDUL USR", "PARTIDUL LIBERTATE UNITATE SI SOLIDARITATE"]


def write(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "party_names.toml"
    path.write_text(textwrap.dedent(text), encoding="utf-8")
    return path


# ---- the checked-in table ---------------------------------------------------------------------------------------------------------------

def test_the_checked_in_table_is_versioned_and_every_entry_has_a_reason():
    raw = party_names.tomllib.loads(party_names.PATH.read_text(encoding="utf-8"))
    assert raw["version"] >= 1 and raw["updated"]
    assert raw["alias"] and raw["kept_apart"]
    for entry in [*raw["alias"], *raw["kept_apart"]]:
        assert entry["published"].strip() and entry["reason"].strip(), entry
    for entry in raw["alias"]:
        assert entry["party"].strip(), entry
    assert table().version == raw["version"]


def test_no_published_name_is_listed_twice_for_one_party_and_no_alias_is_the_registered_name_itself():
    raw = party_names.tomllib.loads(party_names.PATH.read_text(encoding="utf-8"))
    pairs = [(key(e["published"]), key(e["party"])) for e in raw["alias"]]
    assert len(pairs) == len(set(pairs))
    assert all(published != party for published, party in pairs)


def test_predecessor_and_successor_parties_are_kept_apart_and_no_alias_points_at_one():
    names = table()
    assert {key("PDL"), key("PC"), key("UNPR")} <= names.kept_apart
    for aliased, registered in names.aliases.items():
        assert aliased not in names.kept_apart and not set(registered) & names.kept_apart


def test_every_alliance_member_the_aep_table_records_is_a_registered_name_an_alias_can_reach_or_is_written_in_full():
    # a donation published as "USR" must reach the member party AEP's alliances list as "PARTIDUL USR", under the same key
    members = {key(m) for ms in alliances().values() for m in ms}
    assert key("PARTIDUL USR") in members and key("PARTIDUL USR") in table().aliases[key("USR")]
    assert key("PARTIDUL LIBERTATE UNITATE SI SOLIDARITATE") in table().aliases[key("PLUS")]


# ---- the match ----------------------------------------------------------------------------------------------------------------------------

@pytest.mark.parametrize("published,list_name,expected", [
    ("PSD", PSD, True), ("psd", PSD, True), ("P.S.D.", PSD, True), ("Partidul Social Democrat", PSD, True), ("PARTIDUL SOCIAL-DEMOCRAT", PSD, True),  # an abbreviation or a spelling
    ("PNL", PNL, True), ("PNL", "PARTIDUL NATIONAL LIBERAL", True),  # diacritics never matter
    ("PSD", PNL, False), ("PNL", PSD, False),
    ("", PSD, False), ("  ", PSD, False),
])
def test_a_donation_matches_the_list_through_the_table_or_by_its_own_name(published, list_name, expected):
    assert matches(published, list_name) is expected


def test_a_predecessor_party_never_matches_its_successor():
    assert matches("PDL", PNL) is False  # the Democratic-Liberal Party merged into PNL in 2014: another party for this rule
    assert matches("PARTIDUL DEMOCRAT LIBERAL", PNL) is False
    assert matches("PC", "PARTIDUL ALIANTA LIBERALILOR SI DEMOCRATILOR - ALDE") is False
    assert matches("PC", ALLIANCE, ["PARTIDUL ALIANTA LIBERALILOR SI DEMOCRATILOR - ALDE"]) is False
    assert matches("PARTIDUL DEMOCRAT LIBERAL", "PARTIDUL DEMOCRAT LIBERAL") is True  # a predecessor still matches ITS OWN list (same name), never another party's


def test_an_alliance_matches_through_its_recorded_member_parties_and_its_own_name_only():
    assert matches("USR", ALLIANCE, MEMBERS) is True
    assert matches("PLUS", ALLIANCE, MEMBERS) is True
    assert matches("Partidul USR", ALLIANCE, MEMBERS) is True
    assert matches("ALIANTA USR PLUS", ALLIANCE, MEMBERS) is True  # a donation to the alliance itself
    assert matches("PSD", ALLIANCE, MEMBERS) is False  # not a member
    assert matches("USR", ALLIANCE, []) is False  # an alliance with no member recorded matches by its own name only
    assert matches("USR", PSD, MEMBERS) is True  # the member list is the Mandate's, whatever the list's name


def test_an_independent_mandate_matches_nothing_and_no_party_family_exists():
    assert matches("PSD", "Independent", independent=True) is False
    assert matches("Independent", "Independent", independent=True) is False
    assert matches("PSD+PC", PSD) is False  # a joint line is not a party family: it is no one party
    assert matches("PSD", "ALIANTA ELECTORALA PSD ALDE") is False  # the alliance is matched through its recorded members, not through a word in its name
    assert matches("PSD", "ALIANTA ELECTORALA PSD ALDE", ["PARTIDUL SOCIAL DEMOCRAT"]) is True


# ---- loading and refusing -----------------------------------------------------------------------------------------------------------------

def test_a_table_without_a_version_or_with_an_entry_missing_its_reason_is_refused(tmp_path):
    with pytest.raises(PartyNamesError, match="version"):
        load(write(tmp_path, '[[alias]]\npublished = "A"\nparty = "B"\nreason = "r"\n'))
    with pytest.raises(PartyNamesError, match="reason"):
        load(write(tmp_path, 'version = 1\n[[alias]]\npublished = "PSD"\nparty = "PARTIDUL SOCIAL DEMOCRAT"\nreason = " "\n'))
    with pytest.raises(PartyNamesError, match="reason"):
        load(write(tmp_path, 'version = 1\n[[kept_apart]]\npublished = "PDL"\n'))


def test_an_alias_that_merges_a_predecessor_is_refused_whichever_side_it_is_on(tmp_path):
    base = 'version = 1\n[[kept_apart]]\npublished = "PDL"\nreason = "merged in 2014"\n'
    with pytest.raises(PartyNamesError, match="keeps apart"):
        load(write(tmp_path, base + '[[alias]]\npublished = "PDL"\nparty = "PARTIDUL NATIONAL LIBERAL"\nreason = "same"\n'))
    with pytest.raises(PartyNamesError, match="keeps apart"):
        load(write(tmp_path, base + '[[alias]]\npublished = "PNL"\nparty = "P.D.L."\nreason = "same"\n'))


def test_a_duplicate_alias_and_a_no_op_alias_are_refused(tmp_path):
    entry = '[[alias]]\npublished = "PSD"\nparty = "PARTIDUL SOCIAL DEMOCRAT"\nreason = "abbreviation"\n'
    with pytest.raises(PartyNamesError, match="twice"):
        load(write(tmp_path, "version = 1\n" + entry + entry))
    with pytest.raises(PartyNamesError, match="itself"):
        load(write(tmp_path, 'version = 1\n[[alias]]\npublished = "Partidul Social Democrat"\nparty = "PARTIDUL SOCIAL DEMOCRAT"\nreason = "r"\n'))


def test_a_table_passed_in_replaces_the_checked_in_one(tmp_path):
    names = load(write(tmp_path, 'version = 7\n[[alias]]\npublished = "PX"\nparty = "PARTIDUL EXEMPLU"\nreason = "abbreviation"\n'))
    assert names.version == 7
    assert matches("PX", "PARTIDUL EXEMPLU", names=names) is True
    assert matches("PX", "PARTIDUL EXEMPLU") is False  # the checked-in table does not know it
