// Story and test data drawn from the contract's mock fixtures, so the domain atoms are
// shown with the same invented world every screen uses. Nothing here ships in the app.
import { fixtures } from "@grivei/contract/fixtures";
import type { RecordFilter } from "@grivei/contract";
import type { Party, Total, EntityRef, DataThrough, RecordBadge, EntityHeaderData, RecordPageData, RecordsTabData, EntityOverviewData, EntityAliases, RelationshipsCounterparties, RelationshipsTimeline, CounterpartyRecordsData } from "../types.ts";

function named<T extends { name: string }>(set: readonly T[], name: string): T {
  const found = set.find((fixture) => fixture.name === name);
  if (!found) throw new Error(`No fixture named ${name}`);
  return found;
}

const variety = named(fixtures.MainScreen, "records-variety").data.seap.search;
const estimatedCounts = named(fixtures.MainScreen, "extreme-estimated-counts").data.seap.search;
const emptySearch = named(fixtures.MainScreen, "empty-no-match").data;
const typicalSearch = named(fixtures.MainScreen, "text-query").data;

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

export const dataThroughSeap: DataThrough[] = named(fixtures.MainScreen, "text-query").data.sources[0]!.dataThrough;

export const allBadges: RecordBadge[] = [...new Set(recordRows.flatMap((record) => record.badges))];

const goToSearch = named(fixtures.MainScreen, "go-to-entity").data.seap.search;
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
/** Entity rows with Signals in the filter (counts 1 and 2) next to one without (the hand "supplier-county-consortium-share"): the "n Signals" chip's states. */
export const signalRowSamples = pick(named(fixtures.MainScreen, "supplier-county-consortium-share").data.seap.search);
/** A single-winner Record row whose title matched the query, with its highlighted range (the recorded "text-query-title-match"). */
export const highlightedRecord = named(fixtures.MainScreen, "text-query-title-match").data.seap.search.records.rows[0]!;
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
/** An authority placed in a county and UAT (recorded). */
export const authorityHeader = headerOf(fixtures.EntityOverview, "authority-placed-in-uat");
/** A supplier with CUI, aliases and ANAF provenance. */
export const supplierHeader = headerOf(fixtures.EntityOverview, "supplier");
/** Buys and sells: roles has both (recorded, the supplier page). */
export const bothRolesHeader = headerOf(fixtures.EntityOverview, "both-roles-supplier-page");
/** Identity curated and placed nationally (a hand fixture: no archive carries an identity-override file). */
export const curatedHeader = headerOf(fixtures.EntityOverview, "authority-both-roles");
/** An authority placed nationally, not in a county (recorded). */
export const nationalAuthorityHeader = headerOf(fixtures.EntityOverview, "national-authority");
/** A foreign supplier identified by VAT id, not placed, with SEAP as its source. */
export const nameOnlySupplierHeader = headerOf(fixtures.EntityOverview, "foreign-vat-supplier");
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

// A Record row inside Signals (recorded from archive-signals: the two direct purchases of one over-cap Signal, and one inside a splitting Signal).
/** The rows of the Records tab for one over-cap Signal's reproducing filter: each Record carries the Signal it is in. */
/** The Signals of the hospital authority's Overview, recorded: no publication and over cap, newest first (the SignalList story's rows). */
export const recordedOverviewSignals = named(fixtures.EntityOverview, "authority-with-signals").data.entity!.seap.role!.signals.rows;
export const overCapSignalRecords = named(fixtures.EntityRecords, "over-cap-1000017-2023-01-10-2023-01-10").data.entity!.seap.role!.records;
export const splittingSignalRecords = named(fixtures.EntityRecords, "splitting-1000017-2023-03-01-2023-04-08-2000023").data.entity!.seap.role!.records;

