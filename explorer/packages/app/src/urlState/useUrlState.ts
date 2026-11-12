import { useCallback, useMemo } from "react";
import type { RecordFilter } from "@grivei/contract";
import { navigate, useLocation } from "../routing/location.tsx";
import { decodeUrlState, encodeUrlState, type UrlState } from "./codec.ts";

export interface UrlStateApi extends UrlState {
  /** The raw query string ("" or starting with `?`), for links that must carry the state along. */
  search: string;
  /**
   * Merges a change into the URL state. The history entry is replaced, not pushed (typing never fills the back button);
   * pass `{ history: "push" }` for a change that should be a step back can return to.
   * Changing the filter resets the page, unless the patch sets one. A key set to `undefined` is removed.
   */
  update: (patch: UrlStatePatch, options?: { history?: "replace" | "push" }) => void;
  /** Shorthand: patch the filter only. */
  setFilter: (patch: RecordFilter, options?: { history?: "replace" | "push" }) => void;
}

export type UrlStatePatch = Partial<Omit<UrlState, "filter">> & { filter?: RecordFilter };

/** Merge `patch` into `state`; `filter` merges field by field, so `{ q: undefined }` clears `q` and keeps the rest. */
export function applyPatch(state: UrlState, patch: UrlStatePatch): UrlState {
  const { filter: filterPatch, ...rest } = patch;
  const next: UrlState = { ...state, ...rest };
  if (filterPatch) {
    next.filter = { ...state.filter, ...filterPatch };
    if (!("page" in patch)) delete next.page; // a different set of rows starts at page 1
  }
  return next;
}

/** The URL's `RecordFilter`, tab, page and orders, and the way to change them. The one door for pages to the query string. */
export function useUrlState(): UrlStateApi {
  const { pathname, search } = useLocation();
  const state = useMemo(() => decodeUrlState(search), [search]);
  const update = useCallback<UrlStateApi["update"]>(
    (patch, options) => {
      // read the live URL, so two updates in one tick (a keystroke and a reset) compose
      const current = decodeUrlState(window.location.search);
      navigate(`${pathname}${encodeUrlState(applyPatch(current, patch))}`, options?.history ?? "replace");
    },
    [pathname],
  );
  const setFilter = useCallback<UrlStateApi["setFilter"]>((filter, options) => update({ filter }, options), [update]);
  return { ...state, search, update, setFilter };
}
