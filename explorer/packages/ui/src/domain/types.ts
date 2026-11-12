// Shared prop types for the domain displays, taken from the generated contract.
import type {
  DataThroughFieldsFragment, EntityHeaderFieldsFragment, EntityRefFragment, PartyFieldsFragment, RecordBadge, Role, TotalFieldsFragment,
} from "@grivei/contract";

/** Integer bani (1/100 RON) as a decimal string. */
export type { RecordBadge };
export type Total = TotalFieldsFragment;
export type Bani = Total["awarded"];
export type EntityRef = EntityRefFragment;
export type Party = PartyFieldsFragment;
export type DataThrough = DataThroughFieldsFragment["dataThrough"][number];

/** What an Entity page's header shows (`EntityHeaderFields`). */
export type EntityHeaderData = EntityHeaderFieldsFragment;
/** The role an Entity page shows: the URL's /authority/ or /supplier/. */
export type EntityRole = Role;
/** The three tabs of an Entity page; each has its own URL. */
export type EntityPageView = "overview" | "records" | "relationships";
