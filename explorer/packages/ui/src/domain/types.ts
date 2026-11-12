// Shared prop types for the domain displays, taken from the generated contract.
import type {
  DataThroughFieldsFragment, EntityRefFragment, EntityResultPageFieldsFragment, EntityRowFieldsFragment, PartyFieldsFragment,
  RecordBadge, RecordResultFieldsFragment, RecordRowFieldsFragment, TotalFieldsFragment,
} from "@grivei/contract";

/** Integer bani (1/100 RON) as a decimal string. */
export type { RecordBadge };
export type Total = TotalFieldsFragment;
export type Bani = Total["awarded"];
export type EntityRef = EntityRefFragment;
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
