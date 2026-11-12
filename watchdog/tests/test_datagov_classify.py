"""Table-driven classification of data.gov.ro resources: every real name from the operator's first real fetch
(the 76 `unclassified` lines of ~/grivei-data/fetch.log, 63 distinct) plus the 27 names that were already archived.
The log keeps no URLs, so the URL is a neutral file name (`file.csv`/`file.xls`, the extension taken from the name) and
the name decides; the URL rules have their own cases below. No network."""
import pytest

from pipeline.datagov import classify

# expected: "<kind> <unit>" (wanted), "out-of-scope" (known, unwanted kind) or "unclassified" / "conflict"
TABLE = [
    # --- already archived (regression: same kind and unit as the real run archived them) ---
    (2021, "Contracte 2021 - T1", "contracte 2021Q1"),
    (2021, "Contracte 2021 - T4", "contracte 2021Q4"),
    (2021, "Achiziții directe 2021 - T1", "da 2021Q1"),
    (2021, "Achizitii directe 2021 - T2", "da 2021Q2"),
    (2022, "Contracte 2022 T2", "contracte 2022Q2"),
    (2022, "Contracte 2022 T3", "contracte 2022Q3"),
    (2022, "Achizitii directe 2022 T2", "da 2022Q2"),
    (2022, "Achizitii directe  2022 - T3", "da 2022Q3"),
    (2022, "Achiziții directe 2022 - T4", "da 2022Q4"),
    (2023, "Contracte publicate T 1 - 2023", "contracte 2023Q1"),
    (2023, "Achizitii directe T 1 - 2023", "da 2023Q1"),
    (2023, "Notificări de atribuire T 1 - 2023", "dan 2023Q1"),
    (2023, "Anunțuri de atribuire la proceduri fără anunț de inițiere T 1 - 2023", "fara-anunt 2023Q1"),
    # --- 2023: Roman numerals with and without a space, DPS, doubled names ---
    (2023, "Invitații de depunere ofertă la sistemul de achiziții dinamic T 1 - 2023", "out-of-scope"),
    (2023, "Achizitii directe TII 2023", "da 2023Q2"),
    (2023, "Notificari de atribuire TII 2023", "dan 2023Q2"),
    (2023, "Invitatii de depunere oferta la sistemul de achizitii dinamic TII 2023", "out-of-scope"),
    (2023, "Contracte publicate TII 2023", "contracte 2023Q2"),
    (2023, "Achizitii Directe T III 2023", "da 2023Q3"),
    (2023, "Notificari de atribuire la cumpararea directa T III 2023", "dan 2023Q3"),
    (2023, "Invitatii de depunere oferta la sistemul de achizitii dinamic T III 2023", "out-of-scope"),
    (2023, "Contracte publicate T III 2023", "contracte 2023Q3"),
    (2023, "Anunturi de atribuire la proceduri fara anunt de initiere T III 2023", "fara-anunt 2023Q3"),
    (2023, "Achizitii Directe T IV 2023.csv", "da 2023Q4"),
    (2023, "Achizitii Directe T IV 2023.xls", "da 2023Q4"),
    (2023, "Notificari de atribuire la cumpararea directa T IV 2023.csv", "dan 2023Q4"),
    (2023, "Notificari de atribuire la cumpararea directa T IV 2023.xls", "dan 2023Q4"),
    (2023, "Invitații de depunere oferta la sistemul de achiziții dinamic T IV 2023.csv", "out-of-scope"),
    (2023, "Invitații de depunere oferta la sistemul de achiziții dinamic T IV 2023.xls", "out-of-scope"),
    (2023, "Contracte publicate T IV 2023.csv", "contracte 2023Q4"),
    (2023, "Contracte publicate T IV 2023.xls", "contracte 2023Q4"),
    (2023, "Anunțuri de atribuire la proceduri fără anunț de inițiere T IV 2023.csv", "fara-anunt 2023Q4"),
    (2023, "Anunturi de atribuire la proceduri fara anunt de initiere T IV 2023.xls", "fara-anunt 2023Q4"),
    # --- 2024: 'T I' .. 'T III', 'Raport', and names with no year at all (T IV: the year is the dataset's) ---
    (2024, "Achiziții Directe T I 2024", "da 2024Q1"),
    (2024, "Achizitii Directe T I 2024", "da 2024Q1"),
    (2024, "Notificari de atribuire la cumpararea directa T I 2024", "dan 2024Q1"),
    (2024, "Invitatii de depunere oferta la sistemul de achiziții dinamic T I 2024", "out-of-scope"),
    (2024, "Invitatii de depunere oferta la sistemul de achizitii dinamic T I 2024", "out-of-scope"),
    (2024, "Contracte publicate T I 2024", "contracte 2024Q1"),
    (2024, "Anunturi de atribuire la proceduri fara anunt de initiere T I 2024", "fara-anunt 2024Q1"),
    (2024, "Achiziții Directe T II 2024", "da 2024Q2"),
    (2024, "Notificari de atribuire la cumpararea directa T II 2024", "dan 2024Q2"),
    (2024, "Invitatii de depunere oferta la sistemul de achizitii dinamic T II 2024", "out-of-scope"),
    (2024, "Raport Contracte publicate T II 2024", "contracte 2024Q2"),
    (2024, "Anunturi de atribuire la proceduri fara anunt de initiere T II 2024", "fara-anunt 2024Q2"),
    (2024, "Achiziții directe T III 2024", "da 2024Q3"),
    (2024, "Notificari de atribuire la cumpararea directa T III 2024", "dan 2024Q3"),
    (2024, "Contracte publicate T III 2024", "contracte 2024Q3"),
    (2024, "Anunturi de atribuire la proceduri fara anunt de initiere T III 2024", "fara-anunt 2024Q3"),
    (2024, "Achiziții directe T IV", "da 2024Q4"),
    (2024, "Notificari de atribuire la cumpararea directa T IV", "dan 2024Q4"),
    (2024, "Contracte T IV", "contracte 2024Q4"),
    (2024, "Anunțuri de atribuire la proceduri fără anunț de inițiere T IV", "fara-anunt 2024Q4"),
    # --- 2025 ---
    (2025, "Achiziții directe TIII 2025", "da 2025Q3"),
    (2025, "Notificări de atribuire la cumpărarea directa TIII 2025", "dan 2025Q3"),
    (2025, "Contracte TIII 2025", "contracte 2025Q3"),
    (2025, "Anunturi de atribuire la proceduri fara anunt de initiere TIII 2025", "fara-anunt 2025Q3"),
    (2025, "Achiziții directe T IV 2025", "da 2025Q4"),
    (2025, "Notificări de atribuire la cumpărarea directa T IV 2025", "dan 2025Q4"),
    (2025, "Contracte T IV 2025", "contracte 2025Q4"),
    # --- 2026: 'TI', 'TII', 'TIII', and the 'Anunturi de intiere' typo (contract notices, out of scope) ---
    (2026, "Achizitii directe TI 2026", "da 2026Q1"),
    (2026, "Notificari de atribuire la cumpararea directa TI 2026", "dan 2026Q1"),
    (2026, "Contracte TI 2026", "contracte 2026Q1"),
    (2026, "Anunturi de atribuire la proceduri fara anunt de initiere TI 2026", "fara-anunt 2026Q1"),
    (2026, "Achizitii directe TII 2026", "da 2026Q2"),
    (2026, "Notificari de atribuire la cumpararea directa TII 2026", "dan 2026Q2"),
    (2026, "Anunturi de intiere publicate TII 2026", "out-of-scope"),
    (2026, "Contracte TII 2026", "contracte 2026Q2"),
    (2026, "Anunturi de atribuire la proceduri fara anunt de initiere TII 2026", "fara-anunt 2026Q2"),
    (2026, "Achizitii directe TIII 2026", "da 2026Q3"),
    (2026, "Notificari de atribuire la cumpararea directa TIII 2026", "dan 2026Q3"),
    (2026, "Anunturi de intiere publicate TIII 2026", "out-of-scope"),
    (2026, "Contracte TIII 2026", "contracte 2026Q3"),
    (2026, "Anunturi de atribuire la proceduri fara anunt de initiere TIII 2026", "fara-anunt 2026Q3"),
    # --- name variants: case, diacritics, spacing ---
    (2024, "ACHIZIȚII DIRECTE T II 2024", "da 2024Q2"),
    (2024, "Notificări de atribuire la cumpărarea directă T.II 2024", "dan 2024Q2"),
    (2024, "Achiziții directe  T  I  -  2024", "da 2024Q1"),
]
BASE = "https://data.gov.ro/dataset/x/resource/rid/download/"


