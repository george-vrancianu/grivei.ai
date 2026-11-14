"""AEP's connector and the Mandate rules (ticket #180), without a database: reading the real file shapes, the winner from the vote counts, the mandate dates and gaps,
and the fetch (a stubbed `http`: no test reaches the network) with its refresh check for the one-off 2025 file."""
import json
import shutil
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from pipeline.aep import fetch as aep_fetch
from pipeline.aep.mandates import (HANDOVER_WINDOW, INTERIM, LOCAL_2020, LOCAL_2024, NO_RESULTS, PARTIAL_2025, REPEAT_2020, derive, in_force, vacancies)
from pipeline.aep.read import Candidate, Race, MAYOR, is_independent, key, read_minutes, read_partial, read_repeat_round, split_header, tidy
from pipeline.archive import Archive

FIXTURE = Path(__file__).parent / "fixtures" / "archive-aep" / "aep"


def unit(stream, unit_name):
    [d] = list((FIXTURE / stream / "local" / unit_name).iterdir())
    return d


def race(*cands, office=MAYOR):
    return Race(office, "1", None, "X", [Candidate(n, p, v) for n, p, v in cands])


def test_the_winner_is_derived_from_the_votes_and_a_tie_has_none():
    assert race(("A", "P1", 10), ("B", None, 12)).winner().name == "B"
    assert race(("A", "P1", 12), ("B", None, 12)).winner() is None
    assert race(("A", "P1", 0)).winner() is None and Race(MAYOR, "1", None, "X").winner() is None


def test_party_names_keep_the_registered_spelling_with_comma_below_and_independents_have_no_list():
    assert tidy("PARTIDUL  ALIANŢA LIBERALILOR ŞI DEMOCRAŢILOR") == "PARTIDUL ALIANȚA LIBERALILOR ȘI DEMOCRAȚILOR"
    assert key("ALIANȚA ELECTORALĂ \"PSD ALDE\"") == key("ALIANTA ELECTORALA PSD ALDE")  # the alliance table's key
    assert is_independent(None) and is_independent("CANDIDAT INDEPENDENT") and not is_independent("PARTIDUL NAȚIONAL LIBERAL")
    assert not is_independent("ALIANȚA INDEPENDENȚILOR") and not is_independent("PARTIDUL INDEPENDENT")  # a registered list that contains the word is a list


def test_the_final_minutes_are_read_per_county_with_mayors_and_the_county_president():
    races = read_minutes(unit("final", "2024-06-09") / "pv_bv_final.json")
    assert sorted((r.office, r.siruta or r.county) for r in races) == [("COUNTY_PRESIDENT", "BV"), ("MAYOR", "880001"), ("MAYOR", "880010"), ("MAYOR", "880030")]
    [sanpetru] = [r for r in races if r.siruta == "880010"]
    assert sanpetru.winner() == Candidate("TOMA LUCIAN", None, 900)
    assert [r.office for r in read_minutes(unit("final", "2020-09-27") / "pv_b_final.json")] == ["MAYOR", "GENERAL_MAYOR"]


def test_partial_counts_are_never_read_as_final_minutes(tmp_path):
    doc = json.loads((unit("final", "2024-06-09") / "pv_bv_final.json").read_text(encoding="utf-8"))
    doc["stages"]["FINAL"]["enabled"] = False
    path = tmp_path / "pv.json"
    path.write_text(json.dumps(doc), encoding="utf-8")
    with pytest.raises(ValueError, match="FINAL stage is not enabled"):
        read_minutes(path)


def test_the_candidate_and_list_are_split_from_the_csv_column_names():
    parties = {"PARTIDUL SOCIAL DEMOCRAT", "PARTIDUL NAȚIONAL LIBERAL"}
    assert split_header("POPA ANDREI-VLAD-PARTIDUL SOCIAL DEMOCRAT-voturi", parties) == ("POPA ANDREI-VLAD", "PARTIDUL SOCIAL DEMOCRAT")
    assert split_header("LUPU MIRCEA-DAN-CANDIDAT INDEPENDENT-voturi", parties) == ("LUPU MIRCEA-DAN", None)
    assert split_header("DOBRE SILVIU-RADU-ALIANȚA PNL USR-voturi", parties) == ("DOBRE SILVIU-RADU", "ALIANȚA PNL USR")  # an unknown list: after the first hyphen before a list word


