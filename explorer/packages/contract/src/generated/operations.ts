/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Channel =
  | 'CONTRACT'
  | 'DIRECT_PURCHASE';

export type CountySide =
  | 'AUTHORITY'
  | 'SUPPLIER';

export type CoverageStatus =
  | 'HARVESTED'
  | 'HARVESTED_WITH_KNOWN_GAPS'
  | 'NOT_HARVESTED'
  | 'PARTIAL';

export type DateRange = {
  from?: string | null | undefined;
  to?: string | null | undefined;
};

export type EntityIdentity =
  | 'CUI'
  | 'NAME_ONLY';

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

/** How we obtained it: from a published bulk file, by crawling the Source's own site, or from its API (ANAF's VAT endpoint). */
export type ProvenanceKind =
  | 'API'
  | 'BULK'
  | 'CRAWL';

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

/**
 * The whole search state, shared by the main screen, the full-results view,
 * the Records tab and every Signal's reproducing URL. The frontend owns a
 * 1:1 codec between this and the query string; the server never sees a URL.
 */
export type RecordFilter = {
  authority?: string | number | null | undefined;
  badges?: Array<RecordBadge> | null | undefined;
  channel?: Channel | null | undefined;
  county?: string | null | undefined;
  countySide?: CountySide | null | undefined;
  cpv?: string | null | undefined;
  from?: string | null | undefined;
  hasSignals?: boolean | null | undefined;
  procedure?: Array<string> | null | undefined;
  q?: string | null | undefined;
  signal?: SignalRuleSlug | null | undefined;
  supplier?: string | number | null | undefined;
  to?: string | null | undefined;
  uat?: string | null | undefined;
  valueBucket?: ValueBucket | null | undefined;
};

export type RecordOrder =
  | 'DATE_ASC'
  | 'DATE_DESC'
  | 'VALUE_DESC';

export type Role =
  | 'AUTHORITY'
  | 'SUPPLIER';

export type SeapRecordKind =
  | 'AWARD_NOTICE'
  | 'CONTRACT'
  | 'DA'
  | 'DAN';

export type SignalOrder =
  | 'DATE_DESC'
  | 'VALUE_DESC';

export type SignalRuleSlug =
  | 'FRAMEWORK_OVERRUN'
  | 'NO_PUBLICATION'
  | 'OVER_CAP'
  | 'SPLITTING';

export type SourceId =
  | 'ANAF'
  | 'ANI'
  | 'JUST'
  | 'MFINANTE'
  | 'ONRC'
  | 'SEAP';

export type SuspectRule =
  | 'CONTRACT_100X_ESTIMATE'
  | 'CONTRACT_OVER_50BN'
  | 'DIRECT_PURCHASE_10X_CAP';

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

export type CoverageLensQueryVariables = Exact<{
  window?: DateRange | null | undefined;
}>;


export type CoverageLensQuery = { sources: Array<{ id: SourceId, name: string, harvested: boolean, dataThrough: Array<{ kind: string, date: string }> }>, coverage: { window: { from: string | null, to: string | null }, counties: Array<{ county: string, status: CoverageStatus, withRecords: number, publicEntities: number, otherAuthorities: number }>, unplacedAuthorities: { authorities: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } } } };

export type CoveragePageQueryVariables = Exact<{
  window?: DateRange | null | undefined;
}>;


export type CoveragePageQuery = { sources: Array<{ id: SourceId, name: string, harvested: boolean, dataThrough: Array<{ kind: string, date: string }> }>, coverage: { referenceSnapshot: string | null, window: { from: string | null, to: string | null }, counties: Array<{ county: string, status: CoverageStatus, withRecords: number, publicEntities: number, otherAuthorities: number }>, grid: Array<{ quarter: string, kind: string, state: GapState, rule: GapRule | null, note: string | null, records: number, crawlOnly: number, dataThrough: string | null }>, unplacedAuthorities: { authorities: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } } } };

export type EntityOverviewQueryVariables = Exact<{
  key: string | number;
  role: Role;
  filter?: RecordFilter | null | undefined;
  signalOrder?: SignalOrder | null | undefined;
  signalOffset?: number | null | undefined;
}>;


