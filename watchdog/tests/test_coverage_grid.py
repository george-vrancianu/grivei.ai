"""The Coverage grid (#79) without a database: the possibly-incomplete rule as a pure function, and every cell state of `compute_grid`."""
from datetime import date

import pytest

from pipeline.coverage import DEFAULT_KNOWN_GAPS, CellFacts, Inputs, below_neighbours, compute_grid, flagged, load_known_gaps, neighbour_rows
from pipeline.coverage.grid import label, parse_quarter, quarters_to

D = date.fromisoformat
Q = parse_quarter


# ---- the published rule ------------------------------------------------------------------------------------------------


def test_a_2024_q4_style_undersized_file_is_flagged_by_the_rule():
    # 2024 Q4 Contracte, scaled down 1:1000: 95 against neighbours 124..229 (the real ones are 124k..229k rows)
    neighbours = [124, 180, 229, 150]  # two quarters before, two after: median 165, 60% = 99
    assert below_neighbours(95, neighbours)


def test_the_boundary_is_strict_exactly_sixty_percent_is_not_flagged():
    neighbours = [124, 180, 229, 150]
    assert not below_neighbours(99, neighbours)  # 99 == 60% of 165
    assert below_neighbours(98, neighbours)
    assert not below_neighbours(100, neighbours)


def test_the_median_of_an_odd_count_is_the_middle_one():
    assert below_neighbours(5, [10, 100, 12])  # median 12 -> 7.2
    assert not below_neighbours(8, [10, 100, 12])


def test_fewer_than_two_neighbours_means_not_evaluated():
    assert not below_neighbours(1, [])
    assert not below_neighbours(1, [1000])
    assert below_neighbours(1, [1000, 1000])


def test_neighbours_are_the_two_nearest_loaded_quarters_each_side_and_never_the_candidate():
    rows = {Q("2024Q1"): 1, Q("2024Q2"): 2, Q("2024Q3"): 3, Q("2024Q4"): 4, Q("2025Q2"): 5, Q("2025Q3"): 6, Q("2025Q4"): 7}
    assert neighbour_rows(Q("2024Q4"), rows) == [2, 3, 5, 6]
    assert neighbour_rows(Q("2024Q1"), rows) == [2, 3]
    assert neighbour_rows(Q("2025Q4"), rows) == [5, 6]  # a quarter with no file (2025 Q1) is skipped over, not counted as zero


# ---- the grid ----------------------------------------------------------------------------------------------------------------


def grid(**kw):
    kw.setdefault("today", D("2025-09-20"))
    cells = compute_grid(Inputs(**kw))
    return {(c.quarter, c.kind): c for c in cells}


def test_the_grid_runs_from_2021_q1_to_the_quarter_of_today_four_kinds_each():
    cells = compute_grid(Inputs(today=D("2025-09-20")))
    assert len(cells) == 19 * 4
    assert (cells[0].quarter, cells[0].kind) == ("2021-Q1", "DA")
    assert [c.kind for c in cells[:4]] == ["DA", "DAN", "CONTRACT", "AWARD_NOTICE"]
    assert (cells[-1].quarter, cells[-1].kind) == ("2025-Q3", "AWARD_NOTICE")
    assert quarters_to(D("2021-01-01")) == [(2021, 1)]
    assert label((2024, 4)) == "2024-Q4"


def test_a_loaded_bulk_quarter_counts_its_records_and_is_through_its_latest_record():
    g = grid(bulk_rows={("DA", Q("2022Q1")): 4}, facts={("DA", Q("2022Q1")): CellFacts(3, 0, D("2022-03-31"))})
    c = g["2022-Q1", "DA"]
    assert (c.state, c.rule, c.note, c.records, c.data_through) == ("LOADED", None, None, 3, D("2022-03-31"))


def test_crawl_only_records_count_in_a_loaded_cell():
    g = grid(bulk_rows={("CONTRACT", Q("2025Q2")): 15}, facts={("CONTRACT", Q("2025Q2")): CellFacts(16, 1, D("2025-06-30"))})
    assert g["2025-Q2", "CONTRACT"].records == 16


def test_a_hand_entered_gap_overrides_a_loaded_file_and_shows_its_reason_verbatim():
    reason = "Fișier încărcat greșit; raportat la sursă"
    g = grid(bulk_rows={("DAN", Q("2025Q2")): 3}, known_gaps={("DAN", Q("2025Q2")): reason})
    c = g["2025-Q2", "DAN"]
    assert (c.state, c.rule, c.note) == ("KNOWN_GAP", "HAND_ENTERED", reason)


