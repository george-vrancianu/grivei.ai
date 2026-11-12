import { pageCount, pageRange } from "./fullResults.utils.ts";

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
