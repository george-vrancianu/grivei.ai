"""The search text fold (#68). The document of every Record and the reader's query go through the SAME fold, so a word typed
matches the word published whatever its diacritics, case, dots or legal form. The TypeScript mirror is
`explorer/packages/api/src/fold.ts`; both are tested against `tests/fixtures/fold-cases.json`.

  1. strip diacritics (NFKD, drop the combining marks): the cedilla forms ş ţ and the comma-below forms ș ț both give s and t;
  2. lower-case;
  3. join dotted legal forms: a run of single letters separated by dots (`S.R.L.`, `s.c.`) becomes one word (`srl`, `sc`);
  4. split on everything that is not a letter or a digit;
  5. drop the legal-form stop-words (`srl`, `sa`, `sc` ...);
  6. rewrite a RO-prefixed CUI (`RO12345678`) to its digits.
"""
from __future__ import annotations

import re
import unicodedata

# Legal forms: noise in a company name, never worth a match (and never required of the reader).
STOP_WORDS = frozenset({"sc", "srl", "sa", "sca", "scs", "snc", "pfa", "ii"})

_DOTTED = re.compile(r"(?<![^\W_])[^\W\d_](?:\.[^\W\d_])+(?![^\W_])")  # s.r.l  s.c  (single letters joined by dots)
_NOT_ALNUM = re.compile(r"[\W_]+")
_RO_CUI = re.compile(r"^ro(\d{2,10})$")


def tokens(text: str) -> list[str]:
    """The folded tokens of `text`, in order (stop-words dropped, `RO` CUIs rewritten)."""
    stripped = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)).lower()
    joined = _DOTTED.sub(lambda m: m.group(0).replace(".", ""), stripped)
    out = []
    for token in _NOT_ALNUM.split(joined):
        if not token or token in STOP_WORDS:
            continue
        m = _RO_CUI.match(token)
        out.append(m.group(1) if m else token)
    return out


def fold(text: str) -> str:
    """The folded text: its tokens joined by one space. Empty when nothing but stop-words (or nothing) was there."""
    return " ".join(tokens(text))
