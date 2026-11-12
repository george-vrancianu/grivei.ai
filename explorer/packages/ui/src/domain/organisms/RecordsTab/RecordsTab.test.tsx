import type { RecordFilter } from "@grivei/contract";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import {
  authorityEstimatedRecords, authorityRecords, supplierNoMatches, supplierRecords, supplierSeveralFacetsFilter, supplierSeveralFacetsRecords, supplierSplittingRecords,
} from "../../samples/fixtureData.ts";
import type { EntityRole, RecordsTabData } from "../../types.ts";
import { RecordsTab, type RecordsTabProps } from "./index.ts";

function show(records: RecordsTabData, role: EntityRole, filter: RecordFilter = {}, props: Partial<RecordsTabProps> = {}) {
  const onFilterChange = vi.fn();
  renderInUi(
    <RecordsTab
      records={records}
      filter={filter}
      onFilterChange={onFilterChange}
      role={role}
      page={1}
      pageSize={100}
      pageHref={(n) => `/p?page=${n}`}
      entityHref={(e, r) => `/explore/${r}/${e.key}`}
      recordHref={(r) => `/explore/record/${r.code}`}
      methodologyHref="/explore/methodology"
      suspectHref="/s"
      locale="en"
      copy={sampleCopy.recordsTab("en")}
      {...props}
    />,
  );
  return onFilterChange;
}

describe("the Records tab", () => {
  it("shows the facet panel, the total and the Records of the page", () => {
    show(supplierRecords, "supplier");
    expect(screen.getByRole("complementary", { name: "Filter by facet" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Records" })).toBeVisible();
    expect(screen.getByText("13 Records")).toBeVisible();
    expect(screen.getByRole("link", { name: "Contract CAN9600001 1" })).toHaveAttribute("href", "/explore/record/CAN9600001~1");
    expect(screen.getAllByRole("listitem")).toHaveLength(13);
  });

  it("shows the filtered total and rows it is given, not the unfiltered ones", () => {
    show(supplierSplittingRecords, "supplier", { signal: "SPLITTING" });
    expect(screen.getByText("5 Records")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByRole("link", { name: "Contract CAN9600001 1" })).toBeNull();
  });

  it("marks every active facet when several are on", () => {
    show(supplierSeveralFacetsRecords, "supplier", supplierSeveralFacetsFilter);
    for (const name of [/^Contract/, /^2023/, /^SPITALUL EXEMPLU/]) expect(screen.getByRole("button", { name, pressed: true })).toBeVisible();
  });

  it("shows an estimated total with ≈", () => {
    show(authorityEstimatedRecords, "authority", { to: "2030-12-31" });
    expect(screen.getByText(/^≈\s1,240,000 Records$/)).toBeVisible();
  });

  it("pages the Records with real links when there is more than one page", () => {
    show(authorityEstimatedRecords, "authority", {}, { page: 2 });
    const nav = screen.getByRole("navigation", { name: "Result pages" });
    expect(within(nav).getByRole("link", { name: "Page 3" })).toHaveAttribute("href", "/p?page=3");
    expect(within(nav).getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  });

  it("shows no page links for a single page", () => {
    show(authorityRecords, "authority");
    expect(screen.queryByRole("navigation", { name: "Result pages" })).toBeNull();
  });

  it("changes the filter through onFilterChange", async () => {
    const onFilterChange = show(authorityRecords, "authority", { q: "străzi" });
    await userEvent.setup().click(screen.getByRole("button", { name: /^2023/ }));
    expect(onFilterChange).toHaveBeenCalledWith({ q: "străzi", from: "2023-01-01", to: "2023-12-31" });
  });

  describe("an empty result", () => {
    it("says nothing matches and clears only the facets, keeping the other fields", async () => {
      const filter: RecordFilter = { channel: "CONTRACT", q: "pod" };
      const onFilterChange = show(supplierNoMatches, "supplier", filter);
      expect(screen.getByText("No Records match these filters.")).toBeVisible();
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
      await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
      expect(onFilterChange).toHaveBeenCalledWith({ q: "pod" });
    });
    it("offers no clear button when no facet is on", () => {
      show(supplierNoMatches, "supplier", { q: "pod" });
      expect(screen.getByText("No Records match these filters.")).toBeVisible();
      expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    });
  });

  it("is in Romanian under the ro locale", () => {
    show(supplierRecords, "supplier", {}, { locale: "ro", copy: sampleCopy.recordsTab("ro") });
    expect(screen.getByRole("heading", { name: "Înregistrări" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Anul atribuirii" })).toBeVisible();
  });
});