// The Records tab's data (`EntityRecords` fixtures: the `records(filter)` result of an entity's role).
const recordsOf = (name: string): RecordsTabData => named(fixtures.EntityRecords, name).data.entity!.seap.role!.records;
const filterOf = (name: string): RecordFilter => named(fixtures.EntityRecords, name).variables.filter;
// Recorded from the API (seam 1, `recorded/EntityRecords.json`, `recorded/signals/`) except the estimated total, which stays hand-written.
/** A supplier's tab with no filter: facets with authorities as the counterparties. */
export const supplierRecords = recordsOf("supplier");
/** A supplier's tab after choosing the Splitting facet (recorded from archive-splitting: its two splitting Signals, five Records). */
export const supplierSplittingRecords = recordsOf("supplier-with-splitting-facet");
export const supplierSplittingFilter = filterOf("supplier-with-splitting-facet");
/** A year, the channel and one authority on at once. */
export const supplierSeveralFacetsRecords = recordsOf("supplier-several-facets");
export const supplierSeveralFacetsFilter = filterOf("supplier-several-facets");
/** A facet that matches nothing: zero total, no facets, no rows. */
export const supplierNoMatches = recordsOf("supplier-nothing-in-filter");
export const supplierNoMatchesFilter = filterOf("supplier-nothing-in-filter");
/** An authority's tab with no filter: facets with suppliers as the counterparties. */
export const authorityRecords = recordsOf("authority");
/** An authority whose Records are in Signals: the Signal facet lists each rule (recorded, asked with `order: VALUE_DESC`). */
export const authorityWithSignalsRecords = recordsOf("authority-with-signals");
export const authorityOneSupplierRecords = recordsOf("authority-counterparty");
export const authorityOneSupplierFilter = filterOf("authority-counterparty");
/** A huge set: estimated total and counts, many pages (hand-written: an estimate needs more than 65,000 Records). */
export const authorityEstimatedRecords = recordsOf("authority-estimated-total");

// ---- the Record page (`RecordPage` fixtures: the API's recorded answers, ticket #85, plus two hand ones) ----------------------

function recordPage(name: string): RecordPageData {
  const found = fixtures.RecordPage.find((fixture) => fixture.name === name)?.data.seap.record;
  if (!found) throw new Error(`No RecordPage fixture named ${name} with a Record`);
  return found;
}
/** A direct purchase just under 10x the cap, counted, with the over-cap Signal that lists it and a second Record (recorded). */
export const directPurchaseRecord = recordPage("over-cap-signal");
/** A contract with its procedure, contract type and CPV, bulk provenance (recorded): a subsequent contract under a code with a slash. */
export const contractRecord = recordPage("contract-code-with-slash");
/** A consortium of two (an award notice): the full value and each member's equal share (recorded). */
export const consortiumPage = recordPage("award-notice-consortium");
/** A consortium of a CUI firm, a natural person and a foreign firm known by its VAT id (recorded). */
export const consortiumNameOnlyPage = recordPage("consortium-name-only-members");
/** A framework agreement: ceiling, what its subsequent contracts reported so far and the two subsequent contracts listed (recorded). */
export const frameworkPage = recordPage("framework-agreement");
/** A subsequent contract, pointing back to its framework (recorded). */
export const subsequentPage = recordPage("subsequent-contract");
/** A subsequent contract of a framework with a blank ceiling: no ratio (recorded). */
export const blankCeilingPage = recordPage("framework-blank-ceiling");
/** A suspect value under each rule (recorded). */
export const suspectDirectPage = recordPage("direct-purchase-suspect");
export const suspectOverEstimatePage = recordPage("contract-suspect-over-estimate");
export const suspectNoEstimatePage = recordPage("contract-suspect-no-estimate");
/** A Record with no value in SEAP (recorded). */
export const noValuePage = recordPage("direct-purchase-no-value");
/** A natural-person winner: never named, never linked (recorded). */
export const naturalPersonPage = recordPage("natural-person-winner");
/** A Record inside a splitting Signal (recorded). */
export const splittingPage = recordPage("splitting-signal");
/** A framework whose subsequent contracts exceed its ceiling (125%), with the framework-overrun Signal (recorded from archive-framework-overrun). */
export const frameworkOverrunPage = recordPage("framework-overrun-ceiling");
/** A crawled contract in a quarter the bulk has not reached: provisional, linked to its e-licitatie page (recorded). */
export const provisionalPage = recordPage("crawled-provisional");
/** A crawled Record the bulk does not have: crawl-only (recorded). */
export const crawlOnlyPage = recordPage("crawl-only");
/** A Record with no stable public page: `provenance.url` null (hand: the codes the redirect cannot resolve have no recorded Record). */
export const noPublicPage = recordPage("no-public-page");
/** The CUI-mismatch, name-differs and curated-identity Records (recorded). */
export const cuiMismatchPage = recordPage("cui-mismatch");
export const nameDiffersPage = recordPage("name-differs-from-anaf");
export const curatedPage = recordPage("identity-curated");
/** Every badge there is, for the story and test that show each explanation (hand: no one Record has all ten). */
export const everyBadgePage: RecordPageData = {
  ...provisionalPage,
  badges: ["FRAMEWORK_CEILING", "SUBSEQUENT_CONTRACT", "CONSORTIUM_SHARE", "SUSPECT_VALUE", "NO_VALUE", "CUI_MISMATCH", "NAME_DIFFERS_FROM_ANAF", "IDENTITY_CURATED", "CRAWLED_PROVISIONAL", "CRAWL_ONLY"],
};

