// Seam 1 (the app) for the SEAP caption (#98): the Coverage lens says why every county shows one status, only when the data says they do.
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

type Rows = { coverage: { counties: { county: string; status: string }[] } };

/** The test topology's counties, each with a coverage row (a county without one cancels the caption), all with the given status. */
const everyCounty = (data: unknown, status: (county: string) => string) => {
  const { coverage } = data as Rows;
  for (const county of ["RO-CJ", "RO-BV", "RO-B"]) {
    if (!coverage.counties.some((row) => row.county === county)) coverage.counties.push({ ...coverage.counties[0]!, county });
  }
  for (const row of coverage.counties) row.status = status(row.county);
  return data;
};

/** Every county, and NATIONAL, harvested: one status for the whole country. */
const oneStatus = (operation: string, data: unknown) => (operation === "CoverageLens" ? everyCounty(data, () => "HARVESTED") : data);

/** A Source harvested per county: one county differs from the others. */
const perCounty = (operation: string, data: unknown) => (operation === "CoverageLens" ? everyCounty(data, (county) => (county === "RO-BV" ? "NOT_HARVESTED" : "HARVESTED")) : data);

describe.each([
  { locale: "en", url: "/explore/?lens=coverage", caption: "SEAP is harvested nationally; gaps apply to every county" },
  { locale: "ro", url: "/ro/explore/?lens=coverage", caption: "SEAP este colectat la nivel național; lacunele se aplică fiecărui județ" },
] as const)("the SEAP caption at $url", ({ locale, url, caption }) => {
  it("is in the catalogue", () => {
    expect(catalogue[locale].coverageLensMap.nationalCaption("SEAP")).toBe(caption);
  });

  it("shows when every county shares one status", async () => {
    openAt(url);
    render(<App client={fixtureClient({ rewrite: oneStatus }).client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByText(caption)).toBeVisible();
  });

  it("is absent when the counties' statuses differ", async () => {
    openAt(url);
    render(<App client={fixtureClient({ rewrite: perCounty }).client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("button", { name: /^Brașov: / });
    expect(screen.queryByText(caption)).not.toBeInTheDocument();
  });
});
