# Explorer main screen: depth, filter bar, loaders (design handoff)

This folder hands a redesign of the explorer's main screen to whoever builds it. It was drawn on 2026-11-14 against the running app at `/ro/explore/?hasSignals=true&county=RO-BV` and the code on `main` (GitHub `main` was at `6c43b8d` when the code was read; this branch is cut from the local `main` at `321c301`). The request, in the owner's words: the screen "looks too flat, it needs more depth and some minor organisation of information"; group the filters in a bar "with the Signal filter visible (it is the main thing of the app)"; and add loading behaviour. Colours stay. The font of the "Grivei.ai" wordmark in the header stays.

The design lives on a canvas (https://claude.ai/artifact/PxkdQkRfri16pzaVYipgob, private to the owner). Everything needed from it is copied here.

Nothing in this folder is production code, and nothing under `explorer/` was changed. It is a reference to build from.

## What is here

```
index.html        list of every snapshot, opens in a browser
screens/          9 static snapshots, one per state, every style inline
screenshots/      the 9 states as PNG at 1440 px, plus two at 390 px
canvas-source/    the canvas's own source: Main.dc.html (all states behind one `view` setting), four wrappers, canvas.json
README.md         how to preview
```

Fonts, the logo and the Brașov map image are not copied again: the snapshots load them from `../grivei-explorer-design/` (the first handoff, 2026-11-12).

## How to use it

- `screens/*.html` are the visual reference. Every size, spacing, colour and shadow can be read off the element's inline style. Do not copy the markup into the app: build each part as a UI library component, as `explorer/CLAUDE.md` and ADR 0006 require, and update `explorer/packages/ui/COMPONENTS.md` in the same change.
- `canvas-source/Main.dc.html` shows how each state was produced: the data arrays and the state logic are in the script at the bottom. Useful for stories. It is not React code.
- The snapshots are static: the switch, menus and tabs do not respond. Each state is its own file.
- Where this handoff and the first one (`../grivei-explorer-design/CLAUDE.md`) disagree about the main screen, this one is newer. Where a drawing disagrees with behaviour on `main` that this document does not mention, follow `main`.

## Snapshots

| Snapshot | What it shows |
|---|---|
| `explore-loaded.html` | The whole screen: Signals on, Brașov picked, Suppliers tab |
| `explore-loaded-authorities.html` | Authorities tab: long names wrap, columns hold |
| `explore-loaded-records.html` | Records tab: no column head, value label stays per row |
| `explore-signals-off.html` | Signals switch off, no filter set: the active row is gone |
| `explore-menu-open.html` | Value menu open, nothing picked |
| `explore-menu-year.html` | Award year menu: two columns, a range set, two active chips |
| `explore-menu-badges.html` | Badges menu (multi-select) with two picked, Channel set |
| `explore-loading.html` | First load: skeletons |
| `explore-refreshing.html` | Refetch after a filter or county change: previous results dimmed |

## 1. Depth

No new hues. Two existing values get a second name, and shadows are new.

| Surface | Value | Today in `tokens.json` as | Used for |
|---|---|---|---|
| ground | `#0D1014` | `color.bg` | the page; inset wells (search input, map, secondary figures, lens toggle track) |
| panel | `#141920` | `color.panel` | the five regions: search and filters, Total, map, results, and cards elsewhere |
| raised | `#1A212A` | `color.bgDot` | filter menu buttons, Signal chips, secondary buttons, row hover |
| overlay | `#1E2630` | `map.none` | open menus, tooltips, floating status chips |

Add `raised` and `overlay` to `color` in `tokens.json` under those names (same hex as `bgDot` and `map.none`, but a surface is a different use from a dot or a map class, so do not reuse the old names). Contrast on them:

| Text | on panel | on raised | on overlay | on `line` (hover, open menu button) |
|---|---|---|---|---|
| `text` | 14.8 | 13.6 | 12.8 | 11.2 |
| `text2` | 9.6 | 8.8 | 8.3 | 7.3 |
| `muted` | 7.1 | 6.5 | 6.1 | 5.3 |
| `accent` | 9.5 | 8.7 | 8.2 | 7.2 |

Shadows, as a new `shadow` group in `tokens.json`:

| Name | Value | Used for |
|---|---|---|
| `panel` | `inset 0 1px 0 rgba(255,255,255,.04), 0 1px 2px rgba(0,0,0,.4), 0 14px 32px -18px rgba(0,0,0,.8)` | every panel |
| `raised` | `inset 0 1px 0 rgba(255,255,255,.05), 0 1px 2px rgba(0,0,0,.5)` | raised controls |
| `overlay` | `inset 0 1px 0 rgba(255,255,255,.05), 0 4px 8px rgba(0,0,0,.4), 0 20px 44px -10px rgba(0,0,0,.85)` | menus, tooltips |
| `well` | `inset 0 2px 6px rgba(0,0,0,.55)` | inset wells |
| `header` | `0 10px 24px -18px rgba(0,0,0,.9)` | the sticky header |

Rules:

- A panel is `panel` fill, 1 px `line` border, the card radius (6) and the `panel` shadow. Put it in the theme (`MuiCard`, which `Panel` and other cards already use), so entity, Record and Coverage pages pick it up without per-page work.
- A strip inside a panel (the filter bar, the results column head) is `rgba(13,16,20,.35)` over the panel, between hairlines.
- A well is `bg` fill, 1 px border (`lineStrong` for the search input, `line` elsewhere) and the `well` shadow.
- The header becomes sticky: `rgba(13,16,20,.86)`, `backdrop-filter: blur(10px)`, the `header` shadow, `z-index` above menus. The logo disc gets `0 2px 8px rgba(0,0,0,.6)`. The wordmark is unchanged (`button` variant: IBM Plex Mono 600, 13 px).
- The footer takes the same translucent fill as the header.
- The selected state (`states.ts`: `line` fill plus an inset 1 px accent outline) is unchanged and is what marks a set filter menu.

## 2. Layout and organisation

Top to bottom, inside the same `maxWidth` and gutter as today:

1. Page title (`h1`), 24 px Space Grotesk. Today it is the `h4` variant inside the `search` slot; it moves above the panel.
2. **Search and filters panel.** The Source eyebrow as the input's label, the search input in a well, the hint line; then the filter bar as a strip; then the active-chips strip, only when a filter is set. On `main` a `SourcePicker` sits left of the search bar when there is more than one Source; it stays there, inside the panel. It is not drawn.
3. **Total panel.** The Total (the one amber number, with its ⓘ link) on the left. Each part of "what it left out" that is not zero is one inset figure on the right: label in mono 12 px `muted`, value in mono 18 px 600. The drawing has two (Records, framework ceilings not counted); the suspect-value part keeps its link, and the no-value part and the party-coverage line of `MainTotal` follow the same pattern. Figures wrap under the Total on narrow screens.
4. **Map panel** (left) and **results panel** (right), 20 px apart, two columns from the `md` breakpoint as today, stacked below it.

Map panel: a header strip with the lens toggle (its track is a well) on the left and the back link on the right when a county is zoomed; then the title, the map inside a well, the legend; then the data-through lines as a two-column definition list at the foot, behind a hairline.

Results panel:

- The tabs are the panel's header. Counts sit beside the tab names as small pills (`bg` fill, `line` border, radius 10, mono 12 px `muted`).
- Entity tabs get a column head strip: "Furnizor" or "Autoritate", "Semnale", "RON potrivit". It is `aria-hidden`; each row keeps its own accessible text.
- Entity rows: name and meta on the left (`flex: 1 1 240px`); on the right a fixed pair of columns, 136 px for the Signal chip (left-aligned in it, empty when the entity has none) and 150 px for the amount (right-aligned). The per-row "potrivit" caption goes away, replaced by the column head. Below 600 px the right pair wraps under the name.
- Record rows keep their value caption per row ("plafon, neadunat", "valoare atribuită"), since it varies, and have no column head.
- Row padding 12 px 20 px (14 px for Record rows), a hairline between rows, hover fill `raised`.
- "Arată toate cele n" is a centred secondary button (raised) at the panel's foot.

## 3. Filter bar

One row of controls (`role="group"`, the existing accessible name "Filtre"), 8 px apart, wrapping.

**Signals switch**, first. 44 px tall, radius 22. The amber ring (`SignalMark`, large), the existing label "Are Semnale" in 600, and a 34 × 20 px switch track.

- Off: `raised` fill, `signalLine` border, track `lineStrong`, knob `text2`.
- On: `rgba(242,179,61,.14)` fill, `accent` border, a 3 px halo `rgba(242,179,61,.12)`, track `accent`, knob `bg`. Text stays `text` (11.2 on the tint).
- It remains a toggle button with `aria-pressed`, as `ToggleChip` is today, so `hasSignals` keeps its two URL states (`true` or unset). A filter that says `hasSignals: false` still shows only in the active row ("Fără Semnale").
- A 1 px, 28 px tall `lineStrong` divider separates it from the menus.

**Five menus**, each a 44 px button, radius 22, `raised` fill, `lineStrong` border: the group name in `muted`, the value in `text2`, a chevron. Unset shows "Oricare". Set: the value in `text` and the selected state's inset accent outline. Open: `line` fill, `aria-expanded="true"`.

| Menu | Contents | Value shown when set |
|---|---|---|
| Anul atribuirii | two columns, "Din anul" and "Până în anul", each "Oricare" then the years; stays open after a pick | `din 2023`, `până în 2025`, `2023–2025`, or `2024` when both are equal |
| Canal | the two channels, one choice, click again to clear | the channel |
| Valoare | the seven buckets, one choice | the bucket |
| Procedură | the procedure facet values as SEAP publishes them; multi-select as today, stays open (the canvas draws it as one choice) | the name, or `n alese` |
| Insigne | the ten Record badges; multi-select, stays open | `1 aleasă`, `n alese` |
| Partid | only when offered or set, as today | the list |

The menu itself: `overlay` fill, `lineStrong` border, radius 6, the `overlay` shadow, 6 px padding, opens 8 px below its button, left-aligned to it. Items are 40 px tall, radius 4, label left, an amber check on the right when chosen, `text` when chosen and `text2` otherwise, hover fill `line`. Use MUI `Menu`/`MenuItem` (portalled, with its own focus handling and Escape) through new UI library wrappers; single-choice items are `menuitemradio`, multi-choice `menuitemcheckbox`. The Procedure menu with no values shows the existing sentence ("Nu există proceduri de ales.") as its only, disabled line.

**Active row**, a second strip, only when something is set: the label "Filtre active", one accent chip per filter with its remove button (as `ActiveChips` today, 30 px tall here), then "Șterge tot". The county picked on the map joins it as "Județ: Brașov"; removing it does what the map panel's back link does (`county` and `uat` unset). `clearChips` keeps its current meaning (the chips' own fields) unless the open question below is answered otherwise; the drawing clears the county too.

