"""File readers: a bulk file -> (header cells, row cells). No interpretation of the columns here.

CSV comes in two dialects: the DA shape (`|text|` fields, commas between them, see `split_pipe_row`; a field may span
lines) and ordinary quoted CSV (DAN, Contracte 2021). A CSV is read as it is consumed, never whole (a quarter is up to 300 MB). XLSX (2025+) is read with openpyxl in read-only mode, first sheet, so a 60 MB export streams. Any other
extension (`.xls`, `.ods`) is not supported yet: the file is invalid, hence quarantined with that reason.
"""
from __future__ import annotations

import csv
import itertools
import re
from functools import lru_cache
from pathlib import Path
from typing import Iterable

from .errors import InvalidFile
from datetime import datetime, time

from . import values
from .values import Cell

_LINE_BREAK = re.compile(r"\r\n|\n|\r")
_NUMBER_LIKE = re.compile(r"^\s*[-+0-9.eE]*\s*$")
MAX_FIELD_LINES = 300  # the most lines one |text| field may span (a real contract title spans 60, mostly blank)
Header = list[str]
Rows = Iterable[tuple[int, list[Cell]]]  # may have a close()  # (line or row number in the file, cells)


def split_pipe_row(line: str, expected: int | None = None, numeric_bare: bool = False) -> list[str]:
    """Split one DA line: `|text|` fields (which may hold commas and even `|`) and bare fields, separated by commas.

    A `|` followed by `,` or the end of the line closes a field, but a field may itself contain `|,` (the DA quirk), so
    when `expected` (the header's width) is known the split that gives exactly that many fields wins. Without it the
    first complete split is taken (the header line). A bare (unwrapped) field never holds a `|`; with `numeric_bare` it must also
    look like a number (digits, sign, point, exponent) or be blank, which is what the unwrapped columns of the real files are.
    Raises ValueError when there is none.
    """
    n = len(line)

    @lru_cache(maxsize=None)
    def rest(i: int, need: int | None) -> tuple[str, ...] | None:
        # fields starting at i (i may equal n: an empty last field); need = fields still wanted, or None for any
        if need is not None and need <= 0:
            return None
        candidates: list[tuple[str, int]] = []  # (value, index of the comma after it or n)
        if line.startswith("|", i):
            j = i
            while (j := line.find("|", j + 1)) != -1:
                if j + 1 == n or line[j + 1] == ",":
                    candidates.append((line[i + 1 : j], j + 1))
        else:
            j = line.find(",", i)
            bare = line[i : n if j == -1 else j]
            if "|" not in bare and (not numeric_bare or _NUMBER_LIKE.match(bare)):  # bare fields are the numeric columns: one holding a `|` is half of a |text| field
                candidates.append((bare, n if j == -1 else j))
        for value, end in candidates:
            if end >= n:
                if need is None or need == 1:
                    return (value,)
                continue
            tail = rest(end + 1, None if need is None else need - 1)
            if tail is not None:
                return (value, *tail)
        return None

    fields = rest(0, expected)
    if fields is None:
        raise ValueError(f"cannot split into {expected} |fields|" if expected else "unterminated |field|")
    return list(fields)


def read_file(path: Path) -> tuple[Header, Rows]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return _read_csv(path)
    if suffix == ".xlsx":
        return _read_xlsx(path)
    raise InvalidFile(f"unsupported file format {suffix or '(none)'}", [f"{path.name}: only .csv and .xlsx are read"])


_EOL = re.compile(r"(\r\n|\n|\r)$")


class _CsvRows:
    """The data rows of an open CSV file, read as they are wanted (a quarter can be 300 MB). `close()` releases the file."""

    def __init__(self, handle, rows):
        self._handle, self._rows = handle, rows

    def __iter__(self) -> Rows:
        try:
            yield from self._rows
        except UnicodeDecodeError as e:
            raise InvalidFile("not UTF-8 text", [str(e)]) from None
        finally:
            self.close()

    def close(self) -> None:
        self._handle.close()


def _read_csv(path: Path) -> tuple[Header, Rows]:
    handle = path.open(encoding="utf-8-sig", newline="")  # newline="": a quoted field may hold line breaks; lines keep their terminator
    try:
        return _csv_header_and_rows(handle)
    except BaseException:
        handle.close()
        raise


