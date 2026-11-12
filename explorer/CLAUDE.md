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
