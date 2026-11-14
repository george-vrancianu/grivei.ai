import { ONRC_FILTER_URL, RECORD_FILTER_URL, URL_ONLY_KEYS, type OnrcFilter, type RecordFilter, type RecordOrder, type SignalOrder, type UrlEncoding, type UrlKeySpec } from "@grivei/contract";

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
  /** The Entity key picked on an Entity page's Relationships tab. */
  counterparty?: string;
  /**
   * The search an entity link was followed from (the query and chips), kept apart from `filter`: the entity page opens unfiltered and
   * offers "only Records matching ..." while this is present (#106). Absent when empty.
   */
  carried?: RecordFilter;
  /**
   * The Source the page shows (#178): on an entity's Records tab, the Source switch; on the Coverage page and lens, the Source selector.
   * Absent = SEAP, the default, which every link from before the picker still means.
   */
  source?: SourceId;
}

/** The Sources the explorer can search (ADR 0005). SEAP is the default and is left out of the URL; ONRC is `source=onrc`. */
export type SourceId = "SEAP" | "ONRC";
export const SOURCE_KEY = "source";
const SOURCE_PARAM: Record<Exclude<SourceId, "SEAP">, string> = { ONRC: "onrc" };

/** The Source a `source` URL value names; anything unknown, `seap` included, is SEAP (the default, so an old link is never refused). */
export const sourceFromParam = (value: string | null | undefined): SourceId => (value === SOURCE_PARAM.ONRC ? "ONRC" : "SEAP");
/** The Source of a query string (with or without a leading `?`). */
export const sourceOf = (search: string): SourceId => sourceFromParam(new URLSearchParams(search).get(SOURCE_KEY));
/** `source=onrc` for ONRC, nothing for SEAP, appended to `params` last (the canonical position). */
function appendSource(params: URLSearchParams, source: SourceId | undefined): void {
  if (source && source !== "SEAP") params.set(SOURCE_KEY, SOURCE_PARAM[source]);
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
  int: /^\d+$/,
};

/** DIRECT_PURCHASE -> direct-purchase */
export const enumToUrl = (value: string): string => value.toLowerCase().replaceAll("_", "-");
/** direct-purchase -> DIRECT_PURCHASE; null when it is not shaped like an enum slug. */
export const enumFromUrl = (text: string): string | null => (SLUG.test(text) ? text.toUpperCase().replaceAll("-", "_") : null);

/** One URL value into the filter's value, or null when it is malformed (a malformed value is ignored, never sent to the API). */
function decodeValue(encoding: UrlEncoding, text: string): string | number | boolean | null {
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
    case "int":
      return PATTERNS.int.test(text) ? Number(text) : null;
  }
}

function encodeValue(encoding: UrlEncoding, value: string | number | boolean): string {
  return encoding === "enum" ? enumToUrl(String(value)) : String(value);
}

const FIELDS = Object.entries(RECORD_FILTER_URL) as [keyof RecordFilter, UrlKeySpec][];

/** Fields of already-split query parameters (the same reading for the URL, for a carried search and for ONRC's filter). */
function decodeFields<F>(params: URLSearchParams, fields: readonly [string, UrlKeySpec][]): F {
  const filter: Record<string, unknown> = {};
  for (const [field, spec] of fields) {
    const values = params
      .getAll(spec.key)
      .map((text) => decodeValue(spec.encoding, text))
      .filter((v): v is string | number | boolean => v !== null);
    if (values.length === 0) continue;
    filter[field] = spec.repeatable ? values : values[0];
  }
  return filter as F;
}

/** The fields' parameters, in the contract's order; unset fields and the defaults are left out. */
function appendFields(params: URLSearchParams, filter: object, fields: readonly [string, UrlKeySpec][], defaults: Record<string, string> = {}): void {
  for (const [field, spec] of fields) {
    const raw = (filter as Record<string, unknown>)[field];
    if (raw === undefined || raw === null) continue;
    const list = (Array.isArray(raw) ? raw : [raw]) as (string | number | boolean)[];
    for (const value of list) {
      if (defaults[field] === value || value === "") continue;
      params.append(spec.key, encodeValue(spec.encoding, value));
    }
  }
}

