# Grivei.ai landing page

The "in building" page for Grivei.ai, served at https://grivei.ai/: what the project is, and its current status (coming soon: the national graph is being built). Static HTML and CSS, no build step. English at `/` (default), Romanian at `/ro/`.

## Preview

Serve the folder (opening `index.html` directly works too, but the EN/RO links point at folders):

```bash
python3 -m http.server 8000
# then open http://localhost:8000 (English) or http://localhost:8000/ro/ (Romanian)
```

A bare preview has no `/site-flags.json`, so the explorer link stays hidden. To see it, run the `web` service with `GRIVEI_EXPLORER=open` (see `deploy/README.md`).

## Update the status

Make every change in **both** `index.html` (English) and `ro/index.html` (Romanian).

- **A data source changes state:** in its `<li class="source">`, set `data-status` to `live`, `wip`, `next` or `skipped`, and change the word in `<p class="status">`: `live` / `in progress` / `next` / `skipped` in English, `funcțional` / `în lucru` / `urmează` / `omis` in Romanian. A skipped source also gets a `<p class="source__note">` with the reason. The numbering and the summary line follow on their own. An optional `<p class="source__count">` after the status shows a figure under the source.
- **The project changes phase:** edit `phase: coming soon` / `stadiu: în curând` in the top bar, and the "coming soon" block in the stage (`.stage__done`).
- **Something ships:** add an entry at the top of the latest updates (`<ol class="updates">`), newest first.
- **Either way:** bump the date in the footer.
- **The explorer opens or closes:** that is not an edit here. Set `GRIVEI_EXPLORER` on the host (see `deploy/README.md`).

## Deploy

Copy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, a plain web server) as the web root, so `/ro/` resolves. There is nothing to build. On a host other than our Caddy, there is no `/site-flags.json`, so the explorer link stays hidden.

Before going public, read "Next steps" in `CLAUDE.md`: there is no share image (`og:image`) yet, and indexing is undecided. Fonts are self-hosted in `fonts/`, so the page makes no third-party requests.

## Continuing in Claude Code

`CLAUDE.md` carries the context, the decisions already made, the conventions and the open questions. Start Claude Code in this folder and it will pick that file up.
