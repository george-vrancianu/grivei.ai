import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { fullResultsAuthorityRows, fullResultsRecords } from "../../samples/fixtureData.ts";
import { FullResults, type FullResultsData, type FullResultsProps } from "./index.ts";

const pageHref = (n: number) => `/explore/search?tab=records${n > 1 ? `&page=${n}` : ""}`;
const authorities = (count: number, rows = fullResultsAuthorityRows, countEstimated = false): FullResultsData => ({
  tab: "authorities",
  page: { count, countEstimated, rows },
});
const records = (count: number, rows: typeof fullResultsRecords.rows): FullResultsData => ({ tab: "records", page: { count, rows } });

function show(results: FullResultsData, page: number, props: Partial<FullResultsProps> = {}) {
  return renderInUi(
    <FullResults
      results={results}
      page={page}
      pageSize={3}
      pageHref={pageHref}
      entityHref={(e, role) => `/explore/${role}/${e.key}`}
      recordHref={(r) => `/explore/record/${r.code}`}
      locale="en"
      copy={sampleCopy.fullResults("en")}
      {...props}
    />,
  );
}
const nav = () => screen.getByRole("navigation", { name: "Result pages" });

describe("FullResults", () => {
  it("first page: heading with the count, the range, no Previous link, page 1 current", () => {
    show(authorities(8), 1);
    expect(screen.getByRole("heading", { name: /Authorities 8/ })).toBeInTheDocument();
    expect(screen.getByText("Showing 1–3 of 8")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(within(nav()).queryByRole("link", { name: "Previous" })).not.toBeInTheDocument();
    expect(within(nav()).getByRole("link", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(within(nav()).getByRole("link", { name: "Next" })).toHaveAttribute("href", "/explore/search?tab=records&page=2");
  });

  it("middle page: Previous and Next link to the neighbours, only the current page is marked", () => {
    show(authorities(8), 2);
    expect(screen.getByText("Showing 4–6 of 8")).toBeInTheDocument();
    expect(within(nav()).getByRole("link", { name: "Previous" })).toHaveAttribute("href", pageHref(1));
    expect(within(nav()).getByRole("link", { name: "Next" })).toHaveAttribute("href", pageHref(3));
    expect(within(nav()).getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    expect(within(nav()).getByRole("link", { name: "Page 3" })).not.toHaveAttribute("aria-current");
  });

  it("last page: a partial page counts its own rows and has no Next link", () => {
    show(authorities(8, fullResultsAuthorityRows.slice(0, 2)), 3);
    expect(screen.getByText("Showing 7–8 of 8")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(within(nav()).queryByRole("link", { name: "Next" })).not.toBeInTheDocument();
    expect(within(nav()).getByRole("link", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
  });

  it("a single page has no page links", () => {
    show(authorities(3), 1);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows ≈ before an estimated count but never before a Records count", () => {
    const { unmount } = show(authorities(70_000, fullResultsAuthorityRows, true), 1);
    expect(screen.getByRole("heading", { name: /Authorities ≈\s70,000/ })).toBeInTheDocument();
    unmount();
    show(records(11, fullResultsRecords.rows.slice(0, 4)), 1, { pageSize: 4 });
    expect(screen.getByRole("heading", { name: "Records 11" })).toBeInTheDocument();
    expect(screen.getByText("Showing 1–4 of 11")).toBeInTheDocument();
  });

  it("collapses far pages into the first, last and neighbouring pages", () => {
    show(authorities(300), 50);
    const names = within(nav()).getAllByRole("link").map((a) => a.textContent);
    expect(names).toEqual(["Previous", "1", "49", "50", "51", "100", "Next"]);
  });

  it("a page past the end says so and links back to page 1, with no rows or page links", () => {
    show(records(11, []), 9, { pageSize: 4 });
    expect(screen.getByText("This page is past the end: there are only 3 pages.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to page 1" })).toHaveAttribute("href", "/explore/search?tab=records");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("an empty result says so for the tab", () => {
    show({ tab: "suppliers", page: { count: 0, countEstimated: false, rows: [] } }, 1);
    expect(screen.getByText("No suppliers.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("a plain click on a page link goes to onNavigate; a modified click is left to the browser", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    show(authorities(8), 1, { onNavigate });
    await user.click(within(nav()).getByRole("link", { name: "Page 2" }));
    expect(onNavigate).toHaveBeenCalledWith(pageHref(2));
    await user.keyboard("{Control>}");
    await user.click(within(nav()).getByRole("link", { name: "Page 3" }));
    await user.keyboard("{/Control}");
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("links back to the main screen when given where", () => {
    show(authorities(8), 1, { backHref: "/explore/?tab=authorities" });
    expect(screen.getByRole("link", { name: "Back to results" })).toHaveAttribute("href", "/explore/?tab=authorities");
  });

  it("numbers pages in the Romanian format", () => {
    renderInUi(
      <FullResults
        results={authorities(12_000)}
        page={1}
        pageSize={3}
        pageHref={pageHref}
        entityHref={() => "/x"}
        recordHref={() => "/x"}
        locale="ro"
        copy={sampleCopy.fullResults("ro")}
      />,
      "ro",
    );
    expect(screen.getByText("Se afișează 1–3 din 12.000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pagina 4.000" })).toBeInTheDocument();
  });
});
