// Seam 3 for the main screen's Total: the ⓘ link, what it left out (with the way to see it), the "≈" of an estimate and the data-through date.
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

const opened = async (url: string) => {
  openAt(url);
  render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
  return within(await screen.findByTestId("main-total"));
};

describe.each([
  { locale: "en", url: "/explore/", methodology: "/explore/methodology#awarded-value", suspect: "/explore/?q=contract&badges=suspect-value&tab=records" },
  { locale: "ro", url: "/ro/explore/", methodology: "/ro/explore/methodology#awarded-value", suspect: "/ro/explore/?q=contract&badges=suspect-value&tab=records" },
] as const)("the Total at $url", ({ locale, url, methodology, suspect }) => {
  const t = catalogue[locale];

  it("carries the ⓘ link to the methodology page", async () => {
    const total = await opened(url);
    expect(total.getByRole("link", { name: t.total.methodology })).toHaveAttribute("href", methodology);
  });

  it("puts the date the data runs through under the map, not in the Total", async () => {
    const total = await opened(url);
    const note = within(screen.getByTestId("main-data-through"));
    expect(total.queryByText(new RegExp(t.dataThrough.through))).toBeNull();
    // a two-column list: each record kind is a term, its date the definition
    expect(note.getByText(t.coverage.grid.kinds["CONTRACT"]!).tagName).toBe("DT");
    expect(note.getAllByText(new RegExp(`^${t.dataThrough.through}`)).length).toBeGreaterThan(0);
  });

  it("says how many suspect Records it left out and links to them, keeping the search", async () => {
    const total = await opened(`${url}?q=contract`); // the hand `records-variety` fixture: one suspect Record, one with no value, a framework ceiling
    // each part that is not zero is an inset figure: the label, then the value
    const link = total.getByRole("link", { name: `${t.total.figures.suspect} 1` });
    expect(link).toHaveAttribute("href", suspect);
    expect(total.getByText(t.total.figures.noValue).closest("p")).toHaveTextContent(`${t.total.figures.noValue} 1`);
  });

  it("marks an estimated count with ≈", async () => {
    const total = await opened(`${url}?q=ro`); // the hand `extreme-estimated-counts` fixture
    expect(total.getByText(/≈/)).toBeInTheDocument();
  });
});
