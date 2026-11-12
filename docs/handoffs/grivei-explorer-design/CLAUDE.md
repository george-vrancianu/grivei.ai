# Grivei Explorer design handoff: A · Graf

This folder hands the design of the Release 1 explorer to whoever builds the frontend. The spec is issue #37 (`george-vrancianu/grivei.ai`). The direction, **A · Graf**, was chosen on 2026-11-12: dark, dot grid, amber accent, the same look as the landing page in `site/`. The design itself lives on a canvas (https://claude.ai/artifact/5FwtuH7oQv1X1pEPFSHKYF, private to the owner); everything needed from it is copied here.

Nothing in this folder is production code. It is a reference to build from.

## What is here

```
index.html            list of every screen, opens in a browser
screens/              13 static snapshots, one per screen state
screenshots/          the same 13 as PNG at 1440 px, plus two at 390 px
tokens/               tokens.json, tokens.css, mui-theme.draft.ts
assets/               logo and the map and graph images used in the screens
fonts/                the font files from site/fonts, fonts.css, licences
canvas-source/        the design's own source files (.dc.html)
README.md             how to preview
```

## How to use it

- `screens/*.html` are the visual reference. Every style is inline, so exact sizes, spacing and colours can be read off any element. Do not copy the markup into the app: build each part as a UI library component, as `explorer/CLAUDE.md` and ADR 0006 require.
- `tokens/` feeds the MUI theme in the UI library (#40). `mui-theme.draft.ts` type-checks on its own but was never compiled against `@mui/material`.
- `canvas-source/` shows how each state was produced: the data arrays and the small state logic at the bottom of each file. It is useful when writing stories. It is not React code for the app. `Explore.dc.html` holds all five main-screen states behind one `view` setting, and `Entity.dc.html` holds the three tabs behind one `tab` setting.
- The snapshots are static. Tabs and toggles do not switch; each state is its own file. Header and row links do move between the files.

## Screens, routes and issues

Query-string names below are illustrative. The URL codec belongs to #42.

| Snapshot | Route | What it shows | Issues |
|---|---|---|---|
| `explore-query.html` | `/explore/?q=strazi` | Typed query, Money lens, Suppliers tab | #53 #44 #45 #46 #48 #49 #43, wired in #83 |
| `explore-query-records.html` | same, Records tab | Matched field, highlight, badges, Signal chip | #46 #69 #59 |
| `explore-empty.html` | `/explore/` with a date range | No query, placeholder text, national totals | #44 #46 #70 |
| `explore-goto.html` | `/explore/?q=17296459` | Pinned Go-to card, one county lit | #46 #69 |
| `explore-coverage.html` | main screen, Coverage lens | Status per county, one mark per Source | #51, wired in #90 |
| `explore-zoom.html` | main screen, county picked | Locality choropleth, county chip | #50 #71, wired in #84 |
| `results.html` | `/explore/search` | Paged Records, order control, citable URL | #47 |
| `entity-overview.html` | `/explore/authority/4384206` | Headline numbers, Signal cards, counterparties, procedures, consortia, frameworks | #54 #56 #59, wired in #86 |
| `entity-records.html` | `…/records?signal=no-publication` | A Signal's reproducing filter, totals that follow it | #57, wired in #87 |
| `entity-relationships.html` | `…/relationships` | Counterparty graph, timeline, picked counterparty, Flow lens | #58 #52, wired in #88 |
| `record.html` | `/explore/record/CAN1145000/<contract-no>` (ADR 0007) | Framework ceiling won by a consortium | #55 #72, wired in #85 |
| `coverage.html` | `/explore/coverage` | Sources, quarter by kind grid, gap reasons, data-through | #60 #79 #80, wired in #90 |
| `about-the-numbers.html` | methodology page | Counting rule and the four Signal rules | #61 |

The header (logo, explore / coverage / about the numbers, EN / RO) is the app shell of #42.

## Tokens

`tokens/tokens.json` is the source; `tokens.css` is generated from it. The first ten colours and the three font stacks have the same names and values as `:root` in `site/styles.css`.

| Token | Value | Contrast |
|---|---|---|
| `bg` | `#0D1014`, with a dot grid of `#1A212A` every 24 px | |
| `panel` | `#141920` | |
| `line` / `lineStrong` | `#27303B` / `#3A4552` | |
| `text` | `#E8EBEF` | 15.9 on bg, 14.8 on panel |
| `text2` | `#B8C0CA` | 10.4 on bg, 9.6 on panel |
| `muted` | `#9BA5B1` | 7.6 on bg, 7.1 on panel |
| `accent` | `#F2B33D` | 10.3 on bg; `#0D1014` on accent is 10.3 |
| `idle` | `#6B7683` | 4.1 on bg: marks and dashed lines only, never text |

Type: Space Grotesk 600 for titles and big numbers, Inter for text, IBM Plex Mono for labels, codes and every money amount (tabular figures). Radii: 3 px chips, 4 px controls, 6 px cards, 20 px filter pills. Control heights: 56 search, 48 tabs, 44 primary action, 40 filter chips, 36 toggles, 32 badge chips.

## Components, by the levels in `explorer/CLAUDE.md`

| Level | Components in the design |
|---|---|
| Atom | money amount, approximate count (`≈`), badge chip, Signal chip, channel tag, entity link, data-through date, ⓘ link, filter chip, toggle segment |
| Molecule | search input with hint line, filter chips bar, Total (big number, ⓘ, what was left out), map legend, map tooltip, off-map tile, tab bar with counts, entity row, Record row, pager, cite-this-view line |
| Organism | result tabs with Go-to card, Money lens map with tiles, Coverage lens map, zoomed county map, Flow lens map, Signal card, counterparty list with concentration bars, procedure bars, consortia list, framework line, Records table, counterparty graph, monthly timeline, Coverage grid, Sources row |
| Template | main screen (#53), entity page (#54), Record page, Coverage page, methodology page |

## Conventions the design relies on

- **Money.** `30.83 bn RON`, `503.74M RON`, `249,000 RON`: two decimals for bn and M, thousands separators below a million. A framework ceiling shows its value with the note "ceiling, not summed".
- **Totals.** The headline total is the only amber number. Beside it sit the ⓘ link, the Record count, the suspect-value Records left out (a link to them), the no-value count and the framework ceilings.
- **Search highlight.** `<mark>` with an accent fill and dark text, on the matched part only. Each Record row names the matched field; when the match is not in the title the row quotes the field (CPV, CUI).
- **Signals.** An amber ring and a label, never red, never a score. A Signal card has four parts: label, one sentence with the numbers, one line on lawful explanations, then links (the Records, Check in SEAP, how it is counted). The wording never uses suspect, fraud, irregular, illegal or risk. "Suspect value" is a caveat badge, not a Signal.
- **Maps.** Five classes of one hue plus a neutral "none". Areas are separated by a stroke in the panel colour. The hovered area gets a light outline and a tooltip centred above it. Legend under the map, off-map tiles under the legend. County level is drawn as classed absolute value; the zoomed county is on a log scale.
- **Coverage.** Status is never colour alone: known gaps are striped, grid cells carry a glyph (`c`, `?`, `…`, `–`) and an accessible label. Later Sources appear as hollow marks.
- **Narrow screens.** Columns stack; wide tables and the Coverage grid scroll inside their own box. No page scrolls sideways at 390 px.

## What the drawings do not decide

- Focus, hover, pressed, loading, error and no-result states. None are drawn.
- Badge chips are 32 px tall, below a 44 px touch target.
- The Romanian UI. All copy is English and belongs in the bilingual catalogue (#42, #59).
- A supplier's entity page (ANAF status badge, several SEAP spellings, name-only, identity curated); Record pages for suspect value, no value, natural person, CUI mismatch and crawled provisional; Bucharest by sector; the unknown-locality row of a zoomed county.

## Sample data: do not treat it as fact

Real, from the repo branch `prototype/county-geometry`:

- `explore-empty.html` and `explore-zoom.html` use `countygeo.json`: the Q3 2026 bulk exports, authority side only. 96.55 bn RON in 549,951 Records from 13,298 authorities, of which 41.95 bn from 214 authorities the prototype's name rule marks as national. That rule is not the real one.
- Supplier and Record rows, `explore-goto.html`, the entity pages and `record.html` use `data.json`: the Brașov and Timișoara batches. Framework ceilings are left out of sums by a title match ("acord-cadru" without "subsecvent", plus the two CAN1145000 lots), which is an approximation. Splitting sets use a 30-day window and the first three CPV digits as the group.

Placeholders:

- Everything in the typed-query state except supplier and Record rows: map shading, totals, tab counts, tiles, and the authority rows other than Municipiul Brașov.
- Coverage statuses per county, data-through dates, and anything in [brackets].
- The Suppliers and Records tabs of the Q3 2026 states show prototype rows, not national ones.

Fixtures for stories and tests come from #39 and from Seam 1 of the spec, not from these screens.

## Third-party material

- Fonts: Inter, Space Grotesk, IBM Plex Mono, SIL Open Font License. Files and licences are copied from `site/fonts`.
- County outlines in the map images: geoBoundaries ROU ADM1, CC BY 4.0, as in the repo prototype. Brașov localities: the ANCPI polygons in `countygeo.json`. The spec's final outlines are dissolved from ANCPI polygons; the images here are design assets, not production geometry.
- The logo is the project's own: the profile Doberman holding a dossier. `logo-disc.svg` (on a paper-coloured disc) is for dark grounds, `logo-mark.svg` for light ones.

## Decided after the handoff (2026-11-12)

A design review settled these. Where a decision contradicts a drawing, the decision wins. Terms are in `GLOSSARY.md`; Record URLs are in ADR 0007.

**Records and URLs**

- A contract's URL is its award notice code plus a slug of its contract number: `/explore/record/CAN1172752/<contract-no>` (ADR 0007). `record.html`'s `/record/CAN1145000` is now the notice's contract list. Every Record row shows the contract number beside the code.
- An award notice is not a Record. It is where a contract comes from.
- The Go-to card also fires on an exact public code: a DA or DAN opens the Record, a notice opens its contract list, or the contract itself when there is only one.
- The methodology page is `/explore/about-the-numbers` and `/ro/explore/about-the-numbers`. Slugs stay English under both prefixes.

**Main screen**

- The eyebrow "search SEAP · national · 2021 onward" is the Source picker in a read-only, one-option state. No picker is drawn for Release 1.
- The award-date chip defaults to "any", not "2021 – 2026". Records published from 2021 but awarded earlier are counted. "2021 onward" refers to publication.
- The ten caveat badges fold behind one "caveat badges" chip that shows how many are active. It stays open while any badge is active. Inside the fold, the chips are 44 px tall.
- A Signal chip on a Record row opens that Signal's reproducing filter, as drawn. An entity row's "n Signals" chip opens that entity's Overview at its Signals section.
- Map class breaks are recomputed per result set: doubling steps from a rounded value, so the top class holds the maximum. The Flow lens uses the same rule. The zoomed county keeps a log scale with powers-of-ten breaks.
- **Supplier side of the map:**
  - two tiles, "county unknown" and "natural persons", both clickable filters; National and Unplaced appear only on the authority side;
  - after a supplier-county click, the headline total stays the in-county share sum, so it equals the county's value on the map;
  - each Record row shows its full value, with the in-county share on a second line labelled as the convention.
- Under the Coverage lens, the authority/supplier toggle is hidden, and it returns in its previous state with Money.
- Undrawn states (loading, error, no results) are settled as UI-library stories (#40). No results reads "No Records match" and links the Coverage lens for the current county and dates. It never reads as "no spending".

**Coverage**

- "Not harvested" is the dark neutral, the same as "none" on the Money lens. "Partial" is grey.
- SEAP is harvested nationally, so its gaps apply to every county and the lens shows one status everywhere. The striped and partial counties in `explore-coverage.html` are placeholders. The caption says "SEAP is harvested nationally; gaps apply to every county". "Partial" stays in the legend for later Sources.
- There are six grid cell states, as drawn. A quarantined file shows as "awaiting the bulk file". A county is "harvested with known gaps" when any cell in the dated window is a known gap or possibly incomplete.
- The date chip selects publication quarters by year. The caption says so, and there is no attempt at an exact award-to-publication mapping.
- The Sources row lists explorable Sources only. The future one is "MF balance sheets", not "Ministerul Finanțelor". Reference sources (ANAF, the MF list of public entities) are named under the N of M block with their snapshot dates.

**Entity pages**

- An entity with both roles has two pages, `/authority/<key>` and `/supplier/<key>`. Each role chip links to the other page, or is muted when that role has no Records, and the two are never added together. Authorities-tab rows open the authority page and Suppliers-tab rows the supplier page. A Go-to card for a two-role CUI shows both. A name inside a Record opens the role it plays there.
- Every entity's display name is ANAF's current name, authorities included (ADR 0003 amendment). The design's "MUNICIPIUL BRASOV" becomes ANAF's spelling.
- An entity page opens unfiltered. The breadcrumb returns to the search, and the Records tab offers "only Records matching '<q>'", which carries the query and chips across.
- An authority's counterparty list uses equal consortium shares, so its percentages sum to 100%. The consortia list keeps full values.
- A graph edge's colour is the channel holding the most RON with that counterparty, and the legend says so. The picked counterparty's panel shows the split.
- The Signals list is ordered by date, with a toggle to RON kept in the URL.

## Still open

- The CPV group for splitting and the real national-authority rule (spec #37).
- The header shows the logo; `site/` still uses the text mark and its own favicon.
