"""Builds `archive-goto/`, the raw-archive fixture of the Go-to card's ambiguity (ticket #69). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_goto_archive.py

Two authorities whose names differ only by a legal form ("PRIMARIA GEMENA SRL", "PRIMARIA GEMENA SA"; CUIs that fail the check
digit, so two name-only entities) fold to the same text: a query for it has two entities and no Go-to. Every name is invented.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_search_archive import Archive, DA_HEADER, at, da  # noqa: E402

OUT = Path(__file__).parent / "archive-goto"
GEMENA_A, GEMENA_B = ("PRIMARIA GEMENA SRL", "1234567"), ("PRIMARIA GEMENA SA", "7654321")
DA = [
    da("DA96000001", "2023-02-01", "1000", "30197000-6", "Rechizite", "FURNIZOR UNIC SRL", GEMENA_A),
    da("DA96000002", "2023-02-02", "2000", "30197000-6", "Rechizite", "FURNIZOR UNIC SRL", GEMENA_B),
]


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    Archive(OUT).write_unit(source="seap", stream="bulk", kind="da", unit="2023Q1", fetched_at=at(2023, 6, 15),
                            files={"raport-achizitii-directe-t1-2023.csv": ("\n".join([DA_HEADER, *DA]) + "\n").encode()},
                            via="Achizitii directe 2023 - T1", url="https://data.gov.ro/fixture/raport-achizitii-directe-t1-2023.csv")


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