export type EntityOverviewQuery = { entity: { cui: string | null, foreignVatId: string | null, identityCurated: boolean, anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, seap: { roles: Array<Role>, role: { role: Role, directPurchaseShare: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, counterparties: { count: number, topShare: number | null, rows: Array<{ naturalPerson: boolean, entity: { key: string, displayName: string, identity: EntityIdentity } | null, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }> }, procedures: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, consortia: Array<{ members: Array<{ naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null }>, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, frameworks: { count: number, ceilings: string, subsequentReported: string }, largestRecords: Array<{ code: string, title: string, date: string | null, kind: SeapRecordKind, channel: Channel, procedure: string | null, value: string | null, counted: string | null, badges: Array<RecordBadge>, authority: { key: string, displayName: string, identity: EntityIdentity }, winners: Array<{ naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null }>, signals: Array<{ rule: SignalRuleSlug, date: string, numbers:
              | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
              | { __typename: 'NoPublicationNumbers', procedure: string }
              | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
              | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
            , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } }> }>, signals: { count: number, rows: Array<{ rule: SignalRuleSlug, date: string, firstDate: string, recordCount: number, dataThrough: string, records: Array<{ code: string, provenance: { url: string | null } }>, authority: { key: string, displayName: string, identity: EntityIdentity }, suppliers: Array<{ key: string, displayName: string, identity: EntityIdentity }>, numbers:
              | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
              | { __typename: 'NoPublicationNumbers', procedure: string }
              | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
              | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
            , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } }> } } | null }, aliases: Array<{ name: string, records: number, first: string, last: string, differsFromAnaf: boolean }>, provenance: Array<{ source: SourceId, url: string | null, via: string | null, kind: ProvenanceKind, fetchedAt: string }>, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null } | null };

export type EntityRecordsQueryVariables = Exact<{
  key: string | number;
  role: Role;
  filter: RecordFilter;
  limit: number;
  offset: number;
  order?: RecordOrder | null | undefined;
}>;


export type EntityRecordsQuery = { entity: { cui: string | null, foreignVatId: string | null, identityCurated: boolean, anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, seap: { roles: Array<Role>, role: { role: Role, records: { total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, facets: { channel: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, procedure: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, year: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, signal: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, badge: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, counterparty: Array<{ entity: { key: string, displayName: string, identity: EntityIdentity }, matched: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }> }, records: { count: number, rows: Array<{ record: { code: string, title: string, date: string | null, kind: SeapRecordKind, channel: Channel, procedure: string | null, value: string | null, counted: string | null, badges: Array<RecordBadge>, authority: { key: string, displayName: string, identity: EntityIdentity }, winners: Array<{ naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null }>, signals: Array<{ rule: SignalRuleSlug, date: string, numbers:
                    | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
                    | { __typename: 'NoPublicationNumbers', procedure: string }
                    | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
                    | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
                  , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } }> }, matchedField: { field: MatchableField, text: string, highlights: Array<Array<number>> } | null }> } } } | null }, aliases: Array<{ name: string, records: number, first: string, last: string, differsFromAnaf: boolean }>, provenance: Array<{ source: SourceId, url: string | null, via: string | null, kind: ProvenanceKind, fetchedAt: string }>, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null } | null };

export type EntityRelationshipsQueryVariables = Exact<{
  key: string | number;
  role: Role;
  filter?: RecordFilter | null | undefined;
  counterparty?: string | number | null | undefined;
}>;


export type EntityRelationshipsQuery = { entity: { cui: string | null, foreignVatId: string | null, identityCurated: boolean, anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, seap: { roles: Array<Role>, role: { role: Role, counterparties: { count: number, topShare: number | null, rows: Array<{ naturalPerson: boolean, wonTogether: boolean, hasSignals: boolean, entity: { key: string, displayName: string, identity: EntityIdentity } | null, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, viaDirectPurchase: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, viaContract: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }> }, timeline: Array<{ month: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, flow: { side: CountySide, counties: Array<{ area: string, name: string, entities: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, national: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, unplaced: { authorities: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } } | null, unknownSupplierCounty: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } | null } } | null }, aliases: Array<{ name: string, records: number, first: string, last: string, differsFromAnaf: boolean }>, provenance: Array<{ source: SourceId, url: string | null, via: string | null, kind: ProvenanceKind, fetchedAt: string }>, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null } | null };

export type TotalFieldsFragment = { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean };

export type EntityRefFragment = { key: string, displayName: string, identity: EntityIdentity };

export type EntityRowFieldsFragment = { anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null };

export type PartyFieldsFragment = { naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null };

export type ProvenanceFieldsFragment = { source: SourceId, url: string | null, via: string | null, kind: ProvenanceKind, fetchedAt: string };

export type RecordRowFieldsFragment = { code: string, title: string, date: string | null, kind: SeapRecordKind, channel: Channel, procedure: string | null, value: string | null, counted: string | null, badges: Array<RecordBadge>, authority: { key: string, displayName: string, identity: EntityIdentity }, winners: Array<{ naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null }>, signals: Array<{ rule: SignalRuleSlug, date: string, numbers:
      | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
      | { __typename: 'NoPublicationNumbers', procedure: string }
      | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
      | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
    , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } }> };

type SignalNumbersFields_FrameworkOverrunNumbers_Fragment = { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number };

