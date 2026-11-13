// Seam 1 (the app) for the SEAP caption (#98): the Coverage lens says why every county shows one status, only when the data says they do.
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

/** Every county, and NATIONAL, harvested: one status for the whole country. */
const oneStatus = (operation: string, data: unknown) => {
  if (operation !== "CoverageLens") return data;
  const { coverage } = data as { coverage: { counties: { status: string }[] } };
  for (const row of coverage.counties) row.status = "HARVESTED";
  return data;
};

/** A Source harvested per county: one county differs from the others. */
const perCounty = (operation: string, data: unknown) => {
  if (operation !== "CoverageLens") return data;
  const { coverage } = data as { coverage: { counties: { status: string }[] } };
  coverage.counties[0]!.status = coverage.counties[0]!.status === "HARVESTED" ? "NOT_HARVESTED" : "HARVESTED";
  return data;
};

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
