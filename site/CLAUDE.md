# Grivei.ai landing page (in building)

Handoff from a Claude (Cowork) design session on 2026-11-11. This folder is the "in building" landing page for **Grivei.ai** (public name, confirmed 2026-11-11; the internal project name was "WatchDog Grivei"), served at https://grivei.ai/. It is a watchdog that builds an entity graph (institutions, companies, later persons) from Romanian public sources, with mandatory provenance for every edge. First vertical: public procurement (SEAP). The main project lives in `watchdog/` at the repo root (Python harvesters, Postgres, SQL views, HTML viewers); this page lives in `site/`, is separate from it and has no dependency on it.

The page's one job right now: say what the project is and show its status, which is **coming soon**: the national graph is being built (since 2026-11-18; before that, research).

## What is here

| File | Role |
| --- | --- |
| `index.html` | English page, served at `/` (the default). Semantic HTML. |
| `ro/index.html` | Romanian page, served at `/ro/`. Same markup as `index.html`, translated; assets referenced with `../`. |
| `status.js` | Shared by both pages: rebuilds the summary line from the source rows, in the page's language (`<html lang>`), and reveals the explorer link when the host's explorer flag is open. |
| `graph.js` | Shared by both pages: the stage's build animation. A simulated build (the real rebuild's step names, made-up timing, a percentage that is not the real progress) plays once per visit while a made-up graph assembles, then the "coming soon" block shows. |
| `styles.css` | All styling. `@font-face` rules first, then tokens in `:root`, then one block per page section, media queries at the end. |
| `fonts/` | Self-hosted `.woff2` files (latin + latin-ext subsets) and their SIL OFL 1.1 licences in `fonts/licenses/`. |
| `logo-disc.svg` | The logo in the top bar: a copy of the explorer's `explorer/packages/app/src/assets/logo-disc.svg` (copied, not linked: this folder depends on nothing outside it). Replace both together. |
| `favicon.svg` | Three-node path mark (amber → ring → white), same motif as the "≤ 3 steps" card the page had until 2026-11-18. |
| `README.md` | Short human-facing notes: preview, update status, deploy. |

No build step, no dependencies, no framework. Keep it that way unless there is a concrete reason; the page should stay deployable by copying the folder to any static host.

## Decisions already made (do not reopen without asking)

