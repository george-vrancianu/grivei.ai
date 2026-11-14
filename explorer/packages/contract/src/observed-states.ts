/**
 * The states a response shows, read off its data rather than declared by its author,
 * so "the fixtures cover every state" cannot drift from what the fixtures contain.
 */
export const REQUIRED_STATES = [
  "national", "unplaced", "unknown-supplier-county", "unknown-uat",
  "natural-person", "name-only-supplier", "consortium", "framework", "subsequent-contract",
  "suspect-value", "no-value", "estimated-count",
  "both-roles", "entity-provenance:SEAP", "entity-provenance:ONRC", "onrc-section", "onrc-status-since-at-least", "onrc-status-first-seen", "onrc-alias", "not-found", "identity-curated", "crawled-provisional",
  "signal:over-cap", "signal:splitting", "signal:framework-overrun", "signal:no-publication",
  "suspect:DIRECT_PURCHASE_10X_CAP", "suspect:CONTRACT_100X_ESTIMATE", "suspect:CONTRACT_OVER_50BN",
  "gap:LOADED", "gap:KNOWN_GAP", "gap:POSSIBLY_INCOMPLETE", "gap:NOT_IN_SOURCE", "gap:CRAWLED_PROVISIONAL", "gap:NOT_YET_LOADED",
  "coverage:HARVESTED", "coverage:HARVESTED_WITH_KNOWN_GAPS", "coverage:PARTIAL", "coverage:NOT_HARVESTED",
] as const;

export type State = (typeof REQUIRED_STATES)[number];

const SIGNAL_OF_NUMBERS: Record<string, string> = {
  OverCapNumbers: "over-cap",
  SplittingNumbers: "splitting",
  FrameworkOverrunNumbers: "framework-overrun",
  NoPublicationNumbers: "no-publication",
};

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
    // A Signal is shown by its numbers card, so read the rule off `numbers`, not off any field called `rule`
    // (a Record row's signal marker and a suspect flag also carry one).
    if (key === "numbers" && typeof o.__typename === "string" && o.__typename in SIGNAL_OF_NUMBERS) {
      seen.add(`signal:${SIGNAL_OF_NUMBERS[o.__typename]}`);
    }
    if (key === "suspect" && typeof o.rule === "string") seen.add(`suspect:${o.rule}`);
    // An Entity's provenance is a list; one traced to SEAP is the fallback when ANAF has no answer.
    if (Array.isArray(o.provenance) && o.provenance.some((p) => (p as { source?: Json }).source === "SEAP")) seen.add("entity-provenance:SEAP");
    // an Entity traced to ONRC: ANAF does not know the CUI but ONRC lists it (ADR 0018)
    if (Array.isArray(o.provenance) && o.provenance.some((p) => (p as { source?: Json }).source === "ONRC")) seen.add("entity-provenance:ONRC");
    if (key === "onrc" && typeof o.registrationNumber === "string") seen.add("onrc-section");
    if (Array.isArray(o.statuses)) {
      for (const st of o.statuses) {
        if ((st as { sinceAtLeast?: Json }).sinceAtLeast === true) seen.add("onrc-status-since-at-least");
        if ((st as { sinceAtLeast?: Json }).sinceAtLeast === false) seen.add("onrc-status-first-seen");
      }
    }
    if (Array.isArray(o.aliases) && o.aliases.some((a) => typeof (a as { current?: Json }).current === "boolean")) seen.add("onrc-alias");
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
  const seap = root.seap as { record?: Json } | null | undefined;
  if (root.entity === null || seap?.record === null) seen.add("not-found");
  return seen;
}
