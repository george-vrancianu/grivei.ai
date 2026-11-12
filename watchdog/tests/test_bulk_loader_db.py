"""The loader against a real Postgres: identity by public code, re-loads change nothing, later publication wins.
Needs Docker (one throwaway container, `pp37-pytest-<pid>`, 1 GB cap, removed at the end); skipped without it.
The image pin comes from compose.yaml. No dev database is touched."""
import atexit
import json
import os
import re
import shutil
import subprocess
import time
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402

FIXTURE = Path(__file__).parent / "fixtures" / "archive-bulk"
COMPOSE = Path(__file__).resolve().parents[2] / "compose.yaml"
NAME = f"pp37-pytest-{os.getpid()}"
HEAD = "Autoritate contractanta,CUI ,Numar notificare,Data publicare,Denumire,Cod CPV,Denumire CPV,Valoare atribuita (RON),Ofertant,CUI ofertant\n"


def _docker_ok() -> bool:
    try:
        return subprocess.run(["docker", "info"], capture_output=True).returncode == 0
    except FileNotFoundError:
        return False


def _remove():
    subprocess.run(["docker", "rm", "-f", "-v", NAME], capture_output=True)


@pytest.fixture(scope="module")
def server():
    if not _docker_ok():
        pytest.skip("Docker is not available")
    image = re.search(r"image:\s*(paradedb/paradedb:\S+)", COMPOSE.read_text())[1]
    atexit.register(_remove)
    subprocess.run(["docker", "run", "-d", "--name", NAME, "--memory=1g", "--label", "pp37=pytest", "-e", "POSTGRES_PASSWORD=t",
                    "-p", "127.0.0.1::5432", image], check=True, capture_output=True)
    port = subprocess.run(["docker", "port", NAME, "5432/tcp"], check=True, capture_output=True, text=True).stdout.split("\n")[0].rsplit(":", 1)[1]
    url = f"postgresql://postgres:t@127.0.0.1:{port}"
    deadline = time.time() + 90
    while True:
        try:
            psycopg.connect(f"{url}/postgres", autocommit=True).close()
            break
        except psycopg.OperationalError:
            if time.time() > deadline:
                raise
            time.sleep(0.5)
    yield url
    _remove()


@pytest.fixture
def db(server, tmp_path):
    name = f"t{time.time_ns()}"
    with psycopg.connect(f"{server}/postgres", autocommit=True) as c:
        c.execute(f"CREATE DATABASE {name}")
    return f"{server}/{name}"


def _copy_fixture(tmp_path) -> Archive:
    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)
    return Archive(root)


def _dump(url):
    with psycopg.connect(url) as c:
        return (c.execute("SELECT code, kind, quarter, award_date, value_bani, authority_cui, supplier_cui, source_file_id FROM seap.record ORDER BY code").fetchall(),
                c.execute("SELECT record_code, award_date, counted_bani FROM seap.search ORDER BY 1").fetchall())


def test_the_fixture_archive_loads_da_and_dan_and_the_same_file_twice_changes_nothing(db, tmp_path):
    archive = _copy_fixture(tmp_path)
    summary = rebuild(archive, db)
    assert summary.records == 13 and summary.files_loaded == 5 and len(summary.duplicate_files) == 1 and len(summary.quarantined) == 1
    with psycopg.connect(db) as c:
        kinds = dict(c.execute("SELECT kind, count(*) FROM seap.record GROUP BY 1").fetchall())
        assert kinds == {"DA": 6, "DAN": 7}
        assert c.execute("SELECT count(*) FROM seap.record WHERE code = 'DA91000099'").fetchone() == (0,)
        assert c.execute("SELECT count(*) FROM seap.search").fetchone() == (13,)
        assert c.execute("SELECT load_notes FROM seap.record WHERE code = 'DAN9100022'").fetchone() == (["value:scientific_notation", "supplier_cui:scientific_notation"],)
        # DAN9100002 is in two quarters' files: it is there once, from the first
        assert c.execute("SELECT count(*), min(source_file_id) FROM seap.record WHERE code = 'DAN9100002'").fetchone() == (1, 3)
    first = _dump(db)
    # the very same files again, as a re-upload on a later day (a new fetch of the same unit)
    for kind, unit, day in (("dan", "2024Q1", "2024-06-20"), ("dan", "2025Q1", "2025-06-20")):
        src = archive.root / "seap/bulk" / kind / unit / day
        dest = src.parent / "2026-01-01"
        shutil.copytree(src, dest)
        manifest = json.loads((dest / "manifest.json").read_text())
        manifest["fetchedAt"] = "2026-01-01T09:00:00Z"
        (dest / "manifest.json").write_text(json.dumps(manifest))
    second = rebuild(archive, db)
    assert len(second.duplicate_files) == 3  # the first re-upload, and these two
    assert _dump(db) == first


