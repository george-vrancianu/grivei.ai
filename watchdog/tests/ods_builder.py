"""A minimal `.ods` writer for tests (the shape LibreOffice writes: typed cells, repeated blank cells and rows at the end)."""
import zipfile
from datetime import date, datetime, time
from xml.sax.saxutils import escape

NS = ('xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
      'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"')


def cell_xml(v) -> str:
    if v is None:
        return "<table:table-cell/>"
    if isinstance(v, bool):
        return f'<table:table-cell office:value-type="boolean" office:boolean-value="{str(v).lower()}"><text:p>{v}</text:p></table:table-cell>'
    if isinstance(v, (int, float)):
        return f'<table:table-cell office:value-type="float" office:value="{v}"><text:p>{v}</text:p></table:table-cell>'
    if isinstance(v, datetime):
        return f'<table:table-cell office:value-type="date" office:date-value="{v.isoformat()}"><text:p>{v:%d/%m/%Y}</text:p></table:table-cell>'
    if isinstance(v, date):
        return f'<table:table-cell office:value-type="date" office:date-value="{v.isoformat()}"><text:p>{v:%d/%m/%Y}</text:p></table:table-cell>'
    if isinstance(v, time):
        return f'<table:table-cell office:value-type="time" office:time-value="PT{v.hour:02d}H{v.minute:02d}M{v.second:02d}S"><text:p>{v}</text:p></table:table-cell>'
    parts = escape(str(v)).split("\n")
    return f'<table:table-cell office:value-type="string"><text:p>{"</text:p><text:p>".join(parts)}</text:p></table:table-cell>'


def write_ods(path, sheets: list[list[list]]):
    """sheets: a list of sheets, each a list of rows, each a list of cells (str, number, bool, date(time), time or None)."""
    body = ""
    for i, rows in enumerate(sheets, start=1):
        xml = "".join("<table:table-row>" + "".join(cell_xml(c) for c in row) + '<table:table-cell table:number-columns-repeated="16366"/></table:table-row>' for row in rows)
        xml += '<table:table-row table:number-rows-repeated="1048000"><table:table-cell table:number-columns-repeated="16384"/></table:table-row>'
        body += f'<table:table table:name="Sheet{i}"><table:table-column table:number-columns-repeated="20"/>{xml}</table:table>'
    content = f'<?xml version="1.0" encoding="UTF-8"?><office:document-content {NS}><office:body><office:spreadsheet>{body}</office:spreadsheet></office:body></office:document-content>'
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("mimetype", "application/vnd.oasis.opendocument.spreadsheet")
        z.writestr("content.xml", content)
    return path
