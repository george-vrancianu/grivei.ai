/**
 * The states a response shows, read off its data rather than declared by its author,
 * so "the fixtures cover every state" cannot drift from what the fixtures contain.
 */
export const REQUIRED_STATES = [
  "national", "unplaced", "unknown-supplier-county", "unknown-uat",
  "natural-person", "name-only-supplier", "consortium", "framework", "subsequent-contract",
  "suspect-value", "no-value", "estimated-total", "estimated-count",
  "both-roles", "not-found", "identity-curated", "crawled-provisional",
  "signal:over-cap", "signal:splitting", "signal:framework-overrun", "signal:no-publication",
  "gap:LOADED", "gap:KNOWN_GAP", "gap:POSSIBLY_INCOMPLETE", "gap:NOT_IN_SOURCE", "gap:CRAWLED_PROVISIONAL",
  "coverage:HARVESTED", "coverage:HARVESTED_WITH_KNOWN_GAPS", "coverage:PARTIAL", "coverage:NOT_HARVESTED",
] as const;

export type State = (typeof REQUIRED_STATES)[number];

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export function observedStates(data: unknown): Set<string> {
  const seen = new Set<string>();
  const visit = (node: Json, key: string) => {
    if (Array.isArray(node)) return node.forEach((n) => visit(n, key));
    if (node === null || typeof node !== "object") return;
    const o = node;
    if (key === "national" && typeof o.records === "number" && o.records > 0) seen.add("national");
    if (key === "unplaced") seen.add("unplaced");
    if (key === "unknownSupplierCounty") seen.add("unknown-supplier-county");
    if (key === "unknownUat") seen.add("unknown-uat");
    if (o.naturalPerson === true) seen.add("natural-person");
    if (o.identity === "NAME_ONLY") seen.add("name-only-supplier");
    if (Array.isArray(o.winners) && o.winners.length > 1) seen.add("consortium");
    if (Array.isArray(o.consortia) && o.consortia.length > 0) seen.add("consortium");
    if (typeof o.state === "string") seen.add(`gap:${o.state}`);
    if (typeof o.status === "string") seen.add(`coverage:${o.status}`);
    if (typeof o.rule === "string") seen.add(`signal:${o.rule.toLowerCase().replaceAll("_", "-")}`);
    if (o.estimated === true) seen.add("estimated-total");
    if (o.countEstimated === true) seen.add("estimated-count");
    if (Array.isArray(o.roles) && o.roles.length > 1) seen.add("both-roles");
    if (o.identityCurated === true) seen.add("identity-curated");
    if (o.suspect !== undefined && o.suspect !== null) seen.add("suspect-value");
    if (Array.isArray(o.badges)) {
      for (const b of o.badges) {
        if (b === "SUSPECT_VALUE") seen.add("suspect-value");
        if (b === "NO_VALUE") seen.add("no-value");
        if (b === "FRAMEWORK_CEILING") seen.add("framework");
        if (b === "SUBSEQUENT_CONTRACT") seen.add("subsequent-contract");
        if (b === "CONSORTIUM_SHARE") seen.add("consortium");
        if (b === "CRAWLED_PROVISIONAL") seen.add("crawled-provisional");
      }
    }
    if (o.framework !== undefined && o.framework !== null) seen.add("framework");
    for (const [k, v] of Object.entries(o)) visit(v, k);
  };
  const root = data as { [k: string]: Json };
  visit(root as Json, "");
  // an absent entity or record is the not-found state
  const top = JSON.stringify(data);
  if (/"entity":null/.test(top.slice(0, 20)) || /"record":null/.test(top.slice(0, 30))) seen.add("not-found");
  return seen;
}
