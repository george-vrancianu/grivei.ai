import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { manyAliasesOverview as supplierOverview } from "../../../../samples/fixtureData.ts";
import { AppearsInSeapAs } from "./index.ts";

const show = (aliases: typeof supplierOverview.aliases, locale: "en" | "ro" = "en") =>
  renderInUi(<AppearsInSeapAs aliases={aliases} locale={locale} copy={sampleCopy.entityOverview(locale).aliases} />, locale);

describe("AppearsInSeapAs", () => {
  it("lists each spelling with its Record count and first and last dates", () => {
    show(supplierOverview.aliases);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(8);
    expect(within(items[0]!).getByText("CONSTRUCȚII TRANSILVANIA S.A.")).toBeVisible();
    expect(within(items[0]!).getByText("38 Records · first seen 12 Jan 2021, last 30 Oct 2024")).toBeVisible();
  });

  it("flags only the name that differs from ANAF", () => {
    show(supplierOverview.aliases);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).queryByText("Name differs from ANAF")).toBeNull();
    expect(within(items[3]!).getByText("Name differs from ANAF")).toBeVisible();
  });

  it("says 'seen on' for a spelling seen one day only, in the active language", () => {
    show([{ name: "X", records: 1, first: "2024-05-21", last: "2024-05-21", differsFromAnaf: false }], "ro");
    expect(screen.getByText("1 înregistrare · doar la 21 mai 2024")).toBeVisible();
  });

  it("renders nothing when there are no aliases", () => {
    show([]);
    expect(screen.queryByRole("region")).toBeNull();
  });
});
