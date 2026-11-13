import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { ceilingRecord, consortiumRecord, highlightedRecord, naturalPersonRecord, nameOnlyParty, noValueRecord, overCapSignalRecords } from "../../samples/fixtureData.ts";
import type { RecordResult } from "../../types.ts";
import { formatMoney } from "../../atoms/MoneyAmount/moneyAmount.utils.ts";
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

describe("RecordResultRow Signal badges", () => {
  const row = overCapSignalRecords.records.rows[0]!;
  const badges = (locale: "en" | "ro") => ({ href: (s: { reproduce: { authority: string | null } }) => `/explore/authority/${s.reproduce.authority}/records?signal=over-cap`, copy: sampleCopy.signalBadge(locale) });
  const renderWith = (locale: "en" | "ro", signalBadges?: ReturnType<typeof badges>) =>
    renderInUi(
      <ul>
        <RecordResultRow row={row} recordHref="/explore/record/x" entityHref={entityHref} locale={locale} copy={sampleCopy.recordRow(locale)} signalBadges={signalBadges} />
      </ul>,
      locale,
    );

  it("shows a compact badge for the Signal a Record is in, linking to the Signal's Records, in English and Romanian", () => {
    expect(row.record.signals).toHaveLength(1);
    renderWith("en", badges("en"));
    expect(screen.getByRole("link", { name: "Over cap, 10 Jan 2023" })).toHaveAttribute("href", "/explore/authority/1000017/records?signal=over-cap");
  });

  it("says it in Romanian too", () => {
    renderWith("ro", badges("ro"));
    expect(screen.getByRole("link", { name: /^Peste plafon, / })).toBeVisible();
  });

  it("shows no badge when the row is given no Signal wiring", () => {
    renderWith("en");
    expect(screen.queryByRole("link", { name: /Over cap/ })).toBeNull();
  });
});

describe("RecordResultRow", () => {
  it("is two columns: the meta line and title on the left, the value over its caption on the right", () => {
    renderRow(highlightedRecord);
    const { record } = highlightedRecord;
    expect(screen.getByText(record.code)).toBeVisible();
    expect(screen.getByText(record.channel === "CONTRACT" ? "Contract" : "Direct purchase")).toBeVisible();
    expect(screen.getByText("awarded value")).toBeVisible();
    const value = screen.getByText("RON 5,000");
    const title = screen.getByRole("link", { name: record.title });
    expect(title.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says 'ceiling, not summed' under the value of a framework ceiling", () => {
    renderRow(ceilingRecord);
    expect(screen.getByText("ceiling, not summed")).toBeVisible();
  });

  it("links the title to the Record page and shows value, date and authority", () => {
    const { container } = renderRow(highlightedRecord);
    const { record } = highlightedRecord;
    expect(screen.getByRole("link", { name: record.title })).toHaveAttribute("href", `/explore/record/${record.code}`);
    expect(container).toHaveTextContent("RON 5,000");
    expect(container.querySelector("time")).toHaveAttribute("datetime", record.date!);
    expect(screen.getByRole("link", { name: record.authority.displayName })).toHaveAttribute("href", `/explore/authority/${record.authority.key}`);
  });

  it("marks an authority identified by name only, like every other entity link", () => {
    const nameOnlyAuthority = { ...highlightedRecord, record: { ...highlightedRecord.record, authority: nameOnlyParty.entity! } };
    renderRow(nameOnlyAuthority);
    expect(screen.getByRole("link", { name: nameOnlyParty.entity!.displayName })).toHaveAttribute("href", `/explore/authority/${nameOnlyParty.entity!.key}`);
    expect(screen.getByText("name only")).toBeVisible();
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
    // the badge stays, for a reader who filtered by it, and its explanation says a Record shows the full value
    expect(consortiumRecord.record.badges).toContain("CONSORTIUM_SHARE");
    expect(screen.getByText("Consortium share")).toBeVisible();
    await userEvent.setup().hover(screen.getByText("Consortium share"));
    expect(await screen.findByText(/a Record shows the full value/)).toBeVisible();
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
    expect(container).toHaveTextContent("5.000 RON");
  });
});

describe("RecordResultRow in-county share line (#103)", () => {
  it.each(["en", "ro"] as const)("shows the share under the full value, labelled, only when the row has one (%s)", (locale) => {
    const share = consortiumRecord.record.winners[0]!.share!;
    const { container, unmount } = renderRow({ ...consortiumRecord, areaShare: share }, locale);
    const line = container.querySelector("[data-area-share]");
    expect(line?.textContent).toBe(sampleCopy.recordRow(locale).areaShare(formatMoney(share, locale, { showBani: true })));
    unmount();
    expect(renderRow({ ...consortiumRecord, areaShare: null }, locale).container.querySelector("[data-area-share]")).toBeNull();
  });
});