def _url(name):
    return BASE + ("file.xls" if name.endswith(".xls") else "file.csv")


def _outcome(what, why):
    if what:
        return " ".join(what)
    return {"ignored:": "out-of-scope", "conflict:": "conflict"}.get(next((p for p in ("ignored:", "conflict:") if why.startswith(p)), ""), "unclassified")


@pytest.mark.parametrize("year,name,expected", TABLE)
def test_real_resource_names_classify(year, name, expected):
    assert _outcome(*classify({"name": name, "url": _url(name)}, year)) == expected


@pytest.mark.parametrize(
    "name,filename,expected",
    [
        # no kind in the name: the URL's file name decides (fallback)
        ("2026 - T1", "raport-achizitii-directe-t1-2026.csv", "da 2026Q1"),
        # name and URL agree
        ("Achiziții directe T II 2024", "raport-achizitii-directe-t2-2024.csv", "da 2024Q2"),
        # known mis-uploaded Q2 2025 DAN resource: name says DAN, file is the 'fără anunț' one
        ("Notificări de atribuire la cumpărarea directa TII 2025", "raport-anunturi-fara-anunt-tii-2025.csv", "conflict"),
        # name says 'fără anunț', file is the initiation notices
        ("Anunturi de atribuire la proceduri fără anunț de initiere T IV 2025", "raport-anunturi-de-initiere-t4-2025.csv", "conflict"),
        # the quarter in the name and in the file disagree
        ("Achiziții directe T II 2024", "raport-achizitii-directe-t3-2024.csv", "unclassified"),
    ],
)
def test_name_and_url_rule(name, filename, expected):
    assert _outcome(*classify({"name": name, "url": BASE + filename}, 2024 if "2024" in name else 2025 if "2025" in name else 2026)) == expected


def test_year_in_the_name_must_match_the_dataset():
    what, why = classify({"name": "Contracte T II 2023", "url": BASE + "f.csv"}, 2024)
    assert what is None and "does not match" in why
