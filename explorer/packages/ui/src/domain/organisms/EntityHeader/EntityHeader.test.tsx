import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import {
  authorityHeader,
  bothRolesHeader,
  curatedEntity,
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
    expect(screen.getByRole("heading", { level: 1, name: "COMUNA SANPETRU" })).toBeVisible();
    expect(screen.getByText("51000005")).toBeVisible();
    expect(screen.getByText("Sânpetru, Brașov")).toBeVisible();
    expect(screen.getByText("(placed by ANAF)")).toBeVisible();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("says a name-only supplier is identified by name only and shows its foreign VAT id, never a CUI", () => {
    show(nameOnlySupplierHeader, "SUPPLIER");
    expect(screen.getByText("Identified by name only")).toBeVisible();
    expect(screen.getByText("Foreign VAT ID")).toBeVisible();
    expect(screen.getByText("BG103029862")).toBeVisible();
    expect(screen.queryByText("CUI")).not.toBeInTheDocument();
    expect(screen.getByText("Name and status from SEAP, fetched 15 September 2023")).toBeVisible();
  });

  it("says it in Romanian", () => {
    show(nameOnlySupplierHeader, "SUPPLIER", "ro");
    expect(screen.getByText("Identificat doar după denumire")).toBeVisible();
    expect(screen.getByText("Denumire și stare de la SEAP, preluate la 15 septembrie 2023")).toBeVisible();
  });

  it("badges an ANAF status that is not active, and a CUI supplier in good standing gets no badge", () => {
    const { unmount } = show(deregisteredHeader, "SUPPLIER");
    expect(screen.getByText("ANAF status: RADIERE")).toBeVisible();
    unmount();
    show(supplierHeader, "SUPPLIER");
    expect(screen.queryByText(/ANAF status/)).not.toBeInTheDocument();
  });

  it("marks a curated identity", () => {
    show(curatedEntity, "SUPPLIER"); // curation needs an override file the recorded archives do not carry: the hand fixture
    expect(screen.getByText("Identity curated")).toBeVisible();
    expect(screen.getByText("National")).toBeVisible();
  });

  it("shows Unplaced for an entity no Source places", () => {
    show(unplacedAuthorityHeader, "AUTHORITY");
    expect(screen.getByText("Unplaced")).toBeVisible();
  });

  it("offers the role switch only to an entity that both buys and sells, with the current role marked", () => {
    show(bothRolesHeader, "SUPPLIER");
    const nav = screen.getByRole("navigation", { name: "Roles of this entity" });
    expect(nav).toBeVisible();
    expect(screen.getByRole("link", { name: "sells · supplier" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "buys · contracting authority" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "buys · contracting authority" })).toHaveAttribute("href", "/explore/authority/x");
  });

  it("hands a plain click on a role link to onNavigate, and leaves a modified click to the browser", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    show(bothRolesHeader, "SUPPLIER", "en", (href) => seen.push(href));
    await user.click(screen.getByRole("link", { name: "buys · contracting authority" }));
    expect(seen).toEqual(["/explore/authority/x"]);
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link", { name: "buys · contracting authority" }));
    await user.keyboard("{/Control}");
    expect(seen).toHaveLength(1);
  });

  it("fills the page's role chip and mutes the role the entity has no Records in, without a link", () => {
    show(authorityHeader, "AUTHORITY");
    expect(screen.getByText("buys · contracting authority")).toBeVisible();
    expect(screen.getByText("buys · contracting authority")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("sells · no Records as supplier")).toBeVisible();
    expect(screen.queryByRole("link", { name: /sells/ })).toBeNull();
  });

  it("says the same in Romanian", () => {
    show(authorityHeader, "AUTHORITY", "ro");
    expect(screen.getByText("cumpără · autoritate contractantă")).toBeVisible();
    expect(screen.getByText("vinde · nicio înregistrare ca furnizor")).toBeVisible();
  });

  it("says which names SEAP publishes the entity under, with the Records and the dates", () => {
    show(bothRolesHeader, "AUTHORITY");
    const line = screen.getByText(/^Appears in SEAP as/);
    expect(line).toBeVisible();
    for (const alias of bothRolesHeader.aliases) expect(line).toHaveTextContent(alias.name);
    expect(line).toHaveTextContent(/Records? · .+ to /);
  });
});
