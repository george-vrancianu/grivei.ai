# Explorer frontend conventions

How the explorer's React frontend is built. The reasoning is in ADR 0006 (`docs/adr/0006-app-code-uses-a-ui-library-wrapping-mui.md`); vocabulary in `GLOSSARY.md`.

## The UI library is the only door to MUI

- The UI library is the only code that imports `@mui/*`. App code imports every component from the UI library; a lint rule enforces it.
- A wrapped component accepts and passes through the props of the MUI component it wraps (type its props as MUI's props, extended), so MUI's whole API stays available: props, `sx`, theme tokens.
- The wrapper adds what every call site would otherwise repeat: defaults, accessibility, theme. Keep it thin.
- Need a component the UI library lacks? Add the wrapper to the UI library first, then use it.
- The MUI theme lives in the UI library.

## Atomic levels

Place each component at the lowest level that fits:

| Level | What it is | Examples |
| --- | --- | --- |
| **Atom** | One wrapped MUI component, or one indivisible domain display | Button, TextField, Chip; money amount, badge chip, entity link |
| **Molecule** | A few atoms doing one job together | search input, filter chips bar, Total with its ⓘ link |
| **Organism** | A self-contained region of a screen | result tabs, Money lens map, Signal card, Coverage grid |
| **Template** | A screen's layout, with slots for organisms | main screen layout, entity page layout |
| **Page** | A template filled with data from the API | the main screen at `/explore/` |

Components up to templates are **presentational**: they take data through props, typed from the generated GraphQL contract types, and never fetch. Only pages run queries. That is what lets every component be built and mocked on its own in the workbench, before its backend exists.

Domain displays (typed from `@grivei/contract`) live in the UI library under `packages/ui/src/domain/`: `atoms/`, `molecules/`, `organisms/` and `templates/`, each in the one-folder-per-component shape below. They take every user-facing string through a typed `copy` prop (the app passes its catalogue); `domain/samples/` holds story-only sample copy and fixture picks.

## One folder per component

```
SearchInput/
  index.ts                 # the public export, nothing else
  SearchInput.tsx
  SearchInput.stories.tsx  # every state, fed by contract mock fixtures
  SearchInput.test.tsx
  searchInput.utils.ts     # pure helpers, when there are any
  hooks/                   # one hook per file, when there are any
    useDebouncedQuery.ts
  components/              # subcomponents, each in this same shape
    ClearButton/
```

Create `hooks/`, `components/` and the utils file only when they have something in them. Import a component only through its `index.ts`.

## Clean components

- **Split relentlessly.** When a component renders more than one distinct part, each part becomes a subcomponent under `components/`. A component file should read as a short composition of named parts.
- **Reuse before creating.** Search the UI library and the existing levels before writing a component. When a second component needs a subcomponent, promote it to its level in the shared tree.
- **Render in the component, think elsewhere:** state and effects go to hooks in `hooks/`, pure transforms to the utils file.
- **Every user-facing string comes from the bilingual copy catalogue** (EN default, RO at `/ro/`). Romanian source data (institution names, procedures, titles) is shown as published, in both languages.
- **Every component has stories** covering its states (loading, empty, typical, extreme values, both languages), and tests on what a reader sees and does.

## The workbench (Storybook)

`npm run storybook` (local, from `explorer/`) serves every story of `packages/ui` and, once it exists, `packages/app` (`.storybook/main.ts` globs `packages/{ui,app}/src/**/*.stories.{ts,tsx}`). `npm run storybook:build` makes the static build CI runs (`storybook-static/`, gitignored).

- **Language switch.** The toolbar has an EN/RO `locale` global; a decorator passes it to the UI library's `UiProvider`, so MUI's own strings follow it. Text in a story comes from per-locale samples: `pick(globals["locale"], { en: "...", ro: "..." })` from `@grivei/ui/workbench`, used in `render: (args, { globals }) => ...`. Write Romanian samples with diacritics. In the app, copy comes from the catalogue instead.
- **Fixtures.** Stories import mock data from `@grivei/contract/fixtures` (e.g. `fixtures.FullResultsSuppliers`); see `atoms/Table/Table.stories.tsx`. Pass rows through props like the real component will get them.
- **Every story is tested.** `packages/ui/src/workbench/stories.test.tsx` renders every story file under `packages/ui/src` in both locales through portable stories (jsdom); app stories join by widening its glob.
- **Lint.** `npm run lint` (part of `check`) rejects `@mui/*` and `@emotion/*` imports outside `packages/ui`; `tooling/lint-boundary.test.ts` proves it.

## The base map (`domain/organisms/BaseMap`)

The shared map every lens builds on (Money, zoomed county, Coverage, Flow). It has no lens logic: a lens passes numbers per area and decides what they mean.

- `topology` (TopoJSON, built at load time, never GraphQL) with features carrying properties `{ code, name }`: `code` is an ISO 3166-2:RO county code or a SIRUTA; `name` is shown as published. Other shapes: pass `readArea`. `object` picks the TopoJSON object (first by default).
- `values`: `Record<code, number | null>`. Missing, null or non-finite = grey (`NO_DATA_COLOR`, always distinct from the scale). `scale`: `"linear"` (spans zero to the maximum, so colour tracks absolute size; `domain` fixes the span) or `"log"` (zeros are not log-scaled: they take the lowest colour and the legend's low end reads "up to ..."). `formatValue(value, code?)` formats tooltip, area names and legend ends; `code` is the area, so the Money lens looks up the exact Bani string by code and calls `formatMoney` on that, never on the number (on legend ends `code` is an area holding that value, if any).
- `onSelect(code)` on click, Enter or Space (areas are focusable buttons); without it areas are focusable images, not buttons. `selected` highlights one. `tiles` is a slot beside the map for off-map tiles. `renderTooltip(area)` overrides the tooltip content. `copy: BaseMapCopy` carries every string (`mapLabel`, `legendTitle`, `noData`, `areaLabel`, `atMost`). `width`/`height` set the SVG's coordinate space (it scales to its container); `projection` is `"conic"` (default) or `"mercator"`.
- Extension points for lenses (the map itself stays lens-free): `colorOf(code)` overrides the numeric fill (a categorical colour; null = grey), `describeArea({code,name,value})` replaces the value text in the accessible name and default tooltip (a category name; null = the formatted value), `legend` replaces the numeric legend (a categorical one that owns its no-data swatch), `renderOverlay({ centroids, project, width, height })` draws marks (a circle per UAT, a mark per Source) inside the SVG over the areas, pointer events off. Stories: `CategoricalFill`, `OverlayCircles`.
- Pure helpers (`createColorScale`, `featuresOf`) are exported for lenses that need the same colours elsewhere.
- Story and test outlines are invented (`domain/samples/geo/`, built by `packages/ui/scripts/build-geo-fixtures.ts`).

## The Money lens map (`domain/organisms/MoneyLensMap`)

`MoneyLensMap` is the county-level Money lens on the base map. Presentational: `map: MoneyMap`, `topology`, `selected?: MapArea`, `onSelect(area)`, `side` + `onSideChange(side)` (the URL's `countySide` is the only source of the side), `locale`, `copy: MoneyLensMapCopy` (`map`, `side`, `tiles`). A county click emits its code; a tile click emits `NATIONAL`, `UNPLACED` or `UNKNOWN_SUPPLIER_COUNTY`. Counties are coloured on a linear scale from the awarded bani (colour only; every shown amount is the exact Bani string through `formatMoney`). Reusable pieces: `MapTile` (a toggle-button tile), `SideToggle`, `OffMapTiles` (National always; Unplaced and unknown-supplier-county only when the map has them), `moneyMapValues`, `totalsByCounty`, `moneyValueFormatter` (the base map's `formatValue`: the exact Bani string by code, never the number; use it for every money lens).

## The zoomed county map (`domain/organisms/ZoomedCountyMap`)

`ZoomedCountyMap` is the Money lens zoomed into one county (authority side), on the base map. Presentational: `map: UatMap` (`seap.search.uatMap(county:)`), `topology` (the county's UAT outlines with properties `{ code: SIRUTA, name }`; Bucharest's are its six sectors, same component), `selected?: Siruta`, `onSelect(siruta)` (click, Enter or Space: the `RecordFilter.uat` value), `showAuthorityCircles?` (off by default), `locale`, `copy: ZoomedCountyMapCopy` (`map`, `figures`, `authorities`, `circleKey`, `unknownUat`). UATs are coloured by `total.awarded` on a log scale (colour only; every shown amount is the exact Bani string through `formatMoney`). A UAT of the topology that `map.uats` lacks is grey and its text is `copy.map.noData`, which must say no authority bought anything, not "no data". Circles (`AuthorityCircles`, via `renderOverlay`) are sized by `entities` and decorative (`aria-hidden`); the tooltip adds the authority count only when they are on. `map.unknownUat` (authorities with a known county but no UAT) shows as a non-interactive row (`UnknownUatRow`, in the `tiles` slot) when non-null: the contract has no filter value for it. Reuses the Money lens's `moneyMapValues`, `moneyValueFormatter`, `totalsByCounty` (a UAT row has a county row's shape) and `AreaFigures`.

## The Coverage lens map (`domain/organisms/CoverageLensMap`)

`CoverageLensMap` is the Coverage lens at county level, on the base map. Presentational: `lens: CoverageLens` (the `CoverageLens` query: `sources` and `coverage`), `topology`, `selected?: MapArea`, `onSelect(area)` (a county code, `NATIONAL` or `UNPLACED`), `locale`, `copy: CoverageLensMapCopy` (`map`, `status`, `noStatus`, `marks`, `tooltip`, `tiles`). Counties are filled by `status` through the base map's `colorOf` (a category, never a ratio: `values` stays empty, so nothing encodes N or M); a county without a row gets its own pale sand `NO_STATUS_COLOR` (visible against the white outlines; never grey) and says `copy.noStatus`, which must not read as "not harvested" or "bought nothing". `NOT_HARVESTED` shares `PLANNED_MARK_COLOR` (grey = not harvested, as in the glossary), so the planned Sources' marks and a not-harvested county match. Each county's accessible name is "<Name>: <status>. <N of M sentence>". `COVERAGE_COLORS` are colour-blind-safe and the status words (legend, accessible names, tooltip) carry the meaning too. `SourceMarks` (via `renderOverlay`) draws one square per `Source` on every county: the coverage Source (`COVERAGE_SOURCE_ID`, `SEAP`) filled with the county's status colour, any other harvested Source filled `OTHER_HARVESTED_MARK_COLOR` (neutral dark, `data-state="harvested"`), each planned Source (`harvested: false`) an empty grey dashed square titled "<name>: not harvested". `CoverageLegend` explains statuses and marks. The tooltip (`CoverageTooltip`, built on `CoverageFigures`) gives the status, "N of M public entities have SEAP records since <date>, plus K other contracting authorities" (clause dropped when K = 0; `<date>` = `coverage.window.from`, else the harvest's first year, 2021) and the note that an entity without records may simply have bought nothing. `CoverageTiles` (takes `coverage`, so the lens is read once): National (its status and the same sentence) and Unplaced (authority count, Total via `AreaFigures`; only when there are some); no unknown-supplier-county tile. Utils also export `MARK_OUTLINE`, `MARK_FILL` (shared by marks and legend swatches). Reuses the Money lens's `MapTile`, `AreaFigures`, `OFF_MAP_TILE_AREAS`.

## The Flow lens map (`domain/organisms/FlowLensMap`)

`FlowLensMap` is the Flow lens for an entity page's Relationships tab, on the base map: where a supplier's money comes from (authority counties) or where an authority's goes (supplier counties). Presentational: `flow: MoneyMap` (the entity's `flow`; its `side` must be `flowSide(role)`, `AUTHORITY` for a supplier and `SUPPLIER` for an authority, else it throws), `role: "authority" | "supplier"` (the page's entity: it sets the arc direction), `home?: string | null` (the entity's own county code; null, absent or without an outline = bubbles only, no arcs, and the caption says so), `topology`, `selected?: MapArea`, `onSelect(area)` (a county code or an off-map area), `locale`, `copy: FlowLensMapCopy` (`map`, `tiles`, `legend`, `caption`, `tooltip`, `empty`; direction strings are `ByRole`). It draws the Money lens's Totals, not a recomputation: a bubble per county with money (`bubbleRadius`: area proportional to `total.awarded`, sqrt radius, zero at zero, floor `MIN_BUBBLE_RADIUS`) and one arc between the home county and every other county with money (`arcWidth`: linear in money, floor `MIN_ARC_WIDTH`, scaled to the largest non-home county), an arrowhead at the receiving end (into home for a supplier, out of home for an authority; `data-from`/`data-to` on each arc). The home county has a bubble and no arc to itself; local-only (every county that holds money is the home county, and there is at least one) is one bubble, no arcs, and a caption that says so for the money placed in a county only (tiles are covered by the off-map sentence); no county money at all never reads as local-only. A county at zero claims no direction in its tooltip. Geometry comes from `flowMarks` (pure, BigInt-exact ratios; `Number` only for geometry, display goes through `formatMoney`/`AreaFigures`). The home county is filled `HOME_COLOR`, other counties with money `OTHER_COLOR`, the rest grey. Each county's accessible name is "<Name>: <exact money>, <N Records>" (home county adds `tooltip.homeCounty`; a county without a row says `copy.map.noData`); the marks are `aria-hidden`. Subcomponents: `FlowBubbles`, `FlowArcs` (overlay), `FlowLegend` (bubble size, arc width, arrow direction per role, home and other swatches; arc/arrow/home entries only with a home county), `FlowTooltip` (name, `AreaFigures`, direction), `FlowCaption`. Tiles are the Money lens's `OffMapTiles` (National, Unplaced on the supplier page, unknown supplier county on the authority page, from data nullability). An empty flow (no county, nothing on any tile) renders `copy.empty` instead of a map. Sample data: `samples/flowMaps.ts`; sample copy `sampleCopy.flowLensMap(locale)`.

## The Relationships tab (`domain/organisms/RelationshipsTab`)

`RelationshipsTab` is the content of an entity page's Relationships tab, controlled: `entity` (graph centre), `role`, `counterparties` (`EntityRelationships`' role `counterparties`), `timeline` (overall months) and `selectedTimeline` (the picked counterparty's months, drawn over the overall bars on one scale; two `EntityRelationships` queries, with and without `counterparty`), `selected` (an Entity key, kept by the caller, ready for the URL) with `onSelect`, `sidePanel: CounterpartyRecordsData` (`total` and `records` of `EntityRecords` with the counterparty in the filter; a pick beyond the graph's rows is named from those Records' `authority` or winners, none is invented while they load, and the timeline highlight needs no name), `sidePanelLoading`, `sidePanelPaging`, `entityHref` (a counterparty gets the other role), `recordHref`, `flowToggle` (slot), `locale`, `copy: RelationshipsTabCopy`. Size = money, colour = the channel that carries more, dashed edge = some Record with that counterparty had several winners (`wonTogether`; co-winners are the Overview's consortia, not nodes), orange ring = Signals. A node with no Entity (natural person, ADR 0003; or the unidentified group) is a label only and not pickable; the second is never called a person. Keyboard focus is a separate dashed ring, apart from the selection's stroke. Sample data: `samples/fixtureData.ts`; sample copy `sampleCopy.relationshipsTab(locale)`.

