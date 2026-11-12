// Shared prop types for the domain displays, taken from the generated contract.
import type {
  DataThroughFieldsFragment, EntityRefFragment, PartyFieldsFragment, RecordBadge, TotalFieldsFragment,
} from "@grivei/contract";

/** Integer bani (1/100 RON) as a decimal string. */
export type Bani = string;
export type { RecordBadge };
export type Total = TotalFieldsFragment;
export type EntityRef = EntityRefFragment;
export type Party = PartyFieldsFragment;
export type DataThrough = DataThroughFieldsFragment["dataThrough"][number];