def test_the_repeat_round_and_the_partial_election_are_read_with_their_sirutas():
    parties = {"PARTIDUL SOCIAL DEMOCRAT", "PARTIDUL NAȚIONAL LIBERAL"}
    [repeat] = read_repeat_round(unit("repeat", "2020-10-11") / "pv_final_cntry_p_tur2.csv", unit("repeat", "2020-10-11") / "bd_p_11.10.2020.csv", parties)
    assert (repeat.siruta, repeat.winner()) == ("880060", Candidate("GHEORGHE TUDOR", "PARTIDUL SOCIAL DEMOCRAT", 350))
    [partial] = read_partial([unit("partial", "2025-12-07") / "pv_part_uat_p_bv_880030.csv"], parties)
    assert partial.siruta == "880030" and partial.winner() == Candidate("DOBRE SORIN", "PARTIDUL NAȚIONAL LIBERAL", 280)  # summed over two precincts


def test_derive_gives_mandates_dates_and_gaps_and_nothing_for_the_handover_window():
    psd, pnl = "PARTIDUL SOCIAL DEMOCRAT", "PARTIDUL NAȚIONAL LIBERAL"
    mandates, gaps = derive({LOCAL_2020.id: race(("A", psd, 5), ("B", pnl, 4)), LOCAL_2024.id: race(("A", pnl, 5), ("B", psd, 4))}, {})
    assert [(m.leader, m.list_name, m.start, m.end) for m in mandates] == [("A", psd, date(2020, 10, 27), date(2024, 9, 27)), ("A", pnl, date(2024, 10, 27), None)]
    assert gaps == [g for g in gaps if g.reason == HANDOVER_WINDOW] and (gaps[0].start, gaps[0].end) == (date(2024, 9, 27), date(2024, 10, 27))
    assert in_force(mandates, date(2024, 10, 10)) is None  # an award in the window has no Mandate
    assert in_force(mandates, date(2024, 9, 26)).list_name == psd and in_force(mandates, date(2024, 9, 27)) is None and in_force(mandates, date(2024, 10, 27)).list_name == pnl


def test_derive_the_repeat_round_replaces_september_and_a_partial_election_cuts_the_old_mandate():
    mandates, gaps = derive({LOCAL_2020.id: race(("A", "P", 5), ("B", "Q", 5)), REPEAT_2020.id: race(("B", "Q", 9), ("A", "P", 3)), LOCAL_2024.id: race(("B", "Q", 9)),
                             PARTIAL_2025.id: race(("C", "R", 7))}, {})
    assert [(m.leader, m.election.id, m.end) for m in mandates] == [("B", "local-2020-repeat", date(2024, 9, 27)), ("B", "local-2024", date(2025, 9, 8)), ("C", "local-2025-partial", None)]
    assert [(g.reason, g.start, g.end) for g in gaps] == [(HANDOVER_WINDOW, date(2024, 9, 27), date(2024, 10, 27)), (INTERIM, date(2025, 9, 8), date(2026, 1, 6))]


def test_derive_a_known_vacancy_cuts_the_mandate_there_and_the_interim_gap_runs_to_the_partial_winner_or_stays_open():
    races = {LOCAL_2020.id: race(("A", "P", 5)), LOCAL_2024.id: race(("B", "Q", 9))}
    mandates, gaps = derive(races, {}, date(2025, 5, 26))  # no partial election held yet: the interim leader is still in office
    assert [(m.leader, m.end, m.end_basis) for m in mandates] == [("A", date(2024, 9, 27), "HANDOVER_START"), ("B", date(2025, 5, 26), "VACANCY_DATE")]
    assert gaps[-1] == (gaps[-1].__class__(date(2025, 5, 26), None, INTERIM)) and in_force(mandates, date(2025, 6, 1)) is None
    mandates, gaps = derive({**races, PARTIAL_2025.id: race(("C", "R", 7))}, {}, date(2025, 5, 26))  # the vacancy date wins over the 90-day bound (7 Dec 2025)
    assert [(m.leader, m.end) for m in mandates] == [("A", date(2024, 9, 27)), ("B", date(2025, 5, 26)), ("C", None)]
    assert (gaps[-1].reason, gaps[-1].start, gaps[-1].end) == (INTERIM, date(2025, 5, 26), date(2026, 1, 6))
    assert vacancies()["GENERAL:B"] == date(2025, 5, 26)  # the checked-in table


