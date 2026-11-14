import { render, screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { baniToRon, formatMoney, MoneyAmount } from "./index.ts";

// Intl separates digits with a no-break space in some locales; compare as a reader would.
const flat = (text: string) => text.replace(/[\s\u00a0\u202f]+/g, " ");

describe("MoneyAmount", () => {
  it("shows whole RON in English", () => {
    render(<MoneyAmount bani="142000000" locale="en" />);
    expect(flat(screen.getByText(/RON/).textContent!)).toBe("RON 1,420,000");
  });
  it("shows whole RON in Romanian number format", () => {
    render(<MoneyAmount bani="142000000" locale="ro" />);
    expect(flat(screen.getByText(/RON/).textContent!)).toBe("1.420.000 RON");
  });
  it("shows zero", () => {
    expect(flat(formatMoney("0", "en"))).toBe("RON 0");
  });
  it("rounds half up to whole RON and keeps bani on request", () => {
    expect(flat(formatMoney("12350", "en"))).toBe("RON 124");
    expect(flat(formatMoney("12349", "en"))).toBe("RON 123");
    expect(flat(formatMoney("12350", "en", { showBani: true }))).toBe("RON 123.50");
    expect(flat(formatMoney("1", "ro", { showBani: true }))).toBe("0,01 RON");
  });
  it("keeps every digit of an amount beyond Number.MAX_SAFE_INTEGER", () => {
    // 2^53 + 1 bani: a double would print ...992
    expect(Number.isSafeInteger(2 ** 53 + 1)).toBe(false);
    expect(flat(formatMoney("9007199254740993", "en", { showBani: true }))).toBe("RON 90,071,992,547,409.93");
    expect(flat(formatMoney("9007199254740993000", "en"))).toBe("RON 90,071,992,547,409,930");
  });
  it("shows a negative amount", () => {
    expect(flat(formatMoney("-250050", "en", { showBani: true }))).toBe("-RON 2,500.50");
  });
  it("has a compact form that keeps the full amount as its title", () => {
    render(<MoneyAmount bani="142000000" locale="en" compact />);
    const el = screen.getByText(/RON/);
    expect(flat(el.textContent!)).toBe("RON 1.4M");
    expect(flat(el.getAttribute("title")!)).toBe("RON 1,420,000.00");
  });
  it("converts bani to an exact decimal string and refuses anything else", () => {
    expect(baniToRon("5")).toBe("0.05");
    expect(baniToRon("100")).toBe("1.00");
    expect(baniToRon("-1234")).toBe("-12.34");
    expect(() => baniToRon("12.5")).toThrow();
    expect(() => baniToRon("1e5")).toThrow();
  });
  it("is set in the money variant: Plex Mono with tabular figures, at the size of the text around it", () => {
    renderInUi(
      <p style={{ fontSize: "40px" }}>
        <MoneyAmount bani="142000000" locale="en" />
      </p>,
    );
    const amount = screen.getByText(/RON/);
    const style = getComputedStyle(amount);
    expect(style.fontFamily).toContain("IBM Plex Mono");
    expect(style.fontVariantNumeric).toBe("tabular-nums");
    expect(style.fontSize).toBe("40px");
  });
});
