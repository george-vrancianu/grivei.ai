"""Geography Reference sources (#67): fetch, the checked-in UAT table, the TopoJSON.

`fetch.py` archives INS SIRUTA, ANCPI's UAT polygons and the Wikidata SIRUTA points unchanged and dated (`pipeline geo-fetch`);
`table.py` turns the archived snapshots into the checked-in UAT and village tables (`pipeline geo-table`); `topo.py` dissolves
the ANCPI polygons into county outlines and writes county and UAT TopoJSON (`pipeline geo-topojson`, and a step of rebuild).
Needs `shapely` (geometry), which the placement matching itself does not.
"""
