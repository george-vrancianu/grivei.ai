import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** What an AreaTotal is for: a MapArea on the county map, or a SIRUTA on the zoomed county. Kept apart from MapArea so a SIRUTA is never a valid `RecordFilter.county`. */
  AreaKey: { input: string; output: string; }
  /** Integer bani (1/100 RON), serialised as a decimal string so no sum loses precision in JSON. */
  Bani: { input: string; output: string; }
  /** ISO 3166-2:RO, e.g. RO-BV, RO-B. */
  CountyCode: { input: string; output: string; }
  Date: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  /** A county ISO 3166-2:RO code, or one of the off-map tiles. */
  MapArea: { input: string; output: string; }
  Siruta: { input: string; output: string; }
};

export type Alias = {
  __typename?: 'Alias';
  /** Badge: SEAP name differs from ANAF under the same CUI. */
  differsFromAnaf: Scalars['Boolean']['output'];
  first: Scalars['Date']['output'];
  last: Scalars['Date']['output'];
  name: Scalars['String']['output'];
  records: Scalars['Int']['output'];
};

export type AreaTotal = {
  __typename?: 'AreaTotal';
  /** A county code (county map) or a SIRUTA (zoomed county). */
  area: Scalars['AreaKey']['output'];
  /** Distinct entities behind the total on the lens's side (the optional circle per UAT). */
  entities: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  total: Total;
};

export type Channel =
  | 'CONTRACT'
  | 'DIRECT_PURCHASE';

export type Consortium = {
  __typename?: 'Consortium';
  members: Array<Party>;
  total: Total;
};

export type Counterparty = {
  __typename?: 'Counterparty';
  /** Null for natural-person suppliers (shown as 'Persoană fizică'), who are never named or linked. */
  entity: Maybe<Entity>;
  hasSignals: Scalars['Boolean']['output'];
  naturalPerson: Scalars['Boolean']['output'];
  total: Total;
  viaContract: Total;
  /** Edge colouring on the Relationships graph. */
  viaDirectPurchase: Total;
  /** Dashed edge: won together in a consortium. */
  wonTogether: Scalars['Boolean']['output'];
};

export type CounterpartyPage = {
  __typename?: 'CounterpartyPage';
  count: Scalars['Int']['output'];
  rows: Array<Counterparty>;
  /** Top-1 share of the total, for the headline number. */
  topShare: Maybe<Scalars['Float']['output']>;
};

export type County = {
  __typename?: 'County';
  code: Scalars['CountyCode']['output'];
  name: Scalars['String']['output'];
};

export type CountyCoverage = {
  __typename?: 'CountyCoverage';
  county: Scalars['MapArea']['output'];
  otherAuthorities: Scalars['Int']['output'];
  publicEntities: Scalars['Int']['output'];
  status: CoverageStatus;
  /** N of M public entities have records in the window (tooltip only). */
  withRecords: Scalars['Int']['output'];
};

export type CountySide =
  | 'AUTHORITY'
  | 'SUPPLIER';

export type Coverage = {
  __typename?: 'Coverage';
  counties: Array<CountyCoverage>;
  /** Planned Sources' greyed marks, per county, come from `sources` (harvested: false). */
  grid: Array<GapCell>;
  /** MF Lista entităților publice snapshot date. */
  referenceSnapshot: Maybe<Scalars['Date']['output']>;
  source: Source;
  unplacedAuthorities: UnplacedTile;
  window: Period;
};

export type CoverageStatus =
  | 'HARVESTED'
  | 'HARVESTED_WITH_KNOWN_GAPS'
  | 'NOT_HARVESTED'
  | 'PARTIAL';

export type Cpv = {
  __typename?: 'Cpv';
  code: Scalars['String']['output'];
  description: Scalars['String']['output'];
};

export type DataThrough = {
  __typename?: 'DataThrough';
  date: Scalars['Date']['output'];
  /** A record kind of the Source. A plain string because kinds belong to each Source (ADR 0005); SEAP's are SeapRecordKind. */
  kind: Scalars['String']['output'];
};

export type DateRange = {
  from?: InputMaybe<Scalars['Date']['input']>;
  to?: InputMaybe<Scalars['Date']['input']>;
};

/**
 * One contracting authority, supplier, or both. URLs use the role
 * (/explore/authority/<key>, /explore/supplier/<key>), the API doesn't:
 * the page asks for the role it shows.
 */
export type Entity = {
  __typename?: 'Entity';
  /** Spellings under which this entity was published, with dates. Never used to merge. */
  aliases: Array<Alias>;
  /** ANAF status (ACTIV, RADIERE, FUZIUNE ...), badged when not active. */
  anafStatus: Maybe<Scalars['String']['output']>;
  cui: Maybe<Scalars['String']['output']>;
  displayName: Scalars['String']['output'];
  foreignVatId: Maybe<Scalars['String']['output']>;
  identity: EntityIdentity;
  identityCurated: Scalars['Boolean']['output'];
  key: Scalars['ID']['output'];
  placement: Maybe<Placement>;
  /** Where the name and ANAF status came from and when we fetched them: ANAF (the Reference source), or SEAP when ANAF has no answer. */
  provenance: Array<Provenance>;
  /** Source-specific facets, one sibling per explorable Source (ADR 0005). Release 1 has SEAP only. */
  seap: SeapEntity;
};

export type EntityIdentity =
  | 'CUI'
  | 'NAME_ONLY';

export type EntityResult = {
  __typename?: 'EntityResult';
  entity: Entity;
  /** This entity's share of the matching set: consortium shares on the supplier side. */
  matched: Total;
};

export type EntityResultPage = {
  __typename?: 'EntityResultPage';
  /** Distinct entities in the matching set. */
  count: Scalars['Int']['output'];
  /** True when `count` is a HyperLogLog estimate (distinct groups above ~65k): shown with a leading approximately-sign. */
  countEstimated: Scalars['Boolean']['output'];
  rows: Array<EntityResult>;
};

export type FacetCount = {
  __typename?: 'FacetCount';
  total: Total;
  value: Scalars['String']['output'];
};

export type FrameworkLink = {
  __typename?: 'FrameworkLink';
  /** The framework agreement Record (null on the framework itself). */
  agreement: Maybe<SeapRecord>;
  ceiling: Maybe<Scalars['Bani']['output']>;
  /** subsequentReported / ceiling; null when the ceiling is blank. */
  ratio: Maybe<Scalars['Float']['output']>;
  subsequent: Array<SeapRecord>;
  subsequentReported: Scalars['Bani']['output'];
};


export type FrameworkLinkSubsequentArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type FrameworkOverrunNumbers = {
  __typename?: 'FrameworkOverrunNumbers';
  ceiling: Scalars['Bani']['output'];
  ratio: Scalars['Float']['output'];
  subsequent: Scalars['Bani']['output'];
};

export type FrameworkSummary = {
  __typename?: 'FrameworkSummary';
  ceilings: Scalars['Bani']['output'];
  count: Scalars['Int']['output'];
  subsequentReported: Scalars['Bani']['output'];
};

export type GapCell = {
  __typename?: 'GapCell';
  /** Of `records`, the crawl-only ones: crawled or backfilled Records that the bulk file of their quarter does not hold (or that have no bulk file of their kind). */
  crawlOnly: Scalars['Int']['output'];
  dataThrough: Maybe<Scalars['Date']['output']>;
  /** A record kind of the Source (SEAP: SeapRecordKind). A plain string because kinds belong to each Source (ADR 0005). */
  kind: Scalars['String']['output'];
  /** The gap file's written reason, set only for HAND_ENTERED: source data shown verbatim, never translated. */
  note: Maybe<Scalars['String']['output']>;
  quarter: Scalars['String']['output'];
  records: Scalars['Int']['output'];
  /** The published rule that explains the state. The frontend's catalogue words it in both languages. */
  rule: Maybe<GapRule>;
  state: GapState;
};

export type GapRule =
  | 'AWAITING_BULK_FILE'
  | 'COUNT_BELOW_NEIGHBOURS'
  | 'HAND_ENTERED'
  | 'NO_PRIOR_CALL_BEFORE_BACKFILL';

/**
 * A grid cell's state. NOT_YET_LOADED: the bulk file for this quarter and kind is not in the graph yet, either because it has not been
 * published (rule AWAITING_BULK_FILE) or because the pipeline set it aside (no rule, no note: the reason is never shown).
 */
