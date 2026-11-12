import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { consortiumRecord, highlightedRecord, naturalPersonRecord, noValueRecord } from "../../samples/fixtureData.ts";
import type { RecordResult } from "../../types.ts";
import { RecordResultRow } from "./index.ts";

const entityHref = (entity: { key: string }, role: string) => `/explore/${role}/${entity.key}`;
function renderRow(row: RecordResult, locale: "en" | "ro" = "en") {
  return renderInUi(
    <ul>
      <RecordResultRow row={row} recordHref={`/explore/record/${row.record.code}`} entityHref={entityHref} locale={locale} copy={sampleCopy.recordRow(locale)} />
    </ul>,
    locale,
  );
}

describe("RecordResultRow", () => {
  it("links the title to the Record page and shows value, date and authority", () => {
    const { container } = renderRow(highlightedRecord);
    const { record } = highlightedRecord;
    expect(screen.getByRole("link", { name: record.title })).toHaveAttribute("href", `/explore/record/${record.code}`);
    expect(container).toHaveTextContent("RON 300,000");
    expect(container.querySelector("time")).toHaveAttribute("datetime", record.date!);
    expect(screen.getByRole("link", { name: record.authority.displayName })).toHaveAttribute("href", `/explore/authority/${record.authority.key}`);
  });

  it("says why it matched: the field and the matched text with exactly the ranges marked", () => {
    const { container } = renderRow(highlightedRecord);
    const { field, text, highlights } = highlightedRecord.matchedField!;
    expect(field).toBe("TITLE");
    expect(container).toHaveTextContent("Matched in title:");
    expect([...container.querySelectorAll("mark")].map((m) => m.textContent)).toEqual(highlights.map(([s, e]) => text.slice(s!, e!)));
  });

  it("shows no 'why it matched' line when there is no matched field", () => {
    const { container } = renderRow(consortiumRecord);
    expect(consortiumRecord.matchedField).toBeNull();
    expect(container).not.toHaveTextContent("Matched in");
    expect(container.querySelector("mark")).toBeNull();
  });

  it("shows the full value of a consortium Record with a marker that explains it, not a member's share", async () => {
    const { container } = renderRow(consortiumRecord);
    expect(consortiumRecord.record.winners).toHaveLength(2);
    expect(container).toHaveTextContent("RON 30,000,000"); // the full value; each share is RON 15,000,000
    expect(container).not.toHaveTextContent("15,000,000");
    const marker = screen.getByText("consortium");
    await userEvent.setup().hover(marker);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("The full contract value is shown. Each member's share is an equal-share convention");
    // the marker replaces the duplicate badge
    expect(screen.queryByText("Consortium share")).toBeNull();
  });

  it("has no consortium marker for a single winner", () => {
    renderRow(highlightedRecord);
    expect(screen.queryByText("consortium")).toBeNull();
  });

  it("renders 'no value' when the value is null", () => {
    const { container } = renderRow(noValueRecord);
    expect(noValueRecord.record.value).toBeNull();
    expect(container).toHaveTextContent("no value");
    expect(container).not.toHaveTextContent("RON");
  });

  it("renders a natural-person winner as Persoană fizică, unlinked and unnamed", () => {
    const { container } = renderRow(naturalPersonRecord);
    expect(container).toHaveTextContent("Persoană fizică");
    const names = naturalPersonRecord.record.winners.filter((w) => w.naturalPerson).map((w) => w.publishedName);
    for (const name of names) if (name) expect(container).not.toHaveTextContent(name);
  });

  it("reads in Romanian", () => {
    const { container } = renderRow(highlightedRecord, "ro");
    expect(container).toHaveTextContent("Potrivit în titlu:");
    expect(container).toHaveTextContent("300.000 RON");
  });
});
