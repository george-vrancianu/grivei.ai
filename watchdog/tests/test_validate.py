"""`pipeline validate`: read every archived bulk file against its kind and report pass/fail, changing nothing (#64c)."""
import hashlib
from datetime import datetime, timezone
from pathlib import Path

from pipeline.archive import Archive
from pipeline.cli import main
from pipeline.validate import validate_archive

GOOD = ("Autoritate contractanta,CUI,Tip autoritate,Tip anunt,Tip procedura,Numar anunt initiere,Data publicare,Numar lot,Numar anunt atribuire,"
        "Data publicare,Data contract,Numar contract,Incheiar prin ,Valoare contract (RON),Ofertant,CUI ofertant\n"
        "AC,1000001,x,x,x,CN1,01/01/2024,1,CAN1,02/01/2024,02/01/2024,C-1,Fara acord cadru,5,ALFA,2000001\n")


def tree(root: Path) -> dict[str, str]:
    return {str(p.relative_to(root)): (hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else "dir") for p in sorted(root.rglob("*"))}


def put(archive, kind, unit, name, data, stream="bulk"):
    archive.write_unit(source="seap", stream=stream, kind=kind, unit=unit, fetched_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                       files={name: data}, via="t", url="https://x/")


def world(tmp_path):
    archive = Archive(tmp_path / "a")
    put(archive, "contracte", "2024Q1", "ok.csv", b"\xef\xbb\xbf" + GOOD.encode())
    put(archive, "contracte", "2024Q2", "bad.csv", b"a,b\n1,2\n")
    put(archive, "dan", "2024Q1", "x.ods", b"not read")
    put(archive, "crawl", "2024-01-01", "c.json", b"{}", stream="crawl")
    return archive


def test_each_bulk_file_passes_or_fails_with_its_reason_and_non_bulk_units_are_left_out(tmp_path):
    results = validate_archive(world(tmp_path))
    by = {(r.kind, r.unit): r for r in results}
    assert set(by) == {("contracte", "2024Q1"), ("contracte", "2024Q2"), ("dan", "2024Q1")}
    ok = by[("contracte", "2024Q1")]
    assert ok.ok and ok.rows == 1 and ok.records == 1 and ok.reason is None
    assert not by[("contracte", "2024Q2")].ok and "headers do not match" in by[("contracte", "2024Q2")].reason
    assert not by[("dan", "2024Q1")].ok


def test_validate_changes_nothing_in_the_archive_and_never_quarantines(tmp_path, capsys):
    archive = world(tmp_path)
    before = tree(archive.root)
    assert main(["--archive", str(archive.root), "validate"]) == 1  # two files fail
    assert tree(archive.root) == before
    assert not archive.quarantined()
    out = capsys.readouterr().out
    assert "PASS contracte/2024Q1" in out and "FAIL contracte/2024Q2" in out and "headers do not match" in out
    assert "1 passed, 2 failed" in out and "contracte 1/2" in out and "dan 0/1" in out


def test_validate_exits_0_when_everything_passes_and_can_be_narrowed_by_kind(tmp_path, capsys):
    archive = world(tmp_path)
    assert main(["--archive", str(archive.root), "validate", "--kind", "contracte", "--match", "2024Q1"]) == 0
    assert "1 passed, 0 failed" in capsys.readouterr().out


def test_an_incomplete_unit_is_reported_as_a_failure(tmp_path):
    archive = world(tmp_path)
    next(archive.root.glob("seap/bulk/contracte/2024Q1/*/ok.csv")).write_bytes(b"changed")
    by = {(r.kind, r.unit): r for r in validate_archive(archive)}
    assert not by[("contracte", "2024Q1")].ok and "manifest" in by[("contracte", "2024Q1")].reason