def test_a_known_gap_quarter_is_not_a_neighbour_of_the_rule():
    # 2024Q3 has 59 rows; its neighbours 2024Q2 100, 2024Q4 100, 2025Q1 100 give 60 (59 is below)
    rows = {("CONTRACT", Q("2024Q2")): 100, ("CONTRACT", Q("2024Q3")): 59, ("CONTRACT", Q("2024Q4")): 100, ("CONTRACT", Q("2025Q1")): 100}
    assert grid(bulk_rows=rows)["2024-Q3", "CONTRACT"].state == "POSSIBLY_INCOMPLETE"
    # the operator marked two of those quarters as gaps: one neighbour left, the rule is not evaluated
    gaps = {("CONTRACT", Q("2024Q2")): "x", ("CONTRACT", Q("2025Q1")): "x"}
    assert grid(bulk_rows=rows, known_gaps=gaps)["2024-Q3", "CONTRACT"].state == "LOADED"


def test_the_undersized_quarter_is_possibly_incomplete_and_its_neighbours_are_not():
    rows = {("CONTRACT", Q(q)): n for q, n in {"2024Q2": 124, "2024Q3": 180, "2024Q4": 95, "2025Q1": 229, "2025Q2": 150}.items()}
    g = grid(bulk_rows=rows)
    assert {q: c.state for (q, k), c in g.items() if k == "CONTRACT" and c.state in ("LOADED", "POSSIBLY_INCOMPLETE")} == {
        "2024-Q2": "LOADED", "2024-Q3": "LOADED", "2024-Q4": "POSSIBLY_INCOMPLETE", "2025-Q1": "LOADED", "2025-Q2": "LOADED"}
    assert g["2024-Q4", "CONTRACT"].rule == "COUNT_BELOW_NEIGHBOURS"


def test_the_rule_is_per_kind():
    rows = {("CONTRACT", Q("2024Q4")): 1, ("DA", Q("2024Q3")): 1000, ("DA", Q("2025Q1")): 1000}
    assert grid(bulk_rows=rows)["2024-Q4", "CONTRACT"].state == "LOADED"  # DA files are not its neighbours


def test_2021_22_award_notices_are_not_in_the_source_until_the_backfill_covers_the_quarter():
    g = grid()
    assert (g["2021-Q1", "AWARD_NOTICE"].state, g["2021-Q1", "AWARD_NOTICE"].rule) == ("NOT_IN_SOURCE", "NO_PRIOR_CALL_BEFORE_BACKFILL")
    assert g["2022-Q4", "AWARD_NOTICE"].state == "NOT_IN_SOURCE"
    assert g["2023-Q1", "AWARD_NOTICE"].state == "NOT_YET_LOADED"  # 2023+: the bulk file exists at the source, not here yet
    assert g["2021-Q1", "CONTRACT"].state == "NOT_YET_LOADED"  # only award notices are "not in the source"
    covered = grid(backfilled={Q("2021Q2")}, facts={("AWARD_NOTICE", Q("2021Q2")): CellFacts(2, 2, D("2021-05-06"))})
    c = covered["2021-Q2", "AWARD_NOTICE"]
    assert (c.state, c.rule, c.note, c.records, c.data_through) == ("LOADED", None, None, 2, D("2021-05-06"))
    assert covered["2021-Q3", "AWARD_NOTICE"].state == "NOT_IN_SOURCE"


def test_a_partly_backfilled_2021_22_quarter_is_still_not_in_the_source():
    g = grid(facts={("AWARD_NOTICE", Q("2021Q3")): CellFacts(5, 5, D("2021-08-02"))})
    assert g["2021-Q3", "AWARD_NOTICE"].state == "NOT_IN_SOURCE"
    assert g["2021-Q3", "AWARD_NOTICE"].records == 5  # what is there is counted, it just is not the whole quarter


def test_crawled_records_without_a_bulk_file_are_provisional_through_the_crawl_data_through():
    g = grid(facts={("CONTRACT", Q("2025Q3")): CellFacts(4, 4, D("2025-07-02")), ("AWARD_NOTICE", Q("2025Q3")): CellFacts(2, 2, D("2025-07-02"))},
             crawl_through={"CONTRACT": D("2025-09-18"), "AWARD_NOTICE": D("2025-07-02")})
    c = g["2025-Q3", "CONTRACT"]
    assert (c.state, c.rule, c.records, c.data_through) == ("CRAWLED_PROVISIONAL", "AWAITING_BULK_FILE", 4, D("2025-09-18"))
    assert g["2025-Q3", "AWARD_NOTICE"].data_through == D("2025-07-02")


