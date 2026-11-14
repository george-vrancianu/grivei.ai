/**
 * The Restricted switch (ADR 0015, ticket #177). Restricted content (person pages, cross-organisation role lists and their counts, later the SOE-board Signal) is served
 * only when the host's `GRIVEI_RESTRICTED` is exactly `show`: unset, empty or any other value hides it (fail closed). The API reads it once, when it is created, and the
 * resolvers enforce it: with the switch off they return nothing Restricted, not even a count.
 */
export const RESTRICTED_ENV = "GRIVEI_RESTRICTED";

/**
 * The Signal rules that are Restricted (#185): served only when the switch shows (their Signals, Records, counts and the rule's own row). The pipeline keeps them off the
 * public search rows (`signals`, `has_signals`, the rollup); the API reads them through `seap.signal_member` when shown and hides them otherwise.
 */
export const RESTRICTED_RULES: readonly string[] = ["SOE_BOARD_IN_SUPPLIER"];

export function restrictedShown(env: Record<string, string | undefined> = process.env): boolean {
  return env[RESTRICTED_ENV] === "show";
}
