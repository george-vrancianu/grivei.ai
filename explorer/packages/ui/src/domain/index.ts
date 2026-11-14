// Domain displays: presentational pieces typed from the contract (atoms), the few that compose them (molecules),
// and self-contained regions of a screen (organisms).
export * from "./atoms/index.ts";
export * from "./molecules/index.ts";
export * from "./organisms/index.ts";
export * from "./templates/index.ts";
export type { OnrcCountMapData, OnrcResultData, OnrcSearchData, SnapshotCellData, CoveragePageData, GapCellData, GapRule, GapState, EntityAliases, EntityHeaderData, EntityOverviewData, EntityPageRole, FinancialStatementsData, FinancialYearData, FirmDonationsData, FirmDonationData, DonationSourceData, OnrcRegistrationData, OrganisationPeopleData, PersonPageData, LeadershipData, PublicEnterpriseData, RecordPartyData, EntityPageView, RecordPageData, RecordsTabData, RelationshipsCounterparties, RelationshipsData, RelationshipsCounterparty, RelationshipsTimeline, CounterpartyRecordsData, SignalData, SignalRule, SignalRuleBaseRateData } from "./types.ts";
export { METHODOLOGY_ANCHORS, METHODOLOGY_SECTIONS, allMethodologyAnchors, signalAnchor, type MethodologySectionKey } from "./utils/methodologyAnchors.ts";
export { followLink } from "./utils/followLink.ts";
export {
  FORBIDDEN_STEMS, SIGNAL_RULES, forbiddenWords, ruleTexts, signalNumberTexts, signalSentence,
  type SignalNumberTexts, type SignalRuleCopy, type SignalRulesCopy,
} from "./utils/signalWording.ts";
export { pageSx } from "./utils/pageSx.ts";