def _write(archive: Archive, kind: str, unit: str, day: datetime, text: str, name="f.csv"):
    archive.write_unit(source="seap", stream="bulk", kind=kind, unit=unit, fetched_at=day, files={name: text.encode()}, via="v")


def test_the_later_publication_wins_and_an_older_reupload_cannot_overwrite_it(db, tmp_path):
    a = Archive(tmp_path / "a")
    t = lambda y, m, d: datetime(y, m, d, 9, tzinfo=timezone.utc)
    _write(a, "dan", "2024Q1", t(2024, 5, 1), HEAD + "A,1,DAN1,01/09/2024,old title,c,d,10,O,2\nA,1,DAN2,01/10/2024,two,c,d,5,O,2\n")
    # a later fetch (another quarter's export) carries DAN1 republished with a new value
    _write(a, "dan", "2024Q2", t(2024, 8, 1), HEAD + "A,1,DAN1,04/09/2024,new title,c,d,20,O,2\n")
    # an old quarter re-uploaded last: must not bring the old DAN1 back
    _write(a, "dan", "2024Q1", t(2024, 9, 1), HEAD + "A,1,DAN1,01/09/2024,old title again,c,d,11,O,2\nA,1,DAN2,01/10/2024,two,c,d,5,O,2\n")
    rebuild(a, db)
    with psycopg.connect(db) as c:
        assert c.execute("SELECT title, value_bani, quarter, source_file_id FROM seap.record WHERE code='DAN1'").fetchone() == ("new title", 2000, "2024Q2", 2)
        assert c.execute("SELECT count(*) FROM seap.search WHERE record_code='DAN1'").fetchone() == (1,)
        assert c.execute("SELECT counted_bani FROM seap.search WHERE record_code='DAN1'").fetchone() == (2000,)
        assert c.execute("SELECT title, source_file_id FROM seap.record WHERE code='DAN2'").fetchone() == ("two", 1)  # untouched by the re-upload
    # the same publication date with different content: the later file wins the tie
    b = Archive(tmp_path / "b")
    _write(b, "dan", "2024Q1", t(2024, 5, 1), HEAD + "A,1,DAN1,01/09/2024,first,c,d,10,O,2\n")
    _write(b, "dan", "2024Q1", t(2024, 6, 1), HEAD + "A,1,DAN1,01/09/2024,corrected,c,d,10,O,2\n", name="g.csv")
    rebuild(b, db)
    with psycopg.connect(db) as c:
        assert c.execute("SELECT title FROM seap.record WHERE code='DAN1'").fetchone() == ("corrected",)


# ---- contracts and award notices (ticket #64) ---------------------------------------------------------------------------

from test_contracts_loader import H22, line22  # noqa: E402

CONTRACTS = Path(__file__).parent / "fixtures" / "archive-contracts"


def _record(url, code):
    with psycopg.connect(url) as c:
        return c.execute("SELECT code, title, value_bani, counted_bani, quarter, winners, source_file_id, kind, channel FROM seap.record WHERE code = %s",
                         (code,)).fetchone()


