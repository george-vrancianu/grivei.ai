import allowlist from "@grivei/contract/persisted-queries.json";
import type {
  CoverageLensQuery, CoverageLensQueryVariables, CoveragePageQuery, CoveragePageQueryVariables, EntityOverviewQuery, EntityOverviewQueryVariables, EntityRecordsQuery, EntityRecordsQueryVariables,
  EntityRelationshipsQuery, FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables, FullResultsRecordsQuery,
  FullResultsRecordsQueryVariables, FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables,
  EntityRelationshipsQueryVariables, MainScreenQuery, MainScreenQueryVariables, MethodologyBaseRatesQuery, MethodologyBaseRatesQueryVariables, MethodologyReferenceSourcesQuery, MethodologyReferenceSourcesQueryVariables, PersonPageQuery, PersonPageQueryVariables, RecordPageQuery, RecordPageQueryVariables,
  ZoomedCountyQuery, ZoomedCountyQueryVariables,
} from "@grivei/contract";
import type { OnrcCoverageQuery, OnrcCoverageQueryVariables, OnrcSearchQuery, OnrcSearchQueryVariables } from "@grivei/contract";

/** Typed registry of the persisted operations the app sends: the name, its id on the allowlist, its result and variables. */
export interface Operation<Data, Variables> {
  readonly name: string;
  readonly id: string;
  /** Phantom fields carrying the types; never read. */
  readonly types?: { data: Data; variables: Variables };
}

function operation<Data, Variables>(name: string): Operation<Data, Variables> {
  const found = allowlist.operations.find((o) => o.name === name);
  if (!found) throw new Error(`${name} is not on the persisted-query allowlist (run codegen in packages/contract)`);
  return { name, id: found.sha256 };
}

export const MainScreen = operation<MainScreenQuery, MainScreenQueryVariables>("MainScreen");
export const EntityOverview = operation<EntityOverviewQuery, EntityOverviewQueryVariables>("EntityOverview");
export const EntityRecords = operation<EntityRecordsQuery, EntityRecordsQueryVariables>("EntityRecords");
export const EntityRelationships = operation<EntityRelationshipsQuery, EntityRelationshipsQueryVariables>("EntityRelationships");
export const FullResultsAuthorities = operation<FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables>("FullResultsAuthorities");
export const FullResultsSuppliers = operation<FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables>("FullResultsSuppliers");
export const FullResultsRecords = operation<FullResultsRecordsQuery, FullResultsRecordsQueryVariables>("FullResultsRecords");
export const PersonPage = operation<PersonPageQuery, PersonPageQueryVariables>("PersonPage");
export const RecordPage = operation<RecordPageQuery, RecordPageQueryVariables>("RecordPage");
export const ZoomedCounty = operation<ZoomedCountyQuery, ZoomedCountyQueryVariables>("ZoomedCounty");
export const CoverageLens = operation<CoverageLensQuery, CoverageLensQueryVariables>("CoverageLens");
export const CoveragePage = operation<CoveragePageQuery, CoveragePageQueryVariables>("CoveragePage");
export const MethodologyBaseRates = operation<MethodologyBaseRatesQuery, MethodologyBaseRatesQueryVariables>("MethodologyBaseRates");
export const MethodologyReferenceSources = operation<MethodologyReferenceSourcesQuery, MethodologyReferenceSourcesQueryVariables>("MethodologyReferenceSources");
export const OnrcSearch = operation<OnrcSearchQuery, OnrcSearchQueryVariables>("OnrcSearch");
export const OnrcCoverage = operation<OnrcCoverageQuery, OnrcCoverageQueryVariables>("OnrcCoverage");
