import { URL_ONLY_KEYS } from "@grivei/contract";

/**
 * The full URL of the page as the browser has it (scheme, host, path and query, no fragment): what a reader cites and what the copy-link button copies.
 * The carried search of an entity page is navigation (where the reader came from), not part of the address, so it is left out.
 */
export function currentUrl(): string {
  const { origin, pathname, search } = window.location;
  const params = new URLSearchParams(search);
  if (!params.has(URL_ONLY_KEYS.carried)) return `${origin}${pathname}${search}`;
  params.delete(URL_ONLY_KEYS.carried);
  return `${origin}${pathname}${params.size > 0 ? `?${params.toString()}` : ""}`;
}
