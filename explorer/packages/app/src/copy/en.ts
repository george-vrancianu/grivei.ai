import type { Copy } from "./types.ts";

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);

const entityLink: Copy["entityLink"] = {
  nameOnly: { label: "name only", explanation: "Identified by its published name alone (no CUI). Figures may mix up namesakes." },
  identityCurated: { label: "curated", explanation: "A person reviewed and fixed this entity's identity." },
};

export const en: Copy = {
  brand: "Grivei.ai",
  nav: { label: "Main", explore: "Explore", search: "Search", coverage: "Coverage", methodology: "About the numbers" },
  language: { switchTo: "Română", switchLabel: "Romanian version of this page" },
  status: { loading: "Loading…", failed: "The data could not be loaded." },
  main: { title: "Explore public spending", total: "Total awarded" },
  searchField: { label: "Search", placeholder: "Authority, supplier, CUI, title…" },
  records: {
    heading: "Records",
    empty: "No Records yet.",
    noValue: "no value",
    countSuffix: "Records",
    columns: { code: "Code", title: "Title", authority: "Authority", supplier: "Supplier", date: "Date", value: "Value" },
  },
  pages: {
    placeholder: "This page is not built yet.",
    notFound: { title: "Page not found", back: "Back to the main screen" },
    search: { title: "Search" },
    authority: { overview: "Authority", records: "Authority: Records", relationships: "Authority: Relationships" },
    supplier: { overview: "Supplier", records: "Supplier: Records", relationships: "Supplier: Relationships" },
    record: { title: "Record" },
    coverage: { title: "Coverage" },
    methodology: { title: "About the numbers" },
  },
  badges: {
    FRAMEWORK_CEILING: { label: "Framework ceiling", explanation: "The agreed maximum of a framework agreement, not money awarded. Never added to a total." },
    SUBSEQUENT_CONTRACT: { label: "Subsequent contract", explanation: "Awarded under a framework agreement. Counted here; the framework's ceiling is not." },
    CONSORTIUM_SHARE: { label: "Consortium share", explanation: "Several suppliers won together; each is shown with an equal share of the value." },
    SUSPECT_VALUE: { label: "Suspect value", explanation: "The published value breaks a counting rule (for example, far above its estimate). Shown and searchable, but left out of totals." },
    NO_VALUE: { label: "No value", explanation: "SEAP publishes no value for this Record. It is counted, and adds nothing to totals." },
    CUI_MISMATCH: { label: "CUI mismatch", explanation: "The CUI published here does not match the one ANAF confirms for this name." },
    NAME_DIFFERS_FROM_ANAF: { label: "Name differs from ANAF", explanation: "The name published on this Record differs from the registered name at ANAF." },
    IDENTITY_CURATED: { label: "Identity curated", explanation: "A person reviewed and fixed who this party is; the match was not automatic." },
    CRAWLED_PROVISIONAL: { label: "Provisional", explanation: "Read from SEAP this quarter and still awaiting the official bulk data; it may change." },
    CRAWL_ONLY: { label: "Not in bulk data", explanation: "Found on SEAP but never matched in the official bulk data." },
  },
  entityLink,
  party: { naturalPerson: "Natural person", entityLink },
  dataThrough: { through: "data through" },
  total: {
    records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
    suspectLeftOut: (n, f) => `${f} ${plural(n, "suspect value left out", "suspect values left out")}`,
    noValue: (n, f) => `${f} ${plural(n, "Record with no value", "Records with no value")}`,
    frameworkCeilings: (amount) => `Framework ceilings not counted: ${amount}`,
    methodology: "How this total is counted",
  },
};