def test_provisional_data_through_never_passes_the_end_of_the_quarter():
    g = grid(facts={("CONTRACT", Q("2025Q2")): CellFacts(1, 1, D("2025-06-30"))}, crawl_through={"CONTRACT": D("2025-09-18")})
    assert g["2025-Q2", "CONTRACT"].data_through == D("2025-06-30")


def test_no_bulk_and_no_crawl_is_not_yet_loaded_awaiting_the_bulk_file_for_every_kind_in_the_current_quarter():
    g = grid()
    for kind in ("DA", "DAN"):
        c = g["2025-Q3", kind]
        assert (c.state, c.rule, c.note, c.records, c.data_through) == ("NOT_YET_LOADED", "AWAITING_BULK_FILE", None, 0, None)


def test_a_quarantined_file_is_not_yet_loaded_with_no_rule_no_note_and_no_data_through():
    g = grid(quarantined={("DA", Q("2022Q2"))}, facts={("DA", Q("2022Q2")): CellFacts(0, 0, None)})
    c = g["2022-Q2", "DA"]
    assert (c.state, c.rule, c.note, c.records, c.data_through) == ("NOT_YET_LOADED", None, None, 0, None)


def test_a_quarantined_quarter_with_crawled_records_looks_as_if_the_file_did_not_exist():
    g = grid(quarantined={("CONTRACT", Q("2025Q3"))}, facts={("CONTRACT", Q("2025Q3")): CellFacts(1, 1, D("2025-07-01"))}, crawl_through={"CONTRACT": D("2025-07-02")})
    assert g["2025-Q3", "CONTRACT"].state == "CRAWLED_PROVISIONAL"


def test_a_loaded_file_wins_over_a_quarantined_one_of_the_same_cell():
    g = grid(bulk_rows={("DA", Q("2022Q2")): 3}, quarantined={("DA", Q("2022Q2"))})
    assert g["2022-Q2", "DA"].state == "LOADED"


def test_flagged_lines_name_the_cells_to_look_at_and_never_a_quarantine_reason():
    rows = {("CONTRACT", Q(q)): n for q, n in {"2024Q2": 124, "2024Q3": 180, "2024Q4": 95, "2025Q1": 229, "2025Q2": 150}.items()}
    lines = flagged([c for c in compute_grid(Inputs(today=D("2025-09-20"), bulk_rows=rows, quarantined={("DA", Q("2022Q2"))},
                                                    known_gaps={("DAN", Q("2025Q2")): "motiv"}))])
    assert any("2024-Q4 CONTRACT possibly incomplete" in line for line in lines)
    assert "coverage: 2022-Q2 DA not yet loaded" in lines
    assert "coverage: 2025-Q2 DAN known gap (hand-entered)" in lines
    assert not any("2025-Q3" in line for line in lines)  # awaiting a bulk file is expected, not flagged


# ---- the known-gaps file -----------------------------------------------------------------------------------------------------


def test_the_checked_in_known_gaps_file_holds_the_q2_2025_dan_gap_with_a_reason():
    gaps = load_known_gaps(DEFAULT_KNOWN_GAPS)
    assert list(gaps) == [("DAN", Q("2025Q2"))]
    assert gaps["DAN", Q("2025Q2")].strip()


def test_known_gaps_file_format(tmp_path):
    f = tmp_path / "gaps.csv"
    f.write_text('# a comment\nquarter,kind,reason\n\n2023Q1,da,"un motiv, cu virgulă"\n2024-Q3,CONTRACT,alt motiv\n', encoding="utf-8")
    assert load_known_gaps(f) == {("DA", Q("2023Q1")): "un motiv, cu virgulă", ("CONTRACT", Q("2024Q3")): "alt motiv"}


@pytest.mark.parametrize("text", ["quarter,kind,reason\n2023-Q5,DA,x\n", "quarter,kind,reason\n2023-Q1,XX,x\n", "quarter,kind,reason\n2023-Q1,DA,\n"])
def test_a_bad_known_gaps_entry_is_refused(tmp_path, text):
    f = tmp_path / "gaps.csv"
    f.write_text(text, encoding="utf-8")
    with pytest.raises(ValueError):
        load_known_gaps(f)
