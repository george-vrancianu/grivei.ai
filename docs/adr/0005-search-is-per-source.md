# Search is per Source in the backend; combined views are composed in the frontend

Each explorable Source has its own search surface: its own Postgres schema, denormalised search table and `pg_search` index, its own filter, and its own GraphQL namespace (`seap { search }`, later `onrc { search }`). There is no shared index across Sources and no score that ranks one Source's records against another's. The explorer searches one Source at a time, chosen with a Source picker beside the search bar. A view that shows several Sources is composed in the frontend from parallel per-Source queries, grouped by Source, each in its own order ([decision](https://github.com/george-vrancianu/grivei.ai/issues/34)).

The Sources have nothing to rank against each other. SEAP ranks by matched RON, while ONRC, ANI and court records carry no money. Each Source places records on the map its own way (through the contracting authority, the registered seat, the court seat), and its filter chips mean nothing for the others. A blended list would need an invented cross-Source score, against "Signals are counted, never scored". Sources meet on the entity page, keyed by entity, not in search results.

## Considered Options

- **One unified index over every Source's records, one blended result list and map**: rejected for the reasons above, and because every new Source would reshape a shared index and its ranking.
- **Interleaving per-Source results in the frontend**: rejected, because ordering a contract against a company filing is still a cross-Source score, just computed in the browser.

## Consequences

- Every Source's search must accept the same plain-text query and return a match count and its top results, so the frontend can compose a combined view. The Source picker shows match counts per Source as the first such view.
- Each Source declares which lenses it supports. Coverage is mandatory, while Money applies only to Sources with a money measure.
- Each Source's schema joins the shared core (entities, placement, provenance, Signals, coverage) only through entity keys, so a rebuild can reload one Source without touching the others.
