import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { recordRows } from "../../../../samples/fixtureData.ts";
import { LargestRecords } from "./index.ts";

const show = (records: typeof recordRows) =>
  renderInUi(
    <LargestRecords
      records={records}
      entityHref={(e, r) => `/explore/${r}/${e.key}`}
      recordHref={(r) => `/explore/record/${r.code}`}
      locale="en"
      copy={sampleCopy.entityOverview("en").largest}
    />,
  );

describe("LargestRecords", () => {
  it("lists only counted Records, even when the API sends suspect and ceiling Records", () => {
    const uncounted = recordRows.filter((r) => r.counted === null);
    const counted = recordRows.filter((r) => r.counted !== null);
    expect(uncounted.length).toBeGreaterThan(0);
    show([...uncounted, ...counted]);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(counted.length);
    for (const record of uncounted) expect(screen.queryByRole("link", { name: record.title })).toBeNull();
    for (const record of counted) expect(screen.getByRole("link", { name: record.title })).toHaveAttribute("href", `/explore/record/${record.code}`);
  });

  it("shows the empty sentence when no Record is counted", () => {
    show(recordRows.filter((r) => r.counted === null));
    expect(screen.getByText("No counted Records in this selection.")).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
