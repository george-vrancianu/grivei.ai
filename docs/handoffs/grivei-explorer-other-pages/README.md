# Grivei Explorer: the other pages (design handoff)

The design of every explorer page except the main screen, handed off on 2026-11-16: search results, the ONRC screen, the entity pages (Overview for an authority and for a supplier, Records, Relationships), the Record page, Coverage, About the numbers, the person page and Not found. They take the surfaces, panels and filter bar the main screen already has on `main`.

Read `CLAUDE.md` first: it has the shared patterns to build once, each page's changes with the components they land in, the copy to add, what is not drawn, and which numbers are real.

Nothing under `explorer/` is changed by this branch.

## Preview

Serve `docs/handoffs/` (the snapshots load fonts, the logo and the map and graph images from the first handoff, `../grivei-explorer-design/`) and open the index:

```bash
cd docs/handoffs
python3 -m http.server 8000
# http://localhost:8000/grivei-explorer-other-pages/
```

Or look at `screenshots/`, which need no server.

## Contents

| Path | What it is |
|---|---|
| `CLAUDE.md` | The build brief |
| `index.html` | Links to the 12 snapshots |
| `screens/` | Static snapshots with inline styles; nothing responds |
| `screenshots/` | PNG of each snapshot at 1440 px wide; the entity Overview, the Record and Coverage also at 390 px |
| `canvas-source/` | The design's own files: one `.dc.html` per artboard and `canvas.json` (the whole canvas, including the main-screen page handed off earlier) |

## Source

The design canvas: https://claude.ai/artifact/PxkdQkRfri16pzaVYipgob, page "Other pages" (private to the owner). In `canvas-source/`, image addresses starting with `/_blob/` are the canvas's own uploads of files in `../grivei-explorer-design/assets/`: `f871…` is `logo-disc.svg`, `95b5…` `map-brasov-localities-q3-2026.svg`, `ed94…` `graph-brasov-counterparties.svg`, `895a…` `map-flow-brasov.svg`, `7973…` `map-q3-2026-authority.svg`.

The snapshots are the artboards' markup as static pages, rendered with headless Chrome for the screenshots.