- **Language:** the page is bilingual, **English by default** (`/`) with Romanian at `/ro/` (decided 2026-11-11). Two static pages, not a JS toggle: each language has its own URL, works without JS and is indexable. The EN/RO switcher in the top bar is two plain links, the current one marked with `aria-current="page"`; there is no automatic redirect by browser language and no stored preference. Code, comments and docs are in English.
- **Direction:** "B · Graf": dark, technical, mono labels, amber accent. It was chosen over three other prototypes (a light minimal one, a construction-site sign, a typed official memo).
- **Layout "B · Graph assembly"** (chosen by the user 2026-11-18 from the three prototypes of the building page; Console and Ledger lost): a stage where a simulated build plays (a big percentage, "step n / 26 · <step name>", a graph assembling) and ends on **"Coming soon." / "În curând."**, never on "live" and with no explorer button; then the sources as a horizontal pipeline ("sources, as they join the graph"), the latest updates in one column, then the rules. The percentage is an animation, not the real rebuild's progress: the user asked for it knowing that (2026-11-18). The "coming soon" block is the page's real content: it is the markup's state (no JS, reduced motion), it stays in the accessibility tree while the animation plays, and the animation is `aria-hidden`.
- **What the status shows:** the current phase, the data-source pipeline, the latest updates, and a few totals of what is built (decided by the user 2026-11-18, replacing "no figures"). The totals come from the project's own documents only (today `docs/source-roadmap.md`: 13.94M records and 1,098 bn RON, 2021 to 12 Nov 2026). **No institutions, counties or people are named** on the page, in the updates either, even though reports on specific institutions exist in the project.
- **No call to action:** no email capture, no contact link, no forms.
  - **One exception, the explorer link (ticket #41):** the top bar carries one plain text link to the explorer app, `explorer` at `/explore/` on the English page and `explorator` at `/ro/explore/` on the Romanian one. The app is served beside this page (Caddy, see `deploy/README.md`), so the links are root-absolute.
  - **The link follows the host's explorer flag (decided 2026-11-18):** it is in the markup with `hidden`, and `status.js` shows it only when `/site-flags.json` says `"explorer": "open"`. Caddy writes that file from `GRIVEI_EXPLORER` and, when it is not `open`, also redirects `/explore/...` to `/` and `/ro/explore/...` to `/ro/`. No flag file (a bare `python3 -m http.server` preview, another static host) or no JS means the link stays hidden: closed is the safe default.
- **Public name and domain:** "Grivei.ai", at `https://grivei.ai/`. In the mono UI labels (brand, footer) it is written lowercase, `grivei.ai`; in running copy and titles, `Grivei.ai`.
- **Target question:** the graph's target question from the project README, a path of at most 3 steps between a decision-maker and a company that wins contracts from the same authority ("≤ 3 steps" / "≤ 3 pași"). It was the hero, then a card; it left the page on 2026-11-18 because layout B has no place for it. It stays the project's question.

## How status works

The source rows (`<ol id="sources">`) are the single source of truth, **once per language**: `index.html` and `ro/index.html` must carry the same rows with the same `data-status`. Every status change is an edit in both files.

- Each `<li class="source">` carries `data-status`: `live`, `wip`, `next` or `skipped`. The visible words are `live` / `in progress` / `next` / `skipped` in English and `funcțional` / `în lucru` / `urmează` / `omis` in Romanian.
- A `skipped` row also carries a `<p class="source__note">` saying why, citing its source document (the law or ruling, with dates).
- To change a source's status, change `data-status` **and** the word inside `<p class="status">`. Nothing else.
- A Source the pipeline holds also has its row in the `sources` registry (`watchdog/pipeline/sources.py`); `watchdog/tests/test_sources_registry.py` fails when a row here and its registry entry disagree (status, wording, either language). The page itself stays static and does not read the registry.
- A row may carry a `<p class="source__count">` **after** the status (the registry test reads name, description and status in that order): `<span class="n">` a total from the project's own documents and `<span class="s">` its unit. SEAP has its record count (`data-count`, which `graph.js` counts up during the animation); ONRC, being loaded, has "… joining now".
- Above 900px the rows are a pipeline: one column each, the status shown by the shape of the mark on the line. At 900px and below they are numbered rows (CSS counter) with the small status mark. The summary line ("1 funcțională · 1 în lucru · 2 urmează · 1 omisă") is rebuilt from the rows by `status.js`, which picks the wording from `<html lang>`; the static summary in the markup is the no-JS fallback, so keep it in sync when you edit rows. (The segmented bar was dropped on 2026-11-18: the pipeline line does its job. `status.js` still fills a `#sources-bar` if one comes back.)
- Keep rows ordered `live`, then `wip`, then `next`, then `skipped`, so the pipeline reads left to right. The summary leaves out groups with no rows.
- The project phase is plain text in the top bar: `phase: coming soon` / `stadiu: în curând`. When it changes, the stage's "coming soon" block (`.stage__done`) changes with it.
- The latest updates (`<ol class="updates">`) are newest first, one line of bold title and a sentence or two, written from merged work. Same entries in both pages.
- Bump the date in the footer (`<time datetime>` and the visible text, `11 Nov 2026` / `11.11.2026`) in both pages on every status change.

Current status and why:

| Source | Shown as | Basis |
| --- | --- | --- |
| SEAP | live | Harvester, loader, views and reports exist. |
| ANI | skipped | Decided by the user 2026-11-12: CCR Decision 297/2025 (29 May 2025) struck down online publication of declarations; Law 180/2026 (in force 31 Aug 2026) keeps full declarations confidential. Research: [ANI declarations](https://github.com/george-vrancianu/grivei.ai/issues/114). |
| ONRC | wip | Release 2 (#173): the Connector, the `onrc` schema and the entity page's ONRC section exist (#175); not yet publicly explorable. |
| Ministry of Finance (Ministerul Finanțelor) | next | README "Ce urmează". |
| portal.just.ro | next | README "Ce urmează". |

## Conventions

- **Translations:** the two pages say the same thing; neither has content the other lacks. Change copy in both, and keep the source names that are acronyms (SEAP, ANI, ONRC, portal.just.ro) untranslated.
- **Romanian diacritics:** use the comma-below letters ș ț (U+0219, U+021B), never the cedilla forms ş ţ. Any font added must cover the `latin-ext` range.
- **Copy rules, taken from the project's legal and ethical notes:** results are signals, not conclusions; every link points to its source document; personal names are personal data, publish no more than the public interest needs. Do not add claims, numbers or dates that are not in the project's own documents.
- **Colour:** everything comes from the custom properties in `:root`. `--accent` (#F2B33D) is the only accent. Text colours were chosen to stay at or above 4.5:1 on `--bg` and `--panel`; check contrast before introducing a new grey.
- **Status marks** differ in shape as well as colour. Pipeline: filled dot, pulsing accent ring, grey ring, dashed grey ring. Rows: filled dot, accent ring, grey ring, grey dash. Keep that if you restyle them.
- **Layout:** fluid, one `max-width: 1200px` container (`.wrap`). Breakpoints at 900px (sources become rows), 760px (principles stack) and 420px (taller stage).
- **Motion:** the pulsing phase dot and `wip` mark (behind `prefers-reduced-motion: no-preference`), and the stage's build animation, which `graph.js` skips under `prefers-reduced-motion: reduce` (the full graph and the "coming soon" block, still).

## Verified in the design session

Rendered in headless Chromium at 1280, 768, 390 and 320 px wide: no horizontal overflow, no console errors, the script produces the expected bar and summary. **Not verified:** the real typefaces. That environment could not reach Google Fonts or npm, so Space Grotesk and IBM Plex Mono rendered with fallbacks (Inter and a system mono). Real typefaces since verified (2026-11-11, after self-hosting): headless Chromium at 1280 and 390 px, all fonts served from `fonts/`, three-line `h1` and the "≤ 3 pași" card render as intended. Bilingual version verified the same day: both pages at 1280 and 320 px, switcher links work, `status.js` gives "1 live · 1 in progress · 3 next" and "1 funcțională · 1 în lucru · 3 urmează". Note that "≤" (U+2264) is outside the `latin` and `latin-ext` subsets, so it will always come from a fallback font.

Building layout verified 2026-11-18: both pages through the real Caddy image (`caddy:2.11.9-alpine`) at 1280, 768, 390 and 320 px, with `GRIVEI_EXPLORER` empty and `open`. No console errors, no horizontal overflow, the explorer link hidden or shown as the flag says, the summary as expected in both languages, and `/explore/...` redirecting when closed.

## Next steps

1. ~~Self-host the fonts.~~ Done 2026-11-11: Inter and Space Grotesk (variable) and IBM Plex Mono (400/500/600) from Fontsource 5.3.0, `latin` + `latin-ext` only, in `fonts/`. The page makes no third-party requests. To update, `npm pack` the same packages and copy the `.woff2` files; there is no `package.json` on purpose.
2. **Host and domain.** Domain: `grivei.ai`. Canonical, `hreflang` alternates (`en`, `ro`, `x-default` → `/`) and Open Graph / Twitter tags are in place in both pages, pointing at `https://grivei.ai/` and `https://grivei.ai/ro/`. Still missing: a share image (`og:image`, 1200×630, absolute URL; then switch `twitter:card` to `summary_large_image`). The user deploys manually; whatever the host, serve `site/` as the web root so `/ro/` resolves.
3. **Decide on indexing.** There is no `robots` meta tag, so the page is indexable by default.

## Open questions for the user

- What does the page say once the graph is live? The prototype had a live state ("The graph is live." and the explorer as a button); it is not built here, because the explorer flag only governs the link and the routes.
- Who is the publisher of record? A public-interest site that will eventually name people usually needs an identifiable operator and a contact; the page deliberately has neither for now.

## Reference

- Design canvas with all four prototypes (private to the user): https://claude.ai/artifact/HTyjVFspvt1r6CpCC87Hwq
- The Claude project "WatchDog Grivei" holds the project README, schema and reports, plus `claude/landing-page-brief.md` with the same decisions in Romanian.
