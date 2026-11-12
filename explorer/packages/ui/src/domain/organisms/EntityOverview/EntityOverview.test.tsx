import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import {
  authorityManyCounterpartiesOverview, authorityOverview, emptyOverview, manyAliasesOverview, supplierOverview,
} from "../../samples/fixtureData.ts";
import type { EntityAliases, EntityOverviewData, EntityRole } from "../../types.ts";
import { EntityOverview } from "./index.ts";

function show(data: { overview: EntityOverviewData; aliases: EntityAliases }, role: EntityRole, locale: Locale = "en", signals?: React.ReactNode) {
  renderInUi(
    <EntityOverview
      overview={data.overview}
      aliases={data.aliases}
      role={role}
      entityHref={(e, r) => `/explore/${r}/${e.key}`}
      recordHref={(r) => `/explore/record/${r.code}`}
      methodologyHref="/explore/methodology"
      suspectHref="/s"
      locale={locale}
      copy={sampleCopy.entityOverview(locale)}
      signals={signals}
    />,
    locale,
  );
}

describe("the Overview tab", () => {
  it("shows the headline numbers of a supplier", () => {
    show(supplierOverview, "supplier");
    const headline = screen.getByRole("list", { name: "Headline numbers" });
    expect(within(headline).getByText("RON 5,761,440")).toBeVisible();
    expect(within(headline).getByText("The largest holds 66.7% of the total")).toBeVisible();
    expect(within(headline).getByText("93.6%")).toBeVisible();
    expect(within(headline).getByText("1 suspect value left out")).toBeVisible();
  });

  it("puts the Signals the slot holds under a heading with their count, and says so when there are none", () => {
    show(supplierOverview, "supplier", "en", <p>the cards</p>);
    expect(screen.getByRole("heading", { name: "Signals (6)" })).toBeVisible();
    expect(screen.getByText("the cards")).toBeVisible();
  });

  it("says there are no Signals for an entity without any", () => {
    show(authorityOverview, "authority", "en", <p>the cards</p>);
    expect(screen.getByRole("heading", { name: "Signals (0)" })).toBeVisible();
    expect(screen.getByText("No Signals for this entity.")).toBeVisible();
    expect(screen.queryByText("the cards")).toBeNull();
  });

  it("lists every section of an authority with many counterparties, and the framework line with its ceilings", () => {
    show(authorityManyCounterpartiesOverview, "authority");
    expect(screen.getByText("4 framework agreements, ceilings RON 100,000,000, reported subsequent contracts RON 112,400,000")).toBeVisible();
    expect(screen.getByRole("region", { name: "Consortia" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Procedure types" })).toBeVisible();
    expect(screen.getByText("and 216 more")).toBeVisible();
  });

  it("shows the Romanian copy under /ro/", () => {
    show(authorityManyCounterpartiesOverview, "authority", "ro");
    expect(screen.getByRole("heading", { name: "Cele mai mari înregistrări" })).toBeVisible();
    expect(screen.getByText("și încă 216")).toBeVisible();
    expect(screen.getByText("Persoană fizică")).toBeVisible();
  });

  it("has an empty sentence for every list when nothing is in the filter", () => {
    show(emptyOverview, "authority");
    expect(screen.getByText("No counterparties in this selection.")).toBeVisible();
    expect(screen.getByText("No procedures in this selection.")).toBeVisible();
    expect(screen.getByText("No framework agreements.")).toBeVisible();
    expect(screen.getByText("No counted Records in this selection.")).toBeVisible();
  });

  it("shows many aliases, the ones that differ from ANAF flagged", () => {
    show(manyAliasesOverview, "supplier");
    const aliases = screen.getByRole("region", { name: "Appears in SEAP as" });
    expect(within(aliases).getAllByRole("listitem")).toHaveLength(8);
    expect(within(aliases).getAllByText("Name differs from ANAF")).toHaveLength(5);
  });
});
