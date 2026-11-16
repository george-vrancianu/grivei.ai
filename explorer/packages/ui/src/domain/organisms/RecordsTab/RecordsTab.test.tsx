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
      order="VALUE_DESC"
      onOrderChange={() => {}}
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
  it("shows the filter bar, the Total panel and the Records of the page in a titled panel", () => {
    show(supplierRecords, "supplier");
    expect(screen.getByRole("region", { name: "Filter by facet" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Total awarded" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Records" })).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Total awarded" })).getByText("13")).toBeVisible();
    expect(screen.getByRole("link", { name: "Contract CAN9600001 1" })).toHaveAttribute("href", "/explore/record/CAN9600001~1");
    // the header row and one row per Record
    expect(within(screen.getByRole("table", { name: "Records of this entity" })).getAllByRole("row")).toHaveLength(14);
  });

  it("shows the filtered total and rows it is given, not the unfiltered ones", () => {
    show(supplierSplittingRecords, "supplier", { signal: "SPLITTING" });
    expect(within(screen.getByRole("region", { name: "Total awarded" })).getByText("5")).toBeVisible();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(6);
    expect(screen.queryByRole("link", { name: "Contract CAN9600001 1" })).toBeNull();
  });

  it("shows an active chip for every facet that is on when several are", () => {
    show(supplierSeveralFacetsRecords, "supplier", supplierSeveralFacetsFilter);
    const row = within(screen.getByRole("group", { name: "Active filters" }));
    for (const name of [/^Remove Contract/, /^Remove 2023/, /^Remove SPITALUL EXEMPLU/]) expect(row.getByRole("button", { name })).toBeVisible();
  });

  it("gives the Total panel the inset layout: the Records count is a figure beside the amount", () => {
    show(supplierRecords, "supplier");
    const panel = screen.getByRole("region", { name: "Total awarded" });
    expect(within(panel).getByText("Records")).toBeVisible();
    expect(within(panel).getByText("13")).toBeVisible();
  });

  it("puts the order in the Records panel's header and 'Showing 1–7 of n' in its foot", async () => {
    const onOrderChange = vi.fn();
    show(supplierSplittingRecords, "supplier", { signal: "SPLITTING" }, { onOrderChange });
    const panel = screen.getByRole("region", { name: "Records" });
    await userEvent.setup().selectOptions(within(panel).getByRole("combobox", { name: "order" }), "DATE_ASC");
    expect(onOrderChange).toHaveBeenCalledWith("DATE_ASC");
    expect(within(panel).getByText("Showing 1–5 of 5")).toBeVisible();
  });

  it("dims the panel bodies, not the bar, while busy", () => {
    show(supplierRecords, "supplier", {}, { busy: true });
    const panel = screen.getByRole("region", { name: "Records" });
    expect(panel.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole("region", { name: "Total awarded" }).querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole("region", { name: "Filter by facet" }).closest('[aria-busy="true"]')).toBeNull();
  });

  it("puts the failure note in the Records panel and keeps the filter bar", () => {
    show(supplierRecords, "supplier", {}, { failure: <p>The data could not be loaded.</p> });
    expect(within(screen.getByRole("region", { name: "Records" })).getByText("The data could not be loaded.")).toBeVisible();
    expect(screen.getByRole("region", { name: "Filter by facet" })).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows an estimated total with ≈", () => {
    show(authorityEstimatedRecords, "authority", { to: "2030-12-31" });
    expect(within(screen.getByRole("region", { name: "Total awarded" })).getByText(/^≈\s1,240,000$/)).toBeVisible();
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
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Award year/ }));
    await user.click(screen.getByRole("menuitemradio", { name: /^2023/ }));
    expect(onFilterChange).toHaveBeenCalledWith({ q: "străzi", from: "2023-01-01", to: "2023-12-31" });
  });

  describe("an empty result", () => {
    it("says nothing matches and clears the filters on screen, keeping the other fields", async () => {
      const filter: RecordFilter = { channel: "CONTRACT", q: "pod", valueBucket: "UP_TO_10K" };
      const onFilterChange = show(supplierNoMatches, "supplier", filter);
      expect(screen.getByText("No Records match these filters.")).toBeVisible();
      expect(screen.queryByRole("table")).toBeNull();
      const panel = screen.getByRole("region", { name: "Records" });
      await userEvent.setup().click(within(panel).getByRole("button", { name: "Clear filters" }));
      expect(onFilterChange).toHaveBeenCalledWith({ valueBucket: "UP_TO_10K" });
    });
    it("offers no clear button when no filter is on", () => {
      show(supplierNoMatches, "supplier", { county: "RO-BV" });
      expect(screen.getByText("No Records match these filters.")).toBeVisible();
      expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    });
  });

  it("is in Romanian under the ro locale", () => {
    show(supplierRecords, "supplier", {}, { locale: "ro", copy: sampleCopy.recordsTab("ro") });
    expect(screen.getByRole("heading", { level: 2, name: "Înregistrări" })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Anul atribuirii/ })).toBeVisible();
    expect(screen.getByText("Se afișează 1–13 din 13")).toBeVisible();
  });

  describe("the table and the slot above the totals", () => {
    it("names the counterparty column by the page's role: Authority on a supplier's page, Winners on an authority's", () => {
      show(supplierRecords, "supplier");
      expect(screen.getByRole("columnheader", { name: "Authority" })).toBeVisible();
    });

    it("shows the winners column on an authority's page", () => {
      show(authorityRecords, "authority");
      expect(screen.getByRole("columnheader", { name: "Winners" })).toBeVisible();
      expect(screen.getByRole("columnheader", { name: "Value" })).toBeVisible();
    });

    it("keeps a wide table inside its own scrolling box, so the page does not scroll sideways", () => {
      show(supplierRecords, "supplier");
      const box = screen.getByRole("region", { name: "Records of this entity" });
      expect(getComputedStyle(box).overflowX).toBe("auto");
    });

    it("has a slot for one more filter control in the bar, after the menus", () => {
      show(supplierRecords, "supplier", {}, { filterExtras: <a href="/only">only Records matching</a> });
      const extra = screen.getByRole("link", { name: "only Records matching" });
      const bar = screen.getByRole("region", { name: "Filter by facet" });
      const menus = within(bar).getAllByRole("button", { name: /Any/ });
      expect(bar).toContainElement(extra);
      expect(menus[menus.length - 1]!.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("shows no slot content when none is given", () => {
      show(supplierRecords, "supplier");
      expect(screen.queryByRole("link", { name: "only Records matching" })).toBeNull();
    });
  });
});
