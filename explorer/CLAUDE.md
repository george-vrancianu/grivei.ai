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