def test_the_contracts_fixture_loads_one_record_per_contract_and_per_award_notice(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(CONTRACTS, root)
    summary = rebuild(Archive(root), db)
    assert (summary.records, summary.files_loaded, len(summary.quarantined)) == (12, 6, 1)
    with psycopg.connect(db) as c:
        assert dict(c.execute("SELECT kind, count(*) FROM seap.record GROUP BY 1").fetchall()) == {"CONTRACT": 10, "AWARD_NOTICE": 2}
        assert c.execute("SELECT count(*) FROM seap.record WHERE code LIKE 'CAN9000099%'").fetchone() == (0,)  # the quarantined file
        assert c.execute("SELECT channel, notice_code, contract_numbers, lot_count, concluded_by FROM seap.record WHERE code = 'CAN9000010~133'").fetchone() == (
            "CONTRACT", "CAN9000010", ["133"], 1, "Cu acord cadru subsecvent")


def test_a_contract_recurring_in_a_later_quarter_is_one_record_with_the_newer_version(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(CONTRACTS, root)
    rebuild(Archive(root), db)
    code, title, value, counted, quarter, winners, file_id, kind, channel = _record(db, "CAN9000003~5")
    with psycopg.connect(db) as c:
        assert c.execute("SELECT count(*) FROM seap.record WHERE code = 'CAN9000003~5'").fetchone() == (1,)
        assert c.execute("SELECT count(*) FROM seap.search WHERE record_code = 'CAN9000003~5'").fetchone() == (1,)
        assert c.execute("SELECT unit, row_count FROM seap.source_file WHERE id = %s", (file_id,)).fetchone() == ("2022Q2", 2)
    # the 2022 Q2 file's version (notice published 2022-05-20): its title, value and winner, and the quarter of that publication
    assert (title, value, counted, quarter, kind, channel) == ("Combustibil (actualizat)", 15000, 15000, "2022Q2", "CONTRACT", "CONTRACT")
    assert winners == [{"name": "PETROL NOU SA", "cui": "2000005"}]


def test_reloading_an_older_file_after_a_newer_one_leaves_the_newer_version(db, tmp_path):
    # the fixture's last fetch (2023-01-10) is the 2022 Q1 file again, holding CAN9000003 / 5 as it was in March 2022 (value 999)
    root = tmp_path / "archive"
    shutil.copytree(CONTRACTS, root)
    archive = Archive(root)
    last = max((u for u in archive.units() if u.kind == "contracte" and u.unit == "2022Q1"), key=lambda u: u.fetched_at)
    assert last.fetched_at.date().isoformat() == "2023-01-10" and "reincarcat" in last.file_path(last.files[0]).read_text()
    rebuild(archive, db)
    assert _record(db, "CAN9000003~5")[1:4] == ("Combustibil (actualizat)", 15000, 15000)
    with psycopg.connect(db) as c:  # that file was loaded (it is a loaded file, not a skipped one) and changed nothing
        assert c.execute("SELECT count(*) FROM seap.source_file WHERE unit = '2022Q1'").fetchone() == (2,)


def test_the_result_does_not_depend_on_the_order_the_files_arrive_in(db, tmp_path):
    t = lambda y, m, d: datetime(y, m, d, 9, tzinfo=timezone.utc)
    old = H22 + line22(published="03/10/2022", value="999", title="old", supplier="OLD", cui="2000004")
    new = H22 + line22(published="05/20/2022", value="150", title="new", supplier="NEW", cui="2000005")
    dumps = []
    for name, first, second in (("a", old, new), ("b", new, old)):
        a = Archive(tmp_path / name)
        _write(a, "contracte", "2022Q1", t(2022, 6, 1), first)
        _write(a, "contracte", "2022Q2", t(2022, 9, 1), second, name="g.csv")
        rebuild(a, db)
        with psycopg.connect(db) as c:
            dumps.append(c.execute("SELECT code, title, value_bani, quarter, award_date, winners FROM seap.record").fetchall())
            assert c.execute("SELECT count(*) FROM seap.search").fetchone() == (1,)
    assert dumps[0] == dumps[1] == [("CAN1~C1", "new", 15000, "2022Q2", date(2021, 12, 27), [{"name": "NEW", "cui": "2000005"}])]


def test_the_same_publication_date_with_other_content_goes_to_the_later_file_and_replaces_the_whole_version(db, tmp_path):
    t = lambda y, m, d: datetime(y, m, d, 9, tzinfo=timezone.utc)
    a = Archive(tmp_path / "a")
    first = H22 + line22(lot="1", value="100", supplier="ALFA") + line22(lot="2", value="100", supplier="GAMMA", cui="2000003")
    second = H22 + line22(lot="1", value="300", supplier="BETA", cui="2000002")
    _write(a, "contracte", "2022Q1", t(2022, 6, 1), first)
    _write(a, "contracte", "2022Q1", t(2022, 7, 1), second, name="g.csv")
    _write(a, "contracte", "2022Q1", t(2022, 8, 1), second, name="h.csv")  # the same bytes again: nothing to load
    summary = rebuild(a, db)
    assert len(summary.duplicate_files) == 1
    assert _record(db, "CAN1~C1")[1:4] == ("t", 30000, 30000)
    # replaced as a whole: the winners are the second file's, not a merge with the first's
    assert _record(db, "CAN1~C1")[5] == [{"name": "BETA", "cui": "2000002"}]
    with psycopg.connect(db) as c:
        assert c.execute("SELECT winner_position, winners, supplier_cui, share_bani FROM seap.search ORDER BY 1").fetchall() == [(1, 1, "2000002", 30000)]


def test_winners_are_stored_in_published_order_with_one_search_row_each(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(CONTRACTS, root)
    rebuild(Archive(root), db)
    assert _record(db, "CAN9000002~77/2022")[5] == [{"name": "BETA CHIMIE SRL", "cui": "2000002"}, {"name": "ALFA CHIMIE SRL", "cui": "2000001"}]
    assert _record(db, "CAN9100002")[5] == [{"name": "CENTRUL TOPMED DEMO", "cui": "6781938"}, {"name": "ASOCIEREA DEMO", "cui": "5555555"}]
    with psycopg.connect(db) as c:
        assert c.execute("SELECT winner_position, winners, supplier_cui, counted_bani, share_bani FROM seap.search WHERE record_code = 'CAN9000002~77/2022' ORDER BY 1").fetchall() == [
            (1, 2, "2000002", 120025, None), (2, 2, "2000001", 120025, None)]  # an equal share of a consortium's value is the counting rule's (#65)


def test_a_contracts_value_counts_once_when_its_lots_agree_and_sums_when_they_differ(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(CONTRACTS, root)
    rebuild(Archive(root), db)
    assert _record(db, "CAN9000001~C-100")[2:4] == (100000, 100000)  # 3 lots of 1,000 RON (and a second winner on lot 1)
    assert _record(db, "CAN9000002~77/2022")[2:4] == (120025, 120025)  # 500 + 700.25
    assert _record(db, "CAN9100001")[2] == 3519212 + 28846  # an award notice: its two contracts add
    assert _record(db, "CAN9100002")[2] == 9880000  # one contract, two winners: once
    with psycopg.connect(db) as c:
        assert c.execute("SELECT counted_bani FROM seap.record WHERE code = 'CAN9000020~36181'").fetchone() == (None,)  # no value in SEAP


def test_a_second_rebuild_of_the_contracts_fixture_gives_the_same_graph(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(CONTRACTS, root)
    dump = lambda: psycopg.connect(db).execute("SELECT code, kind, title, value_bani, winners, source_file_id FROM seap.record ORDER BY code").fetchall()
    rebuild(Archive(root), db)
    first = dump()
    rebuild(Archive(root), db)
    assert dump() == first


# ---- progress and kill safety of a rebuild (ticket #64, operator) --------------------------------------------------------

from pipeline import rebuild as rebuild_module  # noqa: E402
from pipeline.cli import main as cli_main  # noqa: E402
from pipeline.progress import Progress, read_status  # noqa: E402


def test_a_rebuild_reports_every_unit_as_it_goes_and_updates_the_status_file(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(CONTRACTS, root)
    status_file = tmp_path / "progress.json"
    lines, seen = [], []

    def out(line):
        lines.append(line)
        seen.append(read_status(status_file)["done"] if status_file.exists() else None)

    rebuild(Archive(root), db, Progress(status_file, out=out))
    units = [x for x in lines if " rebuild unit " in x]
    assert len(units) == 7  # six loaded files and the quarantined one
    assert re.search(r"rebuild unit 1/7 kind=contracte unit=2021Q3 files=1 rows=2 records=2 loaded in \d+\.\ds$", units[0])
    assert re.search(r"rebuild unit 3/7 kind=contracte unit=2022Q2 files=1 rows=2 records=2 loaded in", units[2])
    assert re.search(r"rebuild unit 5/7 kind=contracte unit=2023Q1 files=1 rows=0 records=0 quarantined \(headers do not match a CONTRACT file\)$", units[4])
    assert re.search(r"rebuild unit 7/7 kind=fara-anunt unit=2025Q1 files=1 rows=4 records=2 loaded", units[6])
    assert "rebuild done units=7 loaded=6 skipped=0 quarantined=1 records=12 in" in lines[-1]
    assert seen == [None, 0, 1, 2, 3, 4, 5, 6, 7]  # the file moves with the run: at each line it shows the units done before it
    status = read_status(status_file)
    assert (status["state"], status["done"], status["total"], status["loaded"], status["quarantined"], status["records"]) == ("finished", 7, 7, 6, 1, 12)


def test_the_rebuild_command_logs_unit_lines_and_writes_the_status_file(db, tmp_path, capsys):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)
    assert cli_main(["--archive", str(root), "rebuild", "--db", db]) == 0
    out = capsys.readouterr().out
    assert len(re.findall(r"^\S+ rebuild unit \d+/7 kind=", out, re.M)) == 7  # 5 loaded, 1 skipped (the same file fetched again), 1 quarantined
    assert re.search(r"^\S+ rebuild done units=7 loaded=5 skipped=1 quarantined=1 records=13 in ", out, re.M) and "loaded 13 records from 5 file(s)" in out
    assert re.search(r"kind=da unit=2022Q1 files=1 rows=0 records=0 skipped \(same file already loaded\)$", out, re.M)
    assert read_status(root / "rebuild-progress.json")["state"] == "finished"  # the default place: the archive root
    assert cli_main(["--archive", str(root), "status"]) == 0
    assert "state: finished" in capsys.readouterr().out


@pytest.mark.parametrize("killed_by", [RuntimeError("connection lost"), SystemExit(143)])  # a failure, and SIGTERM (the CLI turns it into SystemExit)
def test_a_killed_rebuild_leaves_the_previous_graph_and_a_rerun_from_scratch_gives_the_same_graph(db, tmp_path, monkeypatch, killed_by):
    root = tmp_path / "archive"
    shutil.copytree(CONTRACTS, root)
    archive, status_file = Archive(root), tmp_path / "progress.json"
    rebuild(archive, db)
    complete = _dump_all(db)
    assert len(complete[0]) == 12

    # a second rebuild dies in the middle of its third file
    real, calls = rebuild_module.load_records, []

    def dying(cur, source_file_id, rows):
        calls.append(source_file_id)
        if len(calls) == 3:
            raise killed_by
        real(cur, source_file_id, rows)

    monkeypatch.setattr(rebuild_module, "load_records", dying)
    with pytest.raises(type(killed_by)):
        rebuild(archive, db, Progress(status_file, out=lambda line: None))
    assert _dump_all(db) == complete  # nothing half-loaded: the rolled-back transaction left the previous schema as it was
    status = read_status(status_file)
    assert status["state"] == "failed" and status["done"] == 2 and status["loaded"] == 2

    monkeypatch.setattr(rebuild_module, "load_records", real)
    rebuild(archive, db, Progress(status_file, out=lambda line: None))  # rerun from scratch
    assert _dump_all(db) == complete
    assert read_status(status_file)["state"] == "finished"


def test_a_kill_before_the_first_commit_leaves_no_schema_at_all(db, tmp_path, monkeypatch):
    root = tmp_path / "archive"
    shutil.copytree(CONTRACTS, root)
    monkeypatch.setattr(rebuild_module, "load_records", lambda *a: (_ for _ in ()).throw(SystemExit(143)))
    with pytest.raises(SystemExit):
        rebuild(Archive(root), db)
    with psycopg.connect(db) as c:
        assert c.execute("SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'seap'").fetchone() == (0,)


def _dump_all(url):
    with psycopg.connect(url) as c:
        return (c.execute("SELECT code, kind, title, value_bani, quarter, winners, source_file_id FROM seap.record ORDER BY code").fetchall(),
                c.execute("SELECT record_code, winner_position, share_bani FROM seap.search ORDER BY 1, 2").fetchall(),
                c.execute("SELECT id, kind, unit, sha256 FROM seap.source_file ORDER BY id").fetchall())
