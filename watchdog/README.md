# watchdog — MVP achiziții publice

Un graf de entități (instituții, firme, ulterior persoane) construit din surse publice,
cu proveniență obligatorie pentru fiecare legătură. Prima verticală: achiziții publice (SEAP).

Reconstrucție completă într-o comandă (bază goală + loturile din `data/raw/`): `./run_all.sh`.
Harvester-ul există în două variante echivalente: `connectors/seap_harvest.py` (Python, `pip install -r requirements.txt`)
și `connectors/seap_harvest.browser.js` (de lipit în consola browserului pe e-licitatie.ro, dacă rulezi de pe o rețea
fără acces direct). Viewer-ele generate: `viewer/brasov.html`, `viewer/timisoara.html` (le deschizi direct în browser).

```
watchdog/
├── run_all.sh              # rebuild de la zero
├── requirements.txt        # doar `requests` (pentru harvester); restul folosește psql
├── sql/
│   ├── 001_schema.sql      # surse, documente (raw), entități, aliasuri, muchii + tabele tipizate SEAP
│   ├── 002_load_seap.sql   # transformă un lot JSON SEAP în document -> entity/edge -> tabele tipizate
│   └── 003_views.sql       # interogările de investigație (praguri, divizare, negocieri, concentrare, asocieri)
├── connectors/
│   ├── seap_harvest.py     # descarcă DA + anunțuri de atribuire + contracte pentru o autoritate (necesită `requests`)
│   └── load_batch.py       # încarcă JSON-ul în Postgres și rulează transformarea (necesită doar `psql`)
├── data/raw/               # loturile JSON exact cum au venit de la sursă (păstrează-le; sunt proba)
└── reports/                # rapoartele produse
```

## Rulare de la zero

```bash
createdb watchdog
export DATABASE_URL=postgresql://user:pass@localhost/watchdog
psql $DATABASE_URL -f sql/001_schema.sql
python connectors/seap_harvest.py --authority "MUNICIPIUL BRASOV" --from 2024-01-01 --out data/raw/seap_brasov.json
python connectors/load_batch.py --source seap --file data/raw/seap_brasov.json
psql $DATABASE_URL -f sql/003_views.sql
psql $DATABASE_URL -c "SELECT * FROM v_supplier_totals ORDER BY ron_total_share DESC LIMIT 20"
```

Pentru o altă instituție schimbi doar `--authority`. Rularea repetată a aceluiași lot nu dublează date.
Mai multe autorități trăiesc în aceeași bază: firmele comune se unesc automat după CUI, deci graful
devine inter-orașe (vezi `v_supplier_totals.authority`). Loturi deja descărcate: Brașov, Timișoara (`data/raw/`).

Viewer per autoritate:
```bash
python tools/export_graph.py --authority "MUNICIPIUL TIMISOARA" --county Timis --out viewer/timisoara.graph.json
python tools/build_viewer.py --data viewer/timisoara.graph.json --out viewer/timisoara.html --title "Watchdog Timișoara"
```

## Modelul de date, pe scurt

| Strat | Tabele | Rol |
|---|---|---|
| Proveniență | `source`, `document`, `import_batch` | ce am primit, de unde, când; `document.raw` e payload-ul neatins |
| Graf | `entity`, `entity_alias`, `relation_type`, `edge` | nodurile și legăturile; `edge.document_id` e obligatoriu |
| Tipizat SEAP | `seap_award_notice`, `seap_contract`, `seap_contract_winner`, `seap_direct_acquisition` | datele de domeniu, cu toate câmpurile, pentru interogări precise |
| Investigație | `v_*`, `neighbours()` | întrebările standard ale unui watchdog |

Rezoluția entităților: firmele se identifică după CUI (`norm_cui`), apoi după `seap_entity_id`, apoi după
numele normalizat (`norm_company_name`: fără diacritice, fără SC/SRL/SA). Persoanele (de la ONRC/ANI) vor
avea nevoie de reguli separate — nu există identificator public, deci potrivirea e pe nume + context.

## Ce urmează (conectori)

1. **ONRC** — asociați/administratori pentru fiecare CUI din `entity` → muchii `OWNS_SHARES`, `ADMINISTERS`, apar nodurile `person`.
2. **Ministerul Finanțelor** — bilanțuri per CUI → `entity.attrs` (cifră de afaceri, angajați) ca să vezi firme mici cu contracte mari.
3. **ANI** — declarațiile de interese ale consilierilor locali / primar / directori → `HOLDS_OFFICE`, `DECLARED_INTEREST`.
4. **portal.just.ro** — dosare în care apar firmele/persoanele → `PARTY_IN_CASE`.

Întrebarea-țintă a grafului: drum de lungime ≤ 3 între un decident (`HOLDS_OFFICE` la autoritate) și
o firmă câștigătoare (`AWARDED_CONTRACT` / `DIRECT_PURCHASE` de la aceeași autoritate).

## Note legale / etice

Datele sunt publice, dar numele persoanelor sunt date personale: documentează scopul (interes public,
jurnalism), nu publica mai mult decât e necesar, păstrează întotdeauna linkul către documentul-sursă.
Rezultatele interogărilor sunt *semnale*, nu concluzii — fiecare trebuie verificat în documentul original.

## Vizualizare

Două unelte, cu roluri diferite:

- **Explorare** — `tools/export_graph.py` scoate tot graful din Postgres (`viewer/graph.json`), iar
  `tools/build_viewer.py` îl injectează în `viewer/graph.template.html` → `viewer/graph.html`, o pagină
  autonomă (D3, force layout): sute de noduri, filtre pe tip de legătură și prag de bani, căutare, dosar
  per entitate cu linkuri către documentele SEAP. Aici începi o investigație.
- **Prezentare (Archify)** — `tools/export_archify.py` scoate un sub-graf curat (≤ ~15 entități) în
  formatul JSON IR al [Archify](https://github.com/tt-a1i/archify) (`diagram_type: architecture`):
  autoritatea, firmele alese (sau `--top N`), grupurile de asociere ca `boundaries`, legăturile etichetate
  cu bani și cu negocierile fără publicare. Apoi pe mașina cu Archify:
  `node archify/bin/archify.mjs finalize architecture diagrams/brasov-bloc.architecture.json`.
  Archify are validatoare stricte de layout (suprapuneri, etichete); e gândit ca agentul să repare
  diagrama iterativ, deci exportul e un prim draft, nu un rezultat final. Aici termini o investigație:
  o diagramă curată pentru un articol sau o sesizare.
