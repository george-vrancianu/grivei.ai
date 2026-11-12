import type { RecordFilter } from "@grivei/contract";
import type { Locale, SignalData } from "@grivei/ui";
import { recordsHref } from "../pages/EntityPage/entityPage.utils.ts";

/**
 * The filter a Signal's `reproduce` stands for, as a `RecordFilter` of the entity page it opens on: the grouping the rule used
 * (`signal`, `supplier`, `cpv`, `from`, `to`) without the authority, which is the page itself (the authority's Records tab).
 * Null fields are left out.
 */
export function reproduceFilter(reproduce: SignalData["reproduce"]): RecordFilter {
  const filter: RecordFilter = {};
  if (reproduce.signal) filter.signal = reproduce.signal;
  if (reproduce.supplier) filter.supplier = reproduce.supplier;
  if (reproduce.cpv) filter.cpv = reproduce.cpv;
  if (reproduce.from) filter.from = reproduce.from;
  if (reproduce.to) filter.to = reproduce.to;
  return filter;
}

/**
 * The URL that reproduces a Signal: the AUTHORITY's Records tab (`/explore/authority/<key>/records`, `/ro/explore/...` in Romanian) with
 * the Signal's filter in the query, so the list is exactly the Signal's Records and the URL can be cited. It is always the authority's
 * page, also on a supplier's page: a Signal is one authority's, and `reproduce.authority` is the entity key of its page.
 */
export function signalReproduceHref(locale: Locale, signal: Pick<SignalData, "authority" | "reproduce">): string {
  const key = String(signal.reproduce.authority ?? signal.authority.key);
  return recordsHref(locale, "authority", key, { filter: reproduceFilter(signal.reproduce) });
}
