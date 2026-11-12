import { pageCount, pageItems, pageRange } from "./fullResults.utils.ts";

describe("pageCount", () => {
  it("rounds up and is 0 for no results", () => {
    expect(pageCount(0, 50)).toBe(0);
    expect(pageCount(50, 50)).toBe(1);
    expect(pageCount(51, 50)).toBe(2);
  });
});

describe("pageRange", () => {
  it("numbers the results a page shows", () => {
    expect(pageRange(1, 50, 50)).toEqual({ from: 1, to: 50 });
    expect(pageRange(3, 50, 7)).toEqual({ from: 101, to: 107 });
  });
});

describe("pageItems", () => {
  it("lists every page of a short run", () => {
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4]);
  });
  it("collapses distant pages into a gap, keeping first, last and the neighbours", () => {
    expect(pageItems(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });
  it("fills a gap of one page instead of marking it", () => {
    expect(pageItems(4, 8)).toEqual([1, 2, 3, 4, 5, "gap", 8]);
  });
  it("handles a single page", () => {
    expect(pageItems(1, 1)).toEqual([1]);
  });
});