Height: the filter block goes from about 365 px to 56 px, plus 52 px for the active row when shown. At 1440 × 900 the Total is fully visible without scrolling.

Narrow screens: the canvas lets the controls wrap, one per row at 390 px, because its menus are inline. In the app, where menus are portalled, prefer a single row that scrolls sideways inside the strip, with the Signals switch first; the page itself must not scroll sideways.

## 4. Loading

Three behaviours replace the dashed "Se încarcă…" note.

**Any request in flight.** A 2 px indeterminate bar on the header's bottom edge (track `line`, bar `accent`), and at the right end of the results panel's header a `role="status"` line: a 14 px spinner and the existing "Se încarcă…". `LinearProgress` and `CircularProgress` atoms already exist. The search input's spinner shows only while a typed query is the change in flight (on `main` it follows every page query, chip clicks included).

**First load** (no previous answer): skeletons shaped like the content.

- Total: one block 360 × 40. Each inset figure: its real label, a block for the value.
- Tab names are real; each count is a 34 × 18 pill block.
- Eight rows: name block (30 to 52% wide, 16 px), meta block (50 to 64%, 12 px), a chip-shaped block 104 × 28, an amount block 124 × 16. Rows fade down the list (opacity falls 9% per row).
- Map: the topology is a static file and arrives long before the figures, so the areas are drawn in a neutral fill, pulsing (opacity .3 to .55, 1.8 s), with a floating status chip (overlay surface) in the middle. If the topology itself is not there yet, a block the size of the map.
- Skeleton blocks: a 1.6 s left-to-right shimmer between `raised` and `line`. A new `Skeleton` atom wrapping MUI's, themed once.

