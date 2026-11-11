# Grivei.ai landing page

The "in building" page for Grivei.ai, served at https://grivei.ai/: what the project is, and its current status (research). Static HTML and CSS, no build step.

## Preview

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Update the status

Everything is in `index.html`.

- **A data source changes state:** in its `<li class="source">`, set `data-status` to `live`, `wip` or `next`, and change the word in `<p class="status">` to `funcțional`, `în lucru` or `urmează`. The numbering, the bar and the summary line follow on their own.
- **The project changes phase:** edit `stadiu: cercetare` in the top bar.
- **Either way:** bump the date in the footer.

## Deploy

Copy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, a plain web server). There is nothing to build.

Before going public, read "Next steps" in `CLAUDE.md`: there is no share image (`og:image`) yet, and indexing is undecided. Fonts are self-hosted in `fonts/`, so the page makes no third-party requests.

## Continuing in Claude Code

`CLAUDE.md` carries the context, the decisions already made, the conventions and the open questions. Start Claude Code in this folder and it will pick that file up.
