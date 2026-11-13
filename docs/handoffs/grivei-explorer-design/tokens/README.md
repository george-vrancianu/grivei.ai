# Tokens moved

`tokens.json` now lives in the UI library: `explorer/packages/ui/src/theme/tokens.json`. It is the single source of truth; the MUI theme (`explorer/packages/ui/src/theme/`) is built from it. `mui-theme.draft.ts` is gone: the real theme replaces it.

`tokens.css` stays here as the design's own reference copy (it was generated from the old `tokens.json`); the explorer does not use it.
