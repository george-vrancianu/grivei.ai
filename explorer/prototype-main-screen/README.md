# PROTOTYPE, throwaway: explorer main screen

Answers [Main screen: search bar, Romania map, hits table](https://github.com/george-vrancianu/grivei.ai/issues/7). Three structurally different variants on one route, switch with `?variant=A|B|C`, the pink bar, or ←/→.

- **A, Choropleth + drawer**: geographic choropleth by RON, toggle authority/supplier county, one flat table of records, detail in a side drawer.
- **B, Coverage tiles + master-detail**: search-first hero, tile-grid cartogram with one dot per Source, results tabbed Authorities / Suppliers / Records, detail replaces the right pane.
- **C, Flows + ranked suppliers**: bubbles and arcs for money crossing county lines, suppliers ranked by share of the query, rows expand inline.

```bash
npm install && npm run dev          # http://localhost:5173/?variant=A
# rebuild src/data.json and src/counties.json:
python3 -I scripts/build_data.py <geoBoundaries-ROU-ADM1_simplified.geojson> ../../watchdog/data/raw/*.json
```

Data: the Brașov and Timișoara SEAP batches, accepted direct purchases plus contracts; in memory, no backend. County shapes: [geoBoundaries](https://www.geoboundaries.org/) ROU ADM1 (CC BY 4.0), keyed on ISO 3166-2:RO.
