# Explorer: the other pages in the new surfaces (design handoff)

This folder hands the design of every explorer page except the main screen to whoever builds it. It was drawn on 2026-11-16, on top of the main-screen restyle that is already merged (#221 to #228; `main` at `2770f13`). The owner's request: "Can we have the rest of pages designed?" in the look the main screen now has.

Read first: `explorer/CLAUDE.md`, the sections "Theme: surfaces, shadows and the panel", "The main screen's panels" and "Filter menus" of `explorer/packages/ui/COMPONENTS.md`, and the first handoff of this look, `../grivei-explorer-depth-filterbar-loaders/CLAUDE.md`. Everything here reuses what those built. No new colour and no new shadow.

The design lives on a canvas (https://claude.ai/artifact/PxkdQkRfri16pzaVYipgob, page "Other pages", private to the owner). Everything needed from it is copied here. Nothing under `explorer/` is changed by this branch.

## What is here

```
index.html        list of every snapshot
screens/          12 static snapshots, every style inline, English
screenshots/      the 12 at 1440 px, and three at 390 px
canvas-source/    the canvas's own files (one .dc.html per artboard, canvas.json)
README.md         how to preview
```

Fonts, the logo and the map and graph images load from `../grivei-explorer-design/`.

## How to use it

- `screens/*.html` are the visual reference: read sizes, spacing and colours off the inline styles. Do not copy the markup; build with UI library components and update `COMPONENTS.md` in the same change.
- The snapshots are static. Nothing responds.
- Several pages could not be read from the running app when this was drawn (see "Seen on the local build"), so their content comes from sample data and their structure from the code. **Where a drawing has less than `main` has, `main` wins**: keep every section, state and control the page has today and give it the treatment described here. "Not drawn" below lists the known cases.

## Decisions after review (2026-11-16)

The design was reviewed against `main` with the owner. These decisions override anything below that says otherwise; the sections below are already corrected where noted.

1. **Delivery.** A parent issue with one sub-issue and one PR per step of "Suggested order", in that order.
2. **`Panel` changes in place**, no opt-in variant. Pages whose bodies are reworked later sit in the new panel meanwhile.
3. **Undrawn states** (see "Not drawn") are the builder's call with the shared patterns; the PR shows screenshots. A state that fits no pattern is flagged in the PR, not improvised. Known candidate: the entity page with both roles (the role switch beside the tab strip and the `CiteLine`).
4. **The local build's errors** (`sources` answering `Internal error`, `/geo/counties.topo.json` 404) are a separate bug that blocks step 2.
5. **UI vocabulary** (panel, header strip, foot strip, well, inset figure, segmented control, tag) goes in `COMPONENTS.md`, not `GLOSSARY.md`. A *tag* is a neutral label for an attribute (a person's role, "SEAP counterparty" on an ONRC row); a *badge* is a Record badge. A Record badge is never called a tag.
6. **Counterparty** and **SEAP counterparty** are glossary terms; copy follows them.
7. **The filter menus are already shared** molecules on `main` (`molecules/FilterMenu`, `ChoiceMenu`, `MultiChoiceMenu`, `FilterBarRow`, `FilterBarDivider`). Nothing to lift.
8. **ONRC "In SEAP" stays the three-state `ChoiceMenu`** that `main` has (Any, SEAP counterparty, not in SEAP; `seapCounterparty=true|false` in the URL). The drawing's toggle pill is dropped. Only the bar is restyled.
9. **Records tab: Signal stays a facet**, the first menu in the bar. Every menu option keeps its count, and the ≈ when the count is estimated.
10. **A Signal's reproducing filter shows one active chip per parameter**: "Signal: <rule>" (clears only the signal), the supplier, the date range, and "CPV: <code>" (CPV has no facet and would otherwise be invisible). Each clears on its own.
11. **Subsequent contracts need a count.** Step 4 adds a count of a framework's subsequent contracts to the contract. The page still fetches up to 50, by value. Five show; "Show all n" expands in place up to 50. Over 50, the foot reads "50 of n shown, by value" and links to the authority's Records tab filtered to the framework.
12. **About the numbers marks the section being read** with a scroll-spy (an `IntersectionObserver` over the sections), not only the `#hash` target. The sticky contents list already exists.
13. **Four not-found states share one panel**: unknown address, entity, person and Record (`RecordPage` is not drawn but takes it too). The entity state stops using `StateNote kind="empty"`.
14. **The open tab uses the selected state** (`line` fill, inset accent outline), like paging and the segmented controls, not an amber underline. The current page in `PageNav`, filled amber on `main`, moves to the selected state too.
15. **Picked counterparty**: the header strip reads "Picked counterparty" with the close button; the body starts with the name as a link, then the Awarded and Records inset figures.

## Snapshots

| Snapshot | Route | Data |
|---|---|---|
| `search.html` | `/explore/search` (Records) | real, read live |
| `onrc.html` | `/explore/?source=onrc` | UI library fixtures |
| `entity-overview.html` | `/explore/authority/<key>` | Municipiul Brașov, the first handoff's prototype data |
| `entity-supplier.html` | `/explore/supplier/<key>` | UI library fixtures (ALFA NOU SRL) |
| `entity-records.html` | `…/records` with a Signal's filter | Municipiul Brașov, prototype data |
| `entity-relationships.html` | `…/relationships`, Graph | Municipiul Brașov, prototype data |
| `entity-flow.html` | `…/relationships`, Money flow | Municipiul Brașov, prototype data |
| `record.html` | `/explore/record/<code>` | real, read live |
| `coverage.html` | `/explore/coverage` | grid and dates real (read 2026-11-14) |
| `about-the-numbers.html` | `/explore/methodology` | real copy, read live |
| `person.html` | `/explore/person/<id>` | UI library fixtures |
| `not-found.html` | any unknown address | |

## Shared patterns

Build these once; the pages below only name them.

### 1. The titled panel: header strip, body, foot strip

`molecules/Panel` today is a `Card` with a `SectionHeading` inside its padding. It becomes a three-part panel:

- **Header strip**: the strip fill (`rgba(13,16,20,.35)`, what `FilterStrip` uses), a hairline below, padding 9 px 16 px, at least 28 px of content height. Left: the `SectionHeading` (mono 13, accent, weight 500), unchanged. Right, optional: a short meta line (mono 12, `muted`) or one control (an `OptionToggle`, an `OrderSelect`, a close button).
- **Body**: padding 16 px, gap 12 px; or flush (no padding) when the body is a list or a table, whose rows bring their own 12 px 16 px.
- **Foot strip**, optional: the same fill, a hairline above, padding 10 px 16 px, mono 12 `muted`. It holds a count ("Showing 1–7 of 54"), a caveat sentence, the paging, or a "show all" link, left and right ends.

Suggested props on `Panel`: `aside` (the header's right slot), `foot`, `flush`. Every `Panel` in the app takes the new form; the hand-rolled cards named below move to it.

### 2. Rows and tables inside panels

- A list row: hairline between rows, hover fill `raised`, padding 12 px 16 px (14 px 20 px for full-width Record rows).
- A table: the header row is a strip (strip fill, mono 12 `muted`, hairline below), cells 12 px 14 px, numbers right-aligned in mono with tabular figures, row hover `raised`. It still scrolls sideways inside its own box (`TableContainer`), never the page.

### 3. Inset figures

`InsetFigure` (exists) is used wherever a number supports a headline: the Record's counted value, a framework's three numbers, the picked counterparty's totals, ONRC registration facts, a Signal rule's window and base rate, Data through. An optional third line (mono 12, `muted`) is new: a `note` prop.

### 4. Segmented controls

`OptionToggle`, `SourcePicker` and `SignalOrderToggle` get what the map's lens toggle has: a `Well` track (ground fill, `lineStrong` border, inset shadow), 36 px segments, the selected one in the selected state.

### 5. Paging

`PageNav` becomes a row of 44 px cells, 6 px apart, mono 13: the current page in the selected state (`line` fill, inset accent outline, `aria-current="page"`), the others raised (outlined button look), a disabled Previous or Next with a dashed `lineStrong` border and no fill (`aria-disabled`; `idle` is too faint for its text, use `muted`).

### 6. The filter bar outside the main screen

`FilterMenu` (with `MenuOption`), `ChoiceMenu`, `MultiChoiceMenu`, `FilterBarRow` and `FilterBarDivider` are already shared molecules on `main`, and the ONRC screen already uses them. The entity Records tab now uses them too. The active row (`ActiveChips`) is reused as it is.

### 7. Amber

`explorer/CLAUDE.md`, "Amber", holds: Signals, set filters and the Total. These drawings add no amber use. Links, section headings, the primary button, share bars, coverage cells, the search highlight and map ramps keep the amber they already have.

## Page by page

Paths are under `explorer/packages/`.

### Entity pages: header and tabs (`organisms/EntityHeader`, `templates/EntityPageLayout`)

One panel holds the breadcrumb line, the name (`h1`), the role chips, the identity facts and the tabs.

- Facts are a wrapping row of label-over-value pairs (label mono 12 `muted`, value 14 px): CUI, Location (with "placed by …" in mono `muted`), ANAF status when there is one, "Appears in SEAP as". The identity markers, their explanations and the source line stay as they are, in this row.
- The tabs are the panel's foot strip: tab names as today (`EntityTabNav`), counts as pills (`TabLabel`'s look). The open tab takes the selected state, not the amber underline it has on `main` (and in the drawing).
- **Changed, confirmed:** the page address (`CiteLine` with its copy-link button) moves from under the tabs into the right end of the tab strip; below `md` it wraps under the tabs.

### Overview (`organisms/EntityOverview`)

- `HeadlineNumbers`: four panels in a wrapping row (label mono 12 `muted`, the number in the `stat` type, one sentence below). Only the total is amber.
- Two columns (as today, stacking under about 910 px). Left: Signals, Largest Records, Framework agreements. Right: Counterparties, Procedure types, Consortia.
- **Signals**: the heading with the count and the `SignalOrderToggle` on one line, then the cards, then "Signals 1–20 of 72" and the `PageNav` on one line.
- **`SignalCard`** becomes a panel with: a header strip (the ring, the rule label in Space Grotesk 17, and "Latest Record: … · n Records" on the right); the sentence at 15 px; the lawful-explanations line in a well (13 px, `text2`); "Contracting authority" and "Suppliers" as a two-column definition list; a foot strip with the three links. Its four parts and wording rules do not change.
- **Counterparties** and **Procedure types**: a panel each, header meta on the right ("share of the total awarded", "as SEAP publishes them"); a row is the name, then the share and the amount on the right, the `ShareBar` under them, the meta line under that. Counterparties' foot: "and n more" and the link to the graph.
- **Consortia**: rows of members, Records count and amount; the convention sentence is the foot.
- **Framework agreements** (`FrameworkLine`): three inset figures (Agreements; Ceilings, noted "not summed"; Subsequent contracts, noted with their share of the ceilings), the `ShareBar`, the existing note.
- **Largest Records**: Record rows in a flush panel; the "counted Records only" note is the foot.
- **Leadership list** (`LeadershipSection`), full width under the columns: the caveat, then a table (Leader, List as registered, Period with an "in force" badge, Basis); the gaps line is the foot.

### Supplier sections (`OnrcSection`, `PeopleSection`, `FinancialStatementsSection`, `FirmDonationsSection`, `PublicEnterpriseSection`)

Each is a titled panel; the Source and its snapshot or data-through go in the header's right slot.

- **ONRC registration**: registration number, registration date and legal form as inset figures; the seat as a definition line; Status (badges with their "since" text) and Authorised CAEN codes side by side; ONRC names as rows with the "current" badge and the date span; the aliases note; the source line and link as the foot. It sits beside the people panel from `md` up.
- **Administrators and legal representatives**: rows of name (a link only in a Private view), "born <year>", and the role as a tag on the right.
- **Financial statements**: the intro, the table (the revision is a badge under the source lines), the two notes below it.
- **Firm donations**: the supplier-context sentence in a well, the intro, the table, the attribution and the methodology link as the foot.
- **Public enterprise**: not drawn; a titled panel with its facts as a definition list.

### Records tab (`organisms/RecordsTab`)

- `FacetPanel` becomes a filter bar in its own panel: one `FilterMenu` per facet (Signal first, then Channel, Procedure, Year, Counterparty, Badges) in a `FilterBarRow`, with the active row under it. Options keep their counts (≈ when estimated). A Signal's reproducing filter shows one active chip per parameter: "Signal: No publication", the supplier, the date range, and "CPV: <code>". "Clear filters" is the row's clear action. The `filterExtras` slot ("only Records matching …") stays in the bar, after the menus.
- The Total is a panel using `TotalFigure`'s inset layout, as on the main screen. The drawing's figure labels are illustrative; `InsetTotalCopy` decides them.
- `RecordsTable` sits in a titled panel ("Records"), the `OrderSelect` in the header's right slot, "Showing 1–7 of 54" and the `PageNav` in the foot. The `SignalBadge` of a row sits under its title.
- The `SourcePicker` (SEAP Records, ONRC registrations), when offered, stays above the filter panel.

### Relationships tab (`organisms/RelationshipsTab`, `app/src/components/FlowLensSection`)

- The tab's heading and the "Show" toggle (Graph, Money flow) share one line above the panels: the toggle is a page-level control, not part of the graph panel.
- **Graph view**: the graph panel (title in the header strip, the graph inside a `Well`, the legend as the foot) beside the picked-counterparty panel; "By month" below, full width, its bars inside a `Well`, the period in the header's right slot, the key and tallest-month line under the well.
- **Picked counterparty** (`CounterpartyPanel`): a titled panel with the close button in the header; the name (`h3`, a link); **changed, confirmed:** the total and the Record count as two inset figures; the Signals chip; the "won together" sentence; then the Records as flush rows; "n of m shown" and the link to all of them as the foot.
- **Money flow view**: one titled panel; the map in a `Well` on the left, the county list on the right behind a hairline (name, amount, `ShareBar`); the caption as the foot.

### Record page (`organisms/RecordDetail`)

- `RecordHeading` and `RecordActions` stay on the ground, above the panels: channel tag, code and badges; the title; the primary "Check in SEAP" button and the `CiteLine`.
- `ValueFacts`: a titled panel ("Value"). The value as published stays the big number with its caption; the counted value becomes an inset figure beside it, its reason as the figure's note; `FrameworkLine` (bar and sentence) under both.
- `FrameworkSection`: the subsequent contracts are their own titled panel, count and sum in the header's right slot, Record rows flush. **Changed, confirmed:** more than five are cut to five by value, with "5 of 11 shown, by value" and "Show all 11" in the foot; the link expands the list in place. This needs a count of the subsequent contracts in the contract (the query fetches at most 50). Over 50, the foot reads "50 of n shown, by value" and links to the authority's Records tab filtered to the framework.
- `WinnersSection`: a titled panel; each winner in a well (name link, share line), two per row from `md`; the convention note below.
- Side column: `RecordFacts`, `BadgeExplanations`, `ProvenanceSection` are titled panels; `SignalsSection` keeps its heading on the ground and shows the new `SignalCard`.

### Search, full results (`pages/SearchPage`, `organisms/FullResults`)

- The search bar sits in a panel like the main screen's (label, input well, hint), under the `h1`.
- "Back to results" stays a link on the ground.
- The results are one panel: the kind and its count pill with "Showing 1–50 of n" on the left of the header and the `OrderSelect` on the right; the framed `CiteLine` as a strip under it; the rows; the `PageNav` in the foot with the "Showing" line repeated on its left.

### ONRC screen (`pages/OnrcPage`, `molecules/OnrcFilterChips`, `organisms/OnrcResults`)

It already shares `MainScreenLayout`, and `OnrcFilterChips` is already a filter bar on `main` (In SEAP, divider, Status, CAEN, Registered). It takes the new look:

- "In SEAP" stays the three-state `ChoiceMenu` (Any, SEAP counterparty, not in SEAP), first, then the divider. The drawing's "SEAP counterparties only" toggle pill is dropped: it cannot say "not in SEAP".
- Status: a `MultiChoiceMenu`. Registered: a `FilterMenu` whose content is the two date fields (From, To).
- CAEN: an inline field in the bar, a 44 px pill-shaped well with the label "CAEN" inside and the hint as placeholder.
- The active row as today ("County: Cluj" first).
- Results: a panel with the heading ("n registrations"), `OnrcResultRow`s flush (statuses as badges, "SEAP counterparty" as an outlined tag), "Showing …" and the `PageNav` in the foot. The count map follows the Money lens panel; the Unplaced tile is an inset figure.

### Coverage (`templates/CoveragePageLayout`, `organisms/CoverageGrid`, `SnapshotCoverage`)

The page keeps every section it has. Each `CoverageSection` becomes a titled panel:

- The grid panel: the Source selector in the header's right slot; the grid inside a `Well` that scrolls sideways; the legend and the window note as the foot. Cells are unchanged.
- "Known gaps": its intro, then `KnownGapsTable` as a table in the panel, the cell count in the header's right slot; each row's State shows the cell swatch beside the state name.
- "Data through": its intro, then one inset figure per record kind.
- "Records not in bulk data", "How gaps are decided", the snapshot line and the per-county note are not drawn: titled panels, lists flush.

### About the numbers (`organisms/MethodologyPage`)

- The contents list is a titled panel ("On this page") on the left, sticky under the header from `md` (as on `main`); the section being read is marked with the selected state, found by a scroll-spy; Signal rules are indented.
- The article is one panel, at most 860 px wide: the eyebrow, `h1` and lead, then each section behind a hairline (heading 24 px, text in the `bodyLong` type).
- Each Signal rule is a panel inside the article: a header strip with the ring and the rule's name; the definition; the conditions as a list; `SignalRuleBaseRate` as three inset figures (Time window, How often it fires nationally with its sentence as the note, Data through); the lawful explanations in a well.

### Person (`organisms/PersonDetail`)

A narrower page (960 px). The private-view sentence is a notice on the overlay surface with a lock icon. Then a panel with the breadcrumb, the name and three inset figures (Born, Roles, Source with the snapshot as its note); then the Roles panel: rows of organisation (link, or plain with "no organisation page"), its key and role under it, and the role held as a tag; the basis sentence and source line under the rows.

### Not found (`pages/NotFoundPage`)

**Changed, confirmed:** a panel, 760 px wide: "404" in mono `muted`, the title, one new sentence, a primary "Back to the main screen" and a secondary "Search". The entity, person and Record not-found states take the same panel with their own title and body.

## Loading, refetch and errors

Not drawn. The main screen's rules apply to every page, with what is already built:

- Any request in flight: `RequestBar` under the header (already global) and a `LoadingStatus` at the right end of the header strip of the panel being loaded.
- First load: skeletons shaped like the content (`Skeleton`): the entity header's name and facts, the four headline panels, three rows per list panel, table rows, the Record's value. Real labels stay real.
- Refetch (a filter, the order, a page, a tab, a picked counterparty): keep the last answer at `BUSY_OPACITY` with `aria-busy="true"` until the next lands; header strips stay at full strength.
- Errors: `StateNote kind="error"` with the retry action inside the panel that failed; the rest of the page stays.

## Copy to add

Everything else is catalogue copy, some of it moved to a new place.

| Where | EN | RO |
|---|---|---|
| Record, subsequent contracts foot | `5 of 11 shown, by value` · `Show all 11` | `5 din 11 afișate, după valoare` · `Arată toate cele 11` |
| Overview, Signals paging line | `Signals 1–20 of 72` | `Semnalele 1–20 din 72` |
| Overview, panel header metas | `share of the total awarded` · `as SEAP publishes them` | `pondere din totalul atribuit` · `așa cum le publică SEAP` |
| Overview, framework figures | `Agreements` · `Ceilings` · `not summed` · `Subsequent contracts` · `18.2% of the ceilings` | `Acorduri` · `Plafoane` · `neadunate` · `Contracte subsecvente` · `18,2% din plafoane` |
| Records tab, foot | `Showing 1–7 of 54` | `Se afișează 1–7 din 54` |
| Records tab, Signal chip | `Signal: No publication` | `Semnal: ` followed by the rule's label from the catalogue |
| Records tab, CPV chip | `CPV: <code>` | `CPV: <code>` |
| Record, subsequent contracts over 50 | `50 of n shown, by value` | `50 din n afișate, după valoare` |
| Relationships, picked panel figures | `Awarded` · `Records` | `Atribuit` · `Înregistrări` |
| Supplier, people foot | `Names link to a person page only in a Private view.` | `Numele duc la o pagină de persoană doar într-o vizualizare privată.` |
| Person, figure labels | `Born` · `Roles` · `Source` | `Născut(ă)` · `Roluri` · `Sursa` |
| ONRC, CAEN field label | `CAEN` | `CAEN` |
| Coverage, Known gaps count | `7 cells` | `7 celule` |
| Not found, sentence | `Nothing in the explorer lives at this address. Check it for a typo, or start again from the main screen.` | `La această adresă nu se află nimic în explorer. Verifică dacă este scrisă corect sau pornește din nou de la ecranul principal.` |

## Not drawn: follow `main`

- Entity: the ANAF inactive badge, name-only and curated identities, the role switch when both roles exist, `AppearsInSeapAs` (every spelling), the Public enterprise section, the leadership "via" line, empty and no-role states, the ONRC registrations view of the Records tab.
- Record: `PartySection`, `SuspectNote`, direct purchases, no-value and natural-person winners, the provisional and crawl-only cases, a Record with no public page.
- Search: the Authorities and Suppliers results (the main screen's column head and row columns apply), the Go-to card.
- ONRC: the Coverage lens (`SnapshotCoverage`) and the empty result.
- The Romanian UI. Snapshots are English.
- Focus rings, tooltips and menus: as built for the main screen.

## Sample data: do not treat it as fact

- Real, read from the local app on 2026-11-16: the Record (CAN1064396~561/26128), the Search rows, About the numbers. The Coverage grid states and data-through dates were read on 2026-11-14.
- Municipiul Brașov's numbers are the first handoff's prototype data, not this database's.
- ALFA NOU SRL, the ONRC rows and POPESCU ION are the UI library's fixtures (`ui/src/domain/samples`): no real firm or person.
- `[Brackets]` mark values that were not available: leaders and lists, parties, gap reasons, some counts.
- Map shading and the month bars are placeholders.

## Seen on the local build

- On the build at `localhost:8080` the main screen, entity pages, Coverage and the ONRC screen showed "The data could not be loaded.": their GraphQL query answered `Internal error` at path `sources`. Record, Search and About the numbers loaded.
- `/geo/counties.topo.json` answered 404.

## Suggested order

1. `Panel` (header strip, flush body, foot strip), table and row treatment, `InsetFigure` note, segmented controls on a well, `PageNav`. Visual only; every page improves at once.
2. Entity header with the tab strip, Overview panels, `SignalCard`.
3. Records tab filter bar (after lifting the filter menu pieces), Relationships, the supplier sections.
4. Record page.
5. Search results, the ONRC filter bar.
6. Coverage, About the numbers, Person, Not found.
7. Loading, refetch and error states per page.
