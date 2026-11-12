# Grivei.ai landing page (in building)

Handoff from a Claude (Cowork) design session on 2026-11-11. This folder is the "in building" landing page for **Grivei.ai** (public name, confirmed 2026-11-11; the internal project name was "WatchDog Grivei"), served at https://grivei.ai/. It is a watchdog that builds an entity graph (institutions, companies, later persons) from Romanian public sources, with mandatory provenance for every edge. First vertical: public procurement (SEAP). The main project lives in `watchdog/` at the repo root (Python harvesters, Postgres, SQL views, HTML viewers); this page lives in `site/`, is separate from it and has no dependency on it.

The page's one job right now: say what the project is and show its status, which is **research**.

## What is here

| File | Role |
| --- | --- |
| `index.html` | English page, served at `/` (the default). Semantic HTML. |
| `ro/index.html` | Romanian page, served at `/ro/`. Same markup as `index.html`, translated; assets referenced with `../`. |
| `status.js` | The one script, shared by both pages: rebuilds the status bar and summary line from the source rows, in the page's language (`<html lang>`). |
| `styles.css` | All styling. `@font-face` rules first, then tokens in `:root`, then one block per page section, media queries at the end. |
| `fonts/` | Self-hosted `.woff2` files (latin + latin-ext subsets) and their SIL OFL 1.1 licences in `fonts/licenses/`. |
| `favicon.svg` | Three-node path mark (amber → ring → white), same motif as the hero card. |
| `README.md` | Short human-facing notes: preview, update status, deploy. |

No build step, no dependencies, no framework. Keep it that way unless there is a concrete reason; the page should stay deployable by copying the folder to any static host.

## Decisions already made (do not reopen without asking)

