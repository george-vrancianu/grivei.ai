import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import {
  authorityHeader,
  bothRolesHeader,
  deregisteredHeader,
  nameOnlySupplierHeader,
  supplierHeader,
  unplacedAuthorityHeader,
} from "../../samples/fixtureData.ts";
import type { EntityHeaderData, EntityPageRole } from "../../types.ts";
import type { Locale } from "../../../theme/index.ts";
import { EntityHeader } from "./index.ts";

const roleHref = (role: EntityPageRole) => `/explore/${role.toLowerCase()}/x`;
function show(entity: EntityHeaderData, role: EntityPageRole, locale: Locale = "en", onNavigate?: (href: string) => void) {
  return renderInUi(
    <EntityHeader
      entity={entity}
      role={role}
      roleHref={roleHref}
      onNavigate={onNavigate}
      locale={locale}
      copy={sampleCopy.entityHeader(locale)}
    />,
    locale,
  );
}

describe("EntityHeader", () => {
  it("shows an authority's name as the heading, its CUI and where it is placed", () => {
    show(authorityHeader, "AUTHORITY");
    expect(screen.getByRole("heading", { level: 1, name: "MUNICIPIUL BRAȘOV" })).toBeVisible();
    expect(screen.getByText("4000001")).toBeVisible();
    expect(screen.getByText("Brașov, Brașov")).toBeVisible();
    expect(screen.getByText("(placed by ANAF)")).toBeVisible();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("says a name-only supplier is identified by name only and shows its foreign VAT id, never a CUI", () => {
    show(nameOnlySupplierHeader, "SUPPLIER");
    expect(screen.getByText("Identified by name only")).toBeVisible();
    expect(screen.getByText("Foreign VAT ID")).toBeVisible();
    expect(screen.getByText("DE811128135")).toBeVisible();
    expect(screen.queryByText("CUI")).not.toBeInTheDocument();
    expect(screen.getByText("Name and status from SEAP, fetched 1 October 2024")).toBeVisible();
  });

  it("says it in Romanian", () => {
    show(nameOnlySupplierHeader, "SUPPLIER", "ro");
    expect(screen.getByText("Identificat doar după denumire")).toBeVisible();
    expect(screen.getByText("Denumire și stare de la SEAP, preluate la 1 octombrie 2024")).toBeVisible();
  });

  it("badges an ANAF status that is not active, and a CUI supplier in good standing gets no badge", () => {
    const { unmount } = show(deregisteredHeader, "SUPPLIER");
    expect(screen.getByText("ANAF status: RADIERE")).toBeVisible();
    unmount();
    show(supplierHeader, "SUPPLIER");
    expect(screen.queryByText(/ANAF status/)).not.toBeInTheDocument();
  });

  it("marks a curated identity", () => {
    show(bothRolesHeader, "SUPPLIER");
    expect(screen.getByText("Identity curated")).toBeVisible();
    expect(screen.getByText("National")).toBeVisible();
  });

  it("shows Unplaced for an entity no Source places", () => {
    show(unplacedAuthorityHeader, "AUTHORITY");
    expect(screen.getByText("Unplaced")).toBeVisible();
  });

  it("offers the role switch only to an entity that both buys and sells, with the current role marked", () => {
    show(bothRolesHeader, "SUPPLIER");
    const nav = screen.getByRole("navigation", { name: "View as" });
    expect(nav).toBeVisible();
    expect(screen.getByRole("link", { name: "As supplier" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "As authority" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "As authority" })).toHaveAttribute("href", "/explore/authority/x");
  });

  it("hands a plain click on a role link to onNavigate, and leaves a modified click to the browser", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    show(bothRolesHeader, "SUPPLIER", "en", (href) => seen.push(href));
    await user.click(screen.getByRole("link", { name: "As authority" }));
    expect(seen).toEqual(["/explore/authority/x"]);
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link", { name: "As authority" }));
    await user.keyboard("{/Control}");
    expect(seen).toHaveLength(1);
  });
});
