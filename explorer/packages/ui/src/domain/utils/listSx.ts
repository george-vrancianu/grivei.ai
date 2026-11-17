import { color } from "../../theme/tokens.ts";

/** The row lists' shared look: no bullets, a rule between rows, long names wrap instead of widening the page. */
export const listSx = { listStyle: "none", m: 0, p: 0, "& > li": { minWidth: 0, overflowWrap: "anywhere" }, "& > li + li": { borderTop: 1, borderColor: "divider" } } as const;

/** A list row's look in a panel's flush body, on the pages other than the main screen (whose rows keep `ROW_INSET`): 12 px 16 px padding and a `raised` hover fill. Put it on each `li` of a `listSx` list, which brings the hairline between rows. */
export const listRowSx = { py: 1.5, px: 2, "&:hover": { backgroundColor: color.raised } } as const;
