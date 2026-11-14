"""BaniPartide's firm donations through a real rebuild (ticket #182): `archive-banipartide/` on top of `archive-identity/` is rebuilt into Postgres. Only CUI-keyed
firms are loaded (an individual's row, a truncated CNP, an empty id never reach a table), the party is as published, an unreadable date stays NULL beside its verbatim
text, money is bani, and a sole trader's CUI is not loaded. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.banipartide.build import build_donations  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURES / "archive-identity", root)
    shutil.copytree(FIXTURES / "archive-banipartide", root, dirs_exist_ok=True)
    return Archive(root)


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


def test_only_firm_rows_are_loaded_as_published_with_their_citation(db, archive):
    summary = rebuild(archive, db, overrides_path=FIXTURES / "identity-overrides.toml")
    d = summary.donations
    assert d is not None and (d.files, d.rows, d.loaded, d.dropped_no_cui, d.dropped_sole_trader, d.dropped_other, d.through_year) == (1, 10, 5, 3, 0, 2, 2024)
    assert "donations: 5 firm donations and loans of 10 rows (data through 2024); dropped 3 not CUI-keyed, 0 sole traders, 2 unreadable" in summary.lines()
    rows = q(db, "SELECT donor_cui, party, donation_year, donation_date, date_text, amount_bani, kind, source_row FROM donations.donation ORDER BY source_row")
    assert rows == [
        ("2000007", "PNL", 2023, __import__("datetime").date(2023, 3, 15), "15.03.2023", 5_000_000, "DONATION", 1),
        ("2000007", "PSD", 2024, None, "20.01.2024; 15.05.2024", 25_000_050, "LOAN", 2),  # two dates in the cell: none set, the text kept
        ("2000015", "USR", 2022, __import__("datetime").date(2022, 10, 4), "4102022", 800_536, "DONATION", 3),
        ("2000031", "PSD+PC", 2021, __import__("datetime").date(2021, 6, 9), "9 iunie 2021", 1_200_000, "DONATION", 4),  # the party exactly as published
        ("5443785", "PNL", 2020, None, "", 70_000, "DONATION", 5),  # a donor with no entity is kept (#185 may match it later), no page lists it
    ]
    (file,) = q(db, "SELECT database_hash, table_name, license, license_url, source, underlying, archive_path, row_count, loaded_count, through_year FROM donations.source_file")
    assert file[:5] == ("a27b538b18959ef0899003168196055f75664d82859ac1aab3ab48df4e408405", "Donatori persoane juridice", "CC Attribution 4.0 License",
                        "http://creativecommons.org/licenses/by/4.0/", "Expert Forum")
    assert "Monitorul Oficial" in file[5] and file[6].endswith("donatori_persoane_juridice.csv") and file[7:] == (10, 5, 2024)


def test_no_individual_name_reaches_any_table_of_the_graph(db, archive):
    rebuild(archive, db, overrides_path=FIXTURES / "identity-overrides.toml")
    with psycopg.connect(db) as c:
        tables = c.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE'").fetchall()
        for schema, table in tables:
            dump = c.execute(f'SELECT string_agg(t::text, \' \') FROM "{schema}"."{table}" t').fetchone()[0] or ""
            for needle in ("ZAMFIR", "POPA ELENA", "Reprezentant Fictiv", "1,85E+12"):
                assert needle not in dump, (schema, table, needle)
    assert [r[0] for r in q(db, "SELECT column_name FROM information_schema.columns WHERE table_schema = 'donations' AND table_name = 'donation' ORDER BY ordinal_position")] == [
        "id", "donor_cui", "party", "donation_year", "donation_date", "date_text", "amount_bani", "kind", "source_file_id", "source_row"]  # no donor name column exists


def test_a_sole_traders_cui_is_not_loaded(db, archive):
    rebuild(archive, db, overrides_path=FIXTURES / "identity-overrides.toml")
    with psycopg.connect(db) as c:  # ALFA's entity reads as a sole trader (ANAF's name): the same rebuild step runs again on it
        c.execute("UPDATE core.entity SET display_name = 'ALFA ION PERSOANĂ FIZICĂ AUTORIZATĂ' WHERE key = '2000007'")
        c.execute("TRUNCATE donations.donation, donations.source_file CASCADE")
        with c.cursor() as cur:
            summary = build_donations(cur, archive)
        c.commit()
    assert (summary.loaded, summary.dropped_sole_trader) == (3, 2)
    assert q(db, "SELECT count(*) FROM donations.donation WHERE donor_cui = '2000007'") == [(0,)]
    assert q(db, "SELECT count(*) FROM donations.donation") == [(3,)]


def test_a_rebuild_without_the_table_has_an_empty_schema_and_says_so(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURES / "archive-identity", root)
    summary = rebuild(Archive(root), db, overrides_path=FIXTURES / "identity-overrides.toml")
    assert summary.donations.files == 0 and "donations: none archived" in summary.donations.line()
    assert q(db, "SELECT count(*) FROM donations.donation") == [(0,)]