export type GapState =
  | 'CRAWLED_PROVISIONAL'
  | 'KNOWN_GAP'
  | 'LOADED'
  | 'NOT_IN_SOURCE'
  | 'NOT_YET_LOADED'
  | 'POSSIBLY_INCOMPLETE';

export type MatchableField =
  | 'AUTHORITY'
  | 'CPV_CODE'
  | 'CPV_DESCRIPTION'
  | 'CUI'
  | 'PUBLIC_CODE'
  | 'SUPPLIER'
  | 'TITLE';

export type MatchedField = {
  __typename?: 'MatchedField';
  field: MatchableField;
  /** Highlight ranges into `text`, [start, end) in UTF-16 code units. */
  highlights: Array<Array<Scalars['Int']['output']>>;
  text: Scalars['String']['output'];
};

export type MoneyMap = {
  __typename?: 'MoneyMap';
  counties: Array<AreaTotal>;
  national: Total;
  side: CountySide;
  /** Supplier side only: money going abroad or to unplaced suppliers. Null when empty. */
  unknownSupplierCounty: Maybe<Total>;
  /** Authority side only: authorities no source places in a county. Null when there are none. */
  unplaced: Maybe<UnplacedTile>;
};

export type MonthTotal = {
  __typename?: 'MonthTotal';
  month: Scalars['String']['output'];
  total: Total;
};

export type NoPublicationNumbers = {
  __typename?: 'NoPublicationNumbers';
  procedure: Scalars['String']['output'];
};

export type OverCapNumbers = {
  __typename?: 'OverCapNumbers';
  cap: Scalars['Bani']['output'];
  multiple: Scalars['Float']['output'];
  value: Scalars['Bani']['output'];
};

/** A winner on a Record. */
export type Party = {
  __typename?: 'Party';
  /** Null for a natural person: never named, never linked. */
  entity: Maybe<Entity>;
  naturalPerson: Scalars['Boolean']['output'];
  /** Name as published on this Record (an Alias of `entity`). Null when `naturalPerson`: a person is never named (ADR 0003). */
  publishedName: Maybe<Scalars['String']['output']>;
  /** Equal consortium share, when the Record has more than one winner. */
  share: Maybe<Scalars['Bani']['output']>;
};

/** Output twin of DateRange. */
export type Period = {
  __typename?: 'Period';
  from: Maybe<Scalars['Date']['output']>;
  to: Maybe<Scalars['Date']['output']>;
};

export type Placement = {
  __typename?: 'Placement';
  county: Maybe<County>;
  /** Village SIRUTA when ANAF names one; stored, not plotted. */
  locality: Maybe<Scalars['String']['output']>;
  national: Scalars['Boolean']['output'];
  placedBy: SourceId;
  uat: Maybe<Uat>;
};

/** Where a shown fact came from. Every Record has one; so does every Entity (ANAF (the Reference source), or SEAP when ANAF has no answer). */
export type Provenance = {
  __typename?: 'Provenance';
  /** When we fetched it (from the raw archive). */
  fetchedAt: Scalars['DateTime']['output'];
  kind: ProvenanceKind;
  source: SourceId;
  /** Public page in the Source; null only when the Source has no stable public URL. */
  url: Maybe<Scalars['String']['output']>;
  /** Which file or notice it came from, exactly as the Source titles it (source data, shown verbatim, never translated; e.g. data.gov.ro 2024 Q3 Contracte). Null when there is no file title: a crawl or an API call, which `kind` already says. */
  via: Maybe<Scalars['String']['output']>;
};

/** How we obtained it: from a published bulk file, by crawling the Source's own site, or from its API (ANAF's VAT endpoint). */
export type ProvenanceKind =
  | 'API'
  | 'BULK'
  | 'CRAWL';

export type Query = {
  __typename?: 'Query';
  /** Counties and UATs as keys and names only; geometry ships as static TopoJSON. Bucharest's UATs are its six sectors. */
  counties: Array<County>;
  /** Per-Source coverage, for the Coverage lens and /explore/coverage. Follows the date chip. */
  coverage: Coverage;
  /** An entity by its URL key: a CUI, `vat-<id>` or `name-<slug>` (name-only suppliers). */
  entity: Maybe<Entity>;
  seap: SeapQuery;
  /** Signal rules with their methodology numbers (base rate recomputed per load). */
  signalRules: Array<SignalRule>;
  /** Every Source, harvested or planned, with its data-through dates. Loaded once per visit. */
  sources: Array<Source>;
  uats: Array<Uat>;
};


export type QueryCoverageArgs = {
  source: SourceId;
  window?: InputMaybe<DateRange>;
};


export type QueryEntityArgs = {
  key: Scalars['ID']['input'];
};


export type QueryUatsArgs = {
  county: Scalars['CountyCode']['input'];
};

export type RecordBadge =
  | 'CONSORTIUM_SHARE'
  | 'CRAWLED_PROVISIONAL'
  | 'CRAWL_ONLY'
  | 'CUI_MISMATCH'
  | 'FRAMEWORK_CEILING'
  | 'IDENTITY_CURATED'
  | 'NAME_DIFFERS_FROM_ANAF'
  | 'NO_VALUE'
  | 'SUBSEQUENT_CONTRACT'
  | 'SUSPECT_VALUE';

export type RecordFacets = {
  __typename?: 'RecordFacets';
  badge: Array<FacetCount>;
  channel: Array<FacetCount>;
  /** Top counterparties of the filter's authority/supplier, else empty. */
  counterparty: Array<EntityResult>;
  procedure: Array<FacetCount>;
  signal: Array<FacetCount>;
  year: Array<FacetCount>;
};

/**
 * The whole search state, shared by the main screen, the full-results view,
 * the Records tab and every Signal's reproducing URL. The frontend owns a
 * 1:1 codec between this and the query string; the server never sees a URL.
 */
export type RecordFilter = {
  authority?: InputMaybe<Scalars['ID']['input']>;
  badges?: InputMaybe<Array<RecordBadge>>;
  channel?: InputMaybe<Channel>;
  county?: InputMaybe<Scalars['MapArea']['input']>;
  countySide?: InputMaybe<CountySide>;
  cpv?: InputMaybe<Scalars['String']['input']>;
  from?: InputMaybe<Scalars['Date']['input']>;
  hasSignals?: InputMaybe<Scalars['Boolean']['input']>;
  procedure?: InputMaybe<Array<Scalars['String']['input']>>;
  q?: InputMaybe<Scalars['String']['input']>;
  signal?: InputMaybe<SignalRuleSlug>;
  supplier?: InputMaybe<Scalars['ID']['input']>;
  to?: InputMaybe<Scalars['Date']['input']>;
  uat?: InputMaybe<Scalars['Siruta']['input']>;
  valueBucket?: InputMaybe<ValueBucket>;
};

export type RecordFilterEcho = {
  __typename?: 'RecordFilterEcho';
  authority: Maybe<Entity>;
  qFolded: Maybe<Scalars['String']['output']>;
  supplier: Maybe<Entity>;
};

/** Output twin of RecordFilter (GraphQL inputs can't be outputs), reduced to the fields Signal groupings use. */
export type RecordFilterValue = {
  __typename?: 'RecordFilterValue';
  authority: Maybe<Scalars['ID']['output']>;
  cpv: Maybe<Scalars['String']['output']>;
  from: Maybe<Scalars['Date']['output']>;
  signal: Maybe<SignalRuleSlug>;
  supplier: Maybe<Scalars['ID']['output']>;
  to: Maybe<Scalars['Date']['output']>;
};

export type RecordOrder =
  | 'DATE_ASC'
  | 'DATE_DESC'
  | 'VALUE_DESC';

export type RecordResult = {
  __typename?: 'RecordResult';
  /**
   * The part of the Record's value that went to winners placed in the filter's supplier-side map area: the summed
   * consortium shares of those winners, counted by the same rule and over the same Record x winner rows as the headline
   * Total, so over all Records matching the filter these sum to the Total's `awarded`. Null unless the filter has
   * `countySide: SUPPLIER` and a `county`; null for a Record with a single winner (its full value is the share); null
   * for a Record with no value to share. Always null where no search filter applies (e.g. the entity page's Records tab).
   */
  areaShare: Maybe<Scalars['Bani']['output']>;
  /** Why it matched: computed only for returned rows. */
  matchedField: Maybe<MatchedField>;
  record: SeapRecord;
};

