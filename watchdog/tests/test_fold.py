"""The search fold (#68), pure: every case of fold-cases.json (shared with the TypeScript mirror, `fold.test.ts`)."""
import json
from pathlib import Path

import pytest

from pipeline.fold import fold, tokens

CASES = json.loads((Path(__file__).parent / "fixtures" / "fold-cases.json").read_text(encoding="utf-8"))["cases"]


@pytest.mark.parametrize("case", CASES, ids=[c["rule"] + " | " + c["input"] for c in CASES])
def test_fold_case(case):
    assert fold(case["input"]) == case["folded"]


def test_tokens_are_the_folded_text_split():
    assert tokens("Primăria Ștefan S.R.L. RO1000009") == ["primaria", "stefan", "1000009"]
    assert fold("a  b") == "a b"
