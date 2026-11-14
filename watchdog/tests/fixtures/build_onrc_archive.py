"""Builds `archive-onrc/`, the raw-archive fixture of the ONRC Source (ticket #175). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_onrc_archive.py

The archive is made the way production makes it: the real `fetch_onrc` runs against `ckan()`, a stub of data.gov.ro that serves the datasets
below in the shape of the real ones (checked against the live CKAN listing and the first lines of the real files: `^`-separated, a BOM, the
`OD_*` column names; the legacy layout's four company files with inline status codes). Every name, CUI and number is invented (CUIs carry valid
check digits). Four snapshots: one legacy quarterly (2025-03-18, the earliest held, so what it shows is "since at least") and three current monthly
ones (2026-03-02, 2026-04-03, 2026-05-06). Beside them, a small SEAP slice and the archived ANAF answers.

  PRIMARIA EXEMPLU ONRC   authority (ANAF knows it); buys from all below
  ALFA ONRC SRL           supplier, ANAF knows it: a status change (insolvency first seen 2026-04-03), authorised CAEN codes
  BETA ONRC SRL           supplier, ANAF knows it as "BETA ONRC SRL"; ONRC renames it BETA VECHI SRL -> BETA NOU SRL (2026-04-03): an alias, never the display name
  GAMMA ONRC SRL          supplier, ANAF knows it: struck off (state 1084) first seen 2026-05-06
  DELTA ONRC SRL          supplier whose CUI ANAF does not know (an archived "not found") but ONRC lists: an entity keyed on the ONRC CUI, badged; new in 2026-03-02
  DUBLA ONRC SA           BOTH roles (authority and supplier), ANAF knows it
  OMEGA ONLY SRL          in ONRC only (never a SEAP counterparty): seat in Cluj
  ZETA FARA JUDET SRL     in ONRC only, no county: the Unplaced tile
  PFA FARA CUI            a registration with no usable CUI: no entity
"""
from __future__ import annotations

import hashlib
import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
WATCHDOG = HERE.parents[1]
sys.path.insert(0, str(WATCHDOG))
sys.path.insert(0, str(HERE))

from build_identity_archive import anaf_entry, anaf_response  # noqa: E402
from build_roles_archive import DA_HEADER, da  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.onrc.fetch import fetch_onrc  # noqa: E402

OUT = HERE / "archive-onrc"
BOM = "﻿"
FETCHED = datetime(2026, 11, 13, 4, 0, tzinfo=timezone.utc)


def cui_with_check_digit(body: int) -> int:
    weights = [7, 5, 3, 2, 1, 7, 5, 3, 2]
    digits = [int(d) for d in str(body).rjust(9, "0")]
    return body * 10 + (sum(d * w for d, w in zip(digits, weights)) * 10 % 11 % 10)


AUTH = ("PRIMARIA EXEMPLU ONRC", cui_with_check_digit(310001), "J03/1006/1995")
ALFA = ("ALFA ONRC SRL", cui_with_check_digit(310002), "J40/1001/2015")
BETA = ("BETA ONRC SRL", cui_with_check_digit(310003), "J40/1002/2012")
GAMMA = ("GAMMA ONRC SRL", cui_with_check_digit(310004), "J12/1003/2010")
DELTA = ("DELTA ONRC SRL", cui_with_check_digit(310005), "J05/1004/2018")  # ANAF does not know this CUI
DUBLA = ("DUBLA ONRC SA", cui_with_check_digit(310006), "J40/1005/2008")
OMEGA = ("OMEGA ONLY SRL", cui_with_check_digit(310007), "J12/1007/2020")
ZETA = ("ZETA FARA JUDET SRL", cui_with_check_digit(310008), "J99/1008/2021")
PFA = ("POPESCU DEMO PFA", 0, "F40/1009/2019")  # CUI 0 in the register: no entity
INVALID = ("FIRMA CUI GRESIT SRL", 310009, "J40/1010/2017")  # a CUI that fails the check digit: no entity

FUNCTIUNE, INSOLVENTA, RADIATA, INTRERUPERE = 1048, 1107, 1084, 1074
STATUS_NAMES = {1048: "funcțiune", 1074: "întrerupere temporară de activitate", 1084: "radiată", 1107: "insolvență", 2110: "bilanțul anual nedepus la registrul comerțului"}

# registration -> {snapshot date: (name, CUI, status codes, county, locality, registration date, legal form)}; absent = not listed in that snapshot
S1, S2, S3, S4 = "2025-03-18", "2026-03-02", "2026-04-03", "2026-05-06"


