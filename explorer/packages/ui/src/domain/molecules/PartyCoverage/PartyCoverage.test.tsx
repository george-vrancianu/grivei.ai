import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import type { PartyCoverageData } from "../../types.ts";
import { PartyCoverage } from "./index.ts";

const RON = (n: number) => String(n * 100);
const coverage: PartyCoverageData = {
  party: "PARTIDUL SOCIAL DEMOCRAT",
  direct: { records: 3, awarded: RON(22_000_000) },
  subordinate: { records: 1, awarded: RON(8_000_000) },
  otherParties: { records: 2, awarded: RON(14_000_000) },
  independent: { records: 1, awarded: RON(1_000_000) },
  unattributed: { records: 3, awarded: RON(15_000_000) },
};
const show = (c: PartyCoverageData, locale: "en" | "ro" = "en") =>
  render(<PartyCoverage coverage={c} locale={locale} copy={sampleCopy.partyCoverage(locale)} methodologyHref="/explore/methodology#party-and-leadership" />);
const slice = (name: string) => screen.getByTestId("party-coverage").querySelector(`[data-slice="${name}"]`) as HTMLElement;

describe("PartyCoverage", () => {
  it("names the list as registered and splits the matched Records into direct and subordinate", () => {
    show(coverage);
    expect(screen.getByRole("heading", { name: "Party coverage: PARTIDUL SOCIAL DEMOCRAT" })).toBeVisible();
    expect(slice("direct")).toHaveTextContent(/Led by this list directly: 3 Records/);
    expect(slice("direct")).toHaveTextContent(/22,000,000/);
    expect(slice("subordinate")).toHaveTextContent(/Through subordinate bodies: 1 Record\b/);
    expect(slice("subordinate")).toHaveTextContent(/8,000,000/);
  });

  it("states what the filter leaves out, and the share of the value that no party is attributed to", () => {
    show(coverage);
    expect(slice("otherParties")).toHaveTextContent(/Led by other lists: 2 Records/);
    expect(slice("independent")).toHaveTextContent(/independent leaders \(not a party\): 1 Record\b/);
    expect(slice("unattributed")).toHaveTextContent(/Not attributed to a party: 3 Records/);
    const note = within(screen.getByTestId("party-coverage")).getByText(/of the value in this set is not attributed to any party/);
    expect(note).toHaveTextContent(/^25% of the value/); // 15m of the 60m the five slices make up
    expect(note).toHaveTextContent(/Central government, schools, municipal companies, ADIs and gaps in the mandates carry no Party/);
    expect(screen.getByRole("link", { name: "How a Party is attributed" })).toHaveAttribute("href", "/explore/methodology#party-and-leadership");
  });

  it("is in Romanian at /ro/, the list unchanged", () => {
    show(coverage, "ro");
    expect(screen.getByRole("heading", { name: "Acoperire pe partide: PARTIDUL SOCIAL DEMOCRAT" })).toBeVisible();
    expect(slice("direct")).toHaveTextContent(/Conduse direct de această listă: 3 înregistrări/);
    expect(slice("subordinate")).toHaveTextContent(/Prin organisme subordonate: 1 înregistrare\b/);
    expect(screen.getByText(/nu este atribuită niciunui partid/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Cum se atribuie un Partid" })).toBeVisible();
  });

  it("drops the share when the set has no value, but still says who carries no Party", () => {
    const zero = { records: 0, awarded: "0" };
    show({ ...coverage, direct: zero, subordinate: zero, otherParties: zero, independent: zero, unattributed: zero });
    expect(screen.queryByText(/of the value in this set/)).toBeNull();
    expect(screen.getByText(/Central government, schools/)).toBeVisible();
  });
});
