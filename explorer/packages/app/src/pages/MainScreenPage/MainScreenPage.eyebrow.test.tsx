// Seam 3 for the Source eyebrow (#97): "search SEAP · national · 2021 onward", the Source's name from the API's `sources`, the rest from the catalogue.
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

describe.each([
  { locale: "en", url: "/explore/", line: "search SEAP · national · 2021 onward" },
  { locale: "ro", url: "/ro/explore/", line: "caută SEAP · național · din 2021" },
] as const)("the Source eyebrow at $url", ({ locale, url, line }) => {
  it("reads the Source's name from the API above the search bar, and the rest from the catalogue", async () => {
    openAt(url);
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    const eyebrow = screen.getByTestId("source-eyebrow");
    expect(eyebrow).toHaveTextContent(line);
    expect(eyebrow.compareDocumentPosition(screen.getByRole("searchbox", { name: catalogue[locale].searchBar.label })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // still the same once the API's `sources` have arrived
    await screen.findByTestId("main-total");
    expect(screen.getByTestId("source-eyebrow")).toHaveTextContent(line);
  });
});
