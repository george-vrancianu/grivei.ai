"""SEAP bulk files: reading (CSV, XLSX), per-quarter header aliases, validation and parsing into Records."""
from .errors import InvalidFile
from .headers import norm_header
from .records import KINDS, BulkRecord, KindSpec, ParsedFile, SetAside, Winner, parse_file, parse_file_stats

__all__ = ["InvalidFile", "norm_header", "KINDS", "BulkRecord", "KindSpec", "ParsedFile", "SetAside", "Winner", "parse_file", "parse_file_stats"]
