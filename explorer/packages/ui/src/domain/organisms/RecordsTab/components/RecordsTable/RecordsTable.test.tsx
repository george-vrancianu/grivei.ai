import { screen, within } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityRecords, highlightedRecord, supplierRecords } from "../../../../samples/fixtureData.ts";
import type { EntityRole, RecordsTabData } from "../../../../types.ts";
import { RecordsTable } from "./index.ts";

function show(records: RecordsTabData, role: EntityRole, locale: "en" | "ro" = "en", rows: RecordsTabData["records"]["rows"] = records.records.rows) {
  const copy = sampleCopy.recordsTab(locale);
  renderInUi(
    <RecordsTable
      rows={rows}
      role={role}
      entityHref={(e, r) => `/explore/${r}/${e.key}`}
      recordHref={(r) => `/explore/record/${r.code}`}
      locale={locale}
      copy={{ ...copy.table, recordRow: copy.recordRow }}
    />,
    locale,
  );
}

describe("RecordsTable", () => {
  it("has a row per Record with its code, a linked title and the full value", () => {
    show(supplierRecords, "supplier");
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(supplierRecords.records.rows.length);
    const first = supplierRecords.records.rows[0]!.record;
    expect(within(rows[0]!).getByText(first.code)).toBeVisible();
    expect(within(rows[0]!).getByRole("link", { name: first.title })).toHaveAttribute("href", `/explore/record/${first.code}`);
  });

  it("links the authority on a supplier's page and the winners on an authority's", () => {
    show(supplierRecords, "supplier");
    const first = supplierRecords.records.rows[0]!.record;
    expect(screen.getAllByRole("link", { name: first.authority.displayName })[0]).toHaveAttribute("href", `/explore/authority/${first.authority.key}`);
  });

  it("names the columns in Romanian", () => {
    show(authorityRecords, "authority", "ro");
    expect(screen.getByRole("columnheader", { name: "Înregistrare" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Titlu" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Câștigători" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Valoare" })).toBeVisible();
  });

  it.each([
    ["en", "Matched in title:"],
    ["ro", "Potrivit în titlu:"],
  ] as const)("says why a Record matched the search, with exactly the matched ranges marked (%s)", (locale, line) => {
    show(authorityRecords, "authority", locale, [highlightedRecord]);
    const { text, highlights } = highlightedRecord.matchedField!;
    const cell = screen.getByRole("link", { name: highlightedRecord.record.title }).closest("td")!;
    expect(cell).toHaveTextContent(line);
    expect([...cell.querySelectorAll("mark")].map((m) => m.textContent)).toEqual(highlights.map(([s, e]) => text.slice(s!, e!)));
  });

  it("shows no matched line for a Record without one", () => {
    const row = { ...highlightedRecord, matchedField: null };
    show(authorityRecords, "authority", "en", [row]);
    expect(screen.queryByText(/Matched in/)).toBeNull();
  });
});