def test_derive_a_mandate_without_results_is_a_gap_not_a_guess():
    mandates, gaps = derive({LOCAL_2020.id: race(("A", "P", 5))}, {})
    assert len(mandates) == 1 and (NO_RESULTS, date(2024, 10, 27), None) in [(g.reason, g.start, g.end) for g in gaps]
    mandates, gaps = derive({LOCAL_2024.id: race(("A", "P", 5)), PARTIAL_2025.id: race(("C", "R", 5), ("D", "S", 5))}, {})  # a partial election that is a tie
    assert [m.leader for m in mandates] == ["A"] and gaps[-1].reason == NO_RESULTS and gaps[-1].end is None


def test_an_alliance_keeps_its_registered_name_with_member_parties_and_an_independent_is_not_a_party():
    mandates, _ = derive({LOCAL_2020.id: race(("A", "ALIANȚA USR PLUS", 5)), LOCAL_2024.id: race(("B", None, 5))}, {key("ALIANȚA USR PLUS"): ["PARTIDUL USR", "PLUS"]})
    assert (mandates[0].list_name, mandates[0].member_parties, mandates[0].independent) == ("ALIANȚA USR PLUS", ("PARTIDUL USR", "PLUS"), False)
    assert (mandates[1].list_name, mandates[1].member_parties, mandates[1].independent) == ("Independent", (), True)


# ---- the fetch, with a stubbed http ----------------------------------------------------------------------------------------------

class Resp:
    def __init__(self, body: bytes | None = None, js=None):
        self.body, self.js = body or b"", js

    def raise_for_status(self):
        pass

    def json(self):
        return self.js

    def iter_content(self, chunk_size):
        yield self.body


def stub(calls, sha="sha1"):
    listing = [{"type": "file", "name": "pv_part_uat_p_bv_880030.csv", "sha": sha, "download_url": "https://raw.example/pv_part_uat_p_bv_880030.csv"},
               {"type": "file", "name": "pv_part_uat_p_db (1).csv", "sha": "x", "download_url": "https://raw.example/dup.csv"},
               {"type": "file", "name": "presence_now.csv", "sha": "y", "download_url": "https://raw.example/presence.csv"}]

    def http(url, **kw):
        calls.append(url)
        if url.startswith(aep_fetch.C4R_API + "contents"):
            return Resp(js=listing)
        if url.startswith(aep_fetch.C4R_API + "commits"):
            return Resp(js=[{"commit": {"committer": {"date": "2025-12-09T18:02:15Z"}}}])
        return Resp(b"{}" if url.endswith(".json") else b"a,b\n1,2\n")
    return http


def test_fetch_archives_each_round_once_and_states_the_data_through_date_of_the_one_off_file(tmp_path):
    archive, calls = Archive(tmp_path / "a"), []
    summary = aep_fetch.fetch_aep(archive, http=stub(calls), counties=("bv", "b"), now=datetime(2026, 11, 14, tzinfo=timezone.utc))
    assert sorted(summary.archived) == ["final/local/2020-09-27", "final/local/2024-06-09", "partial/local/2025-12-07", "repeat/local/2020-10-11"] and not summary.failed
    assert aep_fetch.AEP_2020.format(county="bv") in calls and aep_fetch.C4R_2024.format(county="b") in calls
    assert not any("dup" in c or "presence" in c for c in calls)  # only the race files, never a duplicate or the presence file
    [partial] = [u for u, _ in archive.survey() if u is not None and u.stream == "partial"]
    assert partial.origin["dataThrough"] == "2025-12-09" and partial.origin["oneOff"] and sorted(partial.files) == ["pv_part_uat_p_bv_880030.csv"]
    again = aep_fetch.fetch_aep(archive, http=stub([]), counties=("bv", "b"))
    assert again.archived == [] and len(again.unchanged) == 4


def test_the_refresh_check_only_alerts_about_a_newer_one_off_file_and_never_downloads(tmp_path):
    archive = Archive(tmp_path / "a")
    assert "no file archived yet" in aep_fetch.check_partial(archive, http=stub([]))[0]
    aep_fetch.fetch_aep(archive, http=stub([]), counties=("bv",))
    calls = []
    assert aep_fetch.check_partial(archive, http=stub(calls)) == []
    changed = aep_fetch.check_partial(archive, http=stub(calls, sha="sha2"))
    assert len(changed) == 1 and "newer upstream file set" in changed[0] and "2025-12-09" in changed[0]
    assert not any(c.startswith("https://raw.example") for c in calls)  # listings only
    assert "upstream check failed" in aep_fetch.check_partial(archive, http=lambda *a, **k: (_ for _ in ()).throw(OSError("down")))[0]