type SignalNumbersFields_NoPublicationNumbers_Fragment = { __typename: 'NoPublicationNumbers', procedure: string };

type SignalNumbersFields_OverCapNumbers_Fragment = { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number };

type SignalNumbersFields_SplittingNumbers_Fragment = { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string };

export type SignalNumbersFieldsFragment =
  | SignalNumbersFields_FrameworkOverrunNumbers_Fragment
  | SignalNumbersFields_NoPublicationNumbers_Fragment
  | SignalNumbersFields_OverCapNumbers_Fragment
  | SignalNumbersFields_SplittingNumbers_Fragment
;

export type SignalBadgeFieldsFragment = { rule: SignalRuleSlug, date: string, numbers:
    | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
    | { __typename: 'NoPublicationNumbers', procedure: string }
    | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
    | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
  , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } };

export type SignalFieldsFragment = { rule: SignalRuleSlug, date: string, firstDate: string, recordCount: number, dataThrough: string, authority: { key: string, displayName: string, identity: EntityIdentity }, suppliers: Array<{ key: string, displayName: string, identity: EntityIdentity }>, numbers:
    | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
    | { __typename: 'NoPublicationNumbers', procedure: string }
    | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
    | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
  , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } };

export type MoneyMapFieldsFragment = { side: CountySide, counties: Array<{ area: string, name: string, entities: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, national: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, unplaced: { authorities: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } } | null, unknownSupplierCounty: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } | null };

export type DataThroughFieldsFragment = { id: SourceId, name: string, harvested: boolean, dataThrough: Array<{ kind: string, date: string }> };

export type RecordFacetsFieldsFragment = { channel: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, procedure: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, year: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, signal: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, badge: Array<{ value: string, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, counterparty: Array<{ entity: { key: string, displayName: string, identity: EntityIdentity }, matched: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }> };

export type EntityHeaderFieldsFragment = { cui: string | null, foreignVatId: string | null, identityCurated: boolean, anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, aliases: Array<{ name: string, records: number, first: string, last: string, differsFromAnaf: boolean }>, provenance: Array<{ source: SourceId, url: string | null, via: string | null, kind: ProvenanceKind, fetchedAt: string }>, seap: { roles: Array<Role> }, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null };

export type EntityResultPageFieldsFragment = { count: number, countEstimated: boolean, rows: Array<{ entity: { anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null }, matched: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }> };

export type RecordResultFieldsFragment = { count: number, rows: Array<{ record: { code: string, title: string, date: string | null, kind: SeapRecordKind, channel: Channel, procedure: string | null, value: string | null, counted: string | null, badges: Array<RecordBadge>, authority: { key: string, displayName: string, identity: EntityIdentity }, winners: Array<{ naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null }>, signals: Array<{ rule: SignalRuleSlug, date: string, numbers:
          | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
          | { __typename: 'NoPublicationNumbers', procedure: string }
          | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
          | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
        , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } }> }, matchedField: { field: MatchableField, text: string, highlights: Array<Array<number>> } | null }> };

export type FullResultsAuthoritiesQueryVariables = Exact<{
  filter: RecordFilter;
  limit: number;
  offset: number;
}>;


export type FullResultsAuthoritiesQuery = { seap: { search: { total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, authorities: { count: number, countEstimated: boolean, rows: Array<{ entity: { anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null }, matched: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }> } } } };

export type FullResultsSuppliersQueryVariables = Exact<{
  filter: RecordFilter;
  limit: number;
  offset: number;
}>;


export type FullResultsSuppliersQuery = { seap: { search: { total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, suppliers: { count: number, countEstimated: boolean, rows: Array<{ entity: { anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null }, matched: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }> } } } };

export type FullResultsRecordsQueryVariables = Exact<{
  filter: RecordFilter;
  limit: number;
  offset: number;
  order?: RecordOrder | null | undefined;
}>;


export type FullResultsRecordsQuery = { seap: { search: { total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, records: { count: number, rows: Array<{ record: { code: string, title: string, date: string | null, kind: SeapRecordKind, channel: Channel, procedure: string | null, value: string | null, counted: string | null, badges: Array<RecordBadge>, authority: { key: string, displayName: string, identity: EntityIdentity }, winners: Array<{ naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null }>, signals: Array<{ rule: SignalRuleSlug, date: string, numbers:
                | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
                | { __typename: 'NoPublicationNumbers', procedure: string }
                | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
                | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
              , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } }> }, matchedField: { field: MatchableField, text: string, highlights: Array<Array<number>> } | null }> } } } };

export type MainScreenQueryVariables = Exact<{
  filter: RecordFilter;
}>;


