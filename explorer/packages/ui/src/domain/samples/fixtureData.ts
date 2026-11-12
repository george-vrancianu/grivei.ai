// Story and test data drawn from the contract's mock fixtures, so the domain atoms are
// shown with the same invented world every screen uses. Nothing here ships in the app.
import { fixtures } from "@grivei/contract/fixtures";
import type { RecordFilter } from "@grivei/contract";
import type { Party, Total, EntityRef, DataThrough, RecordBadge, EntityHeaderData, RecordsTabData } from "../types.ts";

function named<T extends { name: string }>(set: readonly T[], name: string): T {
  const found = set.find((fixture) => fixture.name === name);
  if (!found) throw new Error(`No fixture named ${name}`);
  return found;
}

const variety = named(fixtures.MainScreen, "records-variety").data.seap.search;
const estimatedCounts = named(fixtures.MainScreen, "extreme-estimated-counts").data.seap.search;
const emptySearch = named(fixtures.MainScreen, "empty-no-match").data;
const typicalSearch = named(fixtures.MainScreen, "typical-text-county").data;

export const recordRows = variety.records.rows.map((row) => row.record);
export const winners: Party[] = recordRows.flatMap((record) => record.winners);

/** A winner that is a CUI entity. */
export const cuiParty = winners.find((p) => p.entity?.identity === "CUI")!;
/** A winner identified by name only. */
export const nameOnlyParty = winners.find((p) => p.entity?.identity === "NAME_ONLY")!;
/** A natural person, as the fixtures carry it (no entity, no published name). */
export const naturalPersonParty = winners.find((p) => p.naturalPerson)!;
/** Every consortium member of the variety fixture, one per Record. */
export const consortiumParties = winners.filter((p) => p.share !== null);
/** The longest entity name any fixture carries, for the long-name story. */
export const longNameEntity: EntityRef = [...winners.flatMap((p) => (p.entity ? [p.entity] : [])), ...recordRows.map((r) => r.authority)]
  .sort((a, b) => b.displayName.length - a.displayName.length)[0]!;

/** The EntityOverview fixture whose Entity has `identityCurated`. */
export const curatedEntity = named(fixtures.EntityOverview, "authority-both-roles").data.entity!;

export const totalTypical: Total = typicalSearch.seap.search.total;
export const totalWithLeftOut: Total = variety.total;
export const totalNational: Total = emptySearch.seap.search.total;
export const totalExtreme: Total = estimatedCounts.total;

export const authoritiesEstimated = estimatedCounts.authorities;
export const suppliersEstimated = estimatedCounts.suppliers;
export const authoritiesExact = variety.authorities;

export const dataThroughSeap: DataThrough[] = named(fixtures.MainScreen, "typical-text-county").data.sources[0]!.dataThrough;

export const allBadges: RecordBadge[] = [...new Set(recordRows.flatMap((record) => record.badges))];

const goToSearch = named(fixtures.MainScreen, "supplier-side-unknown-county").data.seap.search;
const pick = (search: typeof variety) => ({
  authorities: search.authorities,
  suppliers: search.suppliers,
  records: search.records,
  goTo: search.goTo,
});

/** The result tabs' inputs for each state a story shows: a typical search, every Record state, estimated counts, a Go-to match, nothing found. */
export const resultSamples = {
  typical: pick(typicalSearch.seap.search),
  variety: pick(variety),
  estimated: pick(estimatedCounts),
  goTo: pick(goToSearch),
  empty: pick(emptySearch.seap.search),
};
/** A Record row with highlighted matched text, from the typical search. */
export const highlightedRecord = typicalSearch.seap.search.records.rows[0]!;
/** The consortium Record of the variety fixture, with no matched field (an empty query). */
export const consortiumRecord = variety.records.rows[0]!;
export const noValueRecord = variety.records.rows.find((row) => row.record.value === null)!;
export const naturalPersonRecord = variety.records.rows.find((row) => row.record.winners.some((w) => w.naturalPerson))!;

// Entity page headers: the same fixtures the app's entity pages are tested with.
type EntityHeaderFixtureSet = readonly { name: string; data: { entity: EntityHeaderData | null } }[];
function headerOf(set: EntityHeaderFixtureSet, name: string): EntityHeaderData {
  const entity = named(set, name).data.entity;
  if (!entity) throw new Error(`Fixture ${name} has no entity`);
  return entity;
}
/** An authority placed in a county and UAT. */
export const authorityHeader = headerOf(fixtures.EntityOverview, "authority-typical");
/** A supplier with CUI, aliases and ANAF provenance. */
export const supplierHeader = headerOf(fixtures.EntityOverview, "supplier-typical");
/** Buys and sells: roles has both, national placement, identity curated. */
export const bothRolesHeader = headerOf(fixtures.EntityOverview, "both-roles-supplier-side");
/** A foreign supplier identified by VAT id, not placed, with SEAP as its source. */
export const nameOnlySupplierHeader = headerOf(fixtures.EntityOverview, "name-only-supplier-no-filter");
/** A deregistered supplier (ANAF status RADIERE). */
export const deregisteredHeader = headerOf(fixtures.EntityOverview, "deregistered-supplier-extreme-concentration");
/** An authority neither ANAF nor SEAP places in a county. */
export const unplacedAuthorityHeader = headerOf(fixtures.EntityOverview, "unplaced-authority");

// The full-results view's pages. Pagination is a prop of the view, so stories slice these rows into pages (a small page size)
// and say how many results there are in all.
/** Three authority rows (from the FullResultsAuthorities fixtures). */
export const fullResultsAuthorityRows = named(fixtures.FullResultsAuthorities, "typical-page-2").data.seap.search.authorities.rows;
/** Page 1 of a huge result: a HyperLogLog distinct count, shown with "≈". */
export const fullResultsEstimatedAuthorities = named(fixtures.FullResultsAuthorities, "extreme-estimated").data.seap.search.authorities;
/** Eight Records with every Record state (from the FullResultsRecords fixtures); the fixture counts 11 in all. */
export const fullResultsRecords = named(fixtures.FullResultsRecords, "typical-by-value").data.seap.search.records;

// The Records tab's data (`EntityRecords` fixtures: the `records(filter)` result of an entity's role).
const recordsOf = (name: string): RecordsTabData => named(fixtures.EntityRecords, name).data.entity!.seap.role!.records;
const filterOf = (name: string): RecordFilter => named(fixtures.EntityRecords, name).variables.filter;
/** A supplier's tab with no filter: facets with an authority as the counterparty. */
export const supplierRecords = recordsOf("supplier-default-page");
/** The same tab after choosing the Splitting facet. */
export const supplierSplittingRecords = recordsOf("supplier-signal-splitting");
export const supplierSplittingFilter = filterOf("supplier-signal-splitting");
/** A year, the channel, a Signal and one authority on at once. */
export const supplierSeveralFacetsRecords = recordsOf("supplier-several-facets");
export const supplierSeveralFacetsFilter = filterOf("supplier-several-facets");
/** A facet that matches nothing: zero total, no facets, no rows. */
export const supplierNoMatches = recordsOf("supplier-contract-no-matches");
export const supplierNoMatchesFilter = filterOf("supplier-contract-no-matches");
/** An authority's tab with no filter: facets with suppliers as the counterparties. */
export const authorityRecords = recordsOf("authority-default-page");
export const authorityOneSupplierRecords = recordsOf("authority-one-supplier");
export const authorityOneSupplierFilter = filterOf("authority-one-supplier");
/** A huge set: estimated total and counts, many pages. */
export const authorityEstimatedRecords = recordsOf("authority-estimated-total");
