import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityManyCounterpartiesOverview } from "../../../../samples/fixtureData.ts";
import { ProcedureTypes } from "./index.ts";

const show = (procedures: Parameters<typeof ProcedureTypes>[0]["procedures"]) =>
  renderInUi(<ProcedureTypes procedures={procedures} locale="en" copy={sampleCopy.entityOverview("en").procedures} />);

describe("ProcedureTypes", () => {
  it("lists each procedure as published with its money and Record count", () => {
    show(authorityManyCounterpartiesOverview.overview.procedures);
    const rows = within(screen.getByRole("region")).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText("Licitație deschisă")).toBeVisible();
    expect(within(rows[0]!).getByText(/RON 8,617,600,000/)).toBeVisible();
    expect(within(rows[0]!).getByText(/300 Records/)).toBeVisible();
  });

  it("is a sentence when there are no procedures", () => {
    show([]);
    expect(screen.getByText(sampleCopy.entityOverview("en").procedures.empty)).toBeVisible();
  });
});
