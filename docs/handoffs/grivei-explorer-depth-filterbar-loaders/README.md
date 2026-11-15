# Grivei Explorer: depth, filter bar and loaders (design handoff)

A redesign of the explorer's main screen, handed off on 2026-11-14: layered surfaces, the filters grouped in one bar with the Signals switch first, and loading states. Read `CLAUDE.md` first: it says what changes, where each change lands in `explorer/packages/`, which copy to add and which numbers are real.

Nothing under `explorer/` is changed by this branch.

## Preview

Serve `docs/handoffs/` (the snapshots load fonts, the logo and the map image from the first handoff, `../grivei-explorer-design/`) and open the index:

```bash
cd docs/handoffs
python3 -m http.server 8000
# http://localhost:8000/grivei-explorer-depth-filterbar-loaders/
```

Or look at `screenshots/`, which need no server.

## Contents

| Path | What it is |
|---|---|
| `CLAUDE.md` | The build brief: surfaces and shadows, layout, filter bar, loading, file map, copy, open questions |
| `index.html` | Links to the 9 snapshots |
| `screens/` | Static snapshots with inline styles. Controls do not work; each state is its own file |
| `screenshots/` | PNG of each state at 1440 px wide, and two at 390 px |
| `canvas-source/` | The design's own source: `Main.dc.html` holds every state behind one `view` setting; the other four files mount it; `canvas.json` is the canvas layout and notes |

## Source

The design canvas: https://claude.ai/artifact/PxkdQkRfri16pzaVYipgob (private to the owner). In `canvas-source/`, image addresses starting with `/_blob/` are the canvas's own uploads: `f871…` is `logo-disc.svg` and `95b5…` is `map-brasov-localities-q3-2026.svg`, both in `../grivei-explorer-design/assets/`.

The snapshots were produced from `canvas-source/Main.dc.html` by evaluating its template for each state, then rendered with headless Chrome for the screenshots.

The screens show sample data. `CLAUDE.md` says what is real and what is a placeholder.
