export const DEFAULT_PAGE_SIZE = 50;

/** How many pages `count` results make at `pageSize` per page (0 when there are none). */
export function pageCount(count: number, pageSize: number): number {
  return count <= 0 ? 0 : Math.ceil(count / Math.max(1, pageSize));
}

/** The 1-based first and last result number a page shows, given how many rows it holds. */
export function pageRange(page: number, pageSize: number, shown: number): { from: number; to: number } {
  const from = (page - 1) * pageSize + 1;
  return { from, to: from + shown - 1 };
}
