import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import type { EntityPageView } from "../../types.ts";
import type { Locale } from "../../../theme/index.ts";
import { EntityPageLayout } from "./index.ts";

const tabHrefs = {
  overview: "/e/1",
  records: "/e/1/records",
  relationships: "/e/1/relationships",
};
function show(view: EntityPageView, locale: Locale = "en", onNavigate?: (href: string) => void) {
  return renderInUi(
    <EntityPageLayout
      header={<h1>Name</h1>}
      view={view}
      tabHrefs={tabHrefs}
      onNavigate={onNavigate}
      copy={sampleCopy.entityPageLayout(locale)}
    >
      <p>the body</p>
    </EntityPageLayout>,
    locale,
  );
}

describe("EntityPageLayout", () => {
  it("shows the header, three tab links with their own URLs, and the body", () => {
    show("overview");
    const nav = screen.getByRole("navigation", {
      name: "Sections of this page",
    });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Overview", "/e/1"],
      ["Records", "/e/1/records"],
      ["Relationships", "/e/1/relationships"],
    ]);
    expect(screen.getByRole("heading", { name: "Name" })).toBeVisible();
    expect(screen.getByText("the body")).toBeVisible();
  });

  it.each([
    ["overview", "Overview"],
    ["records", "Records"],
    ["relationships", "Relationships"],
  ] as const)("marks the %s tab as the current page", (view, name) => {
    show(view);
    const current = screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.textContent)).toEqual([name]);
  });

  it("names the tabs in Romanian", () => {
    show("records", "ro");
    expect(screen.getByRole("link", { name: "Înregistrări" })).toHaveAttribute("href", "/e/1/records");
  });

  it("hands a plain click on a tab to onNavigate", async () => {
    const seen: string[] = [];
    show("overview", "en", (href) => seen.push(href));
    await userEvent.setup().click(screen.getByRole("link", { name: "Records" }));
    expect(seen).toEqual(["/e/1/records"]);
  });
});