// The Overview tab's data (`EntityOverview` fixtures: the entity's `seap.role` and its aliases).
const overviewOf = (name: string) => {
  const entity = named(fixtures.EntityOverview, name).data.entity!;
  return { overview: entity.seap.role as EntityOverviewData, aliases: entity.aliases as EntityAliases };
};
/** An authority with five counterparties (a natural person among them), consortia, a framework line, a Total that left things out, no Signals (recorded). */
export const authorityOverview = overviewOf("authority");
/** An authority with 220 counterparties (four rows sent, one a natural person), a consortium and a framework line. */
export const authorityManyCounterpartiesOverview = overviewOf("authority-many-counterparties");
/** A supplier with Signals, a consortium and a Total that left things out (recorded). */
export const supplierOverview = overviewOf("supplier-with-signals");
/** A supplier SEAP spells eight ways, no Signals. */
export const manyAliasesOverview = overviewOf("supplier-many-aliases");
/** An authority with nothing in the filter (recorded). */
export const emptyOverview = overviewOf("authority-nothing-in-filter");
/** A name-only supplier (no tax id published), one counterparty (recorded). */
export const nameOnlyOverview = overviewOf("name-only-supplier");

// ---- the Relationships tab (`EntityRelationships` and `EntityRecords` fixtures) ----------------------------------

type RelationshipsSample = {
  entity: EntityHeaderData;
  counterparties: RelationshipsCounterparties;
  timeline: RelationshipsTimeline;
};
function relationships(name: string): RelationshipsSample {
  const entity = named(fixtures.EntityRelationships, name).data.entity!;
  const role = entity.seap.role!;
  return { entity, counterparties: role.counterparties, timeline: role.timeline };
}
const panelOf = (name: string): CounterpartyRecordsData => {
  const { total, records } = recordsOf(name);
  return { total, records };
};
/** An authority with eight counterparties shown of thirteen: contracts, direct purchases, a mix, a Signal ring, a natural person and an unidentified group. */
export const authorityTypicalRelationships = relationships("authority-typical-view");
/** The same tab with the contract supplier picked: its months. */
export const authorityTypicalPickedTimeline = named(fixtures.EntityRelationships, "authority-typical-picked").data.entity!.seap.role!.timeline;
/** The direct-purchase supplier picked: its months, a part of the overall ones. */
export const authorityTypicalPickedDirectTimeline = named(fixtures.EntityRelationships, "authority-typical-picked-direct").data.entity!.seap.role!.timeline;
/** Records with that contract supplier (authority 4000001, supplier 30000002). */
export const authorityPickedPanel = panelOf("authority-one-supplier-contract");
/** Records with the direct-purchase supplier (authority 4000001, supplier 30000001): four Records. */
export const authorityDirectSupplierPanel = panelOf("authority-one-supplier");
/** An authority with a single counterparty. */
export const oneCounterpartyRelationships = relationships("authority-one-counterparty");
/** A supplier that mostly bids in consortia: many won-together edges. */
export const consortiumHeavyRelationships = relationships("supplier-consortium-heavy");
/** An authority whose only counterparty is a natural person. */
export const naturalPersonRelationships = relationships("authority-natural-person-only");
/** A supplier with one authority, picked: its months and Records. */
export const supplierPickedRelationships = relationships("supplier-picked-authority");
export const supplierPickedPanel = panelOf("supplier-one-authority");
/** No counterparties at all. */
export const emptyRelationships = relationships("no-relationships");

/** A Record that carries the framework-ceiling badge: its value is a ceiling, not money awarded. */
export const ceilingRecord = variety.records.rows.find((row) => row.record.badges.includes("FRAMEWORK_CEILING"))!;
