import { useCallback, useMemo } from "react";
import type { OnrcFilter } from "@grivei/contract";
import { navigate, useLocation } from "../routing/location.tsx";
import { decodeOnrcUrlState, encodeOnrcUrlState, SOURCE_KEY, type OnrcUrlState } from "./codec.ts";

/** The map lens of the ONRC screen as written (`coverage`); the first lens, the count, is the default and is left out of the URL. */
const DEFAULT_LENS = "money";
const LENS_KEY = "lens";

/**
 * The URL state of the ONRC screens (#178): ONRC's filter chips, the page, and the map lens. `source=onrc` is what makes the URL ONRC's; it is not part of
 * this state. Same canonical form as the SEAP codec (`encode(decode(q)) === q`): the filter's keys, `tab`, `page` (as `encodeOnrcUrlState`), then `lens`, then `source`.
 */
export interface OnrcScreenState extends OnrcUrlState {
  lens?: string;
}

export function decodeOnrcScreen(search: string): OnrcScreenState {
  const state: OnrcScreenState = decodeOnrcUrlState(search);
  const lens = new URLSearchParams(search).get(LENS_KEY);
  if (lens !== null && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(lens) && lens !== DEFAULT_LENS) state.lens = lens;
  return state;
}

export function encodeOnrcScreen(state: OnrcScreenState): string {
  const params = new URLSearchParams(encodeOnrcUrlState(state));
  if (state.lens && state.lens !== DEFAULT_LENS) params.set(LENS_KEY, state.lens);
  params.set(SOURCE_KEY, "onrc");
  return `?${params.toString()}`;
}

export type OnrcScreenPatch = Partial<Omit<OnrcScreenState, "filter">> & { filter?: OnrcFilter };

/** Merge `patch` into `state`; `filter` merges field by field (a field set to `undefined` is removed) and a different set of rows starts at page 1. */
export function applyOnrcPatch(state: OnrcScreenState, patch: OnrcScreenPatch): OnrcScreenState {
  const { filter: filterPatch, ...rest } = patch;
  const next: OnrcScreenState = { ...state, ...rest };
  if (filterPatch) {
    const merged: Record<string, unknown> = { ...state.filter, ...filterPatch };
    for (const [key, value] of Object.entries(merged)) if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) delete merged[key];
    next.filter = merged as OnrcFilter;
    if (!("page" in patch)) delete next.page;
  }
  for (const key of ["lens", "page", "tab"] as const) if (next[key] === undefined) delete next[key];
  return next;
}

export interface OnrcUrlStateApi extends OnrcScreenState {
  /** The raw query string, for links that carry the state along. */
  search: string;
  update: (patch: OnrcScreenPatch, options?: { history?: "replace" | "push" }) => void;
  setFilter: (patch: OnrcFilter, options?: { history?: "replace" | "push" }) => void;
}

/** The ONRC filter, page and lens in the URL, and the way to change them (history replaced by default, like the SEAP screens). */
export function useOnrcUrlState(): OnrcUrlStateApi {
  const { pathname, search } = useLocation();
  const state = useMemo(() => decodeOnrcScreen(search), [search]);
  const update = useCallback<OnrcUrlStateApi["update"]>(
    (patch, options) => navigate(`${pathname}${encodeOnrcScreen(applyOnrcPatch(decodeOnrcScreen(window.location.search), patch))}`, options?.history ?? "replace"),
    [pathname],
  );
  const setFilter = useCallback<OnrcUrlStateApi["setFilter"]>((filter, options) => update({ filter }, options), [update]);
  return { ...state, search, update, setFilter };
}

/** A patch that lands the filter exactly on `next`: every field either has its new value or is removed (the update merges patches). */
export function patchToOnrc(current: OnrcFilter, next: OnrcFilter): OnrcFilter {
  const patch: Record<string, unknown> = {};
  for (const field of new Set([...Object.keys(current), ...Object.keys(next)])) patch[field] = (next as Record<string, unknown>)[field] ?? undefined;
  return patch as OnrcFilter;
}
