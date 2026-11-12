// Shared prop types for the domain displays, taken from the generated contract.
import type {
  DataThroughFieldsFragment, EntityRefFragment, MainScreenQuery, ZoomedCountyQuery, EntityResultPageFieldsFragment, EntityRowFieldsFragment, PartyFieldsFragment,
  MoneyMapFieldsFragment, RecordBadge, RecordResultFieldsFragment, RecordRowFieldsFragment, TotalFieldsFragment,
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
/** The zoomed county's UAT map: `seap.search.uatMap(county:)`, authority side only. */
export type UatMap = ZoomedCountyQuery["seap"]["search"]["uatMap"];
/** A UAT's SIRUTA code: what a click on the zoomed county emits (the `RecordFilter.uat` value). */
export type Siruta = string;