export type RecordResultPage = {
  __typename?: 'RecordResultPage';
  count: Scalars['Int']['output'];
  rows: Array<RecordResult>;
};

export type Role =
  | 'AUTHORITY'
  | 'SUPPLIER';

/**
 * SEAP side of an entity. The page asks for the role it shows, so one operation
 * per tab serves both. Overview, Records and Relationships take the same filter,
 * so totals follow the side panel.
 */
export type SeapEntity = {
  __typename?: 'SeapEntity';
  /** Null if the entity never held that role. */
  role: Maybe<SeapRole>;
  /** Roles this entity has in SEAP: AUTHORITY if it ever bought, SUPPLIER if it ever won. Both for CNAIR-like entities. */
  roles: Array<Role>;
};


/**
 * SEAP side of an entity. The page asks for the role it shows, so one operation
 * per tab serves both. Overview, Records and Relationships take the same filter,
 * so totals follow the side panel.
 */
export type SeapEntityRoleArgs = {
  role: Role;
};

export type SeapQuery = {
  __typename?: 'SeapQuery';
  /** A Record by its public code (e.g. CAN1166685, DA12345678), the Record page's URL key. */
  record: Maybe<SeapRecord>;
  /**
   * The main screen and the full-results view. One matching set: every field
   * below is computed from the same filter, in one pg_search pass where possible.
   */
  search: SeapSearch;
};


export type SeapQueryRecordArgs = {
  code: Scalars['ID']['input'];
};


export type SeapQuerySearchArgs = {
  filter: RecordFilter;
};

export type SeapRecord = SourceRecord & {
  __typename?: 'SeapRecord';
  authority: Entity;
  badges: Array<RecordBadge>;
  channel: Channel;
  code: Scalars['ID']['output'];
  contractType: Maybe<Scalars['String']['output']>;
  /** Counted value: null when suspect or a framework ceiling, else = value. */
  counted: Maybe<Scalars['Bani']['output']>;
  cpv: Maybe<Cpv>;
  date: Maybe<Scalars['Date']['output']>;
  /** Set for a framework agreement (ceiling) and for its subsequent contracts. */
  framework: Maybe<FrameworkLink>;
  kind: SeapRecordKind;
  procedure: Maybe<Scalars['String']['output']>;
  provenance: Provenance;
  /** Signals this Record belongs to. */
  signals: Array<Signal>;
  /** Why the value is suspect; set exactly when `badges` has SUSPECT_VALUE. */
  suspect: Maybe<SuspectFlag>;
  title: Scalars['String']['output'];
  /** Awarded value as published; null = 'no value in SEAP'. */
  value: Maybe<Scalars['Bani']['output']>;
  /** Winners. One for most; consortium members each with their equal share. */
  winners: Array<Party>;
};

export type SeapRecordKind =
  | 'AWARD_NOTICE'
  | 'CONTRACT'
  | 'DA'
  | 'DAN';

export type SeapRole = {
  __typename?: 'SeapRole';
  consortia: Array<Consortium>;
  counterparties: CounterpartyPage;
  /** Share of the total via direct purchase. */
  directPurchaseShare: Scalars['Float']['output'];
  /** Flow lens, drawn on the counterparty's side: a supplier's page shows where across Romania its money comes from (side AUTHORITY, with the Unplaced tile); an authority's shows where it goes (side SUPPLIER, with the unknown-supplier-county bucket). */
  flow: MoneyMap;
  frameworks: FrameworkSummary;
  largestRecords: Array<SeapRecord>;
  procedures: Array<FacetCount>;
  records: SeapSearch;
  role: Role;
  signals: SignalPage;
  timeline: Array<MonthTotal>;
  total: Total;
};


