"""Sole traders (PFA, II, IF): registrations named after a natural person (ADR 0009: publication of their names is an open question).

One rule for every Source that must keep them out: BaniPartide's firm donations (#182) and ONRC's search table (#176). A registration is a sole
trader's when its legal form says so (ONRC's `FORMA_JURIDICA`, in full or as the abbreviation) or its name carries the form's words.
"""
from __future__ import annotations

import re

from .placement.matching import fold

_SOLE_FORM = re.compile(r"^(PERSOANA FIZICA|INTREPRINDERE INDIVIDUALA|INTREPRINDERE FAMILIALA)")
_SOLE_FORM_ABBREVIATION = re.compile(r"^(?:P\.?F\.?A\.?|I\.?I\.?|I\.?F\.?)$")
_SOLE_NAME = re.compile(r"(?:^| )(?:PFA|PF|PERSOANA FIZICA AUTORIZATA|INTREPRINDERE INDIVIDUALA|INTREPRINDERE FAMILIALA)(?: |$)|(?: )(?:II|IF)$")


def is_sole_trader(name: str | None, legal_form: str | None) -> bool:
    if legal_form and (_SOLE_FORM.match(fold(legal_form)) or _SOLE_FORM_ABBREVIATION.match(legal_form.strip().upper())):
        return True
    return bool(name and _SOLE_NAME.search(fold(name)))
