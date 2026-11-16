/** The Signals column's width in px, from 600 px up (the Signal chip sits left-aligned in it). */
export const SIGNALS_COLUMN = 136;
/** The amount column's width in px, from 600 px up (right-aligned). */
export const AMOUNT_COLUMN = 150;
/** The row's and head's side padding (theme spacing units, 20 px) when the list sits flush in a panel (`inset`), so their fills reach the panel's edges while the text stays at 20 px. */
export const ROW_INSET = 2.5;

/** The row's layout, shared by `EntityResultRow` and its skeleton so the skeleton keeps the real row's shape: the name column on the left, the Signals and amount pair on the right (wrapping under the name below 600 px). */
export const rowLayoutSx = { display: "flex", flexWrap: "wrap", alignItems: "center", rowGap: 0.75, columnGap: 2, py: 1.5 } as const;
/** The left column's flex: the full width below 600 px, a 240 px basis from 600 px up. */
export const nameColumnSx = { flex: { xs: "1 1 100%", sm: "1 1 240px" }, minWidth: 0 } as const;
/** The right pair's box: Signals then amount, pushed to the right edge from 600 px up. */
export const pairSx = { display: "flex", alignItems: "center", flex: "none", ml: { sm: "auto" } } as const;
