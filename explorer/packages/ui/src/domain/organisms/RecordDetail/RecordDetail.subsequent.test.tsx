import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { sentence } from "../../../testing/sentence.ts";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { shadow } from "../../../theme/tokens.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { blankCeilingPage, consortiumPage, directPurchaseRecord, framework49Page, framework50Page, frameworkOver50Page, frameworkPage } from "../../samples/fixtureData.ts";
import type { RecordPageData } from "../../types.ts";
import { RecordDetail } from "./index.ts";

function show(record: RecordPageData, locale: Locale = "en", more: { busy?: boolean; moreHref?: string } = {}) {
  return renderInUi(
    <RecordDetail
      record={record}
      citeUrl={`https://grivei.ai/explore/record/${record.code}`}
      entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
      recordHref={(code) => `/explore/record/${code}`}
      methodologyHref="/explore/methodology"
      subsequentMoreHref={more.moreHref}
      busy={more.busy}
      locale={locale}
      copy={sampleCopy.recordDetail(locale)}
    />,
    locale,
  );
}
const panelName = (locale: Locale) => sampleCopy.recordDetail(locale).framework.subsequentHeading;
const panel = (locale: Locale = "en") => screen.getByRole("region", { name: panelName(locale) });
const rowCount = (locale: Locale = "en") => within(panel(locale)).getAllByRole("listitem").length;

describe("The subsequent contracts panel", () => {
  it("shows five rows by value out of the 50 fetched, with the count in the header and 'Show all' in the foot", () => {
    show(framework49Page);
    expect(rowCount()).toBe(5);
    const fetched = framework49Page.framework!.subsequent;
    for (const record of fetched.slice(0, 5)) expect(within(panel()).getByRole("link", { name: record.title })).toBeVisible();
    expect(within(panel()).queryByRole("link", { name: fetched[5]!.title })).toBeNull();
    expect(within(panel()).getByText(sentence(/^49 contracts · RON /))).toBeVisible();
    expect(within(panel()).getByText("5 of 49 shown, by value")).toBeVisible();
    expect(within(panel()).getByRole("button", { name: "Show all 49" })).toHaveAttribute("aria-expanded", "false");
  });

  it("expands in place to every fetched row, and folds back", async () => {
    const user = userEvent.setup();
    show(framework49Page);
    await user.click(within(panel()).getByRole("button", { name: "Show all 49" }));
    expect(rowCount()).toBe(49);
    expect(within(panel()).getByText("49 of 49 shown, by value")).toBeVisible();
    await user.click(within(panel()).getByRole("button", { name: "Show fewer" }));
    expect(rowCount()).toBe(5);
  });

  it("at exactly 50 has no link to the Records tab: every contract is in the list", async () => {
    const user = userEvent.setup();
    show(framework50Page, "en", { moreHref: "/explore/authority/1000025/records?q=CAN9830002" });
    await user.click(within(panel()).getByRole("button", { name: "Show all 50" }));
    expect(rowCount()).toBe(50);
    expect(within(panel()).getByText("50 of 50 shown, by value")).toBeVisible();
    expect(within(panel()).queryByRole("link", { name: /in Records/ })).toBeNull();
  });

  it("over 50 says how many exist, shows the 50 fetched on request and links to the Records tab", async () => {
    const user = userEvent.setup();
    show(frameworkOver50Page, "en", { moreHref: "/explore/authority/1000025/records?q=CAN9830001" });
    expect(within(panel()).getByText(sentence(/^51 contracts · RON /))).toBeVisible();
    expect(within(panel()).getByText("5 of 51 shown, by value")).toBeVisible();
    await user.click(within(panel()).getByRole("button", { name: "Show the first 50" }));
    expect(rowCount()).toBe(50);
    expect(within(panel()).getByText("50 of 51 shown, by value")).toBeVisible();
    expect(within(panel()).getByRole("link", { name: "Subsequent contracts of this framework, in Records" })).toHaveAttribute("href", "/explore/authority/1000025/records?q=CAN9830001");
  });

  it("with no link given, shows no link to the rest", () => {
    show(frameworkOver50Page);
    expect(within(panel()).queryByRole("link", { name: /in Records/ })).toBeNull();
  });

  it("has no foot with five rows or fewer", () => {
    show(frameworkPage);
    expect(rowCount()).toBe(2);
    expect(within(panel()).queryByRole("button")).toBeNull();
    expect(within(panel()).queryByText(/shown, by value/)).toBeNull();
  });

  it("has no panel when the framework has no subsequent contract, and none on a Record that is not a framework", () => {
    const first = show(blankCeilingPage);
    expect(screen.getByRole("region", { name: panelName("en") })).toBeVisible();
    first.unmount();
    for (const record of [directPurchaseRecord, consortiumPage]) {
      const { unmount } = show(record);
      expect(screen.queryByRole("region", { name: panelName("en") })).toBeNull();
      unmount();
    }
  });

  it("says it in Romanian", async () => {
    const user = userEvent.setup();
    show(frameworkOver50Page, "ro", { moreHref: "/ro/explore/authority/1000025/records" });
    expect(within(panel("ro")).getByText(sentence(/^51 de contracte · /))).toBeVisible();
    expect(within(panel("ro")).getByText("5 din 51 afișate, după valoare")).toBeVisible();
    await user.click(within(panel("ro")).getByRole("button", { name: "Arată primele 50" }));
    expect(within(panel("ro")).getByText("50 din 51 afișate, după valoare")).toBeVisible();
    expect(within(panel("ro")).getByRole("link", { name: "Contractele subsecvente ale acestui acord-cadru, în Înregistrări" })).toBeVisible();
  });
});

describe("A held Record (busy)", () => {
  it("dims every panel's body with aria-busy and leaves the header strips and the foot at full strength", () => {
    show(framework49Page, "en", { busy: true });
    const sub = panel();
    const body = sub.querySelector("[data-panel-part=body]")!;
    expect(body).toHaveAttribute("aria-busy", "true");
    expect(body).toHaveStyle({ opacity: "0.6" });
    expect(sub.querySelector("[data-panel-part=header]")).not.toHaveAttribute("aria-busy");
    expect(sub.querySelector("[data-panel-part=header]")).toHaveStyle({ opacity: "1" });
    expect(sub.querySelector("[data-panel-part=foot]")).toHaveStyle({ opacity: "1" });
    for (const name of ["Value", "Winners", "The Record", "Provenance"]) expect(screen.getByRole("region", { name }).querySelector("[data-panel-part=body]")).toHaveAttribute("aria-busy", "true");
  });

  it("is not busy by default", () => {
    show(framework49Page);
    expect(document.querySelector("[aria-busy]")).toBeNull();
  });
});

describe("The Winners panel", () => {
  it("puts each winner in a well, two to a row from md", () => {
    show(consortiumPage);
    const winners = screen.getByRole("region", { name: "Winners" });
    const list = within(winners).getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    for (const item of within(list).getAllByRole("listitem")) expect(item).toHaveStyle({ boxShadow: shadow.well });
  });
});
