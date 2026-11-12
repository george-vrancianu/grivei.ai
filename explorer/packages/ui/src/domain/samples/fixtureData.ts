// Story and test data drawn from the contract's mock fixtures, so the domain atoms are
// shown with the same invented world every screen uses. Nothing here ships in the app.
import { fixtures } from "@grivei/contract/fixtures";
import type { Party, Total, EntityRef, DataThrough, RecordBadge, EntityHeaderData } from "../types.ts";

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
