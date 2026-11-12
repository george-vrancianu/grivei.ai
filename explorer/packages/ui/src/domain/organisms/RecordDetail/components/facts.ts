/** A definition list laid out as label / value pairs, shared by the sections of the Record page. */
export const factsSx = {
  display: "grid",
  gridTemplateColumns: "max-content 1fr",
  columnGap: 3,
  rowGap: 0.5,
  m: 0,
  "& dt": { color: "text.secondary" },
  "& dd": { m: 0 },
} as const;