def row(name, cui, states, county="Cluj", locality="Cluj-Napoca", registered="10/03/2015", form="SRL"):
    return dict(name=name, cui=cui, states=states, county=county, locality=locality, registered=registered, form=form)


COMPANIES = {
    AUTH[2]: {d: row(AUTH[0], AUTH[1], [FUNCTIUNE], "Bistriţa-Năsăud", "Bistriţa", "02/02/1995", "ADMINISTRATIE") for d in (S1, S2, S3, S4)},
    ALFA[2]: {S1: row(ALFA[0], ALFA[1], [FUNCTIUNE]), S2: row(ALFA[0], ALFA[1], [FUNCTIUNE]), S3: row(ALFA[0], ALFA[1], [FUNCTIUNE, INSOLVENTA]), S4: row(ALFA[0], ALFA[1], [FUNCTIUNE, INSOLVENTA])},
    BETA[2]: {S1: row("BETA VECHI SRL", BETA[1], [FUNCTIUNE], "Bucureşti", "Bucureşti Sectorul 3"), S2: row("BETA VECHI SRL", BETA[1], [FUNCTIUNE], "Bucureşti", "Bucureşti Sectorul 3"),
              S3: row("BETA NOU SRL", BETA[1], [FUNCTIUNE], "Bucureşti", "Bucureşti Sectorul 3"), S4: row("BETA NOU SRL", BETA[1], [FUNCTIUNE], "Bucureşti", "Bucureşti Sectorul 3")},
    GAMMA[2]: {S1: row(GAMMA[0], GAMMA[1], [FUNCTIUNE], "Cluj", "Turda"), S2: row(GAMMA[0], GAMMA[1], [FUNCTIUNE], "Cluj", "Turda"), S3: row(GAMMA[0], GAMMA[1], [FUNCTIUNE], "Cluj", "Turda"),
               S4: row(GAMMA[0], GAMMA[1], [RADIATA], "Cluj", "Turda")},
    DELTA[2]: {d: row(DELTA[0], DELTA[1], [FUNCTIUNE], "Braşov", "Braşov", "20/02/2026") for d in (S2, S3, S4)},
    DUBLA[2]: {d: row(DUBLA[0], DUBLA[1], [FUNCTIUNE], "Iaşi", "Iaşi", "14/05/2008", "SA") for d in (S1, S2, S3, S4)},
    OMEGA[2]: {S1: row(OMEGA[0], OMEGA[1], [FUNCTIUNE, INTRERUPERE], "Cluj", "Floreşti", "03/06/2020"), S2: row(OMEGA[0], OMEGA[1], [FUNCTIUNE], "Cluj", "Floreşti", "03/06/2020"),
               S3: row(OMEGA[0], OMEGA[1], [FUNCTIUNE], "Cluj", "Floreşti", "03/06/2020"), S4: row(OMEGA[0], OMEGA[1], [FUNCTIUNE], "Cluj", "Floreşti", "03/06/2020")},
    ZETA[2]: {d: row(ZETA[0], ZETA[1], [FUNCTIUNE, 2110], "", "", "11/01/2021") for d in (S1, S2, S3, S4)},
    PFA[2]: {d: row(PFA[0], PFA[1], [FUNCTIUNE], "Cluj", "Cluj-Napoca", "05/05/2019", "PFA") for d in (S2, S3, S4)},
    INVALID[2]: {d: row(INVALID[0], INVALID[1], [FUNCTIUNE], "Cluj", "Cluj-Napoca", "01/07/2017") for d in (S2, S3, S4)},
}
CAEN = {ALFA[2]: [("4211", 2), ("4120", 2)], BETA[2]: [("4321", 2)], GAMMA[2]: [("4120", 2)], DELTA[2]: [("6201", 3), ("6202", 3)], DUBLA[2]: [("4211", 2)], OMEGA[2]: [("6201", 2)], AUTH[2]: [("8411", 2)]}


