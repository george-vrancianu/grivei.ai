import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { RECORD_BADGES } from "../../atoms/BadgeChip/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import {
  blankCeilingPage, consortiumNameOnlyPage, consortiumPage, contractRecord, directPurchaseRecord, everyBadgePage, frameworkPage, naturalPersonPage,
  noValuePage, provisionalPage, subsequentPage, suspectDirectPage, suspectNoEstimatePage, suspectOverEstimatePage,
} from "../../samples/fixtureData.ts";
import type { RecordPageData } from "../../types.ts";
import { RecordDetail } from "./index.ts";

function show(record: RecordPageData, locale: Locale = "en") {
  return renderInUi(
    <RecordDetail
      record={record}
      entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
      recordHref={(code) => `/explore/record/${code}`}
      methodologyHref="/explore/methodology"
      locale={locale}
      copy={sampleCopy.recordDetail(locale)}
    />,
    locale,
  );
}
const section = (name: string) => within(screen.getByRole("region", { name }));

describe("RecordDetail", () => {
  it("shows the title as the heading, with date, kind, procedure, contract type and CPV as published", () => {
    show(contractRecord);
    expect(screen.getByRole("heading", { level: 1, name: contractRecord.title })).toBeVisible();
    expect(screen.getByText("8 November 2023")).toBeVisible();
    expect(screen.getByText("Contract")).toBeVisible();
    expect(screen.getByText("Licitație deschisă")).toBeVisible();
    expect(screen.getByText("Lucrări")).toBeVisible();
    expect(screen.getByText("45233140-2 Lucrări de drumuri")).toBeVisible();
  });

  it("names a DAN a direct purchase award notification, in both languages", () => {
    const dan: RecordPageData = { ...directPurchaseRecord, kind: "DAN" };
    const { unmount } = show(dan);
    expect(screen.getByText("Direct purchase award notification (DAN)")).toBeVisible();
    unmount();
    show(dan, "ro");
    expect(screen.getByText("Notificare de atribuire a cumpărării directe (DAN)")).toBeVisible();
  });

  it("shows the value as published and the counted value", () => {
    show(contractRecord);
    expect(screen.getByText("Value as published").nextElementSibling).toHaveTextContent("RON 12,800,000.00");
    expect(screen.getByText("Counted value").nextElementSibling).toHaveTextContent("RON 12,800,000.00");
  });

  it("links the authority and the winner to their entity pages", () => {
    show(contractRecord);
    expect(screen.getByRole("link", { name: contractRecord.authority.displayName })).toHaveAttribute("href", `/explore/authority/${contractRecord.authority.key}`);
    const winner = contractRecord.winners[0]!.entity!;
    expect(screen.getByRole("link", { name: winner.displayName })).toHaveAttribute("href", `/explore/supplier/${winner.key}`);
  });

  it("says 'no value in SEAP' for a null value, with nothing to count", () => {
    show(noValuePage);
    expect(screen.getByText("Value as published").nextElementSibling).toHaveTextContent("No value in SEAP");
    expect(screen.getByText("Counted value").nextElementSibling).toHaveTextContent("Nothing to count");
  });

  it("explains an empty counted value: a suspect value and a framework ceiling", () => {
    const { unmount } = show(suspectDirectPage);
    expect(screen.getByText("Counted value").nextElementSibling).toHaveTextContent("breaks a counting rule");
    unmount();
    show(frameworkPage);
    expect(screen.getByText("Counted value").nextElementSibling).toHaveTextContent("a framework ceiling is not money awarded");
  });

  it.each([
    [suspectDirectPage, "at least ten times the cap in force", "RON 270,120.00"],
    [suspectOverEstimatePage, "at least a hundred times the estimated value", "RON 40,000,000.00"],
    [suspectNoEstimatePage, "above 50 bn RON and e-licitatie gives no estimated value", null],
  ])("states the suspect rule and its threshold", (record, rule, threshold) => {
    show(record);
    const note = section("Suspect value rule");
    expect(note.getByText(new RegExp(rule))).toBeVisible();
    if (threshold) expect(note.getByText(new RegExp(threshold.replace(".", "\\.")))).toBeVisible();
    expect(note.getByRole("link", { name: "How values are counted" })).toHaveAttribute("href", "/explore/methodology");
  });

  it("shows a consortium's full value, every member and each equal share labelled as a convention", () => {
    show(consortiumPage);
    expect(screen.getByText("Counted value").nextElementSibling).toHaveTextContent("RON 30,000,000.00");
    const members = screen.getAllByRole("listitem").filter((li) => /\(equal share/.test(li.textContent ?? ""));
    expect(members).toHaveLength(2);
    for (const member of members) expect(member).toHaveTextContent("equal share RON 15,000,000.00");
    expect(screen.getByText(/counting convention, not a figure SEAP publishes/)).toBeVisible();
  });

  it("marks a name-only member as identified by name only, with its share", () => {
    show(consortiumNameOnlyPage);
    const marker = sampleCopy.entityLink("en").nameOnly.label;
    expect(screen.getAllByText(marker)).toHaveLength(2);
    expect(screen.getAllByText(/equal share RON 2,250,000.00/)).toHaveLength(2);
  });

  it("never names or links a natural-person winner", () => {
    const { container } = show(naturalPersonPage);
    expect(screen.getByText("Persoană fizică")).toBeVisible();
    expect(within(screen.getByText("Winners").nextElementSibling as HTMLElement).queryAllByRole("link")).toEqual([]);
    for (const party of naturalPersonPage.winners) if (party.publishedName) expect(container).not.toHaveTextContent(party.publishedName);
  });

  it("shows the framework line with its percentage, and the subsequent contracts", () => {
    show(frameworkPage);
    const framework = section("Framework agreement");
    expect(framework.getByText("Ceiling RON 100,000,000.00; subsequent contracts reported so far RON 112,400,000.00 (112.4%)")).toBeVisible();
    expect(framework.getByRole("heading", { name: "Subsequent contracts" })).toBeVisible();
    const sub = frameworkPage.framework!.subsequent[0]!;
    expect(framework.getByRole("link", { name: sub.title })).toHaveAttribute("href", `/explore/record/${sub.code}`);
  });

  it("leaves the percentage out when the ceiling is blank", () => {
    show(blankCeilingPage);
    expect(screen.getByText("Ceiling not published; subsequent contracts reported so far RON 0.00")).toBeVisible();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("links a subsequent contract back to its framework agreement", () => {
    show(subsequentPage);
    const agreement = subsequentPage.framework!.agreement!;
    expect(screen.getByRole("link", { name: agreement.title })).toHaveAttribute("href", `/explore/record/${agreement.code}`);
  });

  it("lists the Signals the Record belongs to with links to their Records, without accusatory words", () => {
    show(directPurchaseRecord);
    const signals = section("Signals this Record belongs to");
    expect(signals.getByRole("heading", { name: "Over cap" })).toBeVisible();
    expect(signals.getByRole("link", { name: directPurchaseRecord.title })).toHaveAttribute("href", `/explore/record/${directPurchaseRecord.code}`);
    expect(signals.getByText(/1 Record/)).toBeVisible();
    expect(signals.queryByText(/suspect|fraud|irregular|illegal|risk/i)).toBeNull();
  });

  it("shows the provenance verbatim and a Check in SEAP link that opens a new tab", () => {
    show(directPurchaseRecord);
    const provenance = section("Provenance");
    expect(provenance.getByText("data.gov.ro 2024 Q1 Achiziții directe")).toBeVisible();
    expect(provenance.getByText("Published bulk file")).toBeVisible();
    expect(provenance.getByText("2 October 2024")).toBeVisible();
    const link = provenance.getByRole("link", { name: "Check in SEAP" });
    expect(link).toHaveAttribute("href", directPurchaseRecord.provenance.url!);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("says there is no stable public page, instead of a link, when the URL is null", () => {
    show(provisionalPage);
    const provenance = section("Provenance");
    expect(provenance.queryByRole("link")).toBeNull();
    expect(provenance.getByText("SEAP has no stable public page for this Record yet.")).toBeVisible();
    expect(provenance.queryByText("File or notice")).toBeNull();
  });

  it.each(["en", "ro"] as const)("every badge shows its explanation as visible text (%s)", (locale) => {
    show(everyBadgePage, locale);
    const copy = sampleCopy.badges(locale);
    expect(everyBadgePage.badges).toHaveLength(RECORD_BADGES.length);
    const list = within(screen.getByRole("region", { name: sampleCopy.recordDetail(locale).badges.heading }));
    for (const badge of RECORD_BADGES) {
      expect(list.getByText(copy[badge].label)).toBeVisible();
      expect(list.getByText(copy[badge].explanation)).toBeVisible();
    }
  });

  it("renders Romanian", () => {
    show(frameworkPage, "ro");
    expect(screen.getByText("Valoare publicată")).toBeVisible();
    expect(screen.getByText(/Plafon .*contracte subsecvente raportate până acum .* \(112,4\s?%\)/)).toBeVisible();
  });
});
