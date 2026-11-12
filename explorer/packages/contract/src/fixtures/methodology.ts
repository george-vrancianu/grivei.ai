import type { MethodologyBaseRatesQuery, MethodologyBaseRatesQueryVariables } from "../generated/operations.ts";
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