def _csv_header_and_rows(handle) -> tuple[Header, Rows]:
    try:
        first = next((ln for ln in handle if ln.strip()), None)
    except UnicodeDecodeError as e:
        raise InvalidFile("not UTF-8 text", [str(e)]) from None
    if first is None:
        raise InvalidFile("empty file")
    if first.lstrip().startswith("|"):
        try:
            header = split_pipe_row(_EOL.sub("", first))
        except ValueError as e:
            raise InvalidFile("unreadable header line", [str(e)]) from None
        lines = (_EOL.sub("", ln) for ln in handle)  # split on \r\n, \n and \r only (not splitlines(): it also splits on \x0c, \x85, \u2028...)

        def pipe_rows() -> Rows:
            # A |text| field may hold a line break (a contract title with a newline): a line that does not split into the
            # header's width is joined with the next ones, up to MAX_FIELD_LINES, before the file is called invalid.
            number = 1  # the header was line 1 (blank lines before it are not counted; the reported number is approximate then)
            for line in lines:
                number += 1
                if not line.strip():
                    continue
                start, extra = number, 0
                while True:
                    try:
                        # after a join the text has line breaks inside it: only a split whose unwrapped fields are numbers
                        # is believed (else the commas in the title of a multi-line field fake extra fields)
                        cells = list(split_pipe_row(line, len(header), numeric_bare=extra > 0))
                        break
                    except ValueError as e:
                        following = next(lines, None) if extra < MAX_FIELD_LINES else None
                        if following is None:
                            raise InvalidFile(f"line {start}: {e}", [f"line {start}: {e}"]) from None
                        line, extra, number = f"{line}\n{following}", extra + 1, number + 1
                yield start, cells

        return header, _CsvRows(handle, pipe_rows())

    reader = csv.reader(itertools.chain([first], handle))
    try:
        header = next(reader)
    except (StopIteration, csv.Error) as e:
        raise InvalidFile("unreadable header line", [str(e)]) from None

    def csv_rows() -> Rows:
        try:
            for row in reader:
                if row and any(c.strip() for c in row):
                    yield reader.line_num, list(row)
        except csv.Error as e:
            raise InvalidFile(f"line {reader.line_num}: {e}", [f"line {reader.line_num}: {e}"]) from None

    return header, _CsvRows(handle, csv_rows())


def _values(row) -> list[Cell]:
    """A row of cells -> their values. A float, date or time keeps the cell's number format (see `values.Typed`): a contract
    number Excel coerced (`5/21` -> a date, `1/8858` -> `Jan-8858`) can only be turned back into the published text with it."""
    out: list[Cell] = []
    for cell in row:
        v = cell.value
        fmt = getattr(cell, "number_format", None) or "General"
        if isinstance(v, bool) or v is None or not isinstance(v, (float, datetime, time)):
            out.append(v)
        elif isinstance(v, float):
            out.append(values.TypedFloat(v, fmt))
        elif isinstance(v, datetime):
            out.append(values.TypedDatetime(v.year, v.month, v.day, v.hour, v.minute, v.second, v.microsecond, number_format=fmt))
        else:
            out.append(values.TypedTime(v.hour, v.minute, v.second, v.microsecond, number_format=fmt))
    return out


def _read_xlsx(path: Path) -> tuple[Header, Rows]:
    import zipfile

    from openpyxl import load_workbook

    try:
        workbook = load_workbook(path, read_only=True, data_only=True)
        sheet = workbook.worksheets[0]
        sheet.reset_dimensions()  # do not trust the declared size
        raw = (_values(row) for row in sheet.iter_rows())
        first = next(raw, None)
    except (zipfile.BadZipFile, KeyError, IndexError, ValueError, OSError) as e:
        raise InvalidFile("not a readable XLSX file", [f"{type(e).__name__}: {e}"]) from None
    if first is None:
        raise InvalidFile("empty file")
    width = len(first)
    while width and first[width - 1] in (None, ""):
        width -= 1  # trailing blank header cells are not columns
    header = [str(c).strip() if c is not None else "" for c in first[:width]]

    return header, _XlsxRows(workbook, raw, width)


class _XlsxRows:
    """The data rows of an open read-only workbook. `close()` releases the file even if iteration never started."""

    def __init__(self, workbook, raw, width: int) -> None:
        self._workbook, self._raw, self._width = workbook, raw, width

    def __iter__(self) -> Rows:
        return self._rows()

    def close(self) -> None:
        self._workbook.close()

    def _rows(self) -> Rows:
        width = self._width
        try:
            for number, row in enumerate(self._raw, start=2):
                cells = list(row)
                if all(c is None or (isinstance(c, str) and not c.strip()) for c in cells):
                    continue
                extra = cells[width:]
                if any(c is not None and not (isinstance(c, str) and not c.strip()) for c in extra):
                    raise InvalidFile(f"row {number}: {len(cells)} cells, header has {width}", [f"row {number}: wider than the header"])
                yield number, cells[:width] + [None] * (width - len(cells))
        finally:
            self.close()