## The Record page (`domain/organisms/RecordDetail`)

`RecordDetail` is the content of `/explore/record/<code>`. Presentational: `record: RecordPageData` (`RecordPage`'s `seap.record`), `entityHref(entity, role)`, `recordHref(code)`, `methodologyHref`, `onNavigate?`, `locale`, `copy: RecordDetailCopy` (the app's `recordPage` plus the catalogue's `results.recordRow`). Subcomponents: `RecordHeading`, `ValueFacts` (published and counted value, and why a counted value is empty), `PartiesSection` (authority, winners, consortium shares labelled as a convention), `SuspectNote`, `FrameworkSection`, `BadgeExplanations` (every badge with its explanation as visible text: a tooltip needs hover), `SignalsSection` (a minimal neutral entry until the Signal card exists), `ProvenanceSection` (verbatim `via`, "Check in SEAP" or a sentence when there is no URL).

## The Overview tab (`domain/organisms/EntityOverview`)

`EntityOverview` is the content of an entity page's Overview tab. Presentational: `overview: EntityOverviewData` (the `entity.seap.role` of `EntityOverview`, every figure follows the filter sent), `aliases` (`entity.aliases`), `role`, `entityHref(entity, role)`, `recordHref`, `methodologyHref`, `suspectHref`, `locale`, `copy: EntityOverviewCopy`, and `signals?: ReactNode`, the slot the Signal card organism fills under the Signals heading (until then the heading shows the count and nothing under it). Subcomponents: `HeadlineNumbers` (total, counterparties with the top share, direct-purchase share, Signals; the direct-purchase share reads "–" when no money was awarded, never "0%"), `Counterparties` (a bar per share of the total is decoration, `aria-hidden`; the percentage is text; natural persons are unnamed and unlinked), `ProcedureTypes` (as SEAP publishes them), `Consortia` (the equal share is a convention, said so), `FrameworkLine` (ceilings are not in the total), `LargestRecords` (counted Records only, filtered at render), `AppearsInSeapAs`. MUI's progress bar comes through `atoms/LinearProgress`. Sample data: `samples/fixtureData.ts`; sample copy `sampleCopy.entityOverview(locale)`.

## The Signal card (`domain/organisms/SignalCard`, `domain/molecules/SignalBadge`)

`SignalCard` states one Signal in four parts: the rule's neutral label, one sentence with the Signal's numbers filled in, one line on the lawful explanations, and what it consists of (date of the latest Record, Record count, the authority and up to five suppliers with "and N more", the rest counted). Links: `reproduceHref` (the entity's Records tab with the Signal's filter), `methodologyHref`, and `seapHref`, which is `null` when the Signal has more than one Record: the card then says to check each Record in SEAP. Props: `signal: SignalData` (`SignalFields`), `entityHref`, `onNavigate?`, `locale`, `copy: SignalCardCopy`. A Signal is never scored or ranked; the sentence's rule is the `numbers` type, so sentence and numbers cannot disagree. `SignalBadge` is the compact form for Records rows (label and date). Wording lives in the app's `signalCard` copy (`rules.<RULE>`: label, sentence, lawful); `utils/signalWording.ts` fills the sentences and holds `forbiddenWords`, the guard the app's `signals/signalCopy.test.ts` runs over every string in both languages (no suspect, fraud, irregular, illegal, risk, nor the Romanian words). Romanian counts take "de" from 20. App helpers in `app/src/signals/`: `reproduceHref` and `signalLinks` (methodology anchor `#signal-<rule>`, the SEAP link). Not wired into pages yet (#89).

## The search bar (`domain/molecules/SearchBar`)

`SearchBar` is the free-text search box. Presentational: it emits the query, the page fetches. Props: `value` (the committed query, the URL's `q`), `onQueryChange(query)`, `loading?` (a small spinner, `aria-busy` on the `role="search"` wrapper), `debounceMs?` (250), `minLength?` (2), `copy: SearchBarCopy` (`label`, `placeholder`, `clear`, `loading`, `minLengthHint`). It keeps the typed text locally and, once typing pauses, emits the trimmed query when it has at least `minLength` characters, or "" when the box is empty (so the empty search shows the national state). One character emits nothing and shows `minLengthHint` quietly. It never emits the query it last emitted (or was given). The clear button (and Escape) empties the box, emits "" at once and keeps focus. A `value` it did not emit itself (Back, a removed chip, a link) replaces the text and cancels a pending emission. The English placeholder says the data is in Romanian, with the example "deszăpezire". Logic lives in `hooks/useDebouncedQuery` and `searchBar.utils.ts` (`queryFor`). Tests drive it with vitest fake timers and `userEvent.setup({ advanceTimers })`; Testing Library only drains fake timers when it finds a `jest` global, so stub `jest.advanceTimersByTime` (see `SearchBar.test.tsx`).

In the app: pages pass `onQueryChange={(q) => setFilter({ q: q || undefined })}` (history is replaced, never pushed) and `loading={state.status === "loading"}`. Aborting a superseded request is the page hook's job: `useMainScreen` and `useFullResults` pass an `AbortController` signal to the client, abort it when the variables change or the page unmounts, and ignore an aborted answer.
