import type { RecordOrder } from "@grivei/contract";

export type { RecordOrder };

/** The orders a list of Records can have, in the order the select offers them. The first is the API's default. */
export const RECORD_ORDERS: readonly RecordOrder[] = ["VALUE_DESC", "DATE_DESC", "DATE_ASC"];
export const DEFAULT_RECORD_ORDER: RecordOrder = "VALUE_DESC";