const decodeFilter = (params: URLSearchParams): RecordFilter => decodeFields<RecordFilter>(params, FIELDS);
const appendFilter = (params: URLSearchParams, filter: RecordFilter): void => appendFields(params, filter, FIELDS, DEFAULTS);

/**
 * ONRC's URL search state (#176): its filter chips, the tab and the page. Same canonical form as `UrlState` (`encode(decode(q)) === q` for every canonical
 * query string); the keys are `ONRC_FILTER_URL`'s, then `tab`, then `page`. The ONRC screens (#178) read and write it.
 */
export interface OnrcUrlState {
  filter: OnrcFilter;
  tab?: string;
  page?: number;
}

const ONRC_FIELDS = Object.entries(ONRC_FILTER_URL) as [keyof OnrcFilter, UrlKeySpec][];

export function decodeOnrcUrlState(search: string): OnrcUrlState {
  const params = new URLSearchParams(search);
  const state: OnrcUrlState = { filter: decodeFields<OnrcFilter>(params, ONRC_FIELDS) };
  const tab = params.get(URL_ONLY_KEYS.tab);
  if (tab !== null && SLUG.test(tab)) state.tab = tab;
  const page = params.get(URL_ONLY_KEYS.page);
  if (page !== null && /^[1-9]\d*$/.test(page) && Number(page) > 1) state.page = Number(page);
  return state;
}

export function encodeOnrcUrlState(state: OnrcUrlState): string {
  const params = new URLSearchParams();
  appendFields(params, state.filter, ONRC_FIELDS);
  if (state.tab) params.set(URL_ONLY_KEYS.tab, state.tab);
  if (state.page !== undefined && state.page > 1) params.set(URL_ONLY_KEYS.page, String(state.page));
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}

/** The query string (with or without a leading `?`) into URL state. Unknown keys and malformed values are ignored. */
export function decodeUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const state: UrlState = { filter: decodeFilter(params) };
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
  const counterparty = params.get(URL_ONLY_KEYS.counterparty);
  if (counterparty !== null && PATTERNS.key.test(counterparty)) state.counterparty = counterparty;
  const carried = params.get(URL_ONLY_KEYS.carried);
  if (carried !== null) {
    // only the filter's keys count: a carried search never nests another state (tab, page, a carried search of its own)
    const filter = decodeFilter(new URLSearchParams(carried));
    if (Object.keys(filter).length > 0) state.carried = filter;
  }
  const source = sourceOf(search);
  if (source !== "SEAP") state.source = source;
  if (state.order === undefined) delete state.order;
  if (state.signalOrder === undefined) delete state.signalOrder;
  return state;
}

/**
 * URL state into a query string with a leading `?` ("" when there is nothing to say). Keys come out in one canonical
 * order (the filter's fields as the contract lists them, then tab, page, order, signalOrder, lens, counterparty, carried, source); unset fields and the
 * default `countySide` are left out.
 */
export function encodeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  appendFilter(params, state.filter);
  if (state.tab) params.set(URL_ONLY_KEYS.tab, state.tab);
  if (state.page !== undefined && state.page > 1) params.set(URL_ONLY_KEYS.page, String(state.page));
  if (state.order) params.set(URL_ONLY_KEYS.order, enumToUrl(state.order));
  if (state.signalOrder) params.set(URL_ONLY_KEYS.signalOrder, enumToUrl(state.signalOrder));
  if (state.lens && state.lens !== DEFAULT_LENS) params.set(URL_ONLY_KEYS.lens, state.lens);
  if (state.counterparty) params.set(URL_ONLY_KEYS.counterparty, state.counterparty);
  if (state.carried) {
    const carried = new URLSearchParams();
    appendFilter(carried, state.carried);
    if (carried.size > 0) params.set(URL_ONLY_KEYS.carried, carried.toString());
  }
  appendSource(params, state.source);
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}
