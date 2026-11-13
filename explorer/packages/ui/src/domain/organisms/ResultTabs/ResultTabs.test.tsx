import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderInUi } from "../../../testing/render.tsx";
import { color } from "../../../theme/tokens.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { resultSamples } from "../../samples/fixtureData.ts";
import { ResultTabs, toResultTab, type ResultTab, type ResultTabsProps } from "./index.ts";

type Data = (typeof resultSamples)[keyof typeof resultSamples];
const base = (data: Data, locale: "en" | "ro" = "en"): ResultTabsProps => ({
  ...data,
  entityHref: (entity, role) => `/explore/${role}/${entity.key}`,
  recordHref: (record) => `/explore/record/${record.code}`,
  locale,
  copy: sampleCopy.resultTabs(locale),
});

describe("ResultTabs", () => {
  it("opens on Suppliers when no tab is given", () => {
    renderInUi(<ResultTabs {...base(resultSamples.typical)} />);
    expect(screen.getByRole("tab", { name: /^Suppliers/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Authorities/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: /^Records/ })).toHaveAttribute("aria-selected", "false");
    const panel = screen.getByRole("tabpanel", { name: /^Suppliers/ });
    const first = resultSamples.typical.suppliers.rows[0]!.entity;
    expect(within(panel).getByRole("link", { name: first.displayName })).toHaveAttribute("href", `/explore/supplier/${first.key}`);
  });

  it("switches tabs on its own when uncontrolled, and reports the change", async () => {
    const seen: ResultTab[] = [];
    renderInUi(<ResultTabs {...base(resultSamples.typical)} onTabChange={(tab) => seen.push(tab)} />);
    await userEvent.setup().click(screen.getByRole("tab", { name: /^Records/ }));
    expect(seen).toEqual(["records"]);
    expect(screen.getByRole("tab", { name: /^Records/ })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: /^Records/ });
    expect(within(panel).getByRole("link", { name: resultSamples.typical.records.rows[0]!.record.title })).toBeVisible();
  });

  it("follows the caller's tab when controlled", async () => {
    function Controlled() {
      const [tab, setTab] = useState<ResultTab>(toResultTab(undefined));
      return <ResultTabs {...base(resultSamples.typical)} tab={tab} onTabChange={setTab} />;
    }
    renderInUi(<Controlled />);
    await userEvent.setup().click(screen.getByRole("tab", { name: /^Authorities/ }));
    expect(screen.getByRole("tab", { name: /^Authorities/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: resultSamples.typical.authorities.rows[0]!.entity.displayName })).toHaveAttribute("href", expect.stringMatching(/^\/explore\/authority\//));
  });

  it("honours a given tab", () => {
    renderInUi(<ResultTabs {...base(resultSamples.typical)} tab="records" />);
    expect(screen.getByRole("tab", { name: /^Records/ })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to Suppliers for an unknown tab value", () => {
    expect(toResultTab("nonsense")).toBe("suppliers");
    expect(toResultTab(null)).toBe("suppliers");
    expect(toResultTab("records")).toBe("records");
  });

  it("counts each tab, with ≈ before an estimated distinct count and none before the exact Records count", () => {
    renderInUi(<ResultTabs {...base(resultSamples.estimated)} />);
    expect(screen.getByRole("tab", { name: /^Authorities/ })).toHaveTextContent("Authorities ≈ 66,000");
    expect(screen.getByRole("tab", { name: /^Suppliers/ })).toHaveTextContent("Suppliers ≈ 240,000");
    expect(screen.getByRole("tab", { name: /^Records/ })).toHaveTextContent(/^Records 2,400,000$/);
  });

  it("shows exact counts without ≈", () => {
    renderInUi(<ResultTabs {...base(resultSamples.variety)} />);
    expect(screen.getByRole("tab", { name: /^Suppliers/ })).toHaveTextContent("Suppliers 6");
    expect(screen.getByRole("tab", { name: /^Authorities/ })).not.toHaveTextContent("≈");
  });

  it("pins the Go to page card above the tabs when goTo is set, linking to the entity page", () => {
    renderInUi(<ResultTabs {...base(resultSamples.goTo)} />);
    const card = screen.getByRole("region", { name: "Go to page" });
    const entity = resultSamples.goTo.goTo!;
    expect(card).toHaveTextContent(entity.displayName);
    expect(within(card).getByRole("link", { name: /Open the page/ })).toHaveAttribute("href", `/explore/supplier/${entity.key}`);
    expect(card.compareDocumentPosition(screen.getByRole("tablist")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("opens the Go to page entity in the role its SEAP roles name, not the role of the rows shown", () => {
    const { key, displayName, identity } = resultSamples.goTo.goTo!;
    const authorityOnly = { key: "name-not-in-rows", displayName, identity, seap: { roles: ["AUTHORITY" as const] } };
    const { unmount } = renderInUi(<ResultTabs {...base({ ...resultSamples.goTo, goTo: authorityOnly })} />);
    expect(within(screen.getByRole("region", { name: "Go to page" })).getByRole("link", { name: /Open the page/ })).toHaveAttribute("href", "/explore/authority/name-not-in-rows");
    unmount();
    // both roles: the supplier page ("who gets the money")
    const both = { key, displayName, identity, seap: { roles: ["AUTHORITY" as const, "SUPPLIER" as const] } };
    renderInUi(<ResultTabs {...base({ ...resultSamples.goTo, goTo: both })} />);
    expect(within(screen.getByRole("region", { name: "Go to page" })).getByRole("link", { name: /Open the page/ })).toHaveAttribute("href", `/explore/supplier/${key}`);
  });

  it("gives two result tabs on one page their own ids, so aria-controls and aria-labelledby never collide", () => {
    renderInUi(
      <>
        <ResultTabs {...base(resultSamples.typical)} />
        <ResultTabs {...base(resultSamples.variety)} />
      </>,
    );
    const ids = screen.getAllByRole("tab").map((tab) => tab.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tab of screen.getAllByRole("tab")) {
      const panel = document.getElementById(tab.getAttribute("aria-controls")!);
      expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    }
  });

  it("has no Go to page card when goTo is null", () => {
    renderInUi(<ResultTabs {...base(resultSamples.typical)} />);
    expect(screen.queryByRole("region", { name: "Go to page" })).toBeNull();
  });

  it("says each tab is empty, with the catalogue's sentence", async () => {
    renderInUi(<ResultTabs {...base(resultSamples.empty)} />);
    const user = userEvent.setup();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("No suppliers.");
    await user.click(screen.getByRole("tab", { name: /^Authorities/ }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("No authorities.");
    await user.click(screen.getByRole("tab", { name: /^Records/ }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("No Records.");
  });

  it("offers 'show all' only when the caller gives a URL and there are more rows than shown", () => {
    const { unmount } = renderInUi(<ResultTabs {...base(resultSamples.estimated)} showAllHref={(tab) => `/explore/search?tab=${tab}`} />);
    expect(screen.getByRole("link", { name: "Show all 240,000" })).toHaveAttribute("href", "/explore/search?tab=suppliers");
    unmount();
    renderInUi(<ResultTabs {...base(resultSamples.variety)} tab="records" showAllHref={() => undefined} />);
    expect(screen.queryByRole("link", { name: /^Show all/ })).toBeNull();
  });

  it("keeps the 'show all' link neutral: amber is for the headline Total alone", () => {
    renderInUi(<ResultTabs {...base(resultSamples.estimated)} showAllHref={(tab) => `/explore/search?tab=${tab}`} />);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.accent.slice(i, i + 2), 16));
    expect(getComputedStyle(screen.getByRole("link", { name: "Show all 240,000" })).color).not.toBe(`rgb(${r}, ${g}, ${b})`);
  });

  it("reads in Romanian", () => {
    renderInUi(<ResultTabs {...base(resultSamples.typical, "ro")} />, "ro");
    expect(screen.getByRole("tab", { name: /^Furnizori/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tablist", { name: "Rezultate" })).toBeVisible();
  });
});
