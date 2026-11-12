// Shared prop types for the domain displays, taken from the generated contract.
import type {
  CoverageLensQuery, EntityOverviewQuery, EntityRecordsQuery, EntityRelationshipsQuery, CoverageStatus as ContractCoverageStatus, DataThroughFieldsFragment, EntityHeaderFieldsFragment, EntityRefFragment, MainScreenQuery, ZoomedCountyQuery, EntityResultPageFieldsFragment,
  EntityRowFieldsFragment, MoneyMapFieldsFragment, PartyFieldsFragment, RecordBadge, RecordPageQuery, RecordResultFieldsFragment, RecordRowFieldsFragment, Role,
  SignalFieldsFragment, SignalRuleSlug, TotalFieldsFragment,
} from "@grivei/contract";

/** Integer bani (1/100 RON) as a decimal string. */
export type { RecordBadge };
export type Total = TotalFieldsFragment;
export type Bani = Total["awarded"];
export type EntityRef = EntityRefFragment;
/** `SeapSearch.goTo`: an entity reference with the SEAP roles it has, which say which page to open. */
export type GoToEntity = NonNullable<MainScreenQuery["seap"]["search"]["goTo"]>;
export type Party = PartyFieldsFragment;
export type DataThrough = DataThroughFieldsFragment["dataThrough"][number];

export type EntityRow = EntityRowFieldsFragment;
export type EntityResultPage = EntityResultPageFieldsFragment;
export type EntityResult = EntityResultPageFieldsFragment["rows"][number];
export type RecordResultPage = RecordResultFieldsFragment;
export type RecordResult = RecordResultFieldsFragment["rows"][number];
export type RecordRow = RecordRowFieldsFragment;
export type MatchedField = NonNullable<RecordResult["matchedField"]>;
export type MatchableField = MatchedField["field"];
/** The role an entity page is opened in (the app's `/authority/...` and `/supplier/...` routes). */
export type EntityRole = "authority" | "supplier";
/** The Money lens's map: `seap.search.map` and the Flow lens's `flow`. */
export type MoneyMap = MoneyMapFieldsFragment;

/** What an Entity page's header shows (`EntityHeaderFields`). */
export type EntityHeaderData = EntityHeaderFieldsFragment;
/** The contract's `Role` (AUTHORITY | SUPPLIER) an Entity page asks for; `EntityRole` above is the lowercase URL segment. */
export type EntityPageRole = Role;
/** The three tabs of an Entity page; each has its own URL. */
export type EntityPageView = "overview" | "records" | "relationships";
/** The zoomed county's UAT map: `seap.search.uatMap(county:)`, authority side only. */
export type UatMap = ZoomedCountyQuery["seap"]["search"]["uatMap"];
/** A UAT's SIRUTA code: what a click on the zoomed county emits (the `RecordFilter.uat` value). */
export type Siruta = string;
/** The Coverage lens's data: `CoverageLens` (the `sources` list plus the SEAP `coverage` of the date window). */
export type CoverageLens = CoverageLensQuery;
/** One county's (or NATIONAL's) coverage row. */
export type CountyCoverage = CoverageLens["coverage"]["counties"][number];
/** How much of a county the harvest covers: HARVESTED, HARVESTED_WITH_KNOWN_GAPS, PARTIAL or NOT_HARVESTED. A category, never a ratio. */
export type CoverageStatus = ContractCoverageStatus;
/** A Source as the lens lists it: id, name (source data), whether it is harvested yet. */
export type SourceInfo = CoverageLens["sources"][number];

/** What the Records tab shows (`EntityRecords`): the filtered `total`, the `facets` and one page of Records. */
export type RecordsTabData = NonNullable<NonNullable<EntityRecordsQuery["entity"]>["seap"]["role"]>["records"];
/** The Records tab's facet counts. */
export type RecordFacetData = RecordsTabData["facets"];

/** What the Relationships tab shows (`EntityRelationships`' `seap.role`): the counterparties, the overall timeline and the Flow lens. */
export type RelationshipsData = NonNullable<NonNullable<EntityRelationshipsQuery["entity"]>["seap"]["role"]>;
/** What the Relationships tab's graph shows (`EntityRelationships`): the role's `counterparties` (the top 30 by money, with their count and top share). */
export type RelationshipsCounterparties = NonNullable<NonNullable<EntityRelationshipsQuery["entity"]>["seap"]["role"]>["counterparties"];
/** One counterparty of the graph: the Entity (null for a natural person or an unlinked winner), its money by channel and its markers. */
export type RelationshipsCounterparty = RelationshipsCounterparties["rows"][number];
/** The tab's monthly timeline (`timeline`): one Total per month, "YYYY-MM". */
export type RelationshipsTimeline = NonNullable<NonNullable<EntityRelationshipsQuery["entity"]>["seap"]["role"]>["timeline"];
/**
 * The Records with the picked counterparty: the `total` and `records` of an `EntityRecords` result filtered to that counterparty.
 * The Records' authority or winners name it when it is beyond the graph's top rows.
 */
export type CounterpartyRecordsData = Pick<RecordsTabData, "total" | "records">;

/** A Record as its page shows it (`RecordPage`'s `seap.record`, never null here). */
export type RecordPageData = NonNullable<RecordPageQuery["seap"]["record"]>;
/** A Signal a Record belongs to, with the Records it consists of. */
export type RecordSignal = RecordPageData["signals"][number];

/** What the Overview tab shows (`EntityOverview`'s `seap.role`): totals, counterparties, procedures, consortia, frameworks, largest Records, Signals. */
export type EntityOverviewData = NonNullable<NonNullable<EntityOverviewQuery["entity"]>["seap"]["role"]>;
/** One counterparty row of the Overview (a natural person has no entity). */
/** The Overview's counterparty list: the total count, the top share and the first rows. */
export type OverviewCounterparties = EntityOverviewData["counterparties"];
export type OverviewConsortium = EntityOverviewData["consortia"][number];
export type OverviewProcedure = EntityOverviewData["procedures"][number];
export type OverviewFrameworks = EntityOverviewData["frameworks"];
/** Every spelling of an Entity's name in SEAP ("Appears in SEAP as"). */
export type EntityAliases = EntityHeaderData["aliases"];

/** A Signal as `SignalFields` selects it: rule, dates, count, authority, suppliers, rule-specific numbers and the filter that reproduces it. */
export type SignalData = SignalFieldsFragment;
export type SignalRule = SignalRuleSlug;