def _legacy_files(date_key: str) -> dict[str, str]:
    """The four company files of the legacy layout (2021 to mid-2025) and the `|`-separated nomenclature, as the register published them."""
    d = date_key
    rows = {n: [] for n in ("1neradiate_fara", "2radiate_fara", "3neradiate_cu", "4radiate_cu")}
    for reg, snaps in COMPANIES.items():
        if d not in snaps:
            continue
        r = snaps[d]
        codes = ",".join(str(c) for c in r["states"])
        struck = RADIATA in r["states"]
        if r["county"]:
            address = f"{r['locality']}, Str. EXEMPLU, Nr. 1"
            rows["4radiate_cu" if struck else "3neradiate_cu"].append(f"{r['name']}^{r['cui']}^{reg}^ROONRC.{reg}^{codes}^{address}^România^{r['locality']}^{r['county']}^EXEMPLU^1^^^^^^^")
        else:
            rows["2radiate_fara" if struck else "1neradiate_fara"].append(f"{r['name']}^{r['cui']}^{reg}^ROONRC.{reg}^{codes}")
    short = "DENUMIRE^CUI^COD_INMATRICULARE^EUID^STARE_FIRMA"
    long = short + "^ADRESA_COMPLETA^ADR_TARA^ADR_LOCALITATE^ADR_JUDET^ADR_DEN_STRADA^ADR_DEN_NR_STRADA^ADR_BLOC^ADR_SCARA^ADR_ETAJ^ADR_APARTAMENT^ADR_COD_POSTAL^ADR_SECTOR^ADR_COMPLETARE"
    head = {"1neradiate_fara": short, "2radiate_fara": short, "3neradiate_cu": long, "4radiate_cu": long}
    files = {f"{k}_sediu_{d}.csv": BOM + "\n".join([head[k], *v]) + "\n" for k, v in rows.items()}
    files["5nomenclator_stari_firma.csv"] = "COD|DENUMIRE\n" + "\n".join(f"{c}|{n}" for c, n in STATUS_NAMES.items()) + "\n"
    return files


def _current_files(date_key: str) -> dict[str, str]:
    d = date_key
    firme = ["DENUMIRE^CUI^COD_INMATRICULARE^DATA_INMATRICULARE^EUID^FORMA_JURIDICA^ADR_TARA^ADR_JUDET^ADR_LOCALITATE^ADR_DEN_STRADA^ADR_NR_STRADA^ADR_BLOC^ADR_SCARA^ADR_ETAJ^ADR_APARTAMENT^ADR_COD_POSTAL^ADR_SECTOR^ADR_COMPLETARE^WEB^TARA_FIRMA_MAMA"]
    stare, caen = ["COD_INMATRICULARE^COD"], ["COD_INMATRICULARE^COD_CAEN_AUTORIZAT^VER_CAEN_AUTORIZAT"]
    for reg, snaps in COMPANIES.items():
        if d not in snaps:
            continue
        r = snaps[d]
        firme.append(f"{r['name']}^{r['cui']}^{reg}^{r['registered']}^ROONRC.{reg}^{r['form']}^România^{r['county']}^{r['locality']}^EXEMPLU^1^^^^^400001^^^^")
        stare += [f"{reg}^{c}" for c in r["states"]]
        caen += [f"{reg}^{code}^{version}" for code, version in CAEN.get(reg, [])]
    return {"od_firme.csv": BOM + "\n".join(firme) + "\n", "od_stare_firma.csv": BOM + "\n".join(stare) + "\n", "od_caen_autorizat.csv": BOM + "\n".join(caen) + "\n"}


def _resource(dataset: str, name: str, file: str, size: int, rid: str) -> dict:
    return {"id": rid, "name": name, "url": f"https://data.gov.ro/dataset/{dataset}/resource/{rid}/download/{file}", "format": "CSV", "size": size, "last_modified": "2026-11-06T05:15:47", "hash": ""}


def datasets() -> tuple[dict[str, dict], dict[str, str]]:
    """(CKAN packages by name, file bodies by URL) of the stub data.gov.ro."""
    packages: dict[str, dict] = {}
    bodies: dict[str, str] = {}

    def add(name: str, title: str, when: str, files: dict[str, str], resource_names: dict[str, str] | None = None) -> None:
        resources = []
        for i, (file, body) in enumerate(files.items()):
            res = _resource(name, (resource_names or {}).get(file, file.upper()), file, len(body), f"{hashlib.sha1(f'{name}/{file}'.encode()).hexdigest()[:8]}-0000-4000-8000-{i:012d}")
            resources.append(res)
            bodies[res["url"]] = body
        packages[name] = {"id": f"id-{name}", "name": name, "title": title, "metadata_modified": f"{when}T06:00:00", "resources": resources}

    legacy = _legacy_files(S1)
    add("firme-inregistrate-la-registrul-comertului-pana-la-data-de-18-martie-2025", "Firme înregistrate la Registrul Comerțului până la data de 18 martie 2025", S1, legacy,
        {"1neradiate_fara_sediu_2025-03-18.csv": "neradiate fără sediu", "2radiate_fara_sediu_2025-03-18.csv": "radiate fără sediu", "3neradiate_cu_sediu_2025-03-18.csv": "neradiate cu sediu",
         "4radiate_cu_sediu_2025-03-18.csv": "radiate cu sediu", "5nomenclator_stari_firma.csv": "nomenclator stări firmă"})
    for key, day in ((S2, "02-03-2026"), (S3, "03-04-2026"), (S4, "06-05-2026")):
        add(f"firme-{day}", f"Firme înregistrate la Registrul Comerțului până la data de {day.replace('-', '.')}", key, _current_files(key))
        nomenclature = "COD^DENUMIRE\n" + "\n".join(f"{c}^{n}" for c, n in STATUS_NAMES.items()) + "\n"
        add(f"nomenclatoare-{day}", f"Nomenclatoare utilizate în decodificarea stării firmei - {day.replace('-', '.')}", key, {"n_stare_firma.csv": BOM + nomenclature}, {"n_stare_firma.csv": "N_STARE_FIRMA.CSV"})
    # a dataset that is not a snapshot, and a quarterly snapshot inside the same quarter as another (only the last of a quarter is wanted)
    packages["buget-registrul-comertului-2013"] = {"id": "x", "name": "buget-registrul-comertului-2013", "title": "Buget Registrul Comerţului 2013", "metadata_modified": "2013-01-01T00:00:00", "resources": []}
    add("firme-inregistrate-la-registrul-comertului-pana-la-data-de-08-februarie-2025", "Firme înregistrate la Registrul Comerțului până la data de 08 februarie 2025", "2025-02-08", _legacy_files(S1),
        {f: f for f in _legacy_files(S1)})
    return packages, bodies


