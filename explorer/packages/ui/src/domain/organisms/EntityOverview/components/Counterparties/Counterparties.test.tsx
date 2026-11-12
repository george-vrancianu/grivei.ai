import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityManyCounterpartiesOverview } from "../../../../samples/fixtureData.ts";
import { Counterparties } from "./index.ts";

const { counterparties, total } = authorityManyCounterpartiesOverview.overview;

function show(rows = counterparties) {
  renderInUi(
    <Counterparties
      counterparties={rows}
      total={total.awarded}
      role="authority"
      entityHref={(e, r) => `/explore/${r}/${e.key}`}
      locale="en"
      copy={sampleCopy.entityOverview("en").counterparties}
    />,
  );
}

describe("Counterparties", () => {
  it("writes each counterparty's share of the total next to its bar", () => {
    show();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    // 1,080 M of 9,000 M, 900 M of 9,000 M
    expect(within(items[0]!).getByText("12%")).toBeVisible();
    expect(within(items[1]!).getByText("10%")).toBeVisible();
  });

  it("links an authority's counterparties to supplier pages", () => {
    show();
    expect(screen.getByRole("link", { name: "DRUMARII UNIȚI S.R.L." })).toHaveAttribute("href", "/explore/supplier/30000003");
  });

  it("shows a natural person as 'Persoană fizică', unlinked", () => {
    show();
    const person = screen.getByText("Persoană fizică").closest("li")!;
    expect(within(person).queryByRole("link")).toBeNull();
  });

  it("says how many counterparties the list leaves out", () => {
    show();
    expect(screen.getByText("and 216 more")).toBeVisible();
  });

  it("says nothing about more when every counterparty is listed", () => {
    show({ ...counterparties, count: 4 });
    expect(screen.queryByText(/more/)).toBeNull();
  });
});
