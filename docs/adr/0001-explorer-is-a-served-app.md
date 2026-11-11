# The explorer is a served app, not a static export

The public explorer is a React + MUI frontend talking to a GraphQL API over the Postgres graph, with D3 (or a similar library) for the map and graph views. This deliberately departs from the landing page's no-build, static approach: the main screen is a free-text search that filters a map of Romania and lists the top hits, and those queries run live against the graph rather than over precomputed files. The landing page in `site/` stays static and independent; the explorer lives beside it at `/explore/` and `/ro/explore/`.

## Considered Options

- **Static export** (precomputed JSON per county/authority, served next to `site/`): rejected because arbitrary search across national SEAP coverage does not precompute well.
- **Hybrid** (static overview pages + a small search API): rejected in favour of one stack for every Release rather than two.