- **Language:** the page is bilingual, **English by default** (`/`) with Romanian at `/ro/` (decided 2026-11-11). Two static pages, not a JS toggle: each language has its own URL, works without JS and is indexable. The EN/RO switcher in the top bar is two plain links, the current one marked with `aria-current="page"`; there is no automatic redirect by browser language and no stored preference. Code, comments and docs are in English.
- **Direction:** "B · Graf": dark, technical, mono labels, amber accent. It was chosen over three other prototypes (a light minimal one, a construction-site sign, a typed official memo).
- **What the status shows:** the current phase plus the data-source pipeline. **No institutions, counties, people or figures are named** on the page, even though reports on specific institutions exist in the project.
- **No call to action:** no email capture, no contact link, no forms.
  - **One exception, the explorer link (ticket #41):** the top bar carries one plain text link to the explorer app, `explorer` at `/explore/` on the English page and `explorator` at `/ro/explore/` on the Romanian one. The app is served beside this page (Caddy, see `deploy/README.md`), so the links are root-absolute and do not work from a bare `python3 -m http.server` preview of this folder alone.
- **Public name and domain:** "Grivei.ai", at `https://grivei.ai/`. In the mono UI labels (brand, footer) it is written lowercase, `grivei.ai`; in running copy and titles, `Grivei.ai`.
- **Hero idea:** the graph's target question from the project README, a path of at most 3 steps between a decision-maker and a company that wins contracts from the same authority ("≤ 3 steps" / "≤ 3 pași").

## How status works

The source rows (`<ol id="sources">`) are the single source of truth, **once per language**: `index.html` and `ro/index.html` must carry the same rows with the same `data-status`. Every status change is an edit in both files.

- Each `<li class="source">` carries `data-status`: `live`, `wip`, `next` or `skipped`. The visible words are `live` / `in progress` / `next` / `skipped` in English and `funcțional` / `în lucru` / `urmează` / `omis` in Romanian.
- A `skipped` row also carries a `<p class="source__note">` saying why, citing its source document (the law or ruling, with dates).
- To change a source's status, change `data-status` **and** the word inside `<p class="status">`. Nothing else.
- Row numbers come from a CSS counter. The segmented bar and the summary line ("1 funcțională · 1 în lucru · 3 urmează") are rebuilt from the rows by `status.js`, which picks the wording from `<html lang>`. The static bar and summary in the markup are the no-JS fallback, so keep them in sync when you edit rows.
- Keep rows ordered `live`, then `wip`, then `next`, then `skipped`, so the bar reads left to right. The summary leaves out groups with no rows.
- The project phase is plain text in the top bar: `phase: research` / `stadiu: cercetare`.
- Bump the date in the footer (`<time datetime>` and the visible text, `11 Nov 2026` / `11.11.2026`) in both pages on every status change.

Current status and why:

| Source | Shown as | Basis |
| --- | --- | --- |
| SEAP | live | Harvester, loader, views and reports exist. |
| ANI | skipped | Decided by the user 2026-11-12: CCR Decision 297/2025 (29 May 2025) struck down online publication of declarations; Law 180/2026 (in force 31 Aug 2026) keeps full declarations confidential. Research: [ANI declarations](https://github.com/george-vrancianu/grivei.ai/issues/114). |
| ONRC | next | README "Ce urmează". |
| Ministry of Finance (Ministerul Finanțelor) | next | README "Ce urmează". |
| portal.just.ro | next | README "Ce urmează". |

## Conventions

- **Translations:** the two pages say the same thing; neither has content the other lacks. Change copy in both, and keep the source names that are acronyms (SEAP, ANI, ONRC, portal.just.ro) untranslated.
- **Romanian diacritics:** use the comma-below letters ș ț (U+0219, U+021B), never the cedilla forms ş ţ. Any font added must cover the `latin-ext` range.
- **Copy rules, taken from the project's legal and ethical notes:** results are signals, not conclusions; every link points to its source document; personal names are personal data, publish no more than the public interest needs. Do not add claims, numbers or dates that are not in the project's own documents.
- **Colour:** everything comes from the custom properties in `:root`. `--accent` (#F2B33D) is the only accent. Text colours were chosen to stay at or above 4.5:1 on `--bg` and `--panel`; check contrast before introducing a new grey.
- **Status marks** differ in shape as well as colour (filled dot, accent ring, grey ring, grey dash; a hatched bar segment for `skipped`). Keep that if you restyle them.
- **Layout:** fluid, one `max-width: 1200px` container (`.wrap`). Breakpoints at 900px (hero stacks), 760px (source rows and principles stack) and 420px (smaller card).
- **Motion:** only the pulsing phase dot, behind `prefers-reduced-motion: no-preference`.

## Verified in the design session

Rendered in headless Chromium at 1280, 768, 390 and 320 px wide: no horizontal overflow, no console errors, the script produces the expected bar and summary. **Not verified:** the real typefaces. That environment could not reach Google Fonts or npm, so Space Grotesk and IBM Plex Mono rendered with fallbacks (Inter and a system mono). Real typefaces since verified (2026-11-11, after self-hosting): headless Chromium at 1280 and 390 px, all fonts served from `fonts/`, three-line `h1` and the "≤ 3 pași" card render as intended. Bilingual version verified the same day: both pages at 1280 and 320 px, switcher links work, `status.js` gives "1 live · 1 in progress · 3 next" and "1 funcțională · 1 în lucru · 3 urmează". Note that "≤" (U+2264) is outside the `latin` and `latin-ext` subsets, so it will always come from a fallback font.

## Next steps

1. ~~Self-host the fonts.~~ Done 2026-11-11: Inter and Space Grotesk (variable) and IBM Plex Mono (400/500/600) from Fontsource 5.3.0, `latin` + `latin-ext` only, in `fonts/`. The page makes no third-party requests. To update, `npm pack` the same packages and copy the `.woff2` files; there is no `package.json` on purpose.
2. **Host and domain.** Domain: `grivei.ai`. Canonical, `hreflang` alternates (`en`, `ro`, `x-default` → `/`) and Open Graph / Twitter tags are in place in both pages, pointing at `https://grivei.ai/` and `https://grivei.ai/ro/`. Still missing: a share image (`og:image`, 1200×630, absolute URL; then switch `twitter:card` to `summary_large_image`). The user deploys manually; whatever the host, serve `site/` as the web root so `/ro/` resolves.
3. **Decide on indexing.** There is no `robots` meta tag, so the page is indexable by default.

## Open questions for the user

- Should the page later show the phases after research? An earlier prototype used "Construcție" and "Lansare"; those names were invented and never confirmed.
- Who is the publisher of record? A public-interest site that will eventually name people usually needs an identifiable operator and a contact; the page deliberately has neither for now.

## Reference

- Design canvas with all four prototypes (private to the user): https://claude.ai/artifact/HTyjVFspvt1r6CpCC87Hwq
- The Claude project "WatchDog Grivei" holds the project README, schema and reports, plus `claude/landing-page-brief.md` with the same decisions in Romanian.
