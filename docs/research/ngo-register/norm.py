"""PROTOTYPE (#136), throwaway. Organisation-name normaliser used by every measurement here.

norm(s)        -> name with legal form standardised (e.g. 'ALFA PROD SRL')
strip_form(n)  -> a norm() result with every legal-form token removed (e.g. 'ALFA PROD')
county(s)      -> county name folded, 'JUDETUL'/'JUD.' dropped, all Bucharest spellings -> 'BUCURESTI'
locality(s)    -> locality folded, administrative prefixes dropped, Bucharest sectors -> 'BUCURESTI'
"""
import re, unicodedata

_PUNCT = re.compile(r"[^A-Z0-9 ]")
_SPACES = re.compile(r" +")
# multi-word legal forms written out, matched on the folded, punctuation-free string
_LONG = [
    (r"\bSOCIETATEA? CU RASPUNDERE LIMITATA\b", " SRL "),
    (r"\bSOCIETATEA? PE ACTIUNI\b", " SA "),
    (r"\bSOCIETATEA? IN NUME COLECTIV\b", " SNC "),
    (r"\bSOCIETATEA? IN COMANDITA SIMPLA\b", " SCS "),
    (r"\bSOCIETATEA? IN COMANDITA PE ACTIUNI\b", " SCA "),
    (r"\bPERSOANA FIZICA AUTORIZATA\b", " PFA "),
    (r"\bINTREPRINDEREA? INDIVIDUALA\b", " II "),
    (r"\bINTREPRINDEREA? FAMILIALA\b", " IF "),
    (r"\bREGIA AUTONOMA\b", " RA "),
    (r"\bSOCIETATEA? COMERCIALA\b", " "),  # dropped
]
_LONG = [(re.compile(a), b) for a, b in _LONG]
_SINGLE_RUN = re.compile(r"\b(?:[A-Z] )+[A-Z]\b")  # 'S R L' -> 'SRL' (after dots were removed)
_FORM_ALIASES = {"SRLD": "SRL", "SRLD.": "SRL"}
FORMS = {"SRL", "SA", "SNC", "SCS", "SCA", "RA", "PFA", "II", "IF", "PF", "SCM", "SPRL", "IPURL"}


def fold(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", (s or "").upper())
    return "".join(ch for ch in s if not unicodedata.combining(ch))  # S-cedilla and S-comma both -> S


def norm(s: str | None) -> str:
    s = fold(s).replace("ß", "SS")
    s = s.replace(".", "")  # 'S.R.L.' -> 'SRL', 'S. R. L.' -> 'S R L'
    s = s.replace("&", " SI ")
    s = _PUNCT.sub(" ", s)
    s = _SPACES.sub(" ", s).strip()
    s = _SINGLE_RUN.sub(lambda m: m.group(0).replace(" ", ""), s)
    s = re.sub(r"\bSRL D\b", "SRL", s)  # SRL-D (debutant) is the same name once converted
    for rx, rep in _LONG:
        s = rx.sub(rep, s)
    toks = [_FORM_ALIASES.get(t, t) for t in s.split()]
    if toks and toks[0] == "SC" and len(toks) > 1:  # 'SC ALFA SRL' -> 'ALFA SRL'
        toks = toks[1:]
    return " ".join(toks)


def strip_form(n: str) -> str:
    return " ".join(t for t in n.split() if t not in FORMS)


def county(s: str | None) -> str:
    s = _SPACES.sub(" ", _PUNCT.sub(" ", fold(s).replace(".", " "))).strip()
    s = re.sub(r"^(JUDETUL|JUDET|JUD)\b ?", "", s)
    if "BUCURESTI" in s:
        return "BUCURESTI"
    return s


_LOC_PREFIX = re.compile(r"^((MUNICIPIUL|MUN|ORAS|ORASUL|COMUNA|COM|SAT|SATUL|LOC|LOCALITATEA)\b ?)+")


def locality(s: str | None) -> str:
    s = fold(s)
    if "BUCURESTI" in s:
        return "BUCURESTI"
    s = s.split(",")[-1]  # ONRC "Sat X, Comuna Y" -> "Y" (the UAT)
    s = _SPACES.sub(" ", _PUNCT.sub(" ", s.replace(".", " "))).strip()
    return _LOC_PREFIX.sub("", s)


if __name__ == "__main__":
    for t in ["S.C. ALFA-PROD S.R.L.", "SC Alfa Prod SRL", "ALFA PROD S. R. L.", "Alfa Prod srl-d", "ALFA PROD SOCIETATE CU RASPUNDERE LIMITATA",
              "Societatea Comerciala ALFA S.A.", "ASOCIAŢIA ALFA", "ASOCIAȚIA ALFA", "Popescu Ion P.F.A.", "ALFA & BETA SRL", "S.C. A.B.C. CONSTRUCT S.R.L."]:
        print(f"{t!r:50} -> {norm(t)!r:30} / {strip_form(norm(t))!r}")
    print(county("Judeţul Bistriţa-Năsăud"), county("MUNICIPIUL BUCUREŞTI"), locality("Sat Blănoiu, Comuna Racoviţa"), locality("Bucureşti Sectorul 3"))
