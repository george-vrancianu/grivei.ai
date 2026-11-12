/** The row lists' shared look: no bullets, a rule between rows. */
export const listSx = { listStyle: "none", m: 0, p: 0, "& > li + li": { borderTop: 1, borderColor: "divider" } } as const;
