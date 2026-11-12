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
from datetime import datetime, timezone
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
        assert c.execute("SELECT count(*), min(source_file_id) FROM seap.record WHERE code = 'DAN9100002'").fetchone()[0] == 1
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
