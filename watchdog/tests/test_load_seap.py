"""Loader tests: a SEAP batch goes through connectors/load_batch.py into a throwaway Postgres cluster.

Each test session runs `initdb` in a temp directory and starts a server on a private Unix socket, so no
existing database is touched. Skipped when the Postgres server binaries are not installed.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

WATCHDOG = Path(__file__).resolve().parents[1]


def pg_bindir():
    if shutil.which("initdb"):
        return Path(shutil.which("initdb")).parent
    pg_config = shutil.which("pg_config")
    if pg_config:
        bindir = Path(subprocess.run([pg_config, "--bindir"], capture_output=True, text=True).stdout.strip())
        if (bindir / "initdb").exists():
            return bindir
    return None


@pytest.fixture(scope="session")
def db(tmp_path_factory):
    bindir = pg_bindir()
    if bindir is None:
        pytest.skip("Postgres server binaries (initdb, pg_ctl) not found")
    root = tmp_path_factory.mktemp("pg")
    data, sock = root / "data", root / "sock"
    sock.mkdir()
    subprocess.run([bindir / "initdb", "-D", data, "-U", "postgres", "-A", "trust", "--no-sync"],
                   check=True, capture_output=True)
    subprocess.run([bindir / "pg_ctl", "-D", data, "-l", root / "log", "-w", "start",
                    "-o", f"-c listen_addresses='' -c unix_socket_directories='{sock}'"],
                   check=True, capture_output=True)
    url = f"postgresql://postgres@/postgres?host={sock}"
    try:
        psql(url, "-f", WATCHDOG / "sql" / "001_schema.sql")
        yield url
    finally:
        subprocess.run([bindir / "pg_ctl", "-D", data, "-m", "immediate", "stop"], capture_output=True)


def psql(url, *args):
    r = subprocess.run(["psql", url, "-v", "ON_ERROR_STOP=1", "-q", "-At", *map(str, args)],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return r.stdout


def load(db, tmp_path, notices, contracts=()):
    batch = {"authority": {"name": "MUNICIPIUL TEST", "cui": "1", "seapId": 1},
             "da": [], "notices": notices, "contracts": list(contracts)}
    f = tmp_path / "batch.json"
    f.write_text(json.dumps(batch))
    subprocess.run([sys.executable, WATCHDOG / "connectors" / "load_batch.py", "--source", "seap",
                    "--file", f, "--db", db], check=True, capture_output=True)


NO_VERSION = object()  # the notice has no versionId key, as in batches harvested before the connector kept it


def notice(ca_notice_id, type_id, version_id=NO_VERSION):
    n = {"caNoticeId": ca_notice_id, "noticeNo": f"N{ca_notice_id}", "typeId": type_id, "title": "T",
         "date": "2025-01-01T00:00:00", "isOnline": True}
    if version_id is not NO_VERSION:
        n["versionId"] = version_id
    return n


def notice_url(db, ca_notice_id):
    return psql(db, "-c", f"SELECT url FROM document WHERE source_id='seap' AND kind='award_notice' "
                          f"AND external_id='{ca_notice_id}'").strip()


V = "https://e-licitatie.ro/pub/notices/"


@pytest.mark.parametrize("type_id, version_id, path", [
    (3, 2, "ca-notices/view-c/"),
    (3, 1, "ca-notices/view-c/v1/"),
    (18, 2, "ca-notices/view-rfq/"),
    (18, 1, "ca-notices/view-scn/v1/"),
    (13, 2, "ca-notices/view-rfq/"),
    (20, 1, "ca-notices/view-rfq/v1/"),
    (16, 2, "ca-notices-pc/view/"),
    (16, 1, "ca-notices/view-pc/v1/"),
    (8, 2, "ca-notices-dc/view/"),
    (8, 1, "ca-notices/view-dc/v1/"),
])
def test_award_notice_url_follows_type_and_version(db, tmp_path, type_id, version_id, path):
    ca_notice_id = 900000 + type_id * 10 + version_id
    load(db, tmp_path, [notice(ca_notice_id, type_id, version_id)])
    assert notice_url(db, ca_notice_id) == f"{V}{path}{ca_notice_id}"


def test_notice_without_a_version_links_to_the_current_form(db, tmp_path):
    load(db, tmp_path, [notice(910018, 18)])
    assert notice_url(db, 910018) == f"{V}ca-notices/view-rfq/910018"


def test_reloading_a_notice_with_its_version_corrects_the_link(db, tmp_path):
    load(db, tmp_path, [notice(920003, 3)])
    load(db, tmp_path, [notice(920003, 3, 1)])
    assert notice_url(db, 920003) == f"{V}ca-notices/view-c/v1/920003"


def test_graph_export_drops_the_null_link_of_an_unmapped_notice_type(db, tmp_path):
    """A notice type with no known page has no URL; the edge's source links must not carry a null."""
    load(db, tmp_path, [notice(930099, 99, 2), notice(930003, 3, 2)], [
        {"caNoticeId": n, "id": n, "contractNo": "C", "date": "2025-01-02", "title": "T", "value": 1, "valueRon": 1,
         "winners": [{"name": "SC FURNIZOR GRAF SRL", "cui": "930000"}]} for n in (930099, 930003)])
    out = tmp_path / "graph.json"
    subprocess.run([sys.executable, WATCHDOG / "tools" / "export_graph.py", "--authority", "MUNICIPIUL TEST",
                    "--out", out], check=True, capture_output=True, env={**os.environ, "DATABASE_URL": db})
    [edge] = [e for e in json.loads(out.read_text())["edges"] if e["rel"] == "AWARDED_CONTRACT"]
    assert edge["urls"] == [f"{V}ca-notices/view-c/930003"]


# ---- ADR 0003: the legacy loader no longer turns foreign ids into digits or merges suppliers by name (#66) ----------------


@pytest.mark.parametrize(
    "published, cui",
    [("RO 16310091", "16310091"), ("ro16310091", "16310091"), ("0016310091", "16310091"), ("16310091", "16310091"),
     ("BG103029862", None), ("ATU 18379608", None), ("1003600118796", None), ("", None), ("-", None)],
)
def test_norm_cui_keeps_a_cui_and_never_turns_a_foreign_id_into_digits(db, published, cui):
    out = psql(db, "-c", f"SELECT coalesce(norm_cui('{published}'), '<null>')").strip()
    assert out == (cui or "<null>")


def test_upsert_entity_does_not_merge_homonyms_by_name(db):
    ids = psql(db, "-c", """
        SELECT upsert_entity('company', 'DRUM CONSTRUCT SRL', '16310091', NULL)
        UNION ALL SELECT upsert_entity('company', 'DRUM CONSTRUCT SRL', '22676950', NULL)
        UNION ALL SELECT upsert_entity('company', 'DRUM CONSTRUCT SRL', NULL, NULL)
        UNION ALL SELECT upsert_entity('company', 'DRUM CONSTRUCT S.R.L.', 'BG103029862', NULL)""").split()
    assert len(set(ids)) == 4  # same name, four entities