class Response:
    def __init__(self, body=None, content: bytes | None = None, status=200):
        self._body, self._content, self.status_code = body, content, status

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests

            raise requests.HTTPError(f"{self.status_code}", response=self)

    def json(self):
        return self._body

    def iter_content(self, chunk_size=1 << 20):
        data = self._content or b""
        for i in range(0, len(data), chunk_size):
            yield data[i:i + chunk_size]


def ckan(packages: dict[str, dict], bodies: dict[str, str], *, fail_on: tuple[str, ...] = ()):
    """A stand-in for `requests.get` serving `packages` (CKAN `package_search` and `package_show`) and `bodies` (the files)."""
    from urllib.parse import parse_qs, unquote, urlparse

    def get(url, **kwargs):
        if any(f in url for f in fail_on):
            import requests

            raise requests.ConnectionError("simulated outage")
        parsed = urlparse(url)
        if parsed.path.endswith("/package_search"):
            start = int(parse_qs(parsed.query).get("start", ["0"])[0])
            rows = int(parse_qs(parsed.query).get("rows", ["10"])[0])
            found = list(packages.values())
            return Response({"success": True, "result": {"count": len(found), "results": found[start:start + rows]}})
        if parsed.path.endswith("/package_show"):
            name = unquote(parse_qs(parsed.query)["id"][0])
            return Response({"success": True, "result": packages[name]}) if name in packages else Response({"success": False}, status=404)
        if url in bodies:
            return Response(content=bodies[url].encode("utf-8"))
        return Response(status=404)
    return get


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)
    packages, bodies = datasets()
    summary = fetch_onrc(a, now=FETCHED, http=ckan(packages, bodies))
    assert not summary.failed and not summary.invalid, summary.lines()
    at = lambda y, m, d, h=9: datetime(y, m, d, h, 0, tzinfo=timezone.utc)  # noqa: E731
    das = [da("DA95000001", "2026-02-10", "100000", AUTH[:2], ALFA[:2]), da("DA95000002", "2026-02-12", "50000", AUTH[:2], BETA[:2]),
           da("DA95000003", "2026-02-14", "30000", AUTH[:2], GAMMA[:2]), da("DA95000004", "2026-02-15", "20000", AUTH[:2], DELTA[:2]),
           da("DA95000005", "2026-02-16", "40000", AUTH[:2], DUBLA[:2]), da("DA95000006", "2026-02-17", "10000", DUBLA[:2], ALFA[:2])]
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2026Q1", fetched_at=at(2026, 4, 15),
                 files={"raport-achizitii-directe-t1-2026.csv": ("\n".join([DA_HEADER, *das]) + "\n").encode()},
                 via="Achizitii directe 2026 - T1", url="https://data.gov.ro/fixture/raport-achizitii-directe-t1-2026.csv")
    known = [AUTH, ALFA, BETA, GAMMA, DUBLA]
    entries = [anaf_entry(c, n, state="INREGISTRAT din data 01.01.2000") for n, c, _ in known]
    ids = [c for _, c, _ in known] + [DELTA[1]]
    archive_batch(a, ids, date(2026, 11, 2), anaf_response(entries, [DELTA[1]]), at(2026, 11, 2, 8))


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
