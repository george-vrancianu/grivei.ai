/**
 * The cases whose answers are recorded as the contract's EntityOverview fixtures (ticket #86): each is one persisted-query
 * request, asked of the API after a real rebuild (seam 1). The block "recorded fixtures (#86)" in `seam1.test.ts` compares each
 * answer with the committed JSON and, with `RECORD_FIXTURES=1`, rewrites it. The app's seam 3 tests ask for exactly these
 * variables, so a case here is also a page a test can open. Same convention as `recordedCases.ts` (#83), in its own file.
 *
 * Two archives: `overview` is `archive-roles` with the name-only suppliers of `archive-roles-names` merged on (an authority,
 * suppliers, an entity with both roles, name-only suppliers); `signals` is `archive-signals` (an authority and a supplier whose
 * Records are in Signals).
 */
import type { FixtureKind } from "@grivei/contract/fixtures";

export type RecordedEntityArchive = "overview" | "signals";

export interface RecordedEntityCase {
  operation: "EntityOverview";
  /** Unique within its operation. */
  name: string;
  archive: RecordedEntityArchive;
  kind: FixtureKind;
  description: string;
  variables: Record<string, unknown>;
}

/** The entities of the two archives (watchdog/tests/fixtures/build_roles_archive.py and build_signals_archive.py), all invented. */
export const ENTITY_KEYS = {
  hospital: "1000017", // SPITALUL EXEMPLU: an authority only
  commune: "1000009", // COMUNA EXEMPLU: an authority only
  alfa: "2000007", // ALFA DEMO SRL: a supplier only
  cnair: "2000031", // CNAIR DEMO SA: both roles
  localSupplier: "name-furnizor-local-srl", // no tax id published: name-only
  foreignSupplier: "vat-bg103029862", // a foreign VAT id: name-only
  nobody: "name-nobody-has-this-key",
} as const;

// The page always sends the filter (empty here) and omits the Signals' order and offset unless the URL says so.
const page = (key: string, role: "AUTHORITY" | "SUPPLIER", extra: Record<string, unknown> = {}) => ({ key, role, filter: {}, ...extra });

export const RECORDED_ENTITY_CASES: readonly RecordedEntityCase[] = [
  {
    operation: "EntityOverview", name: "authority", archive: "overview", kind: "typical",
    description: "an authority only: headline numbers (suspect and no-value Records left out), counterparties with a natural person among them, consortia, a framework line, the largest Records",
    variables: page(ENTITY_KEYS.hospital, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "second-authority", archive: "overview", kind: "typical",
    description: "a second authority that shares suppliers with the first and buys from name-only suppliers",
    variables: page(ENTITY_KEYS.commune, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "supplier", archive: "overview", kind: "typical",
    description: "a supplier only: its own share of each Record, consortium shares, a framework agreement and its subsequent contracts",
    variables: page(ENTITY_KEYS.alfa, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "both-roles-authority-page", archive: "overview", kind: "typical",
    description: "an entity that buys and sells, on its authority page: only what it bought, roles lists both",
    variables: page(ENTITY_KEYS.cnair, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "both-roles-supplier-page", archive: "overview", kind: "typical",
    description: "the same entity on its supplier page: only what it won, the role switch points back to the authority page",
    variables: page(ENTITY_KEYS.cnair, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "name-only-supplier", archive: "overview", kind: "typical",
    description: "a supplier with no tax id: a name-only entity (key name-<slug>), no CUI, its numbers all the same",
    variables: page(ENTITY_KEYS.localSupplier, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "foreign-vat-supplier", archive: "overview", kind: "typical",
    description: "a supplier identified by a foreign VAT id: a name-only entity keyed vat-<id>",
    variables: page(ENTITY_KEYS.foreignSupplier, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "authority-asked-as-supplier", archive: "overview", kind: "empty",
    description: "an authority asked for its supplier role: the entity is there, the role is null",
    variables: page(ENTITY_KEYS.hospital, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "supplier-asked-as-authority", archive: "overview", kind: "empty",
    description: "a supplier asked for its authority role: the entity is there, the role is null",
    variables: page(ENTITY_KEYS.alfa, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "unknown-key", archive: "overview", kind: "empty",
    description: "no entity under that key: the page shows not-found",
    variables: page(ENTITY_KEYS.nobody, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "authority-with-signals", archive: "signals", kind: "typical",
    description: "an authority with over-cap and no-publication Signals, in the default order (newest first)",
    variables: page(ENTITY_KEYS.hospital, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "authority-with-signals-by-value", archive: "signals", kind: "typical",
    description: "the same authority with its Signals ordered by value, as the page asks for with signalOrder in the URL",
    variables: page(ENTITY_KEYS.hospital, "AUTHORITY", { signalOrder: "VALUE_DESC" }),
  },
  {
    operation: "EntityOverview", name: "supplier-with-signals", archive: "signals", kind: "typical",
    description: "a supplier whose Records are in Signals: the Signals count and cards on the supplier's page",
    variables: page(ENTITY_KEYS.alfa, "SUPPLIER"),
  },
];
