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
  {
    name: "with-reference-rules", kind: "typical",
    description: "the six ONRC and financial-statement rules (#184) beside the first four: windows, base rates recomputed per load and the year each rule measures in (the statements' rules can only see years a statement covers)",
    variables: {},
    data: {
      signalRules: [
        { slug: "OVER_CAP", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.057, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "SPLITTING", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.112, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "FRAMEWORK_OVERRUN", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.004, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "NO_PUBLICATION", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.031, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "YOUNG_FIRM", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.021, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "NO_CONSTRUCTION_CAEN", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.009, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "AFTER_STRIKE_OFF", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.003, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "INSOLVENCY", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.014, baseRateYear: 2024, dataThrough: "2024-11-30" },
        { slug: "FEW_EMPLOYEES", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.017, baseRateYear: 2023, dataThrough: "2024-11-30" },
        { slug: "NO_FINANCIAL_STATEMENT", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.026, baseRateYear: 2023, dataThrough: "2024-11-30" },
      ],
    },
  },
];

export const methodologyReferenceSources: FixtureSet<MethodologyReferenceSourcesQuery, MethodologyReferenceSourcesQueryVariables> = [
  {
    name: "amepip-held", kind: "typical",
    description: "AMEPIP's list of public enterprises, AEP's one-off 2025 file, MF's financial statements and BaniPartide's firm donations are held: the day AMEPIP published its list, the stated date of AEP's file and the newest fiscal year or donation year are the data-through dates",
    variables: {},
    data: { referenceSources: [
      { id: "AMEPIP", name: "AMEPIP", dataThrough: "2026-01-13", fiscalYear: null, url: "https://data.gov.ro/dataset/amepip-indicatori-financiari-nefinanciari-si-de-guvernanta-corporativa" },
      { id: "AEP", name: "AEP", dataThrough: "2025-12-09", fiscalYear: null, url: null },
      { id: "FINANCIAL_STATEMENTS", name: "MF financial statements", dataThrough: "2025-12-31", fiscalYear: 2025, url: "https://data.gov.ro/organization/mfp" },
      { id: "BANIPARTIDE", name: "BaniPartide", dataThrough: "2024-12-31", fiscalYear: 2024, url: "https://www.banipartide.ro/donatori-persoane-juridice.html" },
    ] },
  },
  {
    name: "amepip-not-held", kind: "empty",
    description: "no AMEPIP list, no financial statements and no BaniPartide table have been fetched yet (a graph built before the first fetch): no data-through dates",
    variables: {},
    data: { referenceSources: [
      { id: "AMEPIP", name: "AMEPIP", dataThrough: null, fiscalYear: null, url: null },
      { id: "AEP", name: "AEP", dataThrough: null, fiscalYear: null, url: null },
      { id: "FINANCIAL_STATEMENTS", name: "MF financial statements", dataThrough: null, fiscalYear: null, url: null },
      { id: "BANIPARTIDE", name: "BaniPartide", dataThrough: null, fiscalYear: null, url: null },
    ] },
  },
];