export type SeapRoleConsortiaArgs = {
  filter?: InputMaybe<RecordFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type SeapRoleCounterpartiesArgs = {
  filter?: InputMaybe<RecordFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type SeapRoleDirectPurchaseShareArgs = {
  filter?: InputMaybe<RecordFilter>;
};


export type SeapRoleFlowArgs = {
  filter?: InputMaybe<RecordFilter>;
};


export type SeapRoleFrameworksArgs = {
  filter?: InputMaybe<RecordFilter>;
};


export type SeapRoleLargestRecordsArgs = {
  filter?: InputMaybe<RecordFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type SeapRoleProceduresArgs = {
  filter?: InputMaybe<RecordFilter>;
};


export type SeapRoleRecordsArgs = {
  filter?: InputMaybe<RecordFilter>;
};


export type SeapRoleSignalsArgs = {
  filter?: InputMaybe<RecordFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<SignalOrder>;
};


export type SeapRoleTimelineArgs = {
  counterparty?: InputMaybe<Scalars['ID']['input']>;
  filter?: InputMaybe<RecordFilter>;
};


export type SeapRoleTotalArgs = {
  filter?: InputMaybe<RecordFilter>;
};

export type SeapSearch = {
  __typename?: 'SeapSearch';
  /** Result tabs, ranked by matched awarded value (ties by key). Offset/limit paging; the server caps limit at 200. Main screen asks limit: 50. */
  authorities: EntityResultPage;
  /** Facet counts for the Records tab side panel (Signal, channel, procedure, year, counterparty). */
  facets: RecordFacets;
  /** Echo of the filter as the server understood it (folded query, resolved entity names). */
  filter: RecordFilterEcho;
  /** Pinned 'Go to page' card: set only when q is an exact CUI or one entity's folded name and exactly one entity matches. */
  goTo: Maybe<Entity>;
  /** Money lens, county level, on the side the filter's countySide names (the URL is the only source of the side). */
  map: MoneyMap;
  records: RecordResultPage;
  suppliers: EntityResultPage;
  total: Total;
  /** Money lens, zoomed county: UAT choropleth. Authority side only: UATs place authorities (the search carries a supplier's county, never its UAT). */
  uatMap: UatMap;
};


export type SeapSearchAuthoritiesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type SeapSearchRecordsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<RecordOrder>;
};


export type SeapSearchSuppliersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type SeapSearchUatMapArgs = {
  county: Scalars['CountyCode']['input'];
};

/**
 * A set of Records matched by one rule. Never scored. Copy (label, sentence,
 * lawful explanations) lives in the frontend's bilingual catalogue, filled
 * from `numbers`.
 */
export type Signal = {
  __typename?: 'Signal';
  authority: Entity;
  dataThrough: Scalars['Date']['output'];
  /** Dated by its latest Record. */
  date: Scalars['Date']['output'];
  firstDate: Scalars['Date']['output'];
  numbers: SignalNumbers;
  recordCount: Scalars['Int']['output'];
  records: Array<SeapRecord>;
  /** The Records-tab filter that reproduces it. The frontend turns it into a URL. */
  reproduce: RecordFilterValue;
  rule: SignalRuleSlug;
  /** Every supplier in its Records, consortium members included; natural persons omitted. */
  suppliers: Array<Entity>;
};


/**
 * A set of Records matched by one rule. Never scored. Copy (label, sentence,
 * lawful explanations) lives in the frontend's bilingual catalogue, filled
 * from `numbers`.
 */
export type SignalRecordsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type SignalNumbers = FrameworkOverrunNumbers | NoPublicationNumbers | OverCapNumbers | SplittingNumbers;

export type SignalOrder =
  | 'DATE_DESC'
  | 'VALUE_DESC';

export type SignalPage = {
  __typename?: 'SignalPage';
  count: Scalars['Int']['output'];
  rows: Array<Signal>;
};

export type SignalRule = {
  __typename?: 'SignalRule';
  /** Fraction (0 to 1) of contracting authorities with at least one Signal of this rule in baseRateYear. Recomputed per load. */
  baseRate: Scalars['Float']['output'];
  baseRateYear: Scalars['Int']['output'];
  dataThrough: Scalars['Date']['output'];
  slug: SignalRuleSlug;
  /** Time window the rule can see, e.g. no-publication 2023+ (or 2021+ after the backfill). */
  window: Period;
};

export type SignalRuleSlug =
  | 'FRAMEWORK_OVERRUN'
  | 'NO_PUBLICATION'
  | 'OVER_CAP'
  | 'SPLITTING';

export type Source = {
  __typename?: 'Source';
  /** Per record kind, e.g. SEAP: DA, DAN, CONTRACT, AWARD_NOTICE. */
  dataThrough: Array<DataThrough>;
  harvested: Scalars['Boolean']['output'];
  id: SourceId;
  name: Scalars['String']['output'];
};

export type SourceId =
  | 'ANAF'
  | 'ANI'
  | 'JUST'
  | 'MFINANTE'
  | 'ONRC'
  | 'SEAP';

/**
 * Shared by every Source's records (a SEAP Record today, an ANI declaration
 * later): the minimum a result row, a provenance link and a badge need.
 * Named SourceRecord, not Record, because `Record` is a TypeScript built-in and
 * the generated resolver types would collide with it.
 */
export type SourceRecord = {
  badges: Array<RecordBadge>;
  code: Scalars['ID']['output'];
  date: Maybe<Scalars['Date']['output']>;
  provenance: Provenance;
  title: Scalars['String']['output'];
};

export type SplittingNumbers = {
  __typename?: 'SplittingNumbers';
  cap: Scalars['Bani']['output'];
  cpvGroup: Scalars['String']['output'];
  from: Scalars['Date']['output'];
  purchases: Scalars['Int']['output'];
  sum: Scalars['Bani']['output'];
  to: Scalars['Date']['output'];
};

/**
 * The published rule that flagged a value as suspect (counting rule). The
 * frontend's catalogue explains each rule; `threshold` is the number.
 */
export type SuspectFlag = {
  __typename?: 'SuspectFlag';
  rule: SuspectRule;
  /** DIRECT_PURCHASE_10X_CAP: the cap in force for its date and type; CONTRACT_100X_ESTIMATE: the estimated value; CONTRACT_OVER_50BN: null. */
  threshold: Maybe<Scalars['Bani']['output']>;
};

export type SuspectRule =
  | 'CONTRACT_100X_ESTIMATE'
  | 'CONTRACT_OVER_50BN'
  | 'DIRECT_PURCHASE_10X_CAP';

/**
 * Every money number the explorer shows is a Total, counted by the one rule
 * (awarded value; framework ceilings out; consortium once per authority,
 * equal shares per supplier; suspect values out). It always says what it left out.
 */
export type Total = {
  __typename?: 'Total';
  awarded: Scalars['Bani']['output'];
  /** True only when `records` is approximated, which exact counts and the rollup never do today: the flag is reserved for a future approximate path. Distinct entity counts (the HyperLogLog ones) carry their own flag: EntityResultPage.countEstimated. */
  estimated: Scalars['Boolean']['output'];
  /** Framework ceilings in the set, never summed (for the 'ceilings X' line). */
  frameworkCeilings: Scalars['Bani']['output'];
  /** Records with no value in SEAP: counted here, add nothing. */
  noValue: Scalars['Int']['output'];
  records: Scalars['Int']['output'];
  /** Records in the set whose value is suspect: shown, searchable, not summed. */
  suspectLeftOut: Scalars['Int']['output'];
};

export type Uat = {
  __typename?: 'Uat';
  county: County;
  name: Scalars['String']['output'];
  siruta: Scalars['Siruta']['output'];
};

/**
 * Zoomed county: only UATs with Records appear; any UAT of `uats(county)` that is
 * absent is grey (no authority bought anything).
 */
export type UatMap = {
  __typename?: 'UatMap';
  uats: Array<AreaTotal>;
  /** Authorities with a known county but no UAT, a row of their own. Null when there are none. */
  unknownUat: Maybe<Total>;
};

/** The Unplaced tile: how many authorities, and what they account for. */
export type UnplacedTile = {
  __typename?: 'UnplacedTile';
  authorities: Scalars['Int']['output'];
  total: Total;
};

/**
 * Preset awarded-value buckets, on `value` in RON as published. Each bucket is
 * (previous edge, edge]: the upper edge is inclusive, so a purchase exactly at a
 * statutory cap sits in the bucket below it, matching "at or under the cap".
 * Records with no value match no bucket. Edges in RON, with their source:
 *
 *   UP_TO_10K    <= 10,000        round floor for small purchases (not statutory)
 *   UP_TO_135K   <= 135,060       direct-purchase cap for supplies/services before 10 Sep 2022
 *   UP_TO_270K   <= 270,120       the same cap from 10 Sep 2022
 *   UP_TO_900K   <= 900,400       direct-purchase cap for works from 10 Sep 2022
 *   UP_TO_9M     <= 9,004,000     10x the works cap: top of the over-cap Signal band
 *   UP_TO_1B     <= 1,000,000,000 1 bn RON: where contract values start being checked for suspect values
 *   OVER_1B      >  1,000,000,000
 *
 * The counting rule checks contracts "of 1 bn RON or more"; because upper edges are
 * inclusive, exactly 1 bn sits in UP_TO_1B. A bucket is a chip, not the rule, so the
 * one-value difference is accepted.
 *
 * The edges are mirrored, in bani, by VALUE_BUCKETS in the contract package.
 */
export type ValueBucket =
  | 'OVER_1B'
  | 'UP_TO_1B'
  | 'UP_TO_9M'
  | 'UP_TO_10K'
  | 'UP_TO_135K'
  | 'UP_TO_270K'
  | 'UP_TO_900K';



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  SignalNumbers:
    | ( FrameworkOverrunNumbers )
    | ( NoPublicationNumbers )
    | ( OverCapNumbers )
    | ( SplittingNumbers )
  ;
};

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  SourceRecord: ( Omit<SeapRecord, 'authority' | 'cpv' | 'signals' | 'winners'> & { authority: _RefType['Entity'], cpv?: Maybe<_RefType['Cpv']>, signals: Array<_RefType['Signal']>, winners: Array<_RefType['Party']> } );
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Alias: ResolverTypeWrapper<Alias>;
  AreaKey: ResolverTypeWrapper<Scalars['AreaKey']['output']>;
  AreaTotal: ResolverTypeWrapper<AreaTotal>;
  Bani: ResolverTypeWrapper<Scalars['Bani']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Channel: Channel;
  Consortium: ResolverTypeWrapper<Omit<Consortium, 'members'> & { members: Array<ResolversTypes['Party']> }>;
  Counterparty: ResolverTypeWrapper<Omit<Counterparty, 'entity'> & { entity?: Maybe<ResolversTypes['Entity']> }>;
  CounterpartyPage: ResolverTypeWrapper<CounterpartyPage>;
  County: ResolverTypeWrapper<County>;
  CountyCode: ResolverTypeWrapper<Scalars['CountyCode']['output']>;
  CountyCoverage: ResolverTypeWrapper<CountyCoverage>;
  CountySide: CountySide;
  Coverage: ResolverTypeWrapper<Coverage>;
  CoverageStatus: CoverageStatus;
  Cpv: ResolverTypeWrapper<Cpv>;
  DataThrough: ResolverTypeWrapper<DataThrough>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateRange: DateRange;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Entity: ResolverTypeWrapper<Omit<Entity, 'aliases' | 'seap'> & { aliases: Array<ResolversTypes['Alias']>, seap: ResolversTypes['SeapEntity'] }>;
  EntityIdentity: EntityIdentity;
  EntityResult: ResolverTypeWrapper<Omit<EntityResult, 'entity'> & { entity: ResolversTypes['Entity'] }>;
  EntityResultPage: ResolverTypeWrapper<EntityResultPage>;
  FacetCount: ResolverTypeWrapper<FacetCount>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  FrameworkLink: ResolverTypeWrapper<Omit<FrameworkLink, 'agreement' | 'subsequent'> & { agreement?: Maybe<ResolversTypes['SeapRecord']>, subsequent: Array<ResolversTypes['SeapRecord']> }>;
  FrameworkOverrunNumbers: ResolverTypeWrapper<FrameworkOverrunNumbers>;
  FrameworkSummary: ResolverTypeWrapper<FrameworkSummary>;
  GapCell: ResolverTypeWrapper<GapCell>;
  GapRule: GapRule;
  GapState: GapState;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  MapArea: ResolverTypeWrapper<Scalars['MapArea']['output']>;
  MatchableField: MatchableField;
  MatchedField: ResolverTypeWrapper<MatchedField>;
  MoneyMap: ResolverTypeWrapper<MoneyMap>;
  MonthTotal: ResolverTypeWrapper<MonthTotal>;
  NoPublicationNumbers: ResolverTypeWrapper<NoPublicationNumbers>;
  OverCapNumbers: ResolverTypeWrapper<OverCapNumbers>;
  Party: ResolverTypeWrapper<Omit<Party, 'entity'> & { entity?: Maybe<ResolversTypes['Entity']> }>;
  Period: ResolverTypeWrapper<Period>;
  Placement: ResolverTypeWrapper<Placement>;
  Provenance: ResolverTypeWrapper<Provenance>;
  ProvenanceKind: ProvenanceKind;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RecordBadge: RecordBadge;
  RecordFacets: ResolverTypeWrapper<RecordFacets>;
  RecordFilter: RecordFilter;
  RecordFilterEcho: ResolverTypeWrapper<Omit<RecordFilterEcho, 'authority' | 'supplier'> & { authority?: Maybe<ResolversTypes['Entity']>, supplier?: Maybe<ResolversTypes['Entity']> }>;
  RecordFilterValue: ResolverTypeWrapper<RecordFilterValue>;
  RecordOrder: RecordOrder;
  RecordResult: ResolverTypeWrapper<Omit<RecordResult, 'matchedField' | 'record'> & { matchedField?: Maybe<ResolversTypes['MatchedField']>, record: ResolversTypes['SeapRecord'] }>;
  RecordResultPage: ResolverTypeWrapper<Omit<RecordResultPage, 'rows'> & { rows: Array<ResolversTypes['RecordResult']> }>;
  Role: Role;
  SeapEntity: ResolverTypeWrapper<Omit<SeapEntity, 'role'> & { role?: Maybe<ResolversTypes['SeapRole']> }>;
  SeapQuery: ResolverTypeWrapper<Omit<SeapQuery, 'record' | 'search'> & { record?: Maybe<ResolversTypes['SeapRecord']>, search: ResolversTypes['SeapSearch'] }>;
  SeapRecord: ResolverTypeWrapper<Omit<SeapRecord, 'authority' | 'cpv' | 'signals' | 'winners'> & { authority: ResolversTypes['Entity'], cpv?: Maybe<ResolversTypes['Cpv']>, signals: Array<ResolversTypes['Signal']>, winners: Array<ResolversTypes['Party']> }>;
  SeapRecordKind: SeapRecordKind;
  SeapRole: ResolverTypeWrapper<Omit<SeapRole, 'consortia' | 'largestRecords' | 'records' | 'signals'> & { consortia: Array<ResolversTypes['Consortium']>, largestRecords: Array<ResolversTypes['SeapRecord']>, records: ResolversTypes['SeapSearch'], signals: ResolversTypes['SignalPage'] }>;
  SeapSearch: ResolverTypeWrapper<Omit<SeapSearch, 'facets' | 'goTo' | 'records'> & { facets: ResolversTypes['RecordFacets'], goTo?: Maybe<ResolversTypes['Entity']>, records: ResolversTypes['RecordResultPage'] }>;
  Signal: ResolverTypeWrapper<Omit<Signal, 'authority' | 'numbers' | 'records' | 'suppliers'> & { authority: ResolversTypes['Entity'], numbers: ResolversTypes['SignalNumbers'], records: Array<ResolversTypes['SeapRecord']>, suppliers: Array<ResolversTypes['Entity']> }>;
  SignalNumbers: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SignalNumbers']>;
  SignalOrder: SignalOrder;
  SignalPage: ResolverTypeWrapper<Omit<SignalPage, 'rows'> & { rows: Array<ResolversTypes['Signal']> }>;
  SignalRule: ResolverTypeWrapper<SignalRule>;
  SignalRuleSlug: SignalRuleSlug;
  Siruta: ResolverTypeWrapper<Scalars['Siruta']['output']>;
  Source: ResolverTypeWrapper<Source>;
  SourceId: SourceId;
  SourceRecord: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['SourceRecord']>;
  SplittingNumbers: ResolverTypeWrapper<SplittingNumbers>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SuspectFlag: ResolverTypeWrapper<SuspectFlag>;
  SuspectRule: SuspectRule;
  Total: ResolverTypeWrapper<Total>;
  Uat: ResolverTypeWrapper<Uat>;
  UatMap: ResolverTypeWrapper<UatMap>;
  UnplacedTile: ResolverTypeWrapper<UnplacedTile>;
  ValueBucket: ValueBucket;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Alias: Alias;
  AreaKey: Scalars['AreaKey']['output'];
  AreaTotal: AreaTotal;
  Bani: Scalars['Bani']['output'];
  Boolean: Scalars['Boolean']['output'];
  Consortium: Omit<Consortium, 'members'> & { members: Array<ResolversParentTypes['Party']> };
  Counterparty: Omit<Counterparty, 'entity'> & { entity?: Maybe<ResolversParentTypes['Entity']> };
  CounterpartyPage: CounterpartyPage;
  County: County;
  CountyCode: Scalars['CountyCode']['output'];
  CountyCoverage: CountyCoverage;
  Coverage: Coverage;
  Cpv: Cpv;
  DataThrough: DataThrough;
  Date: Scalars['Date']['output'];
  DateRange: DateRange;
  DateTime: Scalars['DateTime']['output'];
  Entity: Omit<Entity, 'aliases' | 'seap'> & { aliases: Array<ResolversParentTypes['Alias']>, seap: ResolversParentTypes['SeapEntity'] };
  EntityResult: Omit<EntityResult, 'entity'> & { entity: ResolversParentTypes['Entity'] };
  EntityResultPage: EntityResultPage;
  FacetCount: FacetCount;
  Float: Scalars['Float']['output'];
  FrameworkLink: Omit<FrameworkLink, 'agreement' | 'subsequent'> & { agreement?: Maybe<ResolversParentTypes['SeapRecord']>, subsequent: Array<ResolversParentTypes['SeapRecord']> };
  FrameworkOverrunNumbers: FrameworkOverrunNumbers;
  FrameworkSummary: FrameworkSummary;
  GapCell: GapCell;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  MapArea: Scalars['MapArea']['output'];
  MatchedField: MatchedField;
  MoneyMap: MoneyMap;
  MonthTotal: MonthTotal;
  NoPublicationNumbers: NoPublicationNumbers;
  OverCapNumbers: OverCapNumbers;
  Party: Omit<Party, 'entity'> & { entity?: Maybe<ResolversParentTypes['Entity']> };
  Period: Period;
  Placement: Placement;
  Provenance: Provenance;
  Query: Record<PropertyKey, never>;
  RecordFacets: RecordFacets;
  RecordFilter: RecordFilter;
  RecordFilterEcho: Omit<RecordFilterEcho, 'authority' | 'supplier'> & { authority?: Maybe<ResolversParentTypes['Entity']>, supplier?: Maybe<ResolversParentTypes['Entity']> };
  RecordFilterValue: RecordFilterValue;
  RecordResult: Omit<RecordResult, 'matchedField' | 'record'> & { matchedField?: Maybe<ResolversParentTypes['MatchedField']>, record: ResolversParentTypes['SeapRecord'] };
  RecordResultPage: Omit<RecordResultPage, 'rows'> & { rows: Array<ResolversParentTypes['RecordResult']> };
  SeapEntity: Omit<SeapEntity, 'role'> & { role?: Maybe<ResolversParentTypes['SeapRole']> };
  SeapQuery: Omit<SeapQuery, 'record' | 'search'> & { record?: Maybe<ResolversParentTypes['SeapRecord']>, search: ResolversParentTypes['SeapSearch'] };
  SeapRecord: Omit<SeapRecord, 'authority' | 'cpv' | 'signals' | 'winners'> & { authority: ResolversParentTypes['Entity'], cpv?: Maybe<ResolversParentTypes['Cpv']>, signals: Array<ResolversParentTypes['Signal']>, winners: Array<ResolversParentTypes['Party']> };
  SeapRole: Omit<SeapRole, 'consortia' | 'largestRecords' | 'records' | 'signals'> & { consortia: Array<ResolversParentTypes['Consortium']>, largestRecords: Array<ResolversParentTypes['SeapRecord']>, records: ResolversParentTypes['SeapSearch'], signals: ResolversParentTypes['SignalPage'] };
  SeapSearch: Omit<SeapSearch, 'facets' | 'goTo' | 'records'> & { facets: ResolversParentTypes['RecordFacets'], goTo?: Maybe<ResolversParentTypes['Entity']>, records: ResolversParentTypes['RecordResultPage'] };
  Signal: Omit<Signal, 'authority' | 'numbers' | 'records' | 'suppliers'> & { authority: ResolversParentTypes['Entity'], numbers: ResolversParentTypes['SignalNumbers'], records: Array<ResolversParentTypes['SeapRecord']>, suppliers: Array<ResolversParentTypes['Entity']> };
  SignalNumbers: ResolversUnionTypes<ResolversParentTypes>['SignalNumbers'];
  SignalPage: Omit<SignalPage, 'rows'> & { rows: Array<ResolversParentTypes['Signal']> };
  SignalRule: SignalRule;
  Siruta: Scalars['Siruta']['output'];
  Source: Source;
  SourceRecord: ResolversInterfaceTypes<ResolversParentTypes>['SourceRecord'];
  SplittingNumbers: SplittingNumbers;
  String: Scalars['String']['output'];
  SuspectFlag: SuspectFlag;
  Total: Total;
  Uat: Uat;
  UatMap: UatMap;
  UnplacedTile: UnplacedTile;
};

