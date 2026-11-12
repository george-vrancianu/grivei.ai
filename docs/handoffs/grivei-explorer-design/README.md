# Grivei Explorer: design handoff (A · Graf)

Design reference for the Release 1 explorer, issue #37 of `george-vrancianu/grivei.ai`. Handed off on 2026-11-12. Read `CLAUDE.md` first: it maps every screen to its route and issues, lists the tokens and components, and says which numbers are real.

## Preview

Serve the folder and open the index:

```bash
python3 -m http.server 8000
# http://localhost:8000/
```

Opening `index.html` straight from disk also works in Chrome. Firefox may refuse the fonts from a parent folder when a page is opened from disk, so prefer the server.

## Contents

| Path | What it is |
|---|---|
| `index.html` | Links to all 13 screens |
| `screens/` | Static snapshots with inline styles. Controls do not work; each state is its own file |
| `screenshots/` | PNG of each screen at 1440 px wide, and two at 390 px |
| `tokens/` | `tokens.json`, `tokens.css` (generated from it), `mui-theme.draft.ts` (uncompiled draft for #40) |
| `assets/` | Logo and the map and graph images. Files ending in `.placeholder.svg` carry invented shading |
| `fonts/` | Font files and licences copied from `site/fonts`, plus `fonts.css` |
| `canvas-source/` | The design's own source, one file per screen or state wrapper |
| `CLAUDE.md` | Context, decisions, conventions, data notes and open questions |

## Source

The design canvas: https://claude.ai/artifact/5FwtuH7oQv1X1pEPFSHKYF (private to the owner). Page "A · Graf screens" holds these screens; page "Versions" holds the four directions that were compared.

The screens show sample data. `CLAUDE.md` says what is real and what is a placeholder.
