import { screen, within } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import type { RelationshipsTimeline } from "../../../../types.ts";
import { MonthlyTimeline } from "./index.ts";

const copy = sampleCopy.relationshipsTab("en").timeline;
const total = (awarded: string) => ({ awarded, records: 1, estimated: false, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", subsequentReported: "0" });
const timeline: RelationshipsTimeline = [
  { month: "2024-01", total: total("40000") }, { month: "2024-02", total: total("0") }, { month: "2024-03", total: total("10000") },
];

describe("MonthlyTimeline", () => {
  it("draws a bar per month and gives the same figures as a table", () => {
    const { container } = renderInUi(<MonthlyTimeline timeline={timeline} pickedTimeline={null} pickedName={null} locale="en" copy={copy} />);
    expect(container.querySelectorAll('rect[data-series="overall"]')).toHaveLength(3);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByRole("row", { name: /Jan 2024.*RON\s400/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: copy.label })).toBeInTheDocument();
  });
  it("highlights the picked counterparty's months and names it in the legend and table", () => {
    const { container } = renderInUi(
      <MonthlyTimeline timeline={timeline} pickedTimeline={[{ month: "2024-03", total: total("5000") }]} pickedName="ACME" locale="en" copy={copy} />,
    );
    expect(container.querySelectorAll('rect[data-series="picked"]')).toHaveLength(1);
    expect(screen.getAllByText("ACME").length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "ACME" })).toBeInTheDocument();
  });
  it("says so with no months", () => {
    renderInUi(<MonthlyTimeline timeline={[]} pickedTimeline={null} pickedName={null} locale="en" copy={copy} />);
    expect(screen.getByText(copy.empty)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
