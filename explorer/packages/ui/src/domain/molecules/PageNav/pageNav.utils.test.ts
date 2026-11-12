import { pageItems } from "./pageNav.utils.ts";

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
