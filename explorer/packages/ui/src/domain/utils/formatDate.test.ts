import { formatDate, formatMonth } from "./formatDate.ts";

describe("formatDate", () => {
  it("formats an ISO date day-month-year in both languages, never shifted by the time zone", () => {
    expect(formatDate("2024-09-30", "en")).toBe("30 Sept 2024");
    expect(formatDate("2024-09-30", "en", "long")).toBe("30 September 2024");
    expect(formatDate("2024-01-01", "ro", "long")).toBe("1 ianuarie 2024");
  });
});

describe("formatMonth", () => {
  it("formats in the page's language", () => {
    expect(formatMonth("2024-01", "en")).toMatch(/Jan.*2024/);
    expect(formatMonth("2024-01", "ro")).toMatch(/ian.*2024/i);
  });
  it("keeps what it cannot read", () => expect(formatMonth("soon", "en")).toBe("soon"));
});
