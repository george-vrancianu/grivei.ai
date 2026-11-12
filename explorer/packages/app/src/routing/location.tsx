import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Locale } from "@grivei/ui";
import { parsePath, type Route } from "./routes.ts";

/** The browser's location is the app's router state: a tiny in-house router over the History API (see the codec notes). */
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
};
// One string snapshot, so React compares by value.
const snapshot = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

/** Where a URL lands as a page: its path, and the paging parameter (a page of a list is a new view, a typed letter is not). */
function viewOf(url: string): { pathname: string; page: string | null; hash: string } {
  const parsed = new URL(url, window.location.href);
  return { pathname: parsed.pathname, page: parsed.searchParams.get("page"), hash: parsed.hash };
}

/**
 * Goes to a URL. `replace` (the default for URL-state updates such as typing a search) rewrites the current history
 * entry; `push` adds one (following a link). A new page opens at the top, as a browser would: a push to another path,
 * or a replace that turns the list's page. Typing and filtering stay where they are (the search box must not jump),
 * and a `#fragment` is left to whoever scrolls to it (the methodology page).
 */
export function navigate(url: string, mode: "push" | "replace" = "push"): void {
  const from = viewOf(window.location.href);
  const to = viewOf(url);
  if (mode === "replace") window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  const newPage = mode === "push" ? to.pathname !== from.pathname : to.pathname !== from.pathname || to.page !== from.page;
  if (newPage && to.hash === "") window.scrollTo(0, 0);
  for (const listener of [...listeners]) listener();
}

export interface AppLocation {
  pathname: string;
  /** The query string with its leading `?`, or "". */
  search: string;
  /** The fragment with its leading `#`, or "" (the methodology page scrolls to it). */
  hash: string;
  locale: Locale;
  route: Route;
}

const LocationContext = createContext<AppLocation | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const url = useSyncExternalStore(subscribe, snapshot, snapshot);
  const value = useMemo<AppLocation>(() => {
    const hashAt = url.indexOf("#");
    const hash = hashAt === -1 ? "" : url.slice(hashAt);
    const rest = hashAt === -1 ? url : url.slice(0, hashAt);
    const at = rest.indexOf("?");
    const pathname = at === -1 ? rest : rest.slice(0, at);
    return { pathname, search: at === -1 ? "" : rest.slice(at), hash, ...parsePath(pathname) };
  }, [url]);
  return <LocationContext value={value}>{children}</LocationContext>;
}

export function useLocation(): AppLocation {
  const value = useContext(LocationContext);
  if (!value) throw new Error("useLocation needs a LocationProvider");
  return value;
}
