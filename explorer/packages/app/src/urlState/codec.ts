import { RECORD_FILTER_URL, URL_ONLY_KEYS, type RecordFilter, type RecordOrder, type SignalOrder, type UrlEncoding, type UrlKeySpec } from "@grivei/contract";

/**
 * The URL search state: the `RecordFilter` plus what shapes the view without changing the matching set.
 * The query string is the citable form of this, so `encode(decode(q)) === q` for every canonical query string.
 */
export interface UrlState {
  filter: RecordFilter;
  /** Which result tab or entity tab is open (the values belong to the pages; the codec keeps them as written). */
  tab?: string;
  /** 1-based page of the open list; 1 is the default and is left out of the URL. */
  page?: number;
  /** `RecordOrder` of a Records list, e.g. `VALUE_DESC`. */
  order?: RecordOrder;
  /** `SignalOrder` of the Signals list. */
  signalOrder?: SignalOrder;
  /** The main screen's map lens as written (`coverage`); the default, `money`, is left out of the URL. */
  lens?: string;
}

export const EMPTY_URL_STATE: UrlState = { filter: {} };

/** The one default a `RecordFilter` field has: the Money lens counts the authority's county unless asked otherwise. */
const DEFAULTS: Partial<Record<keyof RecordFilter, string>> = { countySide: "AUTHORITY" };

/** The map lens the URL leaves out. Mirrors `DEFAULT_MAP_LENS` of the UI library, which the codec does not import. */
const DEFAULT_LENS = "money";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PATTERNS: Record<Exclude<UrlEncoding, "boolean" | "enum" | "text">, RegExp> = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  key: /^\S+$/,
  prefix: /^\d+$/,
  "map-area": /^[A-Z][A-Z0-9_-]*$/,
  siruta: /^\d+$/,
};

/** DIRECT_PURCHASE -> direct-purchase */
export const enumToUrl = (value: string): string => value.toLowerCase().replaceAll("_", "-");
/** direct-purchase -> DIRECT_PURCHASE; null when it is not shaped like an enum slug. */
export const enumFromUrl = (text: string): string | null => (SLUG.test(text) ? text.toUpperCase().replaceAll("-", "_") : null);

/** One URL value into the filter's value, or null when it is malformed (a malformed value is ignored, never sent to the API). */
function decodeValue(encoding: UrlEncoding, text: string): string | boolean | null {
  switch (encoding) {
    case "text":
      return text === "" ? null : text;
    case "boolean":
      return text === "true" ? true : text === "false" ? false : null;
    case "enum":
      return enumFromUrl(text);
    case "date":
    case "key":
    case "prefix":
    case "map-area":
    case "siruta":
      return PATTERNS[encoding].test(text) ? text : null;
  }
}

function encodeValue(encoding: UrlEncoding, value: string | number | boolean): string {
  return encoding === "enum" ? enumToUrl(String(value)) : String(value);
}

const FIELDS = Object.entries(RECORD_FILTER_URL) as [keyof RecordFilter, UrlKeySpec][];

/** The query string (with or without a leading `?`) into URL state. Unknown keys and malformed values are ignored. */
export function decodeUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const filter: Record<string, unknown> = {};
  for (const [field, spec] of FIELDS) {
    const values = params
      .getAll(spec.key)
      .map((text) => decodeValue(spec.encoding, text))
      .filter((v): v is string | boolean => v !== null);
    if (values.length === 0) continue;
    filter[field] = spec.repeatable ? values : values[0];
  }
  const state: UrlState = { filter: filter as RecordFilter };
  const tab = params.get(URL_ONLY_KEYS.tab);
  if (tab !== null && SLUG.test(tab)) state.tab = tab;
  const page = params.get(URL_ONLY_KEYS.page);
  if (page !== null && /^[1-9]\d*$/.test(page) && Number(page) > 1) state.page = Number(page);
  const order = params.get(URL_ONLY_KEYS.order);
  if (order !== null) state.order = (enumFromUrl(order) ?? undefined) as RecordOrder | undefined;
  const signalOrder = params.get(URL_ONLY_KEYS.signalOrder);
  if (signalOrder !== null) state.signalOrder = (enumFromUrl(signalOrder) ?? undefined) as SignalOrder | undefined;
  const lens = params.get(URL_ONLY_KEYS.lens);
  if (lens !== null && SLUG.test(lens) && lens !== DEFAULT_LENS) state.lens = lens;
  if (state.order === undefined) delete state.order;
  if (state.signalOrder === undefined) delete state.signalOrder;
  return state;
}

/**
 * URL state into a query string with a leading `?` ("" when there is nothing to say). Keys come out in one canonical
 * order (the filter's fields as the contract lists them, then tab, page, order, signalOrder, lens); unset fields and the
 * default `countySide` are left out.
 */
export function encodeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  for (const [field, spec] of FIELDS) {
    const raw = state.filter[field];
    if (raw === undefined || raw === null) continue;
    const list = (Array.isArray(raw) ? raw : [raw]) as (string | number | boolean)[];
    for (const value of list) {
      if (DEFAULTS[field] === value || value === "") continue;
      params.append(spec.key, encodeValue(spec.encoding, value));
    }
  }
  if (state.tab) params.set(URL_ONLY_KEYS.tab, state.tab);
  if (state.page !== undefined && state.page > 1) params.set(URL_ONLY_KEYS.page, String(state.page));
  if (state.order) params.set(URL_ONLY_KEYS.order, enumToUrl(state.order));
  if (state.signalOrder) params.set(URL_ONLY_KEYS.signalOrder, enumToUrl(state.signalOrder));
  if (state.lens && state.lens !== DEFAULT_LENS) params.set(URL_ONLY_KEYS.lens, state.lens);
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}