**Refetch** (a filter or the county changed and an answer is already on screen; a tab switch never refetches, since one `MainScreen` query carries all three tabs): keep showing the previous Total, map shading and rows at 60% opacity, with `aria-busy="true"` on each region, until the new answer lands; then swap. No skeletons. At 60% the dimmed primary text is still 6.0 on the panel and the Total 4.2 (large text); meta lines fall to 3.4, accepted for a stale region marked busy.

This needs a data change, not only styling: `useMainScreen` returns `{ status: "loading" }` whenever the variables change, which drops the previous answer. Give it a state that carries the last data while the next loads (the page already keeps `lastSources` and `partyOptions` this way, and `EntityPage.keepLast.test.tsx` covers the same idea on the entity page). `useZoomedCounty` and `useCoverageLens` want the same.

Errors keep `StateNote kind="error"`, now on the panel it belongs to; add a "Reîncearcă" / "Try again" action that re-runs the query.

All four animations stop under `prefers-reduced-motion: reduce`; the status text carries the meaning.

## Where it lands in the code

Paths are under `explorer/packages/`.

| Change | Files |
|---|---|
| `raised`, `overlay`, the `shadow` group | `ui/src/theme/tokens.json`, `tokens.ts`, `augmentation.ts`, `theme.ts` (`graf.shadow`), `theme.test.ts`, `Theme.stories.tsx` |
| Panel shadow, overlay tooltip and menu, raised outlined button, skeleton colours | `ui/src/theme/components.ts`: `MuiCard`, `MuiTooltip`, new `MuiMenu`/`MuiPopover`, `MuiMenuItem`, `MuiSkeleton`, `MuiButton` outlined |
| New wrappers | `ui/src/atoms/Skeleton`, `Menu`, `MenuItem` |
| Signals switch | `ui/src/domain/molecules/FilterChips/components/HasSignalsChip` (or a new `SignalsSwitch` beside the `ToggleChip` molecule, `ui/src/domain/molecules/ToggleChip`) |
| Filter menus | `ui/src/domain/molecules/FilterChips`: a new `FilterMenu` subcomponent; `YearRange`, `ChoiceChips`, `ProcedureChips`, `BadgeChips`, `PartyChips` render as its contents; `filterChips.utils.ts` gains the value-text helpers |
| County in the active row | `FilterChips` (`activeChips` in `filterChips.utils.ts` owns only the chips' fields today; the county needs a prop or a wider list) and `MainScreenPage.tsx` |
| Panels and slots | `ui/src/domain/templates/MainScreenLayout`: title slot, search and filters in one panel, `summary` as a panel, `results` in a panel, map header strip |
| Total with inset figures | `ui/src/domain/molecules/TotalFigure`, `app/src/components/MainTotal` |
| Results header, column head, row columns | `ui/src/domain/organisms/ResultTabs` (and `components/TabLabel`, `ResultTabPanel`), `molecules/EntityResultRow`, `EntityResultList`, `RecordResultRow` |
| Map header strip, well, data-through list | `app/src/components/MoneyLensSection`, `ZoomedCountySection`, `CoverageLensSection`, `MainDataThrough`; `ui/src/domain/organisms/BaseMap` for the neutral loading fill |
| Keep the last answer while refetching | `app/src/pages/MainScreenPage/hooks/useMainScreen.ts`, `useZoomedCounty.ts`, `useCoverageLens.ts`, `MainScreenPage.tsx` |
| Top progress bar, sticky header, footer fill | `app/src/components/AppShell`, `components/Header`, `components/Footer` |
| Copy | `app/src/copy/types.ts`, `en.ts`, `ro.ts`; the UI library's `FilterChipsCopy` and row copy types |

Tests that will change: the main screen tests click chips that move into menus (`MainScreenPage.chips`, `.signals`, `.total`, `.search`, `.party`, `.wired`), `EntityResultRow` and `ResultTabs` tests look for the per-row "potrivit", and `theme.test.ts` lists the tokens. `stories.test.tsx` renders every story in both languages, so each new state needs a story.

## Copy to add

Everything else in the drawings is existing catalogue copy.

| Key (suggested) | EN | RO |
|---|---|---|
| `filterChips.badges.menu` | Badges | Insigne |
| `filterChips.picked(n)` | `1 picked`, `n picked` | `1 aleasă`, `n alese` |
| `filterChips.year.range` | `from 2023`, `until 2025`, `2023–2025` | `din 2023`, `până în 2025`, `2023–2025` |
| `filterChips.active.county(area)` | `County: Brașov` | `Județ: Brașov` |
| entity list column head | Supplier, Authority, Signals, RON matched | Furnizor, Autoritate, Semnale, RON potrivit |
| `status.retry` | Try again | Reîncearcă |

The ONRC screen's filter chips already have a county chip (`County ${area}` / `Județul ${area}`); align the two wordings rather than keeping both.

## What the drawings do not decide

- The national map (no county picked), the Coverage lens and its compact grid, the Go-to card, the empty-result state and the typed-query state. They take the same panel, well and strip treatment; their content does not change.
- The ONRC screen, the entity pages, the Record page, the Coverage page and the methodology page. The theme-level changes (panel shadow, overlay surfaces, sticky header) reach them; nothing else was reviewed.
- Focus rings: unchanged (`focusRing` in `states.ts`), not drawn.
- The English UI. Snapshots are Romanian, as on `/ro/explore/`.

## Sample data: do not treat it as fact

Real, read from the local app on 2026-11-14 with `hasSignals=true&county=RO-BV`: the Total, the counts, the rows of all three tabs, the data-through dates and all Romanian copy.

Placeholders: the map shading (the Q3 2026 Brașov image from the first handoff, not this query's), and the two Procedure options (the two names that appear in the Record rows). Figures do not change when a filter is picked on the canvas.

## Seen on the local build, outside the design

- The main-screen GraphQL queries took 8.7 to 8.8 s on a cold load of this URL; a later tab switch answered in under a second. The loaders make that wait legible; they do not shorten it.
- `/geo/counties.topo.json` answered 404, so both lenses showed "Harta nu a putut fi încărcată." `/geo/` is gitignored and built locally; the build serving `localhost:8080` did not have it.

## Suggested order

Four changes, each shippable on its own:

1. Tokens and theme: `raised`, `overlay`, shadows, panel and overlay treatment, sticky header. Visual only.
2. Layout: the five panels, the Total with inset figures, results header, column head and row columns.
3. Filter bar: Signals switch, menus, county in the active row.
4. Loading: `Skeleton`, the skeleton states, keep-last in the hooks, the progress bar, the retry action.

## Decisions (grilled with the owner, 2026-11-15)

These settle the open questions and override the drawings where they differ.

- **County chip.** The county joins the active row as `Județ: X` / `County: X`; "Șterge tot" clears it too (`county` and `uat`), and `clearChips` widens to match. The ONRC screen's `Județul X` / `County X` takes the same wording.
- **Sticky header.** Sticky from `md` up only. Below `md` the header scrolls away (its nav wraps to two or three rows there) and the progress bar sits at the top of the viewport.
- **Filter bar.** Not pinned while scrolling. Below `md`, one row that scrolls sideways inside the strip, Signals switch first, with a fade on the right edge.
- **Column head.** Replaces the per-row "potrivit" from 600 px up. Below 600 px the head is hidden and the per-row caption returns.
- **Tab switch.** Instant: no dimming, no skeletons. Only a filter or county change refetches.
- **Dimmed contrast.** 3.4 for meta lines at 60% is accepted.
- **Amber.** Amber marks only Signals, set filters and the Total; the Total stays the only large amber figure. Drop the switch's 3 px halo. Write the rule into `explorer/CLAUDE.md`.
- **Loading indicators.** The header progress bar plus the results header's `role="status"` line. No fourth indicator: the search spinner shows only for a typed query.
- **Keep-last.** Main screen only (`useMainScreen`, `useZoomedCounty`, `useCoverageLens`). The entity page keeps hiding its old figure on a filter change, as `EntityPage.keepLast.test.tsx` asserts.
- **Retry.** One "Reîncearcă" / "Try again" per failed query, on the panel that owns it. `MainScreen` failing: the note and button in the results panel, an em dash for the figure in the Total panel. Map queries: a note in the map panel. Retry re-runs the query.
- **Other pages.** No design pass now. The theme-level changes reach them; the theme PR carries before/after screenshots of the entity, Record, Coverage, ONRC and methodology pages.
- **Order.** The four changes in "Suggested order"; loading can run beside the filter bar once the layout has landed.
- **Cold load.** The 8.7 s query is a separate performance issue, not this work.
