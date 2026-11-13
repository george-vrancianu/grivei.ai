import { describe, expect, it } from "vitest";
import type { CountyCoverage } from "../../types.ts";
import { nothingHarvestedCoverage, typicalCoverage } from "../../samples/coverageLenses.ts";
import { coverageByCounty, coverageSource, plannedSources, sharedCountyStatus, sinceText, summaryParts } from "./coverageLensMap.utils.ts";

describe("coverage lens utils", () => {
  it("indexes rows by county code", () => {
    expect(coverageByCounty(typicalCoverage.coverage).get("RO-TM")?.status).toBe("PARTIAL");
    expect(coverageByCounty(typicalCoverage.coverage).has("RO-GL")).toBe(false);
  });

  it("finds the planned Sources (harvested: false) and the Source the statuses are about", () => {
    expect(plannedSources(typicalCoverage.sources).map((source) => source.id)).toEqual(["ONRC", "ANI", "MFINANTE", "JUST"]);
    expect(coverageSource(typicalCoverage.sources)?.id).toBe("SEAP");
  });

  it("says since the window's start, else since the harvest's first year", () => {
    expect(sinceText({ from: "2021-01-01", to: null }, "en")).toBe("1 Jan 2021");
    expect(sinceText({ from: null, to: null }, "ro")).toBe("2021");
  });

  it("formats the counts for the locale", () => {
    const row = nothingHarvestedCoverage.coverage.counties.find((r) => r.county === "NATIONAL")!;
    expect(summaryParts({ ...row, publicEntities: 13_200 }, "SEAP", "2021", "ro").publicEntitiesText).toBe("13.200");
  });
});

describe("sharedCountyStatus", () => {
  const row = (county: string, status: CountyCoverage["status"]) => [county, { county, status } as CountyCoverage] as const;
  it("is the status every county shares, ignoring NATIONAL", () => {
    expect(sharedCountyStatus(new Map([row("RO-BV", "HARVESTED"), row("RO-CJ", "HARVESTED"), row("NATIONAL", "PARTIAL")]))).toBe("HARVESTED");
  });
  it("is null when the counties differ, or there are none", () => {
    expect(sharedCountyStatus(new Map([row("RO-BV", "HARVESTED"), row("RO-CJ", "PARTIAL")]))).toBeNull();
    expect(sharedCountyStatus(new Map([row("NATIONAL", "HARVESTED")]))).toBeNull();
  });
});