export type AliasResolvers<ContextType = any, ParentType extends ResolversParentTypes['Alias'] = ResolversParentTypes['Alias']> = {
  differsFromAnaf?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  first?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  last?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  records?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export interface AreaKeyScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AreaKey'], any> {
  name: 'AreaKey';
}

export type AreaTotalResolvers<ContextType = any, ParentType extends ResolversParentTypes['AreaTotal'] = ResolversParentTypes['AreaTotal']> = {
  area?: Resolver<ResolversTypes['AreaKey'], ParentType, ContextType>;
  entities?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
};

export interface BaniScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Bani'], any> {
  name: 'Bani';
}

export type ConsortiumResolvers<ContextType = any, ParentType extends ResolversParentTypes['Consortium'] = ResolversParentTypes['Consortium']> = {
  members?: Resolver<Array<ResolversTypes['Party']>, ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
};

export type CounterpartyResolvers<ContextType = any, ParentType extends ResolversParentTypes['Counterparty'] = ResolversParentTypes['Counterparty']> = {
  entity?: Resolver<Maybe<ResolversTypes['Entity']>, ParentType, ContextType>;
  hasSignals?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  naturalPerson?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
  viaContract?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
  viaDirectPurchase?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
  wonTogether?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type CounterpartyPageResolvers<ContextType = any, ParentType extends ResolversParentTypes['CounterpartyPage'] = ResolversParentTypes['CounterpartyPage']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rows?: Resolver<Array<ResolversTypes['Counterparty']>, ParentType, ContextType>;
  topShare?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type CountyResolvers<ContextType = any, ParentType extends ResolversParentTypes['County'] = ResolversParentTypes['County']> = {
  code?: Resolver<ResolversTypes['CountyCode'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export interface CountyCodeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['CountyCode'], any> {
  name: 'CountyCode';
}

export type CountyCoverageResolvers<ContextType = any, ParentType extends ResolversParentTypes['CountyCoverage'] = ResolversParentTypes['CountyCoverage']> = {
  county?: Resolver<ResolversTypes['MapArea'], ParentType, ContextType>;
  otherAuthorities?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  publicEntities?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CoverageStatus'], ParentType, ContextType>;
  withRecords?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type CoverageResolvers<ContextType = any, ParentType extends ResolversParentTypes['Coverage'] = ResolversParentTypes['Coverage']> = {
  counties?: Resolver<Array<ResolversTypes['CountyCoverage']>, ParentType, ContextType>;
  grid?: Resolver<Array<ResolversTypes['GapCell']>, ParentType, ContextType>;
  referenceSnapshot?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['Source'], ParentType, ContextType>;
  unplacedAuthorities?: Resolver<ResolversTypes['UnplacedTile'], ParentType, ContextType>;
  window?: Resolver<ResolversTypes['Period'], ParentType, ContextType>;
};

export type CpvResolvers<ContextType = any, ParentType extends ResolversParentTypes['Cpv'] = ResolversParentTypes['Cpv']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type DataThroughResolvers<ContextType = any, ParentType extends ResolversParentTypes['DataThrough'] = ResolversParentTypes['DataThrough']> = {
  date?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type EntityResolvers<ContextType = any, ParentType extends ResolversParentTypes['Entity'] = ResolversParentTypes['Entity']> = {
  aliases?: Resolver<Array<ResolversTypes['Alias']>, ParentType, ContextType>;
  anafStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cui?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  foreignVatId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  identity?: Resolver<ResolversTypes['EntityIdentity'], ParentType, ContextType>;
  identityCurated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  placement?: Resolver<Maybe<ResolversTypes['Placement']>, ParentType, ContextType>;
  provenance?: Resolver<Array<ResolversTypes['Provenance']>, ParentType, ContextType>;
  seap?: Resolver<ResolversTypes['SeapEntity'], ParentType, ContextType>;
};

export type EntityResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['EntityResult'] = ResolversParentTypes['EntityResult']> = {
  entity?: Resolver<ResolversTypes['Entity'], ParentType, ContextType>;
  matched?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
};

export type EntityResultPageResolvers<ContextType = any, ParentType extends ResolversParentTypes['EntityResultPage'] = ResolversParentTypes['EntityResultPage']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  countEstimated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  rows?: Resolver<Array<ResolversTypes['EntityResult']>, ParentType, ContextType>;
};

export type FacetCountResolvers<ContextType = any, ParentType extends ResolversParentTypes['FacetCount'] = ResolversParentTypes['FacetCount']> = {
  total?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type FrameworkLinkResolvers<ContextType = any, ParentType extends ResolversParentTypes['FrameworkLink'] = ResolversParentTypes['FrameworkLink']> = {
  agreement?: Resolver<Maybe<ResolversTypes['SeapRecord']>, ParentType, ContextType>;
  ceiling?: Resolver<Maybe<ResolversTypes['Bani']>, ParentType, ContextType>;
  ratio?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  subsequent?: Resolver<Array<ResolversTypes['SeapRecord']>, ParentType, ContextType, RequireFields<FrameworkLinkSubsequentArgs, 'limit' | 'offset'>>;
  subsequentReported?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
};

export type FrameworkOverrunNumbersResolvers<ContextType = any, ParentType extends ResolversParentTypes['FrameworkOverrunNumbers'] = ResolversParentTypes['FrameworkOverrunNumbers']> = {
  ceiling?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  ratio?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  subsequent?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FrameworkSummaryResolvers<ContextType = any, ParentType extends ResolversParentTypes['FrameworkSummary'] = ResolversParentTypes['FrameworkSummary']> = {
  ceilings?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subsequentReported?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
};

export type GapCellResolvers<ContextType = any, ParentType extends ResolversParentTypes['GapCell'] = ResolversParentTypes['GapCell']> = {
  crawlOnly?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  dataThrough?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  quarter?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  records?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rule?: Resolver<Maybe<ResolversTypes['GapRule']>, ParentType, ContextType>;
  state?: Resolver<ResolversTypes['GapState'], ParentType, ContextType>;
};

export interface MapAreaScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['MapArea'], any> {
  name: 'MapArea';
}

export type MatchedFieldResolvers<ContextType = any, ParentType extends ResolversParentTypes['MatchedField'] = ResolversParentTypes['MatchedField']> = {
  field?: Resolver<ResolversTypes['MatchableField'], ParentType, ContextType>;
  highlights?: Resolver<Array<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MoneyMapResolvers<ContextType = any, ParentType extends ResolversParentTypes['MoneyMap'] = ResolversParentTypes['MoneyMap']> = {
  counties?: Resolver<Array<ResolversTypes['AreaTotal']>, ParentType, ContextType>;
  national?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
  side?: Resolver<ResolversTypes['CountySide'], ParentType, ContextType>;
  unknownSupplierCounty?: Resolver<Maybe<ResolversTypes['Total']>, ParentType, ContextType>;
  unplaced?: Resolver<Maybe<ResolversTypes['UnplacedTile']>, ParentType, ContextType>;
};

export type MonthTotalResolvers<ContextType = any, ParentType extends ResolversParentTypes['MonthTotal'] = ResolversParentTypes['MonthTotal']> = {
  month?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
};

export type NoPublicationNumbersResolvers<ContextType = any, ParentType extends ResolversParentTypes['NoPublicationNumbers'] = ResolversParentTypes['NoPublicationNumbers']> = {
  procedure?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OverCapNumbersResolvers<ContextType = any, ParentType extends ResolversParentTypes['OverCapNumbers'] = ResolversParentTypes['OverCapNumbers']> = {
  cap?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  multiple?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PartyResolvers<ContextType = any, ParentType extends ResolversParentTypes['Party'] = ResolversParentTypes['Party']> = {
  entity?: Resolver<Maybe<ResolversTypes['Entity']>, ParentType, ContextType>;
  naturalPerson?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  publishedName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  share?: Resolver<Maybe<ResolversTypes['Bani']>, ParentType, ContextType>;
};

export type PeriodResolvers<ContextType = any, ParentType extends ResolversParentTypes['Period'] = ResolversParentTypes['Period']> = {
  from?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  to?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
};

export type PlacementResolvers<ContextType = any, ParentType extends ResolversParentTypes['Placement'] = ResolversParentTypes['Placement']> = {
  county?: Resolver<Maybe<ResolversTypes['County']>, ParentType, ContextType>;
  locality?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  national?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  placedBy?: Resolver<ResolversTypes['SourceId'], ParentType, ContextType>;
  uat?: Resolver<Maybe<ResolversTypes['Uat']>, ParentType, ContextType>;
};

export type ProvenanceResolvers<ContextType = any, ParentType extends ResolversParentTypes['Provenance'] = ResolversParentTypes['Provenance']> = {
  fetchedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ProvenanceKind'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['SourceId'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  via?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  counties?: Resolver<Array<ResolversTypes['County']>, ParentType, ContextType>;
  coverage?: Resolver<ResolversTypes['Coverage'], ParentType, ContextType, RequireFields<QueryCoverageArgs, 'source'>>;
  entity?: Resolver<Maybe<ResolversTypes['Entity']>, ParentType, ContextType, RequireFields<QueryEntityArgs, 'key'>>;
  seap?: Resolver<ResolversTypes['SeapQuery'], ParentType, ContextType>;
  signalRules?: Resolver<Array<ResolversTypes['SignalRule']>, ParentType, ContextType>;
  sources?: Resolver<Array<ResolversTypes['Source']>, ParentType, ContextType>;
  uats?: Resolver<Array<ResolversTypes['Uat']>, ParentType, ContextType, RequireFields<QueryUatsArgs, 'county'>>;
};

export type RecordFacetsResolvers<ContextType = any, ParentType extends ResolversParentTypes['RecordFacets'] = ResolversParentTypes['RecordFacets']> = {
  badge?: Resolver<Array<ResolversTypes['FacetCount']>, ParentType, ContextType>;
  channel?: Resolver<Array<ResolversTypes['FacetCount']>, ParentType, ContextType>;
  counterparty?: Resolver<Array<ResolversTypes['EntityResult']>, ParentType, ContextType>;
  procedure?: Resolver<Array<ResolversTypes['FacetCount']>, ParentType, ContextType>;
  signal?: Resolver<Array<ResolversTypes['FacetCount']>, ParentType, ContextType>;
  year?: Resolver<Array<ResolversTypes['FacetCount']>, ParentType, ContextType>;
};

export type RecordFilterEchoResolvers<ContextType = any, ParentType extends ResolversParentTypes['RecordFilterEcho'] = ResolversParentTypes['RecordFilterEcho']> = {
  authority?: Resolver<Maybe<ResolversTypes['Entity']>, ParentType, ContextType>;
  qFolded?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  supplier?: Resolver<Maybe<ResolversTypes['Entity']>, ParentType, ContextType>;
};

export type RecordFilterValueResolvers<ContextType = any, ParentType extends ResolversParentTypes['RecordFilterValue'] = ResolversParentTypes['RecordFilterValue']> = {
  authority?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  cpv?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  from?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  signal?: Resolver<Maybe<ResolversTypes['SignalRuleSlug']>, ParentType, ContextType>;
  supplier?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  to?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
};

export type RecordResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RecordResult'] = ResolversParentTypes['RecordResult']> = {
  areaShare?: Resolver<Maybe<ResolversTypes['Bani']>, ParentType, ContextType>;
  matchedField?: Resolver<Maybe<ResolversTypes['MatchedField']>, ParentType, ContextType>;
  record?: Resolver<ResolversTypes['SeapRecord'], ParentType, ContextType>;
};

export type RecordResultPageResolvers<ContextType = any, ParentType extends ResolversParentTypes['RecordResultPage'] = ResolversParentTypes['RecordResultPage']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rows?: Resolver<Array<ResolversTypes['RecordResult']>, ParentType, ContextType>;
};

export type SeapEntityResolvers<ContextType = any, ParentType extends ResolversParentTypes['SeapEntity'] = ResolversParentTypes['SeapEntity']> = {
  role?: Resolver<Maybe<ResolversTypes['SeapRole']>, ParentType, ContextType, RequireFields<SeapEntityRoleArgs, 'role'>>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
};

export type SeapQueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['SeapQuery'] = ResolversParentTypes['SeapQuery']> = {
  record?: Resolver<Maybe<ResolversTypes['SeapRecord']>, ParentType, ContextType, RequireFields<SeapQueryRecordArgs, 'code'>>;
  search?: Resolver<ResolversTypes['SeapSearch'], ParentType, ContextType, RequireFields<SeapQuerySearchArgs, 'filter'>>;
};

export type SeapRecordResolvers<ContextType = any, ParentType extends ResolversParentTypes['SeapRecord'] = ResolversParentTypes['SeapRecord']> = {
  authority?: Resolver<ResolversTypes['Entity'], ParentType, ContextType>;
  badges?: Resolver<Array<ResolversTypes['RecordBadge']>, ParentType, ContextType>;
  channel?: Resolver<ResolversTypes['Channel'], ParentType, ContextType>;
  code?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  contractType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  counted?: Resolver<Maybe<ResolversTypes['Bani']>, ParentType, ContextType>;
  cpv?: Resolver<Maybe<ResolversTypes['Cpv']>, ParentType, ContextType>;
  date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  framework?: Resolver<Maybe<ResolversTypes['FrameworkLink']>, ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['SeapRecordKind'], ParentType, ContextType>;
  procedure?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  provenance?: Resolver<ResolversTypes['Provenance'], ParentType, ContextType>;
  signals?: Resolver<Array<ResolversTypes['Signal']>, ParentType, ContextType>;
  suspect?: Resolver<Maybe<ResolversTypes['SuspectFlag']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['Bani']>, ParentType, ContextType>;
  winners?: Resolver<Array<ResolversTypes['Party']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SeapRoleResolvers<ContextType = any, ParentType extends ResolversParentTypes['SeapRole'] = ResolversParentTypes['SeapRole']> = {
  consortia?: Resolver<Array<ResolversTypes['Consortium']>, ParentType, ContextType, RequireFields<SeapRoleConsortiaArgs, 'limit'>>;
  counterparties?: Resolver<ResolversTypes['CounterpartyPage'], ParentType, ContextType, RequireFields<SeapRoleCounterpartiesArgs, 'limit'>>;
  directPurchaseShare?: Resolver<ResolversTypes['Float'], ParentType, ContextType, Partial<SeapRoleDirectPurchaseShareArgs>>;
  flow?: Resolver<ResolversTypes['MoneyMap'], ParentType, ContextType, Partial<SeapRoleFlowArgs>>;
  frameworks?: Resolver<ResolversTypes['FrameworkSummary'], ParentType, ContextType, Partial<SeapRoleFrameworksArgs>>;
  largestRecords?: Resolver<Array<ResolversTypes['SeapRecord']>, ParentType, ContextType, RequireFields<SeapRoleLargestRecordsArgs, 'limit'>>;
  procedures?: Resolver<Array<ResolversTypes['FacetCount']>, ParentType, ContextType, Partial<SeapRoleProceduresArgs>>;
  records?: Resolver<ResolversTypes['SeapSearch'], ParentType, ContextType, Partial<SeapRoleRecordsArgs>>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  signals?: Resolver<ResolversTypes['SignalPage'], ParentType, ContextType, RequireFields<SeapRoleSignalsArgs, 'limit' | 'offset' | 'order'>>;
  timeline?: Resolver<Array<ResolversTypes['MonthTotal']>, ParentType, ContextType, Partial<SeapRoleTimelineArgs>>;
  total?: Resolver<ResolversTypes['Total'], ParentType, ContextType, Partial<SeapRoleTotalArgs>>;
};

export type SeapSearchResolvers<ContextType = any, ParentType extends ResolversParentTypes['SeapSearch'] = ResolversParentTypes['SeapSearch']> = {
  authorities?: Resolver<ResolversTypes['EntityResultPage'], ParentType, ContextType, RequireFields<SeapSearchAuthoritiesArgs, 'limit' | 'offset'>>;
  facets?: Resolver<ResolversTypes['RecordFacets'], ParentType, ContextType>;
  filter?: Resolver<ResolversTypes['RecordFilterEcho'], ParentType, ContextType>;
  goTo?: Resolver<Maybe<ResolversTypes['Entity']>, ParentType, ContextType>;
  map?: Resolver<ResolversTypes['MoneyMap'], ParentType, ContextType>;
  records?: Resolver<ResolversTypes['RecordResultPage'], ParentType, ContextType, RequireFields<SeapSearchRecordsArgs, 'limit' | 'offset' | 'order'>>;
  suppliers?: Resolver<ResolversTypes['EntityResultPage'], ParentType, ContextType, RequireFields<SeapSearchSuppliersArgs, 'limit' | 'offset'>>;
  total?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
  uatMap?: Resolver<ResolversTypes['UatMap'], ParentType, ContextType, RequireFields<SeapSearchUatMapArgs, 'county'>>;
};

export type SignalResolvers<ContextType = any, ParentType extends ResolversParentTypes['Signal'] = ResolversParentTypes['Signal']> = {
  authority?: Resolver<ResolversTypes['Entity'], ParentType, ContextType>;
  dataThrough?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  date?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  firstDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  numbers?: Resolver<ResolversTypes['SignalNumbers'], ParentType, ContextType>;
  recordCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  records?: Resolver<Array<ResolversTypes['SeapRecord']>, ParentType, ContextType, RequireFields<SignalRecordsArgs, 'limit' | 'offset'>>;
  reproduce?: Resolver<ResolversTypes['RecordFilterValue'], ParentType, ContextType>;
  rule?: Resolver<ResolversTypes['SignalRuleSlug'], ParentType, ContextType>;
  suppliers?: Resolver<Array<ResolversTypes['Entity']>, ParentType, ContextType>;
};

export type SignalNumbersResolvers<ContextType = any, ParentType extends ResolversParentTypes['SignalNumbers'] = ResolversParentTypes['SignalNumbers']> = {
  __resolveType: TypeResolveFn<'FrameworkOverrunNumbers' | 'NoPublicationNumbers' | 'OverCapNumbers' | 'SplittingNumbers', ParentType, ContextType>;
};

export type SignalPageResolvers<ContextType = any, ParentType extends ResolversParentTypes['SignalPage'] = ResolversParentTypes['SignalPage']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rows?: Resolver<Array<ResolversTypes['Signal']>, ParentType, ContextType>;
};

export type SignalRuleResolvers<ContextType = any, ParentType extends ResolversParentTypes['SignalRule'] = ResolversParentTypes['SignalRule']> = {
  baseRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  baseRateYear?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  dataThrough?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['SignalRuleSlug'], ParentType, ContextType>;
  window?: Resolver<ResolversTypes['Period'], ParentType, ContextType>;
};

export interface SirutaScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Siruta'], any> {
  name: 'Siruta';
}

export type SourceResolvers<ContextType = any, ParentType extends ResolversParentTypes['Source'] = ResolversParentTypes['Source']> = {
  dataThrough?: Resolver<Array<ResolversTypes['DataThrough']>, ParentType, ContextType>;
  harvested?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['SourceId'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SourceRecordResolvers<ContextType = any, ParentType extends ResolversParentTypes['SourceRecord'] = ResolversParentTypes['SourceRecord']> = {
  __resolveType: TypeResolveFn<'SeapRecord', ParentType, ContextType>;
};

export type SplittingNumbersResolvers<ContextType = any, ParentType extends ResolversParentTypes['SplittingNumbers'] = ResolversParentTypes['SplittingNumbers']> = {
  cap?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  cpvGroup?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  from?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  purchases?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sum?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  to?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SuspectFlagResolvers<ContextType = any, ParentType extends ResolversParentTypes['SuspectFlag'] = ResolversParentTypes['SuspectFlag']> = {
  rule?: Resolver<ResolversTypes['SuspectRule'], ParentType, ContextType>;
  threshold?: Resolver<Maybe<ResolversTypes['Bani']>, ParentType, ContextType>;
};

export type TotalResolvers<ContextType = any, ParentType extends ResolversParentTypes['Total'] = ResolversParentTypes['Total']> = {
  awarded?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  estimated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  frameworkCeilings?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  noValue?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  records?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  suspectLeftOut?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type UatResolvers<ContextType = any, ParentType extends ResolversParentTypes['Uat'] = ResolversParentTypes['Uat']> = {
  county?: Resolver<ResolversTypes['County'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  siruta?: Resolver<ResolversTypes['Siruta'], ParentType, ContextType>;
};

export type UatMapResolvers<ContextType = any, ParentType extends ResolversParentTypes['UatMap'] = ResolversParentTypes['UatMap']> = {
  uats?: Resolver<Array<ResolversTypes['AreaTotal']>, ParentType, ContextType>;
  unknownUat?: Resolver<Maybe<ResolversTypes['Total']>, ParentType, ContextType>;
};

export type UnplacedTileResolvers<ContextType = any, ParentType extends ResolversParentTypes['UnplacedTile'] = ResolversParentTypes['UnplacedTile']> = {
  authorities?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  Alias?: AliasResolvers<ContextType>;
  AreaKey?: GraphQLScalarType;
  AreaTotal?: AreaTotalResolvers<ContextType>;
  Bani?: GraphQLScalarType;
  Consortium?: ConsortiumResolvers<ContextType>;
  Counterparty?: CounterpartyResolvers<ContextType>;
  CounterpartyPage?: CounterpartyPageResolvers<ContextType>;
  County?: CountyResolvers<ContextType>;
  CountyCode?: GraphQLScalarType;
  CountyCoverage?: CountyCoverageResolvers<ContextType>;
  Coverage?: CoverageResolvers<ContextType>;
  Cpv?: CpvResolvers<ContextType>;
  DataThrough?: DataThroughResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  Entity?: EntityResolvers<ContextType>;
  EntityResult?: EntityResultResolvers<ContextType>;
  EntityResultPage?: EntityResultPageResolvers<ContextType>;
  FacetCount?: FacetCountResolvers<ContextType>;
  FrameworkLink?: FrameworkLinkResolvers<ContextType>;
  FrameworkOverrunNumbers?: FrameworkOverrunNumbersResolvers<ContextType>;
  FrameworkSummary?: FrameworkSummaryResolvers<ContextType>;
  GapCell?: GapCellResolvers<ContextType>;
  MapArea?: GraphQLScalarType;
  MatchedField?: MatchedFieldResolvers<ContextType>;
  MoneyMap?: MoneyMapResolvers<ContextType>;
  MonthTotal?: MonthTotalResolvers<ContextType>;
  NoPublicationNumbers?: NoPublicationNumbersResolvers<ContextType>;
  OverCapNumbers?: OverCapNumbersResolvers<ContextType>;
  Party?: PartyResolvers<ContextType>;
  Period?: PeriodResolvers<ContextType>;
  Placement?: PlacementResolvers<ContextType>;
  Provenance?: ProvenanceResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RecordFacets?: RecordFacetsResolvers<ContextType>;
  RecordFilterEcho?: RecordFilterEchoResolvers<ContextType>;
  RecordFilterValue?: RecordFilterValueResolvers<ContextType>;
  RecordResult?: RecordResultResolvers<ContextType>;
  RecordResultPage?: RecordResultPageResolvers<ContextType>;
  SeapEntity?: SeapEntityResolvers<ContextType>;
  SeapQuery?: SeapQueryResolvers<ContextType>;
  SeapRecord?: SeapRecordResolvers<ContextType>;
  SeapRole?: SeapRoleResolvers<ContextType>;
  SeapSearch?: SeapSearchResolvers<ContextType>;
  Signal?: SignalResolvers<ContextType>;
  SignalNumbers?: SignalNumbersResolvers<ContextType>;
  SignalPage?: SignalPageResolvers<ContextType>;
  SignalRule?: SignalRuleResolvers<ContextType>;
  Siruta?: GraphQLScalarType;
  Source?: SourceResolvers<ContextType>;
  SourceRecord?: SourceRecordResolvers<ContextType>;
  SplittingNumbers?: SplittingNumbersResolvers<ContextType>;
  SuspectFlag?: SuspectFlagResolvers<ContextType>;
  Total?: TotalResolvers<ContextType>;
  Uat?: UatResolvers<ContextType>;
  UatMap?: UatMapResolvers<ContextType>;
  UnplacedTile?: UnplacedTileResolvers<ContextType>;
};

