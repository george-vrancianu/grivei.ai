import type { Locale } from "@grivei/ui";
import { pathFor } from "../routing/routes.ts";
import { encodeOnrcScreen } from "../urlState/onrcScreen.ts";
import { encodeUrlState, type SourceId } from "../urlState/codec.ts";

/**
 * Where the Source picker beside the search bar goes: the other Source's main screen with the same query text and the map lens kept. The chips stay behind
 * (each Source has its own), and the results are never carried across: a Source answers for itself (ADR 0005).
 */
export function searchSourceHref(locale: Locale, source: SourceId, state: { q?: string | undefined; lens?: string | undefined }): string {
  const filter = state.q ? { q: state.q } : {};
  const lens = state.lens ? { lens: state.lens } : {};
  const query = source === "ONRC" ? encodeOnrcScreen({ filter, ...lens }) : encodeUrlState({ filter, ...lens });
  return `${pathFor(locale, { name: "main" })}${query}`;
}

/**
 * The Coverage page of a Source: SEAP's is the one every link from before the selector means; ONRC's is `source=onrc`. The date chip's window (`from`/`to`) goes along,
 * so a switch there and back keeps the highlighted columns.
 */
export function coverageSourceHref(locale: Locale, source: SourceId, window: { from?: string | null | undefined; to?: string | null | undefined } = {}): string {
  const filter = { ...(window.from ? { from: window.from } : {}), ...(window.to ? { to: window.to } : {}) };
  return `${pathFor(locale, { name: "coverage" })}${encodeUrlState({ filter, ...(source === "ONRC" ? { source } : {}) })}`;
}
