# Placing contracting authorities (and suppliers) in a county

Research for [#6](https://github.com/george-vrancianu/grivei.ai/issues/6), a child of the wayfinder map [#2](https://github.com/george-vrancianu/grivei.ai/issues/2).
Investigated 2026-11-11 against the repo's raw SEAP batches, the live e-licitatie.ro public API (a handful of requests), ANAF's public VAT-register web service, and INS's SIRUTA nomenclature on data.gov.ro.

## Answer in brief

- **SEAP does carry county and locality for every registered entity**, authorities and suppliers alike, but **not in the list endpoints our Connector uses today**. The county is one GET away: `api-pub/Entity/getCAEntityView/{id}` for authorities, `getSUEntityView/{id}` or `getSUEntityByCIF` for suppliers. Award-notice detail also has the authority's county, NUTS3 code, legal buyer type and per-lot place of performance.
- **Our raw batches**: the authority record has no location. Award-notice winners have `county` for 785 of 790 rows. Direct-purchase (DA) suppliers have **no location at all**, and about 90% of their CUIs never appear as a notice winner.
- **The gap-filler is SEAP itself.** ANAF's free VAT-register service (100 CUIs per request, 1 request per second, no key needed) is the authoritative cross-check and the fallback for CUIs SEAP can't resolve. It returns the SIRUTA county code, the ISO county code, and the Bucharest sector in the locality name.
- **Normalise to the ISO 3166-2:RO county code** (`AB` … `VS`, `B` for Bucharest), plus `NUTS3` and the SIRUTA `JUD` code as attributes. Bucharest is one map unit (`B`). Keep the sector as an optional sub-attribute, not a 43rd–48th county.
- **National-level authorities** (ministries, central agencies, national companies) are flagged with a `scope = national` attribute, taken from SEAP's own buyer-type fields. By default the map shows them **off-map**, in a separate "National" tile beside it, not piled onto Bucharest. Their deconcentrated county branches have their own CUIs and plot normally. Optionally, a later view can spread national spending by lot place of performance (NUTS3).

## 1. What SEAP returns today (evidence from `watchdog/data/raw/`)

Batches: `seap_brasov_2024_2026.json` (1,667 DA, 212 notices, 392 contracts) and `seap_timisoara_2024_2026.json` (279 DA, 168 notices, 234 contracts), produced by `watchdog/connectors/seap_harvest.py`.

| Record | Location fields present | Coverage in batches |
|---|---|---|
| `authority` (from `ComboPub/searchContractingAuthorities`) | none: only `seapId`, `cui`, `name` | 0% |
| `notices[].ca` (`GetCANoticeList`) | none: `"4384206 - MUNICIPIUL BRASOV"` string | 0% |
| `da[].ca`, `da[].supplier` (`GetDirectAcquisitionList`) | none: `"RO 16310091 Q TEST SA"` string, no supplier entity id | 0% |
| `contracts[].winners[]` (`GetCANoticeContracts`) | `city`, `county`, `country`, `addr`, `entityId` | Brașov: county on 496/499 winners. Timișoara: 289/291 |

Observations from the winner data:

- **County values are SEAP's ASCII nomenclature** (`Brasov`, `Bucuresti`, `Bistrita-Nasaud`, `Caras-Severin`), and `NA` for foreign suppliers (Germany, Türkiye, Italy).
- **Null county mostly means no SEAP entity behind the winner.** Of the 5 Romanian winners with `county: null`, 4 also have `entityId: null`: they were typed into the notice as free text. The county is often recoverable from the free-text `addr` (`"…, judet Brasov"`) or the `city`, but not reliably.
- **Bucharest appears as `city = county = "Bucuresti"`** (169 rows). The sector is not in a structured field.
- **The data has quality errors.** One winner has `city = "Codlea"` with `county = "Bucuresti"` (Codlea is in Brașov county). One CUI (`RO19256531`) appears with two different localities in the same county. These are address snapshots per notice, not a registry.
- **DA suppliers are the big gap.** Brașov's DAs involve 422 distinct supplier CUIs, and only 39 also appear as notice winners. Timișoara: 141 distinct, 17 overlap. In other words, about 90% of DA suppliers have no location in the batch. DAs are also the bulk of the rows (1,946 DAs vs 626 contracts).
- `002_load_seap.sql` stores winner `city`/`county`/`country` in `entity.attrs` via `upsert_entity`. DA suppliers and the authority get no location attributes.

## 2. SEAP endpoints that do carry location

The public SPA bundle (`https://e-licitatie.ro/app-pub?v=…`) defines an `EntityApi` with `this.api="api-pub/Entity"` and the methods `getCAEntityView(id)`, `getSUEntityView(id)` and `getSUEntityByCIF(body)`. These calls require a `Referer` header, otherwise they return `{"message":"Access Denied: Referrer cannot be null."}`. Live responses (2026-11-11):

`GET /api-pub/Entity/getCAEntityView/3289` (MUNICIPIUL BRASOV):
```json
{"entityId":3289,"fiscalNumber":"4384206","entityName":"MUNICIPIUL BRASOV",
 "address":"Strada: Eroilor, nr. 8, Sector: -, Judet: Brasov, Localitate: Brasov, Cod postal: 500007",
 "city":"Brasov","county":"Brasov","country":"Romania", ...}
```
`getCAEntityView/2769` (Ministerul Transporturilor și Infrastructurii) → `county: "Bucuresti"`, `address: "…, Sector: 1, Judet: Bucuresti, …"`.
`getCAEntityView/1500` (Sector 1 town hall) → `county: "Bucuresti"`, and the sector only appears in the `address` string (`Sector: 1`).

`GET /api-pub/Entity/getSUEntityView/199346` (a Brașov supplier, `entityId` from a winner) → `city: "Brasov"`, `county: "Brasov"`, `postalCode`.
`POST /api-pub/Entity/getSUEntityByCIF/` with body `"16310091"` (a DA-only supplier, no entity id needed) → `entityId: 60869`, `county: "Bucuresti"`, `address: "…, Sector: 5, …"`. **This fills the DA-supplier gap from SEAP itself, keyed by CUI.**

Foreign supplier `getSUEntityView/100025867` → `county: "NA"`, `country: "Türkiye"`.

**Award-notice detail**, `GET /api-pub/C_PUBLIC_CANotice/get/{caNoticeId}` (tested on 100662702), section `section1_New.section1_1.caAddress` contains:

- `county: {id: 4, text: "Bucuresti", localeKey: "B"}`. The `localeKey` is the ISO 3166-2:RO code.
- `nutsCodeItem.text: "RO321 Bucuresti"` (NUTS3)
- `legalBuyerType.text: "Autoritate guvernamentală centrală"` (the eForms buyer legal type)
- `section1_4_New.caType: "Minister sau orice altă autoritate națională sau federală"`, with `localeKey Common.Clasiff.ContractingAuthorityType.NationalOrFederalAuthority`
- `section2_New.section2_2_New.descriptionList[i].nutsCode: "RO321 Bucureşti"`: the **place of performance per lot**.

**County nomenclature**, `GET /api-pub/ComboPub/searchCounty?filter=&pageIndex=0&pageSize=60&parentId=1` returns 43 items: 41 counties, `Bucuresti`, and `NA` (id 0). The names are ASCII with no diacritics. The ids are 1..42, in the alphabetical order of the ISO 3166-2:RO codes (AB=1, AG=2, AR=3, B=4, BC=5 … VS=42). That is an observation, not a documented contract, so key on the name or ISO code, not the id.

**Authority-type nomenclature**, `GET /api-pub/ComboPub/searchContractingAuthorityType` returns 40 entries. The national-level ones include "Minister", "Aparatul de lucru al guvernului", "Agentie/birou national", "Organe de specialitate in subordinea ministerului/Guvernului", "Autoritati administrative autonome" and "De interes national". The local ones include "Consiliul local/Primarie", "Comuna", "Oras", "Municipiu", "Sector Municipiu Bucuresti/CGMB", "Consiliul judetean" and "De interes local sau regional". These are probably legacy (pre-eForms) types. New notices carry both `caType` and `legalBuyerType`.

**Cost.** One GET per authority (or one per distinct supplier CUI). At the Connector's existing pace (`PAUSE = 0.35` s, about 3 requests/s), 10,000 entities take about an hour. It is a one-off cost per entity, refreshed rarely. The endpoints are undocumented, like the rest of `api-pub`.

## 3. ANAF public lookup (cross-check and fallback)

Official docs: [servicii_sincron.html](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/servicii_sincron.html) and [doc_WS_V9.txt](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt) (published 2025-02-04).

- `POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva`, with body `[{"cui": 4384206, "data": "2026-11-10"}, …]`. No authentication.
- **Limits (doc_WS_V9, rule a):** "Un request poate contine maxim 100 de CUI-uri. Un client poate executa maxim 1 request pe secunda." Rule b warns that overloading attempts are sanctioned. So: 100 CUIs/s, about 100k CUIs in about 17 minutes.
- **Response** (`found[]` / `notFound[]`) includes `adresa_sediu_social` and `adresa_domiciliu_fiscal` with `sdenumire_Judet`, `scod_Judet`, `scod_JudetAuto`, `sdenumire_Localitate`, `scod_Localitate`, plus `date_generale.cod_CAEN` and `forma_juridica`.
- Live test, 4 CUIs, all found:
  - MUNICIPIUL BRASOV → `sdenumire_Judet: "BRAŞOV"`, `scod_Judet: "8"`, `scod_JudetAuto: "BV"`
  - Ministry of Transport → `"MUNICIPIUL BUCUREŞTI"`, `scod_Judet: "40"`, `scod_JudetAuto: "B"`, `sdenumire_Localitate: "Sector 1 Mun. Bucureşti"`
  - Sector 1 town hall → same as the ministry, sector 1
  - TETKRON SRL → `BV`, which agrees with SEAP.
- `scod_Judet` equals the **SIRUTA `JUD` code** (Brașov 8, Bucharest 40; checked against SIRUTA below). `scod_JudetAuto` is the ISO/plate code. `scod_Localitate` is an ANAF-internal code (Brașov = 16), **not** a SIRUTA code.
- Public institutions are present too: the register covers fiscal registrations, not only VAT payers. `cod_CAEN` and `forma_juridica` were empty for the authorities.
- Terms: the generic MF/ANAF API terms ([termeni_conditii_API.pdf](https://static.anaf.ro/static/10/Anaf/termeni_conditii_API.pdf)) mostly concern authenticated developer APIs: GDPR obligations, audit headers, no use of ANAF logos. I found no explicit reuse licence for the public lookup data. This is part of the deferred legal posture. Storing a county code derived from it is low-risk.
- ANAF gives the **current** registered seat, not the address at contract time. A company that moved shows its new county. This is acceptable for a map, but record `located_at_source` and `located_on`.

ONRC was not evaluated as a lookup: its public data needs a paid or registered portal, and ANAF already covers companies and institutions by CUI.

## 4. SIRUTA (INS) as the reference nomenclature

INS publishes SIRUTA on data.gov.ro (dataset `siruta_s1-2026`, updated 2026-08-11). The CSV is semicolon-separated, UTF-8 with BOM, and has the columns `SIRUTA;DENLOC;CODP;JUD;SIRSUP;TIP;NIV;MED;REGIUNE;FSJ;NUTS;LAU`. The legend (`legenda-siruta.xml`) defines the `TIP` codes: 40 = county or Bucharest, 6 = Bucharest sector, 1/4 = municipality, and so on.

- 42 rows with `TIP=40`. `JUD` is 1..39 alphabetical, plus **40 = Municipiul București**, **51 = Călărași**, **52 = Giurgiu**. `NUTS` gives the NUTS3 code (for example `RO122` Brașov, `RO321` București).
- The Bucharest sectors are `TIP=6`, SIRUTA 179141..179196 ("BUCUREŞTI SECTORUL 1".."6"), under SIRSUP 179132.
- **Diacritics:** SIRUTA 2026 and ANAF use **cedilla** forms (`Ş`, `Ţ`), not comma-below (`Ș`, `Ț`). SEAP uses ASCII. A normaliser must fold both forms.

## 5. Normalising county names

Canonical key: **ISO 3166-2:RO subdivision code** (`AB`, `AG`, `AR`, `B`, `BC`, … `VS`; 42 values). It is short and stable, it is what ANAF (`scod_JudetAuto`) and SEAP notice detail (`county.localeKey`) already emit, and Romania-county GeoJSON is commonly keyed by it or by NUTS3.

Reference table: one row per county, with `iso`, `siruta_jud`, `nuts3`, `name_ro` (with comma-below diacritics, for display), `name_seap` (ASCII), plus folded aliases. Build it once from SIRUTA `TIP=40` rows and check it into the repo.

Matching rule for any input string:
1. Unicode NFKD, strip combining marks. This folds both `Ş`/`Ș` and `Ţ`/`Ț` to `S`/`T`. Then uppercase, collapse spaces and hyphens.
2. Strip the prefixes `JUDETUL `, `JUD. `, `MUNICIPIUL ` (only for Bucharest).
3. Map `BUCURESTI`, `MUNICIPIUL BUCURESTI`, `BUCHAREST`, `SECTOR n` and `BUCURESTI SECTORUL n` → `B`, and keep `sector = n` when it is present.
4. `NA`, empty, or a non-Romanian `country` → `county = null`, `country = <ISO country>`. These are foreign suppliers, never plotted on the Romania map.
5. Anything unmatched → `null`, plus a log line. Don't guess.

**Bucharest and sectors:** plot Bucharest as one unit (`B`), as NUTS3 and ISO do. The six sector town halls and their agencies are local authorities of `B`. Store `sector` (1–6) as an attribute, from ANAF's `Sector n Mun. Bucureşti` locality or SEAP's `Sector: n` in the address string, for a possible later Bucharest zoom. Ilfov (`IF`) is separate and must not be merged into `B`.

## 6. National-level authorities on a county map

The problem: ministries, central agencies (ANAF, CNAS, ANAP), national companies (CNAIR, CFR, Transelectrica, Romgaz, Hidroelectrica) and autonomous authorities nearly all have their seat in Bucharest. Their SEAP spending is orders of magnitude larger than any county's local spending. Plotting them at their seat turns `B` into a single saturated blob and says nothing true about where the money goes.

Recommended representation:

1. **Classify scope from SEAP's own fields**, not from name heuristics. Use `legalBuyerType` (eForms, for example "Autoritate guvernamentală centrală") and/or `caType` (the national-level entries listed in §2), read from the authority's latest award notice. Store `scope ∈ {national, county, local}` on the entity, with provenance pointing to that notice. Use name rules (`^MINISTERUL`, `COMPANIA NATIONALA`, `AGENTIA NATIONALA`, `AUTORITATEA NATIONALA`, …) only as a fallback for authorities with DAs only (no notices), and flag such rows as inferred.
2. **Default map: national authorities off-map.** Show a "National / central" tile or bubble next to the Romania map, with the same metric (count, value) so the totals still add up. The county choropleth then reflects county and local authorities only. Clicking the tile filters the hits table, like clicking a county.
3. **Seat county is still stored** (`county = B`) and is shown in the entity detail. It is a fact about the entity, not about where it spends.
4. **Deconcentrated and territorial units have their own CUI and county**: DSP Brașov, ISU, Direcțiile Regionale de Drumuri și Poduri of CNAIR, county police inspectorates, Prefectura. They plot in their own county as normal. SEAP even has a "Serviciile public deconcentrate" type. Don't roll them up to the ministry.
5. **Optional later view, "where national money lands":** allocate award-notice lots of national authorities by `section2_2_New.descriptionList[].nutsCode` (place of performance, NUTS3 → county). DAs have no place of performance, so this view is notices-only. Label it as a different measure. Multi-county or `RO`-level lots stay in the National tile.

## Recommendation

1. **Extend the SEAP Connector** with a cached entity-location step:
   - For each authority `seapId`, call `getCAEntityView`.
   - For each supplier, call `getSUEntityView` by `entityId` when it is present, otherwise `getSUEntityByCIF` with the CUI parsed from the DA string.
   - Send `Referer: https://e-licitatie.ro/pub` and keep the existing ~3 requests/s.
   - Store `city`, `county`, `country`, and the raw `address` (for `Sector: n`) in `entity.attrs`, with a document/provenance row.
2. **Fetch award-notice detail once per authority** (its latest notice) for `legalBuyerType` and `caType`, and derive `scope`.
3. **Run ANAF v9 in batches** (100 CUIs/request, ≤1 request/s) over all Romanian CUIs:
   - as the fallback where SEAP has no entity (free-text winners, `getSUEntityByCIF` misses);
   - as a disagreement check (log SEAP-vs-ANAF county mismatches as data-quality notes; prefer ANAF for the map because it is the fiscal registry);
   - to get the Bucharest sector.
4. **Normalise everything to ISO 3166-2:RO** through a checked-in county table built from SIRUTA (`iso`, `siruta_jud`, `nuts3`, names). Bucharest = `B`, sector as an attribute, foreign suppliers off-map.
5. **Map default:** county and local authorities in the choropleth, national authorities in a separate National tile. A place-of-performance view can come later.

## Open questions

- Should the map colour by **authority county** (who spends) only, or offer a **supplier county** toggle (where the money goes)? This research makes both possible.
- Which **GeoJSON** of Romanian counties will the explorer use, and which key does it carry (ISO, NUTS3, SIRUTA, or name)? The county table should include whatever it needs.
- **Undocumented `api-pub` endpoints and the `Referer` check**: acceptable for the national seeding run (#2), or should bulk seeding prefer ANAF where possible?
- Should **"National authority"** become a glossary term (`scope = national`) via `domain-modeling`?
- **ANAF data reuse terms** for republishing derived attributes are part of the deferred legal posture.

## Sources

- Repo: `watchdog/data/raw/seap_brasov_2024_2026.json`, `watchdog/data/raw/seap_timisoara_2024_2026.json`, `watchdog/connectors/seap_harvest.py`, `watchdog/sql/002_load_seap.sql`.
- e-licitatie.ro public SPA bundle `https://e-licitatie.ro/app-pub?v=KEofz3XYcPN18N6ksFkq2x81KaIcnF96CAXAvkV4EBs1` (the `EntityApi` and `ComboPub` definitions), plus live responses from `api-pub/Entity/getCAEntityView/{3289,2769,1500,727}`, `getSUEntityView/{199346,100025867}`, `getSUEntityByCIF` (16310091), `C_PUBLIC_CANotice/get/100662702`, `ComboPub/searchCounty`, `ComboPub/searchContractingAuthorityType`, fetched 2026-11-11.
- ANAF: [servicii_sincron.html](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/servicii_sincron.html), [doc_WS_V9.txt](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt), [termeni_conditii_API.pdf](https://static.anaf.ro/static/10/Anaf/termeni_conditii_API.pdf), and a live v9 query on 2026-11-11.
- INS SIRUTA on data.gov.ro: [siruta_s1-2026](https://data.gov.ro/dataset/siruta_s1-2026) (`siruta_s1_2026.csv`, `legenda-siruta.xml`).
