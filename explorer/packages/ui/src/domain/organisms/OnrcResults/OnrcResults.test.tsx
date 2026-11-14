import { fixtures } from "@grivei/contract/fixtures";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import type { OnrcResultData } from "../../types.ts";
import { OnrcResults, type OnrcResultsProps } from "./index.ts";

const typical = fixtures.OnrcSearch[0]!.data.onrc.search.organisations;
const rows = typical.rows as OnrcResultData[];

const base = (extra: Partial<OnrcResultsProps> = {}): OnrcResultsProps => ({
  count: typical.count, rows, page: 1, pageSize: 50, pageHref: (n) => `/explore/?source=onrc&page=${n}`, entityHref: (e) => `/explore/supplier/${e.key}`, locale: "en", copy: sampleOnrcCopy.results("en"), ...extra,
});

describe("OnrcResults", () => {
  it("heads the list with the match count and shows each registration, linked to its entity page", () => {
    renderInUi(<OnrcResults {...base()} />);
    const region = screen.getByRole("region", { name: "2 registrations" });
    expect(within(region).getByRole("heading", { name: "2 registrations" })).toBeVisible();
    expect(within(region).getByText("Showing 1–2 of 2")).toBeVisible();
    expect(within(region).getAllByRole("listitem")).toHaveLength(2);
    expect(within(region).getByRole("link", { name: /ALFA ONRC SRL/ })).toHaveAttribute("href", "/explore/supplier/3100020");
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("pages with real links when the count is over a page, and keeps the page's offset in the range line", () => {
    renderInUi(<OnrcResults {...base({ count: 120, page: 2 })} />);
    expect(screen.getByText("Showing 51–52 of 120")).toBeVisible();
    expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute("href", "/explore/?source=onrc&page=3");
  });

  it("says nothing matches, with the sole-trader note and a link to ONRC's coverage", async () => {
    const onNavigate = vi.fn();
    renderInUi(<OnrcResults {...base({ count: 0, rows: [], emptyHref: "/explore/coverage?source=onrc", onNavigate })} />);
    expect(screen.getByText(/No registration matches\. Sole traders/)).toBeVisible();
    await userEvent.click(screen.getByRole("link", { name: "Check which ONRC snapshots are held" }));
    expect(onNavigate).toHaveBeenCalledWith("/explore/coverage?source=onrc");
  });

  it("shows names as plain text without an entity link, and the toolbar slot above the list", () => {
    renderInUi(<OnrcResults {...base({ entityHref: undefined, toolbar: <p>toolbar</p> })} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("toolbar")).toBeVisible();
  });

  it("reads in Romanian", () => {
    renderInUi(<OnrcResults {...base({ locale: "ro", copy: sampleOnrcCopy.results("ro") })} />, "ro");
    expect(screen.getByRole("heading", { name: "2 înmatriculări" })).toBeVisible();
  });
});
