/** How many subsequent contracts show before the reader asks for more. */
export const PREVIEW_ROWS = 5;

export interface SubsequentView {
  /** How many rows are on screen. */
  shown: number;
  /** The framework's true number of subsequent contracts (never less than the rows fetched). */
  total: number;
  /** A foot is only needed when something is cut or can be cut. */
  hasFoot: boolean;
  /** Some contracts are not among the fetched rows (over the fetch limit): the list cannot show all of them. */
  beyondList: boolean;
  /** More rows than the preview: the list can expand. */
  canExpand: boolean;
}

/** What the list of subsequent contracts shows, given the fetched rows, the true count and whether the reader expanded it. */
export function subsequentView(fetched: number, count: number, expanded: boolean): SubsequentView {
  const total = Math.max(count, fetched);
  const canExpand = fetched > PREVIEW_ROWS;
  const beyondList = total > fetched;
  return { shown: canExpand && !expanded ? PREVIEW_ROWS : fetched, total, hasFoot: canExpand || beyondList, beyondList, canExpand };
}
