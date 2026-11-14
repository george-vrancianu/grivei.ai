import type { MethodologyBaseRatesQuery, MethodologyBaseRatesQueryVariables, MethodologyReferenceSourcesQuery, MethodologyReferenceSourcesQueryVariables } from "../generated/operations.ts";
import type { FixtureSet } from "./types.ts";

export const methodologyBaseRates: FixtureSet<MethodologyBaseRatesQuery, MethodologyBaseRatesQueryVariables> = [
  {
    name: "typical-after-backfill", kind: "typical",
    description: "all four rules with their windows and national base rates; no-publication covers 2021+ after the backfill",
    variables: {},
    data: {
      signalRules: [
        { slug: "OVER_CAP", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.057, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "SPLITTING", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.112, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "FRAMEWORK_OVERRUN", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.004, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "NO_PUBLICATION", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.031, baseRateYear: 2024, dataThrough: "2024-11-30" },
      ],
    },
  },
  {
    name: "before-backfill", kind: "extreme",
    description: "no-publication sees 2023+ only; a rule that fired for no authority (rate 0) and an open window start",
    variables: {},
    data: {
      signalRules: [
        { slug: "OVER_CAP", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.057, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "SPLITTING", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.112, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "FRAMEWORK_OVERRUN", window: { from: null, to: "2024-11-30" }, baseRate: 0, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "NO_PUBLICATION", window: { from: "2023-01-01", to: "2024-11-30" }, baseRate: 0.031, baseRateYear: 2024, dataThrough: "2024-11-30" },
      ],
    },
  },
];

export const methodologyReferenceSources: FixtureSet<MethodologyReferenceSourcesQuery, MethodologyReferenceSourcesQueryVariables> = [
  {
    name: "amepip-held", kind: "typical",
    description: "AMEPIP's list of public enterprises is held: the day it was published is its data-through date",
    variables: {},
    data: { referenceSources: [{ id: "AMEPIP", name: "AMEPIP", dataThrough: "2026-01-13", url: "https://data.gov.ro/dataset/amepip-indicatori-financiari-nefinanciari-si-de-guvernanta-corporativa" }] },
  },
  {
    name: "amepip-not-held", kind: "empty",
    description: "no AMEPIP list has been fetched yet (a graph built before the first fetch): no data-through date",
    variables: {},
    data: { referenceSources: [{ id: "AMEPIP", name: "AMEPIP", dataThrough: null, url: null }] },
  },
];
