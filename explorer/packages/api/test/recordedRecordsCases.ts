/**
 * The cases whose answers are recorded as the contract's EntityRecords fixtures (ticket #87): each is one persisted-query request,
 * asked of the API after a real rebuild (seam 1), with exactly the variables the Records tab sends (`key`, `role`, `filter`, a page of
 * 100 at offset 0, no `order`). The block "recorded fixtures (#87)" in `seam1.test.ts` compares each answer with the committed JSON
 * and, with `RECORD_FIXTURES=1`, rewrites it. Same convention and archives as `recordedEntityCases.ts` (#86), in its own file.
 */
import type { FixtureKind } from "@grivei/contract/fixtures";
import { ENTITY_KEYS, type RecordedEntityArchive } from "./recordedEntityCases.ts";

export interface RecordedRecordsCase {
  operation: "EntityRecords";
  /** Unique within its operation. */
  name: string;
  archive: RecordedEntityArchive;
  kind: FixtureKind;
  description: string;
  variables: Record<string, unknown>;
}

const page = (key: string, role: "AUTHORITY" | "SUPPLIER", filter: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({ key, role, filter, limit: 100, offset: 0, ...extra });
const K = ENTITY_KEYS;

export const RECORDED_RECORDS_CASES: readonly RecordedRecordsCase[] = [
  // ---- the default page of each kind of entity ----
  { operation: "EntityRecords", name: "authority", archive: "overview", kind: "typical",
    description: "an authority's Records tab opened without a filter: every facet, suppliers as the counterparties, a suspect value and blanks among the rows",
    variables: page(K.hospital, "AUTHORITY") },
  { operation: "EntityRecords", name: "supplier", archive: "overview", kind: "typical",
    description: "a supplier's Records tab opened without a filter: its own share of each Record, authorities as the counterparties",
    variables: page(K.alfa, "SUPPLIER") },
  { operation: "EntityRecords", name: "both-roles-authority-page", archive: "overview", kind: "typical",
    description: "an entity that buys and sells, on its authority page: only what it bought",
    variables: page(K.cnair, "AUTHORITY") },
  { operation: "EntityRecords", name: "both-roles-supplier-page", archive: "overview", kind: "typical",
    description: "the same entity on its supplier page: only what it won",
    variables: page(K.cnair, "SUPPLIER") },
  { operation: "EntityRecords", name: "name-only-supplier", archive: "overview", kind: "typical",
    description: "a supplier with no tax id (key name-<slug>): its Records all the same",
    variables: page(K.localSupplier, "SUPPLIER") },
  { operation: "EntityRecords", name: "authority-asked-as-supplier", archive: "overview", kind: "empty",
    description: "an authority asked for its supplier role: the entity is there, the role is null",
    variables: page(K.hospital, "SUPPLIER") },
  { operation: "EntityRecords", name: "unknown-key", archive: "overview", kind: "empty",
    description: "no entity under that key: the page shows not-found",
    variables: page(K.nobody, "SUPPLIER") },

  // ---- one facet at a time, on the authority and the supplier of the roles archive ----
  { operation: "EntityRecords", name: "authority-channel-direct-purchase", archive: "overview", kind: "typical",
    description: "the authority's Records after the Direct purchase facet (channel): the total, the facets and the rows follow the filter",
    variables: page(K.hospital, "AUTHORITY", { channel: "DIRECT_PURCHASE" }) },
  { operation: "EntityRecords", name: "authority-channel-contract", archive: "overview", kind: "typical",
    description: "the authority's Records after the Contract facet (channel)",
    variables: page(K.hospital, "AUTHORITY", { channel: "CONTRACT" }) },
  { operation: "EntityRecords", name: "authority-procedure", archive: "overview", kind: "typical",
    description: "the authority's Records after one procedure (Negociere, as published)",
    variables: page(K.hospital, "AUTHORITY", { procedure: ["Negociere"] }) },
  { operation: "EntityRecords", name: "authority-year-2024", archive: "overview", kind: "typical",
    description: "the authority's Records after the year facet 2024 (from 2024-01-01 to 2024-12-31): one Record",
    variables: page(K.hospital, "AUTHORITY", { from: "2024-01-01", to: "2024-12-31" }) },
  { operation: "EntityRecords", name: "authority-counterparty", archive: "overview", kind: "typical",
    description: "the authority's Records after picking one supplier from the counterparty facet (RecordFilter.supplier)",
    variables: page(K.hospital, "AUTHORITY", { supplier: K.alfa }) },
  { operation: "EntityRecords", name: "second-authority-name-only-counterparty", archive: "overview", kind: "typical",
    description: "an authority's Records after picking a name-only supplier (key name-<slug>) from the counterparty facet",
    variables: page(K.commune, "AUTHORITY", { supplier: K.localSupplier }) },
  { operation: "EntityRecords", name: "authority-badge-suspect-value", archive: "overview", kind: "typical",
    description: "the authority's Records after the Suspect value badge: the suspect Record is listed and shown, but counted in no sum",
    variables: page(K.hospital, "AUTHORITY", { badges: ["SUSPECT_VALUE"] }) },
  { operation: "EntityRecords", name: "authority-several-facets", archive: "overview", kind: "typical",
    description: "the authority's Records with a year, the channel and one supplier on at once",
    variables: page(K.hospital, "AUTHORITY", { from: "2023-01-01", to: "2023-12-31", channel: "CONTRACT", supplier: K.alfa }) },
  { operation: "EntityRecords", name: "supplier-several-facets", archive: "overview", kind: "typical",
    description: "the supplier's Records with a year, the channel and one authority on at once: the filter the panel builds by several choices",
    variables: page(K.alfa, "SUPPLIER", { from: "2023-01-01", to: "2023-12-31", channel: "CONTRACT", authority: K.hospital }) },
  { operation: "EntityRecords", name: "authority-nothing-in-filter", archive: "overview", kind: "empty",
    description: "an authority whose filter (the year 2019) matches none of its Records: zero total, empty facets, no rows",
    variables: page(K.hospital, "AUTHORITY", { from: "2019-01-01", to: "2019-12-31" }) },
  { operation: "EntityRecords", name: "supplier-nothing-in-filter", archive: "overview", kind: "empty",
    description: "a supplier whose filter (the year 2019) matches none of its Records: zero total, empty facets, no rows",
    variables: page(K.alfa, "SUPPLIER", { from: "2019-01-01", to: "2019-12-31" }) },
  { operation: "EntityRecords", name: "supplier-counterparty", archive: "overview", kind: "typical",
    description: "the supplier's Records after picking one authority from the counterparty facet (RecordFilter.authority)",
    variables: page(K.alfa, "SUPPLIER", { authority: K.hospital }) },
  { operation: "EntityRecords", name: "supplier-channel-contract", archive: "overview", kind: "typical",
    description: "the supplier's Records after the Contract facet (channel)",
    variables: page(K.alfa, "SUPPLIER", { channel: "CONTRACT" }) },

  // ---- Signals: the Records a Signal reproduces (archive-signals; the order is asked for so these do not share variables with the roles archive's pages) ----
  { operation: "EntityRecords", name: "authority-with-signals", archive: "signals", kind: "typical",
    description: "an authority whose Records are in Signals, opened without a filter (?order=value-desc): the Signal facet lists each rule with its Records",
    variables: page(K.hospital, "AUTHORITY", {}, { order: "VALUE_DESC" }) },
  { operation: "EntityRecords", name: "authority-signal-over-cap", archive: "signals", kind: "typical",
    description: "the Records of the over-cap Signals of the authority (signal=over-cap): the filter a Signal's reproducing link opens",
    variables: page(K.hospital, "AUTHORITY", { signal: "OVER_CAP" }, { order: "VALUE_DESC" }) },
  { operation: "EntityRecords", name: "authority-signal-no-publication", archive: "signals", kind: "typical",
    description: "the Records of the no-publication Signals of the authority (signal=no-publication)",
    variables: page(K.hospital, "AUTHORITY", { signal: "NO_PUBLICATION" }, { order: "VALUE_DESC" }) },
  { operation: "EntityRecords", name: "supplier-signal-over-cap", archive: "signals", kind: "typical",
    description: "a supplier's Records that are in over-cap Signals",
    variables: page(K.alfa, "SUPPLIER", { signal: "OVER_CAP" }, { order: "VALUE_DESC" }) },

  // ---- placement world ----
  { operation: "EntityRecords", name: "authority-placed-in-uat", archive: "moneymap", kind: "typical",
    description: "a commune placed in a county and a UAT, with a consortium Record won with a firm of another county",
    variables: page(K.sanpetru, "AUTHORITY") },
];
