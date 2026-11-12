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

export type PageItem = number | "gap";

/** The page numbers to link: first, last and the current page with one neighbour each side; "gap" stands for skipped pages. */
export function pageItems(page: number, pages: number): PageItem[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((n, i) => {
    const before = sorted[i - 1];
    if (before !== undefined && n - before === 2) items.push(n - 1);
    else if (before !== undefined && n - before > 2) items.push("gap");
    items.push(n);
  });
  return items;
}
