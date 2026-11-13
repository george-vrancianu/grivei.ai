import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sentence } from "../../../testing/sentence.ts";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { RECORD_BADGES } from "../../atoms/BadgeChip/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import {
  blankCeilingPage, consortiumNameOnlyPage, consortiumPage, contractRecord, directPurchaseRecord, everyBadgePage, frameworkOverrunPage, frameworkPage,
  naturalPersonPage, noPublicPage, noValuePage, subsequentPage, suspectDirectPage, suspectNoEstimatePage, suspectOverEstimatePage,
} from "../../samples/fixtureData.ts";
import type { RecordPageData } from "../../types.ts";
import { SignalCard } from "../SignalCard/index.ts";
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

describe("RecordDetail Signals", () => {
  const withCards = (locale: Locale) =>
    renderInUi(
      <RecordDetail
        record={frameworkOverrunPage}
        entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
        recordHref={(code) => `/explore/record/${code}`}
        methodologyHref="/explore/methodology"
        locale={locale}
        copy={sampleCopy.recordDetail(locale)}
        renderSignalCard={(signal) => (
          <SignalCard
            signal={signal}
            reproduceHref="/explore/authority/1000017/records?signal=framework-overrun"
            methodologyHref="/explore/methodology#signal-framework-overrun"
            entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
            locale={locale}
            copy={sampleCopy.signalCard(locale)}
          />
        )}
      />,
      locale,
    );

  it("shows each Signal as a card, followed by the Signal's own Records, when it is given the card", () => {
    withCards("en");
    const signals = section("Signals this Record belongs to");
    expect(signals.getByRole("heading", { name: "Framework overrun" })).toBeVisible();
    expect(signals.getByRole("link", { name: "How this Signal is detected" })).toHaveAttribute("href", "/explore/methodology#signal-framework-overrun");
    expect(signals.getByRole("link", { name: "See the 4 Records" })).toHaveAttribute("href", "/explore/authority/1000017/records?signal=framework-overrun");
    for (const record of frameworkOverrunPage.signals[0]!.records) expect(signals.getByRole("link", { name: record.title })).toHaveAttribute("href", `/explore/record/${record.code}`);
  });

  it("says it in Romanian", () => {
    withCards("ro");
    expect(section("Semnalele din care face parte această înregistrare").getByRole("heading", { name: "Depășirea acordului-cadru" })).toBeVisible();
  });
});

describe("RecordDetail", () => {
  it("shows the title as the heading, with date, kind, procedure, contract type and CPV as published", () => {
    show(contractRecord);
    expect(screen.getByRole("heading", { level: 1, name: contractRecord.title })).toBeVisible();
    const header = within(screen.getByRole("heading", { level: 1 }).parentElement!);
    expect(header.getByText("20 January 2025")).toBeVisible();
    expect(header.getByText("Contract")).toBeVisible();
    expect(header.getByText("Licitatie deschisa")).toBeVisible();
    expect(screen.getByText("Servicii")).toBeVisible();
    expect(screen.getByText("50720000-8 Servicii de reparare si de intretinere a incalzirii centrale (Rev.2)")).toBeVisible();
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
    expect(screen.getByText("Value as published").nextElementSibling).toHaveTextContent("RON 289,637.00");
    expect(screen.getByText("Counted value").nextElementSibling).toHaveTextContent("RON 289,637.00");
  });

  it("links the authority and the winner to their entity pages", () => {
    show(contractRecord);
    // the subsequent contracts listed below repeat the names: look in the parties' own blocks
    const authority = within(screen.getByText("Contracting authority").nextElementSibling as HTMLElement);
    expect(authority.getByRole("link", { name: contractRecord.authority.displayName })).toHaveAttribute("href", `/explore/authority/${contractRecord.authority.key}`);
    const winner = contractRecord.winners[0]!.entity!;
    const winners = within(screen.getByText("Winners").nextElementSibling as HTMLElement);
    expect(winners.getByRole("link", { name: winner.displayName })).toHaveAttribute("href", `/explore/supplier/${winner.key}`);
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
    [suspectDirectPage, "at least ten times the cap in force", "RON 135,060.00"],
    [suspectOverEstimatePage, "at least a hundred times the estimated value", "RON 10,000,000.00"],
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
    expect(screen.getByText("Counted value").nextElementSibling).toHaveTextContent("RON 98,800.00");
    const members = screen.getAllByRole("listitem").filter((li) => /\(equal share/.test(li.textContent ?? ""));
    expect(members).toHaveLength(2);
    for (const member of members) expect(member).toHaveTextContent("equal share RON 49,400.00");
    expect(screen.getByText(/counting convention, not a figure SEAP publishes/)).toBeVisible();
  });

  it("marks a name-only member as identified by name only, with its share", () => {
    show(consortiumNameOnlyPage);
    const marker = sampleCopy.entityLink("en").nameOnly.label;
    expect(screen.getAllByText(marker)).toHaveLength(1); // the foreign firm; the CUI firm is linked, the natural person is neither named nor linked
    expect(screen.getAllByText(sentence(/equal share RON 166,666.67/))).toHaveLength(2);
    expect(screen.getAllByText(sentence(/equal share RON 166,666.66/))).toHaveLength(1);
    expect(screen.getByText("Persoană fizică")).toBeVisible();
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
    expect(framework.getByText(sentence("Ceiling RON 10,000,000.00; subsequent contracts reported so far RON 5,000,000.00 (50%)"))).toBeVisible();
    expect(framework.getByRole("heading", { name: "Subsequent contracts" })).toBeVisible();
    for (const sub of frameworkPage.framework!.subsequent) expect(framework.getByRole("link", { name: sub.title })).toHaveAttribute("href", `/explore/record/${sub.code}`);
    expect(frameworkPage.framework!.subsequent).toHaveLength(2);
  });

  it("shows a ratio over 100% as is, and the framework-overrun Signal beside it", () => {
    show(frameworkOverrunPage);
    expect(section("Framework agreement").getByText(/\(125%\)/)).toBeVisible();
    expect(section("Signals this Record belongs to").getAllByRole("heading").length).toBeGreaterThan(0);
  });

  it("leaves the percentage out when the ceiling is blank", () => {
    show(blankCeilingPage);
    expect(screen.getByText(sentence("Ceiling not published; subsequent contracts reported so far RON 500,000.00"))).toBeVisible();
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
    expect(signals.getByText(/2 Records/)).toBeVisible();
    expect(signals.queryByText(/suspect|fraud|irregular|illegal|risk/i)).toBeNull();
  });

  it("shows the provenance verbatim and a Check in SEAP link that opens a new tab", () => {
    show(directPurchaseRecord);
    const provenance = section("Provenance");
    expect(provenance.getByText("Achizitii directe t1-2023")).toBeVisible();
    expect(provenance.getByText("Published bulk file")).toBeVisible();
    expect(provenance.getByText("15 June 2023")).toBeVisible();
    const link = provenance.getByRole("link", { name: "Check in SEAP" });
    expect(link).toHaveAttribute("href", "/source/seap/DA98000001"); // a bulk Record's link is the redirect for its code
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("says there is no stable public page, instead of a link, when the URL is null", () => {
    show(noPublicPage);
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
    show(frameworkOverrunPage, "ro");
    expect(screen.getByText("Valoare publicată")).toBeVisible();
    expect(screen.getByText(sentence(/Plafon .*contracte subsecvente raportate până acum .* \(125\s?%\)/))).toBeVisible();
  });
});
