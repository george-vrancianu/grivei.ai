"""The `sources` registry (pipeline/sources.py): its entries are complete, and the landing page's static rows agree with them."""
import re
from pathlib import Path

from pipeline.sources import SOURCES, by_id

SITE = Path(__file__).resolve().parents[2] / "site"
STATUS_WORDS = {"en": {"live": "live", "wip": "in progress", "next": "next", "skipped": "skipped"},
                "ro": {"live": "funcțional", "wip": "în lucru", "next": "urmează", "skipped": "omis"}}


def _rows(page: str) -> dict[str, tuple[str, str, str]]:
    """name -> (data-status, description, status word) of each row of the page's `<ol id="sources">`."""
    html = page.split('id="sources"', 1)[1].split("</ol>", 1)[0]
    found = re.findall(r'<li class="source" data-status="(\w+)">\s*<h3 class="source__name">(.*?)</h3>\s*<p class="source__what">(.*?)</p>\s*<p class="status">(.*?)</p>', html, re.S)
    return {name: (status, what, word) for status, name, what, word in found}


def test_every_entry_is_complete_and_ids_are_unique():
    assert len({s.id for s in SOURCES}) == len(SOURCES)
    for s in SOURCES:
        assert s.name and s.schema and s.record_kinds and s.lenses and s.placement_rule and s.methodology_anchor
        assert s.landing_row.status in STATUS_WORDS["en"] and set(s.landing_row.what) == {"en", "ro"}
        assert callable(s.status) and s.data_through_sql.strip().upper().startswith("SELECT")


def test_today_the_registry_holds_seap_and_onrc():
    assert [s.id for s in SOURCES] == ["SEAP", "ONRC"] and by_id("SEAP").schema == "seap" and by_id("ONRC").schema == "onrc"


def test_each_entry_has_its_own_schema_file_and_the_landing_pages_carry_its_row():
    for s in SOURCES:
        assert (Path(__file__).resolve().parents[1] / "pipeline" / "sql" / f"{s.schema}_schema.sql").is_file()
        for lang, path in (("en", SITE / "index.html"), ("ro", SITE / "ro" / "index.html")):
            row = _rows(path.read_text(encoding="utf-8"))[s.landing_row.name]
            assert row == (s.landing_row.status, s.landing_row.what[lang], STATUS_WORDS[lang][s.landing_row.status]), (s.id, lang)
