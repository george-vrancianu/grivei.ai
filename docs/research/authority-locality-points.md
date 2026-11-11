# Placing contracting authorities at their locality

Research for [#15](https://github.com/george-vrancianu/grivei.ai/issues/15), a child of the wayfinder map [#2](https://github.com/george-vrancianu/grivei.ai/issues/2). It builds on [#6](https://github.com/george-vrancianu/grivei.ai/issues/6) (`docs/research/authority-county-mapping.md` on branch `research/authority-county-mapping`) and [#5](https://github.com/george-vrancianu/grivei.ai/issues/5) (`docs/research/seap-bulk-sources.md` on branch `research/seap-bulk-sources`).
Investigated 2026-11-11 against INS SIRUTA (S1 2026), ANCPI's administrative units on data.gov.ro and its ArcGIS open-data hub, Wikidata, the ADR Q3 2026 direct-purchase export, ANAF's VAT-register service (10 requests) and e-licitatie.ro (about 10 requests).

**Question.** In the Money lens, a zoomed county shows contracting authorities as points at their locality. Where does each authority's locality come from, how reliably does it map to a SIRUTA code, which open dataset gives a point per SIRUTA code (and under what licence), and what does it mean that many authorities share one locality?

## Answer in brief

- **Locality source: ANAF first, SEAP as fallback.** ANAF's `sdenumire_Localitate` is a structured string such as `Sat Sânpetru Com. Sânpetru`, `Mun. Braşov`, `Orş. Tăşnad` or `Sector 5 Mun. Bucureşti`. It names the UAT (commune/town/municipality) and often the village. In a random sample of **1,000 of the 13,239 authorities** active in Q3 2026, ANAF found all 1,000, and a simple parser resolved **all 1,000 to a SIRUTA UAT code** (368 also to a village). SEAP's `getCAEntityView` gives an ASCII `city` taken from SEAP's own locality pick-list, plus the postal code inside the `address` string. It is good, but names repeat inside a county, so it needs the postal code to disambiguate.
- **Plot at the UAT, store the village.** The key for a point is the **SIRUTA code of the UAT** (3,180 UATs plus the 6 Bucharest sectors = 3,186 points). UAT names are unique within a county, so the match is deterministic. Store the village SIRUTA too when the source names one, but don't plot at that level in Release 1.
- **Point dataset: Wikidata (CC0), checked against ANCPI (CC BY 4.0).** Wikidata has a coordinate (`P625`) for **every SIRUTA UAT and for 13,753 of 13,755 villages**, keyed by the SIRUTA property `P843`, under CC0. In tests, 3,167 of 3,180 UAT points fall inside ANCPI's official polygon for the same SIRUTA code, and the median distance to the ANCPI centroid is 1.2 km. ANCPI's official UAT polygons (CC BY 4.0, keyed on SIRUTA in `natCode`/`nationalCode`, March 2025 version) are the authority and the fallback (point-on-surface). OpenStreetMap also carries `siruta:code`, but ODbL's share-alike clause makes it a poor primary source. Use it only as an internal cross-check.
- **Concentration is heavy.** In the sample, **37% of authorities sit in just 41 places**: the 40 county-seat municipalities (28%) and Bucharest (9%). Scaled to one quarter, that is about 90 authorities per county seat on average and about 1,200 in Bucharest, against about 2 per commune. **Plot one mark per locality** (aggregated, sized by the lens metric, with a count), not one mark per authority. Clicking a mark filters the hits table to that locality. National authorities are already off-map in the National tile (#6), which removes much of the Bucharest pile.

## 1. Where each authority's locality comes from

### ANAF VAT-register service (preferred)

The same `POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva` call from #6 (100 CUIs per request, at most 1 request/s per [doc_WS_V9.txt](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt)). The locality fields in `adresa_sediu_social` are:

| Field | Example | Use |
|---|---|---|
| `scod_Judet` | `8` | SIRUTA `JUD` code (as shown in #6) |
| `scod_JudetAuto` | `BV` | ISO 3166-2:RO |
| `sdenumire_Localitate` | `Sat Sânpetru Com. Sânpetru` | UAT and village, parse this |
| `scod_Postal` | `507190` | Tiebreak; empty for 37 of 1,000 |
| `scod_Localitate` | `155` | ANAF-internal, **not** SIRUTA; ignore |

**Sample test.** I took the distinct authority CUIs in the ADR Q3 2026 direct-purchase file (13,239 CUIs after deduplicating the file's repeated rows; see #5), drew 1,000 at random (seed 15), and sent them to ANAF in 10 requests spaced 2 s apart. All 1,000 were found. The `sdenumire_Localitate` forms:

| Form | Count | Meaning |
|---|---|---|
| `Sat <village> Com. <commune>` | 366 | village + commune |
| `Loc. <locality> <Mun./Orş.> <town>` | 2 | component locality of a town |
| `Mun. <name>` | 353 | municipality (UAT level only) |
| `Com. <name>` | 102 | commune (UAT level only) |
| `Orş. <name>` | 84 | town (UAT level only) |
| `Sector <n> Mun. Bucureşti` | 93 | Bucharest sector |

The parser below resolved **1,000 / 1,000 to a SIRUTA UAT code** in the county given by `scod_Judet`, and all 368 village names to a SIRUTA locality inside that UAT. No row was unparsed or unmatched.

Caveats (as in #6): ANAF gives the **current** registered seat, not the address on the contract date. Record `located_at_source` and `located_on`. ANAF's names follow its own nomenclature, and a UAT created or renamed after ANAF's last update would fail to match. Log those failures; don't guess.

### SEAP entity view (fallback, and the source when ANAF has no record)

`GET /api-pub/Entity/getCAEntityView/{entityId}` (with `Referer: https://e-licitatie.ro/pub`) returns `city`, `county` and an `address` string. Four live checks:

| Entity | `city` | `county` | postal code in `address` |
|---|---|---|---|
| 12617 COMUNA SANPETRU | `Sanpetru` | `Brasov` | 507190 |
| 8480 COMUNA SANPETRU MARE | `Sanpetru Mare` | `Timis` | 307385 |
| 176476 SCOALA GIMNAZIALA NR. 1 PRAJENI | `Prajeni` | `Botosani` | 717305 |
| 36714 SCOALA GIMNAZIALA ... SCANTEIA | `Scanteia` | `Iasi` | 707425 |

ANAF agreed on all four, including the postal codes.

**The `city` is chosen from SEAP's locality nomenclature, not typed freely.** The public SPA bundle defines `kSelectCity` → `api-pub/ComboPub/searchCity`, filtered by county id through `parentId`. It holds **13,896 entries** nationally. For Brașov (`parentId=10`) it returns 172 entries:

- all 165 SIRUTA Brașov localities (ASCII-folded);
- 6 commune names that are not also village names (`Comana`, `Moieciu`, `Sinca`, `Ticusu`, `Ucea`, `Vistea`);
- one legacy entry (`Rasnov Romacril`).

The pick-list disambiguates homonyms with a parenthesis, such as `Sanpetru (Brasov)` / `Sanpetru (Hunedoara)` or `Feldioara (Ucea)`. The entity view, however, returned the bare `Sanpetru`. So expect the qualifier to be missing from `city`.

**Homonyms.** In SIRUTA, **910 of 13,749 localities (6.6%) share their folded name with another locality in the same county**. The postal code distinguishes 908 of them, because every SIRUTA locality has a non-zero `CODP`, and rural codes are per village. So the SEAP rule is: `(county, folded city)` → SIRUTA candidates. If there is more than one, pick by the `Cod postal` parsed from `address`. If `city` equals a UAT name, take the UAT.

### Bulk data.gov.ro files

The ADR exports (#5) carry the authority's name and CUI but **no address or locality**. They supply the list of CUIs to look up, not the locality itself.

## 2. Mapping to SIRUTA codes

Reference: INS SIRUTA on data.gov.ro, [`siruta_s1-2026`](https://data.gov.ro/dataset/siruta_s1-2026), CC BY 4.0. It has 16,978 rows: 42 counties (`NIV=1`), **3,181 UATs** (`NIV=2`, every one with `LAU = RO_<SIRUTA>`) and 13,755 localities (`NIV=3`, parent in `SIRSUP`). The legend (`legenda-siruta.xml`) gives the `TIP` codes:

| `TIP` | Meaning | Count |
|---|---|---|
| 1 | county-seat municipality | 40 |
| 4 | other municipality | 62 |
| 2 | town | 216 |
| 3 | commune | 2,862 |
| 9 at `NIV=2` | Municipiul București (179132) | 1 |
| 6 | Bucharest sectors (179141 … 179196) | 6 |
| 9, 10, 11, 17, 18, 19, 22, 23 | component localities and villages | 13,749 |

Matching rules:

1. **Folding.** NFKD, strip combining marks, uppercase, treat `-` as a space, collapse spaces. This folds cedilla `Ş Ţ` (SIRUTA 2026 and ANAF: 6,850 SIRUTA names use cedilla forms, and one uses comma-below), comma-below `Ș Ț`, `Â`/`Î`, and SEAP's ASCII into one key. Folding merges only **15** pairs of distinct names in the same county, and these are mostly SIRUTA spelling variants such as `HANĂŞEŞTI`/`HĂNĂŞEŞTI`. They are harmless at UAT level because the parent decides.
2. **UAT naming.** In SIRUTA, municipalities are `MUNICIPIUL X`, towns are `ORAŞ X`, and communes are a bare name. ANAF uses `Mun.`, `Orş.` and `Com.`. Strip `MUNICIPIUL` / `ORAS` from SIRUTA and `Mun.` / `Orş.` / `Com.` from ANAF, then match `(JUD, bare name)`. **Bare UAT names are unique within a county** (0 collisions across 3,181 UATs). Note that municipality and town names often also appear as villages (`BRAŞOV` 40205 is the component locality of `MUNICIPIUL BRAŞOV` 40198), so always resolve the UAT first and the village inside it.
3. **Village.** For ANAF `Sat X Com. Y` / `Loc. X Mun. Y`: resolve `Y` to the UAT, then `X` among the `NIV=3` rows with `SIRSUP` = that UAT.
4. **Bucharest.** `Sector n Mun. Bucureşti` → sector SIRUTA via a lookup table (179141, 179150, 179169, 179178, 179187, 179196 for sectors 1–6; the step is not constant, so don't compute it). On the national map Bucharest stays one county, `B`, as in #6. In the zoomed `B` view, the six sectors are the points. SEAP's `Sector: n` in the address string gives the same.
5. **No match** → `locality = null` + log line; the authority still counts in its county (from #6) and appears in an "unplaced" row of the zoomed county, never at a guessed point.

## 3. A point per SIRUTA code

| Dataset | Level | Key | Licence | Verdict |
|---|---|---|---|---|
| **Wikidata** `P843` (SIRUTA) + `P625` | 3,181 / 3,181 UATs, 13,753 / 13,755 localities, 6 / 6 sectors | SIRUTA | **CC0** | **Use for points** |
| **ANCPI "Unități administrativ-teritoriale"** (RELUAT, INSPIRE AU) | 3,186 polygons (3,180 UATs + 6 sectors; Municipiul București is represented by its sectors) | SIRUTA in `natCode` / `nationalCode` | **CC BY 4.0** | **Reference geometry, validation, fallback** |
| geo-spatial.org "Localități România" | locality points (geo-spatial.org geometry, SIRUTA attributes), 2020-12-31 | SIRUTA | No dataset licence stated; the site footer says CC BY-SA 3.0 | Share-alike and stale; not needed |
| OpenStreetMap | ~15,400 place nodes tagged `siruta:code` (13,741 distinct values) | SIRUTA | **ODbL** | Internal cross-check only |
| geoBoundaries ROU ADM2 | 3,235 "municipalities" | name | CC BY 4.0 (derived from ANCPI 2016) | Older copy of ANCPI; use the original |
| GeoNames | populated places | no SIRUTA | CC BY 4.0 | Would need name matching; no |

**ANCPI.** The data.gov.ro dataset [`unitati-administrativ-teritoriale-07-03-2024`](https://data.gov.ro/dataset/unitati-administrativ-teritoriale-07-03-2024) (CC BY 4.0, shapefiles in Stereo 70 / Pulkovo 1942) has attributes `natCode` (= SIRUTA), `name`, `natLevName` and `resOfAut` (the seat of the authority). The newer [`unitati-administrativ-teritoriale-api`](https://data.gov.ro/dataset/unitati-administrativ-teritoriale-api) (CC BY 4.0, updated 2026-05-15, flagged as an EU **high-value dataset**) points to an INSPIRE ATOM feed and an ArcGIS feature service (`services-eu1.arcgis.com/.../AU_Unități_administrative/FeatureServer/1`). That service serves the same 3,186 units, with `beginLifespanVersion` March 2025, and can return WGS84 directly (`outSR=4326`, `returnCentroid=true`). Joined against SIRUTA S1 2026, **all 3,180 non-Bucharest UATs and all 6 sectors match**, with no ANCPI code missing from SIRUTA. ANCPI has polygons only, no village points. 31 of its centroids fall outside their own (concave) polygon, so use a point-on-surface if you derive points from it.

**Wikidata validation.** One SPARQL query (`?item wdt:P843 ?siruta . OPTIONAL { ?item wdt:P625 ?coord }`) returned 17,011 rows covering 16,976 SIRUTA codes, every one of them present in SIRUTA S1 2026. 35 codes have two items, so dedupe by preferring the item whose type matches the SIRUTA level. Point-in-polygon against the ANCPI polygons (generalised to about 200 m):

- UAT points inside their own UAT polygon: **3,167 / 3,180**. Median distance to the ANCPI centroid 1.2 km, 90th percentile 3.6 km, maximum 16.6 km. Wikidata's commune point is usually the seat village, which is what we want.
- Village points inside their parent UAT polygon: **13,593 / 13,753**. Most misses are within a few km of a border (generalisation). **4** are gross errors (> 20 km away; for example `FRUNZARU` 129077, `PIELEŞTI` 16070).
- Precision: about 800 of the 17k coordinates have two decimals or fewer (≈ 1 km or worse). That is fine at county zoom.

So: snapshot Wikidata once into a checked-in table, and on import **accept a point only if it falls inside the ANCPI polygon of its SIRUTA code. Otherwise use ANCPI's point-on-surface.** CC0 needs no attribution, but ANCPI does (CC BY 4.0): "Limite UAT: ANCPI, CC BY 4.0". SIRUTA also does: "SIRUTA: INS, CC BY 4.0". This fits the attribution wording already pending under the legal posture in #2.

Why not OSM as the primary source: a public database derived from OSM data must itself be offered under ODbL (share-alike on the derivative database). That is avoidable here, because Wikidata and ANCPI cover the same ground without that obligation.

## 4. How many authorities share one locality

From the 1,000-authority sample (Q3 2026 active authorities, roughly ±3 percentage points), grouped by UAT:

| UAT type | Share of authorities | Scaled to 13,239 | Number of UATs | Authorities per UAT |
|---|---|---|---|---|
| Bucharest (6 sectors) | 9.3% | ~1,230 | 1 (6 sectors) | ~1,230 (~200 per sector) |
| County-seat municipality (`TIP 1`) | 28.1% | ~3,720 | 40 | **~93** |
| Other municipality (`TIP 4`) | 7.3% | ~970 | 62 | ~16 |
| Town (`TIP 2`) | 9.1% | ~1,200 | 216 | ~6 |
| Commune (`TIP 3`) | 46.2% | ~6,120 | 2,862 | ~2 |

In the sample, 594 UATs appear. 504 have one authority, 55 have 2–4, 34 have 5–19, and 1 (Bucharest) has 20 or more. The busiest county seats in the sample (Galați, Timișoara, Constanța, Iași, Baia Mare) each hold 1.2% of all sampled authorities. A county seat typically holds about a third of its county's authorities: city hall, the county council, county hospitals, schools and high schools, deconcentrated services, utilities, police and ISU.

What it means for plotting:

1. **One mark per locality (UAT), not per authority.** The mark's area encodes the lens metric (spend or count), and a label or tooltip gives `n authorities`. Ninety stacked dots at one coordinate would be unreadable and would hide the totals.
2. **Click → filter.** Clicking a locality filters the hits table to its authorities, the same interaction as clicking a county on the national map. Individual authorities are rows, each with its own URL (#7).
3. **No jitter, no spiderfy, by default.** A spiral of 90 points around a seat implies geography that doesn't exist. If a breakdown inside a locality is wanted later, use a small inline chart in the tooltip (for example by authority type), not fake positions.
4. **Commune marks will be many and small.** About 2,860 communes, mostly with 1–2 authorities. That gives a dense, even scatter, with the seat dominating. A square-root or log scale for the mark area keeps communes visible next to the seat.
5. **Bucharest zoom** uses the six sector points (ANCPI has sector polygons; Wikidata has sector points). National authorities stay in the National tile (#6).
6. **Unplaced authorities** (no locality match) are listed under the county in an "unplaced" row, not dropped and not pinned to the county seat.

## Recommendation

1. **Build a checked-in `locality` reference table** from SIRUTA S1 2026 (CC BY 4.0), one row per UAT and per Bucharest sector, with these columns:
   - `siruta`, `county_iso`, `siruta_jud`, `tip`, `name` (display, with comma-below diacritics), `name_folded`;
   - `lon`, `lat`, `point_source ∈ {wikidata, ancpi_pos}`.

   Take the points from a Wikidata `P843`/`P625` snapshot (CC0), validated inside the ANCPI UAT polygon (CC BY 4.0), with ANCPI point-on-surface as the fallback. Optionally keep a second table for village-level (`NIV=3`) SIRUTA codes and their points, for later. Refresh it when INS publishes a new SIRUTA semester. Diff the UAT list, because new communes are rare but do happen.
2. **Locate authorities through ANAF** in the same batch pass #6 already recommends. Parse `sdenumire_Localitate` into a UAT SIRUTA code (always), a village SIRUTA code (when present) and a sector. Store them on the entity with `located_at_source = anaf` and `located_on`.
3. **Fall back to SEAP `getCAEntityView`** for CUIs ANAF doesn't return: `(county, folded city)` → SIRUTA, with the postal code from `address` as the tiebreak. Log any disagreement between ANAF and SEAP as a data-quality note.
4. **Plot one aggregated mark per UAT** in the zoomed county: area by the lens metric (square-root scale), count in the tooltip, click to filter the hits table. Bucharest zooms to its six sectors. Unmatched authorities go in an "unplaced" row.
5. **Don't use OSM-derived data** in anything we publish (ODbL share-alike). Keep it as an internal cross-check at most.

## Open questions

- **Plot level: UAT only, or village when known?** UAT is complete and deterministic. ANAF gives a village for only about 37% of authorities, and in practice it is mostly the commune's seat village anyway. The recommendation is UAT for Release 1. Confirm.
- **Point vs polygon in the zoomed county.** With ANCPI polygons available under CC BY 4.0, the zoomed county could also be a UAT choropleth instead of (or under) the points. This connects to the open **County geometry** item in #2. ANCPI's county polygons (`Unitate_administrativa_judet`) are a candidate there too.
- **Supplier localities.** The same pipeline places suppliers (ANAF covers companies), for a later "where the money goes" view. Out of scope here.
- **Attribution wording** for ANCPI and INS (CC BY 4.0) joins the deferred legal-posture list in #2.

## Sources

- INS SIRUTA S1 2026: [data.gov.ro/dataset/siruta_s1-2026](https://data.gov.ro/dataset/siruta_s1-2026) (`siruta_s1_2026.csv`, `legenda-siruta.xml`; CC BY 4.0; read 2026-11-11).
- ANCPI, Unități administrativ-teritoriale: [unitati-administrativ-teritoriale-07-03-2024](https://data.gov.ro/dataset/unitati-administrativ-teritoriale-07-03-2024) (`Unitate_administrativa_UAT.zip`, DBF attributes and `.prj`) and [unitati-administrativ-teritoriale-api](https://data.gov.ro/dataset/unitati-administrativ-teritoriale-api) → [ArcGIS hub item 466b7199c19f4904831e14bc7f407af9_1](https://open-data-ancpi.hub.arcgis.com/datasets/466b7199c19f4904831e14bc7f407af9_1) (licence CC BY 4.0 in the item metadata). The feature service was queried with `outSR=4326&returnCentroid=true` on 2026-11-11.
- Wikidata Query Service, `SELECT ?item ?siruta ?coord WHERE { ?item wdt:P843 ?siruta . OPTIONAL { ?item wdt:P625 ?coord } }`, run 2026-11-11. Wikidata structured data is CC0 ([Wikidata:Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)).
- ANAF v9: [doc_WS_V9.txt](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt); 10 live requests (1,000 CUIs) on 2026-11-11.
- e-licitatie.ro: SPA bundle `app-pub?v=KEofz3XYcPN18N6ksFkq2x81KaIcnF96CAXAvkV4EBs1` (the `kSelectCity` → `ComboPub/searchCity` directive), `ComboPub/searchCity` (national total; Brașov `parentId=10`, 4 pages), `ComboPub/searchContractingAuthorities`, `Entity/getCAEntityView/{12617,8480,176476,36714}`, fetched 2026-11-11.
- ADR SEAP export: [achizitii-publice-2026](https://data.gov.ro/dataset/achizitii-publice-2026), "Achizitii directe TIII 2026" (authority CUIs for the sample).
- geoBoundaries API `gbOpen/ROU/ALL` (ADM2 source: ANCPI 2016, CC BY 4.0). geo-spatial.org [Romania vector datasets page](https://geo-spatial.org/vechi/download/romania-seturi-vectoriale) (site footer licence CC BY-SA 3.0). Geofabrik taginfo for Romania (`siruta:code` key counts). [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) §4.4 (share-alike for derivative databases).
