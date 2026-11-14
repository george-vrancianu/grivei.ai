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
  /**
   * Integer bani that may be negative (a loss, negative equity), serialised as a decimal string. Only a company's own statements (`FinancialYear`) can be negative;
   * every awarded value is a plain `Bani`.
   */
  SignedBani: { input: string; output: string; }
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
  /** What `CountyCoverage.withRecords` is counted against: SEAP's is MF's list of public entities; ONRC has none (its register is the whole population), so its N of M is not stated. */
  denominator: CoverageDenominator;
  /** Planned Sources' greyed marks, per county, come from `sources` (harvested: false). */
  grid: Array<GapCell>;
  /** MF Lista entităților publice snapshot date. */
  referenceSnapshot: Maybe<Scalars['Date']['output']>;
  source: Source;
  unplacedAuthorities: UnplacedTile;
  window: Period;
};

export type CoverageDenominator =
  | 'NONE'
  | 'PUBLIC_ENTITIES';

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

export type DonationKind =
  | 'DONATION'
  | 'LOAN';

/** BaniPartide's firm-donor table as we hold it. Each row cites BaniPartide and, through its methodology, the underlying publications (Monitorul Oficial, AEP's pages); BaniPartide gives no report reference per row. */
export type DonationSource = {
  __typename?: 'DonationSource';
  /** BaniPartide's page for the table. */
  datasetUrl: Maybe<Scalars['String']['output']>;
  /** When we fetched the table (from the raw archive). */
  fetchedAt: Scalars['DateTime']['output'];
  /** The licence as BaniPartide gives it (CC Attribution 4.0). */
  license: Maybe<Scalars['String']['output']>;
  licenseUrl: Maybe<Scalars['String']['output']>;
  /** The publisher, Expert Forum, as BaniPartide names it. */
  publisher: Maybe<Scalars['String']['output']>;
  publisherUrl: Maybe<Scalars['String']['output']>;
  /** BaniPartide's methodology page, where it names its underlying sources. */
  underlyingUrl: Maybe<Scalars['String']['output']>;
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
  /**
   * The firm donations and loans to parties that BaniPartide lists under this entity's CUI (a Reference source; ticket #182), newest first. Null when it lists none, for an entity
   * with no CUI and for a sole trader (never published against a person's name). The same on both role pages; on a supplier it is context ("also a firm donor"): never a Signal
   * (ADR 0014), never a Party, and never added to awarded value. No individual donor is ever served (ADR 0009).
   */
  donations: Maybe<FirmDonations>;
  /**
   * MF's annual financial statements for this entity's CUI, one row per fiscal year (a Reference source; ticket #179). Null when MF holds none for the CUI, and for an entity
   * with no CUI. The same on both role pages; the page shows it on the supplier's. Context only: never a Signal, and never added to awarded value (ADR 0014).
   */
  financials: Maybe<FinancialStatements>;
  foreignVatId: Maybe<Scalars['String']['output']>;
  identity: EntityIdentity;
  identityCurated: Scalars['Boolean']['output'];
  key: Scalars['ID']['output'];
  /** The Leadership list (AEP's election results, ADR 0012): set for a town hall, Bucharest sector, Bucharest city hall or county council, and for a subordinate body of one (its authority's list, with the basis of the tie). Null for every other entity, and always null for an entity that is only a supplier. Leaders are never linked to a person page or to ONRC. */
  leadership: Maybe<Leadership>;
  /** The ONRC registration under this entity's CUI (ADR 0018). Null when ONRC lists none (a name-only supplier has none). The same on both role pages of an entity that is an authority and a supplier. */
  onrc: Maybe<OnrcRegistration>;
  placement: Maybe<Placement>;
  /** Where the name and ANAF status came from and when we fetched them: ANAF (the Reference source); ONRC when ANAF has no answer but ONRC lists the CUI (ADR 0018); else SEAP. */
  provenance: Array<Provenance>;
  /** Set when AMEPIP's list of public enterprises (OUG 109/2011) holds this entity's CUI; the entity's own basis for it. Null otherwise, and for every entity with no CUI. The same on both role pages. */
  publicEnterprise: Maybe<PublicEnterprise>;
  /** Source-specific facets, one sibling per explorable Source (ADR 0005): SEAP, and ONRC below. */
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
  /**
   * How many Signals this entity has in the matching set, on the side of the tab it is listed in: the Signals with at least one
   * Record in the filter's set where the entity is the authority (Authorities tab) or a winner (Suppliers tab, consortium members
   * included). It is the number the entity page's Overview shows beside "Signals" when the same filter is applied there. The
   * entity page's own filter starts empty (a search is not carried over), so the Overview opens on every Signal of the entity and
   * can list more than this count says; with no filter on the main screen the two agree. Never a score: a count, 0 when there are
   * none (never null).
   */
  signalCount: Scalars['Int']['output'];
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

/** Which release of MF's file a year's figures come from. */
export type FinancialRevision =
  /** The year's first release: MF may still revise it. */
  | 'FIRST_RELEASE'
  /** MF's re-published (`actualizat`) file for the year, a year after the first. */
  | 'REVISED';

/** The MF file a year's figures were read from, as the portal publishes it. */
export type FinancialSource = {
  __typename?: 'FinancialSource';
  /** MF's dataset page on data.gov.ro. */
  datasetUrl: Maybe<Scalars['String']['output']>;
  /** When we fetched it (from the raw archive). */
  fetchedAt: Scalars['DateTime']['output'];
  /** The file's name as MF gives it, e.g. WEB_BL_BS_SL_AN2024.txt. */
  file: Scalars['String']['output'];
  /** The file's own download link. */
  fileUrl: Maybe<Scalars['String']['output']>;
  license: Maybe<Scalars['String']['output']>;
  /** The day MF published this file. */
  published: Maybe<Scalars['Date']['output']>;
  /** The dataset as the portal titles it (source data, verbatim). */
  via: Maybe<Scalars['String']['output']>;
};

/**
 * A company's annual financial statements as the Ministry of Finance publishes them (bulk files on data.gov.ro, from fiscal year 2021): turnover, profit or loss, debts,
 * equity and the average number of employees, newest year first. A Reference source, shown as context beside the awards; its figures are never added to awarded value (ADR 0014).
 */
export type FinancialStatements = {
  __typename?: 'FinancialStatements';
  years: Array<FinancialYear>;
};

/** One fiscal year of one company's statements. Every figure may be null (a blank cell in MF's file); a blank is never read as zero. */
export type FinancialYear = {
  __typename?: 'FinancialYear';
  /** The average number of employees. Null when the cell is blank: reads "not reported", never zero. A cell that says 0 is 0. */
  averageEmployees: Maybe<Scalars['Int']['output']>;
  awardShareOfTurnover: Maybe<Scalars['Float']['output']>;
  /**
   * Context, never a Signal and never added to awarded value (ADR 0014): what this entity was awarded as a supplier in the calendar year (the awarded value of the Records
   * awarded that year, the same counting rule as every Total) as bani, and that as a share of the year's turnover. A contract's whole value counts in its award year, so the
   * share can exceed 1 and is no revenue share. Null share when the turnover is blank or zero.
   */
  awardedInYear: Scalars['Bani']['output'];
  /** Debts (datorii). Signed, like the turnover. */
  debts: Maybe<Scalars['SignedBani']['output']>;
  /** Equity (capitaluri - total); negative when the company owes more than it owns. */
  equity: Maybe<Scalars['SignedBani']['output']>;
  fiscalYear: Scalars['Int']['output'];
  /** True for the newest fiscal year MF's files hold (for any company) while it is a first release: the page notes it may be revised. */
  mayBeRevised: Scalars['Boolean']['output'];
  /** Net profit minus net loss: negative is a loss. Null when MF's file has both blank. */
  profitOrLoss: Maybe<Scalars['SignedBani']['output']>;
  revision: FinancialRevision;
  /** The file the figures come from: each figure cites MF and it. */
  source: FinancialSource;
  /** Net turnover (cifra de afaceri neta). Signed: MF's files are not validated, so a negative cell is served as it is. */
  turnover: Maybe<Scalars['SignedBani']['output']>;
};

/** One donation or loan as BaniPartide lists it. The party is exactly as published: it is no Party entity and is not normalised. */
export type FirmDonation = {
  __typename?: 'FirmDonation';
  amount: Scalars['Bani']['output'];
  /** Set only when exactly one date is readable from the published cell and it falls in the year. */
  date: Maybe<Scalars['Date']['output']>;
  /** The published date cell, verbatim (it can list several dates, or none). */
  dateText: Scalars['String']['output'];
  kind: DonationKind;
  party: Scalars['String']['output'];
  /** The row's number in the BaniPartide table export we hold: what a citation points at. */
  sourceRow: Scalars['Int']['output'];
  /** The year BaniPartide files the row under; null when the row has none. */
  year: Maybe<Scalars['Int']['output']>;
};

/**
 * A company's donations and loans to parties as BaniPartide (Expert Forum, CC BY 4.0) lists them from the parties' annual publications, newest first. Amounts are not summed anywhere:
 * a donation is a different measure from awarded value (ADR 0014).
 */
export type FirmDonations = {
  __typename?: 'FirmDonations';
  /** The newest year BaniPartide covers, for any donor: the list's data-through year. Later donations may be missing. */
  dataThroughYear: Scalars['Int']['output'];
  donationCount: Scalars['Int']['output'];
  items: Array<FirmDonation>;
  loanCount: Scalars['Int']['output'];
  source: DonationSource;
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
  /** The grid period: SEAP's is a quarter (`2024-Q4`). ONRC's is one snapshot, written as its date (`2026-05-06`), or a calendar month with no snapshot held (`2026-04`, a KNOWN_GAP). */
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

/**
 * An authority's Mandates, newest last, with the gaps between them. A Mandate runs from the oath to the successor's oath; the handover window, an interim leader
 * and a mandate without results get no Mandate and are listed as gaps, never guessed. The party is as registered at the election: the leader may have
 * switched party since (the page says so). Leader names appear only here.
 */
export type Leadership = {
  __typename?: 'Leadership';
  gaps: Array<LeadershipGap>;
  mandates: Array<Mandate>;
  /** Set for a subordinate body: the authority this list is, and the MF snapshot its principal-credit-holder tie comes from (a funding relation, the current tie). */
  via: Maybe<LeadershipVia>;
};

export type LeadershipGap = {
  __typename?: 'LeadershipGap';
  endDate: Maybe<Scalars['Date']['output']>;
  kind: LeadershipGapKind;
  startDate: Scalars['Date']['output'];
};

export type LeadershipGapKind =
  | 'HANDOVER_WINDOW'
  | 'INTERIM'
  | 'NO_RESULTS';

/** The authority a subordinate body takes its Leadership list and Party from, and the basis: principal credit holder in MF's list of public entities, as every held snapshot says. */
export type LeadershipVia = {
  __typename?: 'LeadershipVia';
  authority: Scalars['ID']['output'];
  authorityName: Scalars['String']['output'];
  /** The newest MF snapshot that shows the tie. */
  snapshotDate: Scalars['Date']['output'];
  /** How many held snapshots list the body (all show the same single principal). */
  snapshots: Scalars['Int']['output'];
};

export type Mandate = {
  __typename?: 'Mandate';
  basis: MandateBasis;
  /** The day the basis data runs through: the election day for final minutes, the stated date of the one-off 2025 file. */
  dataThrough: Scalars['Date']['output'];
  electionDate: Scalars['Date']['output'];
  /** Null while the mandate is still in force. */
  endDate: Maybe<Scalars['Date']['output']>;
  independent: Scalars['Boolean']['output'];
  /** The elected leader's name as AEP wrote it (source data). Never linked to a person. */
  leaderName: Scalars['String']['output'];
  /** The list the leader ran on, as registered at the election: a party, an alliance under its registered name, or 'Independent' (which is no party). */
  list: Scalars['String']['output'];
  /** An alliance's member parties (empty for a party or an independent). */
  memberParties: Array<Scalars['String']['output']>;
  /** From the oath (assumed: AEP publishes no per-UAT oath dates, see the methodology page). */
  startDate: Scalars['Date']['output'];
};

export type MandateBasis =
  | 'FINAL_MINUTES'
  | 'PARTIAL_MINUTES'
  | 'REPEAT_ROUND';

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

export type OnrcAlias = {
  __typename?: 'OnrcAlias';
  /** True when the newest snapshot lists it: ONRC's legal name today. */
  current: Scalars['Boolean']['output'];
  /** The first and the last held snapshot that listed this name. */
  firstSeen: Scalars['Date']['output'];
  lastSeen: Scalars['Date']['output'];
  name: Scalars['String']['output'];
  /** True when the earliest held snapshot already listed it: it is at least that old. */
  sinceAtLeast: Scalars['Boolean']['output'];
};

export type OnrcAreaCount = {
  __typename?: 'OnrcAreaCount';
  area: Scalars['MapArea']['output'];
  name: Scalars['String']['output'];
  registrations: Scalars['Int']['output'];
};

export type OnrcCaen = {
  __typename?: 'OnrcCaen';
  code: Scalars['String']['output'];
  /** The CAEN revision ONRC records (0 = 1998, 1 = 2003, 2 = 2008, 3 = 2025); null when unknown. */
  version: Maybe<Scalars['Int']['output']>;
};

/**
 * ONRC's count lens (ADR 0014: ONRC has no money measure). Counties with no matching registration are absent. The placement rule is the registered
 * seat's county; a registration with no county is in the Unplaced tile. Sole traders' registrations are in neither.
 */
export type OnrcCountMap = {
  __typename?: 'OnrcCountMap';
  counties: Array<OnrcAreaCount>;
  unplacedRegistrations: Scalars['Int']['output'];
};

export type OnrcCurrentStatus = {
  __typename?: 'OnrcCurrentStatus';
  code: Scalars['Int']['output'];
  /** ONRC's nomenclature name (Romanian, source data); null when the held nomenclature does not list the code. */
  name: Maybe<Scalars['String']['output']>;
};

/** ONRC's search state, 1:1 with the URL like RecordFilter (the codec is `ONRC_FILTER_URL`). Every chip is a field; an unset field narrows nothing. */
export type OnrcFilter = {
  caen?: InputMaybe<Scalars['String']['input']>;
  county?: InputMaybe<Scalars['MapArea']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  registeredFrom?: InputMaybe<Scalars['Date']['input']>;
  registeredTo?: InputMaybe<Scalars['Date']['input']>;
  seapCounterparty?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type OnrcFilterEcho = {
  __typename?: 'OnrcFilterEcho';
  qFolded: Maybe<Scalars['String']['output']>;
};

export type OnrcMatchableField =
  | 'ALIAS'
  | 'CAEN'
  | 'CUI'
  | 'NAME'
  | 'REGISTRATION_NUMBER';

export type OnrcMatchedField = {
  __typename?: 'OnrcMatchedField';
  field: OnrcMatchableField;
  /** Highlight ranges into `text`, [start, end) in UTF-16 code units. */
  highlights: Array<Array<Scalars['Int']['output']>>;
  /** The field's text as published (an earlier name, the CUI, the CAEN code...). */
  text: Scalars['String']['output'];
};

export type OnrcQuery = {
  __typename?: 'OnrcQuery';
  /** A registration by its ONRC registration number (e.g. J40/1234/2010), the way the entity page's ONRC section shows it; null for an unknown number and for a sole trader's registration. */
  record: Maybe<OnrcRegistration>;
  /**
   * ONRC registrations by plain text (name, an earlier name, CUI, registration number, authorised CAEN code), with the same contract as SEAP's search:
   * a match count and the top results. One matching set: the count, the Organisations tab and the count lens all come from the same filter.
   * Never people, and never a sole trader's (PFA, II, IF) registration: those are named after a natural person (ADR 0009).
   */
  search: OnrcSearch;
};


export type OnrcQueryRecordArgs = {
  registrationNumber: Scalars['ID']['input'];
};


export type OnrcQuerySearchArgs = {
  filter: OnrcFilter;
};

/**
 * One ONRC registration as the newest held snapshot lists it, with the history derived by comparing snapshots (ONRC's statuses and names are
 * undated). No person of the registration is served here: its administrators and legal representatives are ticket #177's, and an organisation
 * that exists only in ONRC never names anyone (ADR 0018).
 */
export type OnrcRegistration = {
  __typename?: 'OnrcRegistration';
  /** ONRC's legal name and earlier names, newest first, each with the snapshots it was seen in. Aliases only: they never rename the entity (ADR 0018). */
  aliases: Array<OnrcAlias>;
  /** The authorised CAEN codes of the newest snapshot, by code. */
  caen: Array<OnrcCaen>;
  /** The CUI, when it passes the check digit. */
  cui: Maybe<Scalars['String']['output']>;
  /** The entity page of the CUI; null for a registration with no valid CUI. */
  entity: Maybe<Entity>;
  /** FORMA_JURIDICA as published, e.g. SRL; null when the snapshot has none. */
  legalForm: Maybe<Scalars['String']['output']>;
  /** ONRC's legal name as the newest snapshot lists it. */
  name: Scalars['String']['output'];
  /** Where it came from: ONRC's dataset page, the snapshot's title, and when we fetched it. */
  provenance: Provenance;
  /** Null when the newest snapshot is in the legacy layout, which carries no registration date. */
  registrationDate: Maybe<Scalars['Date']['output']>;
  /** ONRC's registration number (COD_INMATRICULARE), e.g. J40/1234/2010. Source data, shown as published. */
  registrationNumber: Scalars['String']['output'];
  /** The registered seat, as published. */
  seat: OnrcSeat;
  /** The snapshot the registration, CAEN codes and seat come from. */
  snapshot: Scalars['Date']['output'];
  /** The statuses the newest snapshot shows (a company can carry several, e.g. in operation and in insolvency), by code. */
  statuses: Array<OnrcStatus>;
};

/** One matching registration. Never a person: no administrator, no legal representative (those are the entity page's, and only for organisations tied to public money, ADR 0009). */
export type OnrcResult = {
  __typename?: 'OnrcResult';
  caen: Array<OnrcCaen>;
  cui: Maybe<Scalars['String']['output']>;
  /** The entity page of the CUI; null for a registration with no valid CUI. */
  entity: Maybe<Entity>;
  legalForm: Maybe<Scalars['String']['output']>;
  /** Why it matched: every field that holds a query word, strongest first (CUI, registration number, name, an earlier name, CAEN). Empty without a text query. */
  matched: Array<OnrcMatchedField>;
  /** ONRC's legal name as the newest snapshot lists it. */
  name: Scalars['String']['output'];
  registrationDate: Maybe<Scalars['Date']['output']>;
  registrationNumber: Scalars['String']['output'];
  /** The CUI is an authority or a winner of a loaded SEAP Record. */
  seapCounterparty: Scalars['Boolean']['output'];
  seat: OnrcSeat;
  /** The statuses the newest snapshot shows. */
  statuses: Array<OnrcCurrentStatus>;
};

export type OnrcResultPage = {
  __typename?: 'OnrcResultPage';
  count: Scalars['Int']['output'];
  rows: Array<OnrcResult>;
};

export type OnrcResultTab =
  | 'ORGANISATIONS';

export type OnrcSearch = {
  __typename?: 'OnrcSearch';
  /** The match count: registrations matching the filter, sole traders' left out. */
  count: Scalars['Int']['output'];
  /** The results tab that opens first. Organisations only: ONRC search never lists people. */
  defaultTab: OnrcResultTab;
  /** Echo of the filter as the server understood it. */
  filter: OnrcFilterEcho;
  /** The count lens: registrations matching the filter, by the seat's county, for the same filter as the count (every chip narrows it, `county` included, as in SEAP's Money lens). */
  map: OnrcCountMap;
  /** The Organisations tab: ranked by text relevance, then newest registration first (a registration with no date last), then ONRC's registration number. Offset/limit paging; the server caps limit at 200. */
  organisations: OnrcResultPage;
};


export type OnrcSearchOrganisationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type OnrcSeat = {
  __typename?: 'OnrcSeat';
  /** The seat as one line, as published. */
  address: Maybe<Scalars['String']['output']>;
  /** The county as ONRC writes it. */
  county: Maybe<Scalars['String']['output']>;
  locality: Maybe<Scalars['String']['output']>;
  postalCode: Maybe<Scalars['String']['output']>;
};

export type OnrcStatus = {
  __typename?: 'OnrcStatus';
  /** ONRC's status code, e.g. 1048. */
  code: Scalars['Int']['output'];
  /** The first held snapshot that showed this status (the one it was first seen in; ONRC dates no status itself). */
  firstSeen: Scalars['Date']['output'];
  /** The status as ONRC's nomenclature names it (Romanian, source data); null when the held nomenclature does not list the code. */
  name: Maybe<Scalars['String']['output']>;
  /** True when the earliest held snapshot already showed it: the status is at least that old, and firstSeen is a lower bound. */
  sinceAtLeast: Scalars['Boolean']['output'];
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

/** Where a shown fact came from. Every Record has one; so does every Entity (ANAF (the Reference source); ONRC when ANAF does not know the CUI but ONRC lists it, ADR 0018; else SEAP). */
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

/**
 * The basis of the "public enterprise (AMEPIP)" mark: the entity's CUI is on AMEPIP's open-data list of the companies under OUG 109/2011
 * (the Agency for the Monitoring and Evaluation of the Performance of Public Enterprises), as the newest held list names it. AMEPIP is a
 * Reference source (it has no pages of its own here); its facts are source data, shown as published.
 */
export type PublicEnterprise = {
  __typename?: 'PublicEnterprise';
  /** When we fetched it (from the raw archive). */
  fetchedAt: Scalars['DateTime']['output'];
  /** The first and the last financial year AMEPIP holds indicators for. */
  firstYear: Maybe<Scalars['Int']['output']>;
  lastYear: Maybe<Scalars['Int']['output']>;
  /** The licence the list is published under, e.g. CC-BY-4.0. */
  license: Maybe<Scalars['String']['output']>;
  /** The company's name as AMEPIP's list writes it (it may differ from the entity's display name). */
  listedAs: Scalars['String']['output'];
  /** ONRC's registration number as AMEPIP writes it, e.g. J05/14/1991. */
  registrationNumber: Maybe<Scalars['String']['output']>;
  /** The day AMEPIP published the list this comes from: the list's data-through date. */
  snapshot: Scalars['Date']['output'];
  /** The ONRC status as AMEPIP writes it for the newest year (Romanian source data). */
  status: Maybe<Scalars['String']['output']>;
  /** AMEPIP's dataset page on data.gov.ro. */
  url: Maybe<Scalars['String']['output']>;
  /** The resource as the portal titles it (source data, verbatim). */
  via: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /** Counties and UATs as keys and names only; geometry ships as static TopoJSON. Bucharest's UATs are its six sectors. */
  counties: Array<County>;
  /** Per-Source coverage, for the Coverage lens and /explore/coverage. Follows the date chip. */
  coverage: Coverage;
  /** An entity by its URL key: a CUI, `vat-<id>` or `name-<slug>` (name-only suppliers). */
  entity: Maybe<Entity>;
  onrc: OnrcQuery;
  /** The Reference sources held beside the explorable ones (AMEPIP's public enterprises, AEP's one-off 2025 file, MF's financial statements, BaniPartide's firm donations), each with its data-through date; for the methodology page. */
  referenceSources: Array<ReferenceSource>;
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

/** The Party of a SEAP Record: the Mandate in force on its award date at its authority, or through its principal credit holder. Never a supplier's, never a person's. */
export type RecordParty = {
  __typename?: 'RecordParty';
  basis: MandateBasis;
  dataThrough: Scalars['Date']['output'];
  electionDate: Scalars['Date']['output'];
  independent: Scalars['Boolean']['output'];
  list: Scalars['String']['output'];
  memberParties: Array<Scalars['String']['output']>;
  /** Set for a subordinate body's Record: the authority it is inherited through. */
  via: Maybe<LeadershipVia>;
};

export type RecordResult = {
  __typename?: 'RecordResult';
  /**
   * The part of the Record's value that went to winners placed in the filter's supplier-side map area: the summed
   * consortium shares of those winners, counted by the same rule and over the same Record x winner rows as the headline
   * Total, so over all Records matching the filter these sum to the Total's `awarded`. Null unless the filter has
   * `countySide: SUPPLIER` and a `county`; null for a Record with a single winner (its full value is the share); null
   * for a Record with no value to share. The app's entity Records tab never sends a county, so it never sees one.
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

/** A Reference source: held to enrich entities, never explorable on its own (no search, no Coverage). Its data-through date says how current it is. */
export type ReferenceSource = {
  __typename?: 'ReferenceSource';
  /** The day the held list was published (a source published by fiscal year: the end of the newest year held); null when none is held yet. */
  dataThrough: Maybe<Scalars['Date']['output']>;
  /** For a source published by year (MF's financial statements by fiscal year, BaniPartide's donations by the year they are filed under): the newest year held. Null for the others, and when none is held. */
  fiscalYear: Maybe<Scalars['Int']['output']>;
  /** The source's short name, e.g. AMEPIP. */
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** Where the list comes from; null when none is held yet. */
  url: Maybe<Scalars['String']['output']>;
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
  /** The Party of the mandate in force on the award date at the authority (ADR 0012). Null when the authority is not a town hall, sector, Bucharest city hall or county council (or a subordinate body of one), or the date falls in a gap. */
  party: Maybe<RecordParty>;
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
  CoverageDenominator: CoverageDenominator;
  CoverageStatus: CoverageStatus;
  Cpv: ResolverTypeWrapper<Cpv>;
  DataThrough: ResolverTypeWrapper<DataThrough>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateRange: DateRange;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DonationKind: DonationKind;
  DonationSource: ResolverTypeWrapper<DonationSource>;
  Entity: ResolverTypeWrapper<Omit<Entity, 'aliases' | 'seap'> & { aliases: Array<ResolversTypes['Alias']>, seap: ResolversTypes['SeapEntity'] }>;
  EntityIdentity: EntityIdentity;
  EntityResult: ResolverTypeWrapper<Omit<EntityResult, 'entity'> & { entity: ResolversTypes['Entity'] }>;
  EntityResultPage: ResolverTypeWrapper<EntityResultPage>;
  FacetCount: ResolverTypeWrapper<FacetCount>;
  FinancialRevision: FinancialRevision;
  FinancialSource: ResolverTypeWrapper<FinancialSource>;
  FinancialStatements: ResolverTypeWrapper<FinancialStatements>;
  FinancialYear: ResolverTypeWrapper<FinancialYear>;
  FirmDonation: ResolverTypeWrapper<FirmDonation>;
  FirmDonations: ResolverTypeWrapper<FirmDonations>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  FrameworkLink: ResolverTypeWrapper<Omit<FrameworkLink, 'agreement' | 'subsequent'> & { agreement?: Maybe<ResolversTypes['SeapRecord']>, subsequent: Array<ResolversTypes['SeapRecord']> }>;
  FrameworkOverrunNumbers: ResolverTypeWrapper<FrameworkOverrunNumbers>;
  FrameworkSummary: ResolverTypeWrapper<FrameworkSummary>;
  GapCell: ResolverTypeWrapper<GapCell>;
  GapRule: GapRule;
  GapState: GapState;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Leadership: ResolverTypeWrapper<Leadership>;
  LeadershipGap: ResolverTypeWrapper<LeadershipGap>;
  LeadershipGapKind: LeadershipGapKind;
  LeadershipVia: ResolverTypeWrapper<LeadershipVia>;
  Mandate: ResolverTypeWrapper<Mandate>;
  MandateBasis: MandateBasis;
  MapArea: ResolverTypeWrapper<Scalars['MapArea']['output']>;
  MatchableField: MatchableField;
  MatchedField: ResolverTypeWrapper<MatchedField>;
  MoneyMap: ResolverTypeWrapper<MoneyMap>;
  MonthTotal: ResolverTypeWrapper<MonthTotal>;
  NoPublicationNumbers: ResolverTypeWrapper<NoPublicationNumbers>;
  OnrcAlias: ResolverTypeWrapper<OnrcAlias>;
  OnrcAreaCount: ResolverTypeWrapper<OnrcAreaCount>;
  OnrcCaen: ResolverTypeWrapper<OnrcCaen>;
  OnrcCountMap: ResolverTypeWrapper<OnrcCountMap>;
  OnrcCurrentStatus: ResolverTypeWrapper<OnrcCurrentStatus>;
  OnrcFilter: OnrcFilter;
  OnrcFilterEcho: ResolverTypeWrapper<OnrcFilterEcho>;
  OnrcMatchableField: OnrcMatchableField;
  OnrcMatchedField: ResolverTypeWrapper<OnrcMatchedField>;
  OnrcQuery: ResolverTypeWrapper<Omit<OnrcQuery, 'search'> & { search: ResolversTypes['OnrcSearch'] }>;
  OnrcRegistration: ResolverTypeWrapper<Omit<OnrcRegistration, 'entity'> & { entity?: Maybe<ResolversTypes['Entity']> }>;
  OnrcResult: ResolverTypeWrapper<Omit<OnrcResult, 'entity'> & { entity?: Maybe<ResolversTypes['Entity']> }>;
  OnrcResultPage: ResolverTypeWrapper<Omit<OnrcResultPage, 'rows'> & { rows: Array<ResolversTypes['OnrcResult']> }>;
  OnrcResultTab: OnrcResultTab;
  OnrcSearch: ResolverTypeWrapper<Omit<OnrcSearch, 'filter' | 'organisations'> & { filter: ResolversTypes['OnrcFilterEcho'], organisations: ResolversTypes['OnrcResultPage'] }>;
  OnrcSeat: ResolverTypeWrapper<OnrcSeat>;
  OnrcStatus: ResolverTypeWrapper<OnrcStatus>;
  OverCapNumbers: ResolverTypeWrapper<OverCapNumbers>;
  Party: ResolverTypeWrapper<Omit<Party, 'entity'> & { entity?: Maybe<ResolversTypes['Entity']> }>;
  Period: ResolverTypeWrapper<Period>;
  Placement: ResolverTypeWrapper<Placement>;
  Provenance: ResolverTypeWrapper<Provenance>;
  ProvenanceKind: ProvenanceKind;
  PublicEnterprise: ResolverTypeWrapper<PublicEnterprise>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RecordBadge: RecordBadge;
  RecordFacets: ResolverTypeWrapper<RecordFacets>;
  RecordFilter: RecordFilter;
  RecordFilterEcho: ResolverTypeWrapper<Omit<RecordFilterEcho, 'authority' | 'supplier'> & { authority?: Maybe<ResolversTypes['Entity']>, supplier?: Maybe<ResolversTypes['Entity']> }>;
  RecordFilterValue: ResolverTypeWrapper<RecordFilterValue>;
  RecordOrder: RecordOrder;
  RecordParty: ResolverTypeWrapper<RecordParty>;
  RecordResult: ResolverTypeWrapper<Omit<RecordResult, 'matchedField' | 'record'> & { matchedField?: Maybe<ResolversTypes['MatchedField']>, record: ResolversTypes['SeapRecord'] }>;
  RecordResultPage: ResolverTypeWrapper<Omit<RecordResultPage, 'rows'> & { rows: Array<ResolversTypes['RecordResult']> }>;
  ReferenceSource: ResolverTypeWrapper<ReferenceSource>;
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
  SignedBani: ResolverTypeWrapper<Scalars['SignedBani']['output']>;
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
  DonationSource: DonationSource;
  Entity: Omit<Entity, 'aliases' | 'seap'> & { aliases: Array<ResolversParentTypes['Alias']>, seap: ResolversParentTypes['SeapEntity'] };
  EntityResult: Omit<EntityResult, 'entity'> & { entity: ResolversParentTypes['Entity'] };
  EntityResultPage: EntityResultPage;
  FacetCount: FacetCount;
  FinancialSource: FinancialSource;
  FinancialStatements: FinancialStatements;
  FinancialYear: FinancialYear;
  FirmDonation: FirmDonation;
  FirmDonations: FirmDonations;
  Float: Scalars['Float']['output'];
  FrameworkLink: Omit<FrameworkLink, 'agreement' | 'subsequent'> & { agreement?: Maybe<ResolversParentTypes['SeapRecord']>, subsequent: Array<ResolversParentTypes['SeapRecord']> };
  FrameworkOverrunNumbers: FrameworkOverrunNumbers;
  FrameworkSummary: FrameworkSummary;
  GapCell: GapCell;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Leadership: Leadership;
  LeadershipGap: LeadershipGap;
  LeadershipVia: LeadershipVia;
  Mandate: Mandate;
  MapArea: Scalars['MapArea']['output'];
  MatchedField: MatchedField;
  MoneyMap: MoneyMap;
  MonthTotal: MonthTotal;
  NoPublicationNumbers: NoPublicationNumbers;
  OnrcAlias: OnrcAlias;
  OnrcAreaCount: OnrcAreaCount;
  OnrcCaen: OnrcCaen;
  OnrcCountMap: OnrcCountMap;
  OnrcCurrentStatus: OnrcCurrentStatus;
  OnrcFilter: OnrcFilter;
  OnrcFilterEcho: OnrcFilterEcho;
  OnrcMatchedField: OnrcMatchedField;
  OnrcQuery: Omit<OnrcQuery, 'search'> & { search: ResolversParentTypes['OnrcSearch'] };
  OnrcRegistration: Omit<OnrcRegistration, 'entity'> & { entity?: Maybe<ResolversParentTypes['Entity']> };
  OnrcResult: Omit<OnrcResult, 'entity'> & { entity?: Maybe<ResolversParentTypes['Entity']> };
  OnrcResultPage: Omit<OnrcResultPage, 'rows'> & { rows: Array<ResolversParentTypes['OnrcResult']> };
  OnrcSearch: Omit<OnrcSearch, 'filter' | 'organisations'> & { filter: ResolversParentTypes['OnrcFilterEcho'], organisations: ResolversParentTypes['OnrcResultPage'] };
  OnrcSeat: OnrcSeat;
  OnrcStatus: OnrcStatus;
  OverCapNumbers: OverCapNumbers;
  Party: Omit<Party, 'entity'> & { entity?: Maybe<ResolversParentTypes['Entity']> };
  Period: Period;
  Placement: Placement;
  Provenance: Provenance;
  PublicEnterprise: PublicEnterprise;
  Query: Record<PropertyKey, never>;
  RecordFacets: RecordFacets;
  RecordFilter: RecordFilter;
  RecordFilterEcho: Omit<RecordFilterEcho, 'authority' | 'supplier'> & { authority?: Maybe<ResolversParentTypes['Entity']>, supplier?: Maybe<ResolversParentTypes['Entity']> };
  RecordFilterValue: RecordFilterValue;
  RecordParty: RecordParty;
  RecordResult: Omit<RecordResult, 'matchedField' | 'record'> & { matchedField?: Maybe<ResolversParentTypes['MatchedField']>, record: ResolversParentTypes['SeapRecord'] };
  RecordResultPage: Omit<RecordResultPage, 'rows'> & { rows: Array<ResolversParentTypes['RecordResult']> };
  ReferenceSource: ReferenceSource;
  SeapEntity: Omit<SeapEntity, 'role'> & { role?: Maybe<ResolversParentTypes['SeapRole']> };
  SeapQuery: Omit<SeapQuery, 'record' | 'search'> & { record?: Maybe<ResolversParentTypes['SeapRecord']>, search: ResolversParentTypes['SeapSearch'] };
  SeapRecord: Omit<SeapRecord, 'authority' | 'cpv' | 'signals' | 'winners'> & { authority: ResolversParentTypes['Entity'], cpv?: Maybe<ResolversParentTypes['Cpv']>, signals: Array<ResolversParentTypes['Signal']>, winners: Array<ResolversParentTypes['Party']> };
  SeapRole: Omit<SeapRole, 'consortia' | 'largestRecords' | 'records' | 'signals'> & { consortia: Array<ResolversParentTypes['Consortium']>, largestRecords: Array<ResolversParentTypes['SeapRecord']>, records: ResolversParentTypes['SeapSearch'], signals: ResolversParentTypes['SignalPage'] };
  SeapSearch: Omit<SeapSearch, 'facets' | 'goTo' | 'records'> & { facets: ResolversParentTypes['RecordFacets'], goTo?: Maybe<ResolversParentTypes['Entity']>, records: ResolversParentTypes['RecordResultPage'] };
  Signal: Omit<Signal, 'authority' | 'numbers' | 'records' | 'suppliers'> & { authority: ResolversParentTypes['Entity'], numbers: ResolversParentTypes['SignalNumbers'], records: Array<ResolversParentTypes['SeapRecord']>, suppliers: Array<ResolversParentTypes['Entity']> };
  SignalNumbers: ResolversUnionTypes<ResolversParentTypes>['SignalNumbers'];
  SignalPage: Omit<SignalPage, 'rows'> & { rows: Array<ResolversParentTypes['Signal']> };
  SignalRule: SignalRule;
  SignedBani: Scalars['SignedBani']['output'];
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
  denominator?: Resolver<ResolversTypes['CoverageDenominator'], ParentType, ContextType>;
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

export type DonationSourceResolvers<ContextType = any, ParentType extends ResolversParentTypes['DonationSource'] = ResolversParentTypes['DonationSource']> = {
  datasetUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fetchedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  license?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  licenseUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  publisher?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  publisherUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  underlyingUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type EntityResolvers<ContextType = any, ParentType extends ResolversParentTypes['Entity'] = ResolversParentTypes['Entity']> = {
  aliases?: Resolver<Array<ResolversTypes['Alias']>, ParentType, ContextType>;
  anafStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cui?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  donations?: Resolver<Maybe<ResolversTypes['FirmDonations']>, ParentType, ContextType>;
  financials?: Resolver<Maybe<ResolversTypes['FinancialStatements']>, ParentType, ContextType>;
  foreignVatId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  identity?: Resolver<ResolversTypes['EntityIdentity'], ParentType, ContextType>;
  identityCurated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  leadership?: Resolver<Maybe<ResolversTypes['Leadership']>, ParentType, ContextType>;
  onrc?: Resolver<Maybe<ResolversTypes['OnrcRegistration']>, ParentType, ContextType>;
  placement?: Resolver<Maybe<ResolversTypes['Placement']>, ParentType, ContextType>;
  provenance?: Resolver<Array<ResolversTypes['Provenance']>, ParentType, ContextType>;
  publicEnterprise?: Resolver<Maybe<ResolversTypes['PublicEnterprise']>, ParentType, ContextType>;
  seap?: Resolver<ResolversTypes['SeapEntity'], ParentType, ContextType>;
};

export type EntityResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['EntityResult'] = ResolversParentTypes['EntityResult']> = {
  entity?: Resolver<ResolversTypes['Entity'], ParentType, ContextType>;
  matched?: Resolver<ResolversTypes['Total'], ParentType, ContextType>;
  signalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type FinancialSourceResolvers<ContextType = any, ParentType extends ResolversParentTypes['FinancialSource'] = ResolversParentTypes['FinancialSource']> = {
  datasetUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fetchedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  file?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fileUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  license?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  published?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  via?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type FinancialStatementsResolvers<ContextType = any, ParentType extends ResolversParentTypes['FinancialStatements'] = ResolversParentTypes['FinancialStatements']> = {
  years?: Resolver<Array<ResolversTypes['FinancialYear']>, ParentType, ContextType>;
};

export type FinancialYearResolvers<ContextType = any, ParentType extends ResolversParentTypes['FinancialYear'] = ResolversParentTypes['FinancialYear']> = {
  averageEmployees?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  awardShareOfTurnover?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  awardedInYear?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  debts?: Resolver<Maybe<ResolversTypes['SignedBani']>, ParentType, ContextType>;
  equity?: Resolver<Maybe<ResolversTypes['SignedBani']>, ParentType, ContextType>;
  fiscalYear?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  mayBeRevised?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  profitOrLoss?: Resolver<Maybe<ResolversTypes['SignedBani']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['FinancialRevision'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['FinancialSource'], ParentType, ContextType>;
  turnover?: Resolver<Maybe<ResolversTypes['SignedBani']>, ParentType, ContextType>;
};

export type FirmDonationResolvers<ContextType = any, ParentType extends ResolversParentTypes['FirmDonation'] = ResolversParentTypes['FirmDonation']> = {
  amount?: Resolver<ResolversTypes['Bani'], ParentType, ContextType>;
  date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  dateText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['DonationKind'], ParentType, ContextType>;
  party?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceRow?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type FirmDonationsResolvers<ContextType = any, ParentType extends ResolversParentTypes['FirmDonations'] = ResolversParentTypes['FirmDonations']> = {
  dataThroughYear?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  donationCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['FirmDonation']>, ParentType, ContextType>;
  loanCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['DonationSource'], ParentType, ContextType>;
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

export type LeadershipResolvers<ContextType = any, ParentType extends ResolversParentTypes['Leadership'] = ResolversParentTypes['Leadership']> = {
  gaps?: Resolver<Array<ResolversTypes['LeadershipGap']>, ParentType, ContextType>;
  mandates?: Resolver<Array<ResolversTypes['Mandate']>, ParentType, ContextType>;
  via?: Resolver<Maybe<ResolversTypes['LeadershipVia']>, ParentType, ContextType>;
};

export type LeadershipGapResolvers<ContextType = any, ParentType extends ResolversParentTypes['LeadershipGap'] = ResolversParentTypes['LeadershipGap']> = {
  endDate?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LeadershipGapKind'], ParentType, ContextType>;
  startDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
};

export type LeadershipViaResolvers<ContextType = any, ParentType extends ResolversParentTypes['LeadershipVia'] = ResolversParentTypes['LeadershipVia']> = {
  authority?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  authorityName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  snapshotDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  snapshots?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MandateResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mandate'] = ResolversParentTypes['Mandate']> = {
  basis?: Resolver<ResolversTypes['MandateBasis'], ParentType, ContextType>;
  dataThrough?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  electionDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  endDate?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  independent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  leaderName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  list?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  memberParties?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  startDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
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

export type OnrcAliasResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcAlias'] = ResolversParentTypes['OnrcAlias']> = {
  current?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  firstSeen?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  lastSeen?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sinceAtLeast?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type OnrcAreaCountResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcAreaCount'] = ResolversParentTypes['OnrcAreaCount']> = {
  area?: Resolver<ResolversTypes['MapArea'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  registrations?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type OnrcCaenResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcCaen'] = ResolversParentTypes['OnrcCaen']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type OnrcCountMapResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcCountMap'] = ResolversParentTypes['OnrcCountMap']> = {
  counties?: Resolver<Array<ResolversTypes['OnrcAreaCount']>, ParentType, ContextType>;
  unplacedRegistrations?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type OnrcCurrentStatusResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcCurrentStatus'] = ResolversParentTypes['OnrcCurrentStatus']> = {
  code?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type OnrcFilterEchoResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcFilterEcho'] = ResolversParentTypes['OnrcFilterEcho']> = {
  qFolded?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type OnrcMatchedFieldResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcMatchedField'] = ResolversParentTypes['OnrcMatchedField']> = {
  field?: Resolver<ResolversTypes['OnrcMatchableField'], ParentType, ContextType>;
  highlights?: Resolver<Array<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type OnrcQueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcQuery'] = ResolversParentTypes['OnrcQuery']> = {
  record?: Resolver<Maybe<ResolversTypes['OnrcRegistration']>, ParentType, ContextType, RequireFields<OnrcQueryRecordArgs, 'registrationNumber'>>;
  search?: Resolver<ResolversTypes['OnrcSearch'], ParentType, ContextType, RequireFields<OnrcQuerySearchArgs, 'filter'>>;
};

export type OnrcRegistrationResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcRegistration'] = ResolversParentTypes['OnrcRegistration']> = {
  aliases?: Resolver<Array<ResolversTypes['OnrcAlias']>, ParentType, ContextType>;
  caen?: Resolver<Array<ResolversTypes['OnrcCaen']>, ParentType, ContextType>;
  cui?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  entity?: Resolver<Maybe<ResolversTypes['Entity']>, ParentType, ContextType>;
  legalForm?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  provenance?: Resolver<ResolversTypes['Provenance'], ParentType, ContextType>;
  registrationDate?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  registrationNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  seat?: Resolver<ResolversTypes['OnrcSeat'], ParentType, ContextType>;
  snapshot?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  statuses?: Resolver<Array<ResolversTypes['OnrcStatus']>, ParentType, ContextType>;
};

export type OnrcResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcResult'] = ResolversParentTypes['OnrcResult']> = {
  caen?: Resolver<Array<ResolversTypes['OnrcCaen']>, ParentType, ContextType>;
  cui?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  entity?: Resolver<Maybe<ResolversTypes['Entity']>, ParentType, ContextType>;
  legalForm?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  matched?: Resolver<Array<ResolversTypes['OnrcMatchedField']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  registrationDate?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  registrationNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  seapCounterparty?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  seat?: Resolver<ResolversTypes['OnrcSeat'], ParentType, ContextType>;
  statuses?: Resolver<Array<ResolversTypes['OnrcCurrentStatus']>, ParentType, ContextType>;
};

export type OnrcResultPageResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcResultPage'] = ResolversParentTypes['OnrcResultPage']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rows?: Resolver<Array<ResolversTypes['OnrcResult']>, ParentType, ContextType>;
};

export type OnrcSearchResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcSearch'] = ResolversParentTypes['OnrcSearch']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  defaultTab?: Resolver<ResolversTypes['OnrcResultTab'], ParentType, ContextType>;
  filter?: Resolver<ResolversTypes['OnrcFilterEcho'], ParentType, ContextType>;
  map?: Resolver<ResolversTypes['OnrcCountMap'], ParentType, ContextType>;
  organisations?: Resolver<ResolversTypes['OnrcResultPage'], ParentType, ContextType, RequireFields<OnrcSearchOrganisationsArgs, 'limit' | 'offset'>>;
};

export type OnrcSeatResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcSeat'] = ResolversParentTypes['OnrcSeat']> = {
  address?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  county?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locality?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  postalCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type OnrcStatusResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnrcStatus'] = ResolversParentTypes['OnrcStatus']> = {
  code?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  firstSeen?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sinceAtLeast?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
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

export type PublicEnterpriseResolvers<ContextType = any, ParentType extends ResolversParentTypes['PublicEnterprise'] = ResolversParentTypes['PublicEnterprise']> = {
  fetchedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  firstYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  lastYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  license?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  listedAs?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  registrationNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  snapshot?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  via?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  counties?: Resolver<Array<ResolversTypes['County']>, ParentType, ContextType>;
  coverage?: Resolver<ResolversTypes['Coverage'], ParentType, ContextType, RequireFields<QueryCoverageArgs, 'source'>>;
  entity?: Resolver<Maybe<ResolversTypes['Entity']>, ParentType, ContextType, RequireFields<QueryEntityArgs, 'key'>>;
  onrc?: Resolver<ResolversTypes['OnrcQuery'], ParentType, ContextType>;
  referenceSources?: Resolver<Array<ResolversTypes['ReferenceSource']>, ParentType, ContextType>;
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

export type RecordPartyResolvers<ContextType = any, ParentType extends ResolversParentTypes['RecordParty'] = ResolversParentTypes['RecordParty']> = {
  basis?: Resolver<ResolversTypes['MandateBasis'], ParentType, ContextType>;
  dataThrough?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  electionDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  independent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  list?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  memberParties?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  via?: Resolver<Maybe<ResolversTypes['LeadershipVia']>, ParentType, ContextType>;
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

export type ReferenceSourceResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReferenceSource'] = ResolversParentTypes['ReferenceSource']> = {
  dataThrough?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  fiscalYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  party?: Resolver<Maybe<ResolversTypes['RecordParty']>, ParentType, ContextType>;
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

export interface SignedBaniScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['SignedBani'], any> {
  name: 'SignedBani';
}

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
  DonationSource?: DonationSourceResolvers<ContextType>;
  Entity?: EntityResolvers<ContextType>;
  EntityResult?: EntityResultResolvers<ContextType>;
  EntityResultPage?: EntityResultPageResolvers<ContextType>;
  FacetCount?: FacetCountResolvers<ContextType>;
  FinancialSource?: FinancialSourceResolvers<ContextType>;
  FinancialStatements?: FinancialStatementsResolvers<ContextType>;
  FinancialYear?: FinancialYearResolvers<ContextType>;
  FirmDonation?: FirmDonationResolvers<ContextType>;
  FirmDonations?: FirmDonationsResolvers<ContextType>;
  FrameworkLink?: FrameworkLinkResolvers<ContextType>;
  FrameworkOverrunNumbers?: FrameworkOverrunNumbersResolvers<ContextType>;
  FrameworkSummary?: FrameworkSummaryResolvers<ContextType>;
  GapCell?: GapCellResolvers<ContextType>;
  Leadership?: LeadershipResolvers<ContextType>;
  LeadershipGap?: LeadershipGapResolvers<ContextType>;
  LeadershipVia?: LeadershipViaResolvers<ContextType>;
  Mandate?: MandateResolvers<ContextType>;
  MapArea?: GraphQLScalarType;
  MatchedField?: MatchedFieldResolvers<ContextType>;
  MoneyMap?: MoneyMapResolvers<ContextType>;
  MonthTotal?: MonthTotalResolvers<ContextType>;
  NoPublicationNumbers?: NoPublicationNumbersResolvers<ContextType>;
  OnrcAlias?: OnrcAliasResolvers<ContextType>;
  OnrcAreaCount?: OnrcAreaCountResolvers<ContextType>;
  OnrcCaen?: OnrcCaenResolvers<ContextType>;
  OnrcCountMap?: OnrcCountMapResolvers<ContextType>;
  OnrcCurrentStatus?: OnrcCurrentStatusResolvers<ContextType>;
  OnrcFilterEcho?: OnrcFilterEchoResolvers<ContextType>;
  OnrcMatchedField?: OnrcMatchedFieldResolvers<ContextType>;
  OnrcQuery?: OnrcQueryResolvers<ContextType>;
  OnrcRegistration?: OnrcRegistrationResolvers<ContextType>;
  OnrcResult?: OnrcResultResolvers<ContextType>;
  OnrcResultPage?: OnrcResultPageResolvers<ContextType>;
  OnrcSearch?: OnrcSearchResolvers<ContextType>;
  OnrcSeat?: OnrcSeatResolvers<ContextType>;
  OnrcStatus?: OnrcStatusResolvers<ContextType>;
  OverCapNumbers?: OverCapNumbersResolvers<ContextType>;
  Party?: PartyResolvers<ContextType>;
  Period?: PeriodResolvers<ContextType>;
  Placement?: PlacementResolvers<ContextType>;
  Provenance?: ProvenanceResolvers<ContextType>;
  PublicEnterprise?: PublicEnterpriseResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RecordFacets?: RecordFacetsResolvers<ContextType>;
  RecordFilterEcho?: RecordFilterEchoResolvers<ContextType>;
  RecordFilterValue?: RecordFilterValueResolvers<ContextType>;
  RecordParty?: RecordPartyResolvers<ContextType>;
  RecordResult?: RecordResultResolvers<ContextType>;
  RecordResultPage?: RecordResultPageResolvers<ContextType>;
  ReferenceSource?: ReferenceSourceResolvers<ContextType>;
  SeapEntity?: SeapEntityResolvers<ContextType>;
  SeapQuery?: SeapQueryResolvers<ContextType>;
  SeapRecord?: SeapRecordResolvers<ContextType>;
  SeapRole?: SeapRoleResolvers<ContextType>;
  SeapSearch?: SeapSearchResolvers<ContextType>;
  Signal?: SignalResolvers<ContextType>;
  SignalNumbers?: SignalNumbersResolvers<ContextType>;
  SignalPage?: SignalPageResolvers<ContextType>;
  SignalRule?: SignalRuleResolvers<ContextType>;
  SignedBani?: GraphQLScalarType;
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

