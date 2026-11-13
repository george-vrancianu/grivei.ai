/** The row lists' shared look: no bullets, a rule between rows, long names wrap instead of widening the page. */
export const listSx = { listStyle: "none", m: 0, p: 0, "& > li": { minWidth: 0, overflowWrap: "anywhere" }, "& > li + li": { borderTop: 1, borderColor: "divider" } } as const;
