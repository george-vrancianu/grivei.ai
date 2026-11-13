// Seam 1 (the app) for the Source eyebrow (#97): "search SEAP · national · 2021 onward", the Source's name from the API's `sources`, the rest from the catalogue.
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

const API_NAME = "SEAP (from the API)";
/** The fixture's SEAP is named "SEAP", the same as its id: give it a name only the API's answer can supply. */
const renameSeap = (operation: string, data: unknown) => {
  if (operation !== "MainScreen") return data;
  const { sources } = data as { sources: { id: string; name: string }[] };
  for (const source of sources) if (source.id === "SEAP") source.name = API_NAME;
  return data;
};

describe.each([
  { locale: "en", url: "/explore/", before: "search SEAP · national · 2021 onward", after: `search ${API_NAME} · national · 2021 onward` },
  { locale: "ro", url: "/ro/explore/", before: "caută SEAP · național · din 2021", after: `caută ${API_NAME} · național · din 2021` },
] as const)("the Source eyebrow at $url", ({ locale, url, before, after }) => {
  it("shows the id until the API answers, then the Source's name from the API, and describes the search box", async () => {
    openAt(url);
    render(<App client={fixtureClient({ rewrite: renameSeap }).client} loadCountyTopology={loadTestCountyTopology} />);
    const box = screen.getByRole("searchbox", { name: catalogue[locale].searchBar.label });
    expect(box).toHaveAccessibleDescription(new RegExp(before.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await screen.findByTestId("main-total");
    expect(screen.getByText(after)).toBeInTheDocument();
    expect(box).toHaveAccessibleDescription(new RegExp(after.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    expect(screen.getByText(after).compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
