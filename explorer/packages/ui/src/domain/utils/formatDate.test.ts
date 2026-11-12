import { formatDate } from "./formatDate.ts";

describe("formatDate", () => {
  it("formats an ISO date day-month-year in both languages, never shifted by the time zone", () => {
    expect(formatDate("2024-09-30", "en")).toBe("30 Sept 2024");
    expect(formatDate("2024-09-30", "en", "long")).toBe("30 September 2024");
    expect(formatDate("2024-01-01", "ro", "long")).toBe("1 ianuarie 2024");
  });
});
