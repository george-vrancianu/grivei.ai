/**
 * The Restricted switch (ADR 0015, ticket #177). Restricted content (person pages, cross-organisation role lists and their counts, later the SOE-board Signal) is served
 * only when the host's `GRIVEI_RESTRICTED` is exactly `show`: unset, empty or any other value hides it (fail closed). The API reads it once, when it is created, and the
 * resolvers enforce it: with the switch off they return nothing Restricted, not even a count.
 */
export const RESTRICTED_ENV = "GRIVEI_RESTRICTED";

export function restrictedShown(env: Record<string, string | undefined> = process.env): boolean {
  return env[RESTRICTED_ENV] === "show";
}
