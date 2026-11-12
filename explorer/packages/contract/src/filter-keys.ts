import type { RecordFilter } from "./generated/operations.ts";

export type UrlEncoding =
  | "text"       // free text, as typed
  | "date"       // YYYY-MM-DD
  | "enum"       // the enum value, lower-cased with hyphens: DIRECT_PURCHASE -> direct-purchase
  | "boolean"    // written as true or false; unset means no filter
  | "key"        // an entity key (CUI, vat-<id>, name-<slug>)
  | "prefix"     // a CPV prefix
  | "map-area"   // RO-BV, NATIONAL, UNPLACED, UNKNOWN_SUPPLIER_COUNTY, as the API names them
  | "siruta";    // a UAT's SIRUTA code

export interface UrlKeySpec {
  /** The query-string key. */
  key: string;
  encoding: UrlEncoding;
  /** True when the key may appear several times (one per list item). */
  repeatable: boolean;
}

/**
 * The URL search state, one entry per `RecordFilter` field (the codec of #42 consumes this).
 * Every field has a key and every filter key is a field; contract tests enforce both.
 * Keys equal the field names so the mapping stays one-to-one and readable in citations:
 *   /explore/authority/<key>/records?signal=splitting&supplier=<key>&cpv=301&from=2024-01-01&to=2024-12-31
 * A field left at its default (countySide = authority) or unset is omitted from the URL. Booleans are the exception to
 * "true when present": `hasSignals=false` is a distinct, citable value (it filters to Records without Signals) and
 * round-trips as written, so only `true` and `false` decode and anything else is ignored.
 */
export const RECORD_FILTER_URL = {
  q: { key: "q", encoding: "text", repeatable: false },
  from: { key: "from", encoding: "date", repeatable: false },
  to: { key: "to", encoding: "date", repeatable: false },
  channel: { key: "channel", encoding: "enum", repeatable: false },
  valueBucket: { key: "valueBucket", encoding: "enum", repeatable: false },
  hasSignals: { key: "hasSignals", encoding: "boolean", repeatable: false },
  badges: { key: "badges", encoding: "enum", repeatable: true },
  procedure: { key: "procedure", encoding: "text", repeatable: true },
  county: { key: "county", encoding: "map-area", repeatable: false },
  uat: { key: "uat", encoding: "siruta", repeatable: false },
  countySide: { key: "countySide", encoding: "enum", repeatable: false },
  authority: { key: "authority", encoding: "key", repeatable: false },
  supplier: { key: "supplier", encoding: "key", repeatable: false },
  cpv: { key: "cpv", encoding: "prefix", repeatable: false },
  signal: { key: "signal", encoding: "enum", repeatable: false },
} as const satisfies Record<keyof RecordFilter, UrlKeySpec>;

/**
 * URL state that is not part of `RecordFilter`: which result tab / entity tab is open,
 * which page of it, and how its rows are sorted (`order`: RecordOrder on Records lists;
 * `signalOrder`: SignalOrder on the entity Overview). They shape the view, not the
 * matching set, but a citation must reproduce them. Signal paging is not citable.
 */
export const URL_ONLY_KEYS = { tab: "tab", page: "page", order: "order", signalOrder: "signalOrder" } as const;