export type MainScreenQuery = { sources: Array<{ id: SourceId, name: string, harvested: boolean, dataThrough: Array<{ kind: string, date: string }> }>, seap: { search: { filter: { qFolded: string | null, authority: { key: string, displayName: string, identity: EntityIdentity } | null, supplier: { key: string, displayName: string, identity: EntityIdentity } | null }, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, map: { side: CountySide, counties: Array<{ area: string, name: string, entities: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, national: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, unplaced: { authorities: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } } | null, unknownSupplierCounty: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } | null }, goTo: { key: string, displayName: string, identity: EntityIdentity, seap: { roles: Array<Role> } } | null, facets: { procedure: Array<{ value: string }> }, authorities: { count: number, countEstimated: boolean, rows: Array<{ entity: { anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null }, matched: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }> }, suppliers: { count: number, countEstimated: boolean, rows: Array<{ entity: { anafStatus: string | null, key: string, displayName: string, identity: EntityIdentity, placement: { national: boolean, placedBy: SourceId, county: { code: string, name: string } | null, uat: { siruta: string, name: string } | null } | null }, matched: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }> }, records: { count: number, rows: Array<{ record: { code: string, title: string, date: string | null, kind: SeapRecordKind, channel: Channel, procedure: string | null, value: string | null, counted: string | null, badges: Array<RecordBadge>, authority: { key: string, displayName: string, identity: EntityIdentity }, winners: Array<{ naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null }>, signals: Array<{ rule: SignalRuleSlug, date: string, numbers:
                | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
                | { __typename: 'NoPublicationNumbers', procedure: string }
                | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
                | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
              , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } }> }, matchedField: { field: MatchableField, text: string, highlights: Array<Array<number>> } | null }> } } } };

export type ZoomedCountyQueryVariables = Exact<{
  filter: RecordFilter;
  county: string;
}>;


export type ZoomedCountyQuery = { uats: Array<{ siruta: string, name: string, county: { code: string, name: string } }>, seap: { search: { total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean }, uatMap: { uats: Array<{ area: string, name: string, entities: number, total: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } }>, unknownUat: { awarded: string, records: number, suspectLeftOut: number, noValue: number, frameworkCeilings: string, estimated: boolean } | null } } } };

export type MethodologyBaseRatesQueryVariables = Exact<{ [key: string]: never; }>;


export type MethodologyBaseRatesQuery = { signalRules: Array<{ slug: SignalRuleSlug, baseRate: number, baseRateYear: number, dataThrough: string, window: { from: string | null, to: string | null } }> };

export type RecordPageQueryVariables = Exact<{
  code: string | number;
}>;


export type RecordPageQuery = { seap: { record: { code: string, title: string, date: string | null, kind: SeapRecordKind, channel: Channel, procedure: string | null, contractType: string | null, value: string | null, counted: string | null, badges: Array<RecordBadge>, authority: { key: string, displayName: string, identity: EntityIdentity }, winners: Array<{ naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null }>, cpv: { code: string, description: string } | null, suspect: { rule: SuspectRule, threshold: string | null } | null, provenance: { source: SourceId, url: string | null, via: string | null, kind: ProvenanceKind, fetchedAt: string }, framework: { ceiling: string | null, subsequentReported: string, ratio: number | null, agreement: { code: string, title: string } | null, subsequent: Array<{ code: string, title: string, date: string | null, kind: SeapRecordKind, channel: Channel, procedure: string | null, value: string | null, counted: string | null, badges: Array<RecordBadge>, authority: { key: string, displayName: string, identity: EntityIdentity }, winners: Array<{ naturalPerson: boolean, publishedName: string | null, share: string | null, entity: { key: string, displayName: string, identity: EntityIdentity } | null }>, signals: Array<{ rule: SignalRuleSlug, date: string, numbers:
              | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
              | { __typename: 'NoPublicationNumbers', procedure: string }
              | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
              | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
            , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } }> }> } | null, signals: Array<{ rule: SignalRuleSlug, date: string, firstDate: string, recordCount: number, dataThrough: string, records: Array<{ code: string, title: string, date: string | null, value: string | null, counted: string | null, badges: Array<RecordBadge> }>, authority: { key: string, displayName: string, identity: EntityIdentity }, suppliers: Array<{ key: string, displayName: string, identity: EntityIdentity }>, numbers:
          | { __typename: 'FrameworkOverrunNumbers', ceiling: string, subsequent: string, ratio: number }
          | { __typename: 'NoPublicationNumbers', procedure: string }
          | { __typename: 'OverCapNumbers', value: string, cap: string, multiple: number }
          | { __typename: 'SplittingNumbers', purchases: number, sum: string, cap: string, cpvGroup: string, from: string, to: string }
        , reproduce: { authority: string | null, supplier: string | null, signal: SignalRuleSlug | null, cpv: string | null, from: string | null, to: string | null } }> } | null } };
