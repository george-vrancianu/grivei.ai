import type { Copy } from "./types.ts";

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);

const entityLink: Copy["entityLink"] = {
  nameOnly: { label: "name only", explanation: "Identified by its published name alone (no CUI). Figures may mix up namesakes." },
  identityCurated: { label: "curated", explanation: "A person reviewed and fixed this entity's identity." },
};

const badges: Copy["badges"] = {
  FRAMEWORK_CEILING: { label: "Framework ceiling", explanation: "The agreed maximum of a framework agreement, not money awarded. Never added to a total." },
  SUBSEQUENT_CONTRACT: { label: "Subsequent contract", explanation: "Awarded under a framework agreement. Counted here; the framework's ceiling is not." },
  CONSORTIUM_SHARE: { label: "Consortium share", explanation: "Several suppliers won together. A supplier's own figures count an equal share of the contract value; a Record shows the full value." },
  SUSPECT_VALUE: { label: "Suspect value", explanation: "The published value breaks a counting rule (for example, far above its estimate). Shown and searchable, but left out of totals." },
  NO_VALUE: { label: "No value", explanation: "SEAP publishes no value for this Record. It is counted, and adds nothing to totals." },
  CUI_MISMATCH: { label: "CUI mismatch", explanation: "The CUI published here does not match the one ANAF confirms for this name." },
  NAME_DIFFERS_FROM_ANAF: { label: "Name differs from ANAF", explanation: "The name published on this Record differs from the registered name at ANAF." },
  IDENTITY_CURATED: { label: "Identity curated", explanation: "A person reviewed and fixed who this party is; the match was not automatic." },
  CRAWLED_PROVISIONAL: { label: "Provisional", explanation: "Read from SEAP this quarter and still awaiting the official bulk data; it may change." },
  CRAWL_ONLY: { label: "Not in bulk data", explanation: "Found on SEAP but never matched in the official bulk data." },
};

export const en: Copy = {
  brand: "Grivei.ai",
  nav: { label: "Main", explore: "Explore", search: "Search", coverage: "Coverage", methodology: "About the numbers" },
  language: { switchTo: "Română", switchLabel: "Romanian version of this page" },
  status: { loading: "Loading…", failed: "The data could not be loaded." },
  main: { title: "Explore public spending", total: "Total awarded" },
  searchField: { label: "Search", placeholder: "Authority, supplier, CUI, title…" },
  results: {
    label: "Results",
    tabs: { authorities: "Authorities", suppliers: "Suppliers", records: "Records" },
    empty: { authorities: "No authorities match.", suppliers: "No suppliers match.", records: "No Records match." },
    showAll: (_n, formatted) => `Show all ${formatted}`,
    goTo: { heading: "Go to page", open: "Open the page", cui: "CUI", nameOnly: "identified by name only" },
    entityRow: {
      matched: "matched",
      records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
      national: "national",
      noCounty: "county unknown",
      entityLink,
    },
    recordRow: {
      noValue: "no value",
      consortium: {
        label: "consortium",
        explanation: "The full contract value is shown. Each member's share is an equal-share convention, not a published figure.",
      },
      authority: "Authority",
      winners: "Winners",
      matchedIn: (field) => `Matched in ${field}`,
      fields: {
        TITLE: "title", AUTHORITY: "authority", SUPPLIER: "supplier", CPV_CODE: "CPV code", CPV_DESCRIPTION: "CPV description",
        PUBLIC_CODE: "public code", CUI: "CUI",
      },
      badges,
      party: { naturalPerson: "Persoană fizică", entityLink },
    },
  },
  filterChips: {
    label: "Filters",
    year: { group: "Award year", from: "From year", to: "To year", any: "Any" },
    channel: { group: "Channel", options: { DIRECT_PURCHASE: "Direct purchase", CONTRACT: "Contract" } },
    valueBucket: {
      group: "Value",
      options: {
        UP_TO_10K: "Up to 10,000 RON",
        UP_TO_135K: "Up to 135,060 RON",
        UP_TO_270K: "Up to 270,120 RON",
        UP_TO_900K: "Up to 900,400 RON",
        UP_TO_9M: "Up to 9,004,000 RON",
        UP_TO_1B: "Up to 1 bn RON",
        OVER_1B: "Over 1 bn RON",
      },
    },
    signals: { group: "Signals", has: "Has Signals", without: "Without Signals" },
    procedure: { group: "Procedure", empty: "No procedures to choose from." },
    badges: { group: "Record badges", badges: badges },
    active: {
      group: "Active filters",
      none: "No filters on.",
      from: (when) => `From ${when}`,
      to: (when) => `Until ${when}`,
      remove: (chip) => `Remove ${chip}`,
      clearAll: "Clear all",
    },
  },
  pages: {
    placeholder: "This page is not built yet.",
    notFound: { title: "Page not found", back: "Back to the main screen" },
    search: { title: "Search" },
    record: { title: "Record" },
    coverage: { title: "Coverage" },
    methodology: { title: "About the numbers" },
  },
  badges,
  entityLink,
  party: { naturalPerson: "Persoană fizică", entityLink },
  dataThrough: { through: "data through" },
  total: {
    records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
    suspectLeftOut: (n, f) => `${f} ${plural(n, "suspect value left out", "suspect values left out")}`,
    noValue: (n, f) => `${f} ${plural(n, "Record with no value", "Records with no value")}`,
    frameworkCeilings: (amount) => `Framework ceilings not counted: ${amount}`,
    methodology: "How this total is counted",
  },
  entityPage: {
    layout: { label: "Sections of this page", tabs: { overview: "Overview", records: "Records", relationships: "Relationships" } },
    header: {
      identity: {
        cui: "CUI",
        foreignVatId: "Foreign VAT ID",
        nameOnly: { label: "Identified by name only", explanation: "No CUI that ANAF knows for this supplier, so it is identified by its foreign VAT id or its published name. Figures may mix up namesakes." },
        identityCurated: { label: "Identity curated", explanation: "A person reviewed and fixed this entity's identity." },
      },
      anafStatus: { label: "ANAF status", inactive: (status) => `ANAF lists this entity as ${status}, not active.` },
      placement: {
        label: "Location",
        national: "National",
        unplaced: { label: "Unplaced", explanation: "Neither ANAF nor SEAP places this entity in a county." },
        placedBy: (source) => `placed by ${source}`,
      },
      source: { from: (source, fetched) => `Name and status from ${source}, fetched ${fetched}` },
      roles: { label: "View as", authority: "As authority", supplier: "As supplier" },
    },
    notFound: { title: "Entity not found", body: "No authority or supplier is published under this key." },
    tabBody: {
      overview: "The Overview is not built yet.",
      records: "The Records tab is not built yet.",
      relationships: "The Relationships tab is not built yet.",
    },
  },
};
