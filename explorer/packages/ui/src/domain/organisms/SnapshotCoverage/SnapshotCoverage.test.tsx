import { fixtures } from "@grivei/contract/fixtures";
import { screen, within } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import type { SnapshotCellData } from "../../types.ts";
import { SnapshotCoverage } from "./index.ts";

const recorded = fixtures.OnrcCoverage[0]!.data;
const cells = recorded.coverage.grid as SnapshotCellData[];
const dataThrough = recorded.sources.find((s) => s.id === "ONRC")!.dataThrough[0];

describe("SnapshotCoverage", () => {
  it("lists the snapshots newest first, a known gap for the month with none, and the data-through date", () => {
    renderInUi(<SnapshotCoverage cells={cells} dataThrough={dataThrough} locale="en" copy={sampleOnrcCopy.snapshots("en")} />);
    expect(screen.getByText(/Registrations: data through/)).toHaveTextContent("Registrations: data through 6 May 2026");
    const rows = within(screen.getByRole("table", { name: "ONRC snapshots" })).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.getAttribute("data-state"))).toEqual(["LOADED", "KNOWN_GAP", "LOADED"]);
    expect(rows[0]).toHaveTextContent("Snapshot of 6 May 2026");
    expect(rows[0]).toHaveTextContent("13");
    expect(rows[2]).toHaveTextContent("Snapshot of 2 March 2026");
  });

  it("lists the newest snapshot once when a ROLE cell shares its period, counting only registrations", () => {
    const withRole: SnapshotCellData[] = [...cells, { ...cells[2]!, kind: "ROLE", records: 99 }];
    renderInUi(<SnapshotCoverage cells={withRole} dataThrough={dataThrough} locale="en" copy={sampleOnrcCopy.snapshots("en")} />);
    const rows = within(screen.getByRole("table", { name: "ONRC snapshots" })).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(screen.queryByText("99")).toBeNull();
  });

  it("says a month with no snapshot is not held, for a gap whose rule is null, and does not say why ONRC published nothing", () => {
    renderInUi(<SnapshotCoverage cells={cells} dataThrough={dataThrough} locale="en" copy={sampleOnrcCopy.snapshots("en")} />);
    const gap = screen.getAllByRole("row").find((r) => r.getAttribute("data-state") === "KNOWN_GAP")!;
    expect(gap).toHaveTextContent("Apr 2026");
    expect(gap).toHaveTextContent("Known gap");
    expect(gap).toHaveTextContent("No snapshot of this month is held.");
  });

  it("reads in Romanian", () => {
    renderInUi(<SnapshotCoverage cells={cells} dataThrough={dataThrough} locale="ro" copy={sampleOnrcCopy.snapshots("ro")} />, "ro");
    const gap = screen.getAllByRole("row").find((r) => r.getAttribute("data-state") === "KNOWN_GAP")!;
    expect(gap).toHaveTextContent("Nu deținem niciun instantaneu din această lună.");
    expect(screen.getByText(/Înmatriculări: date până la/)).toBeVisible();
  });

  it("says no snapshot is held when there is no cell", () => {
    renderInUi(<SnapshotCoverage cells={[]} dataThrough={undefined} locale="en" copy={sampleOnrcCopy.snapshots("en")} />);
    expect(screen.getByRole("status")).toHaveTextContent("No ONRC snapshot is held yet.");
    expect(screen.queryByRole("table")).toBeNull();
  });
});
