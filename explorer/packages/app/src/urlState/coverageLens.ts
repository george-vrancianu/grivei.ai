import type { RecordFilter } from "@grivei/contract";
import type { Locale } from "@grivei/ui";
import { pathFor } from "../routing/routes.ts";
import { encodeUrlState } from "./codec.ts";

/**
 * The main screen's Coverage lens for a search: the county and the date chip stay, everything else goes. Coverage answers for
 * authority areas and a date window only, so the query, the other chips, the county's side and its UAT have no meaning there.
 */
export function coverageLensHref(locale: Locale, filter: Pick<RecordFilter, "county" | "from" | "to">): string {
  const kept: RecordFilter = {
    ...(filter.county ? { county: filter.county } : {}),
    ...(filter.from ? { from: filter.from } : {}),
    ...(filter.to ? { to: filter.to } : {}),
  };
  return `${pathFor(locale, { name: "main" })}${encodeUrlState({ filter: kept, lens: "coverage" })}`;
}
