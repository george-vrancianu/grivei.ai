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
