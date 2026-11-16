/** Eight rows, each a little different, so the list reads as names of varying length. Widths are shares of the left column. */
export const ROW_SHAPES = [
  { name: "46%", meta: "58%" },
  { name: "34%", meta: "62%" },
  { name: "40%", meta: "54%" },
  { name: "52%", meta: "60%" },
  { name: "38%", meta: "50%" },
  { name: "44%", meta: "64%" },
  { name: "32%", meta: "56%" },
  { name: "48%", meta: "52%" },
] as const;

export const ROW_COUNT = ROW_SHAPES.length;

export type RowShape = (typeof ROW_SHAPES)[number];

/** The rows fade down the list: full strength at the top, 9 points less per row. */
export const rowOpacity = (index: number): number => Math.round((1 - index * 0.09) * 100) / 100;
