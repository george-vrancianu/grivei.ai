/**
 * The cases whose answers are recorded as the contract's EntityOverview fixtures (ticket #86): each is one persisted-query
 * request, asked of the API after a real rebuild (seam 1). The block "recorded fixtures (#86)" in `seam1.test.ts` compares each
 * answer with the committed JSON and, with `RECORD_FIXTURES=1`, rewrites it. The app's seam 3 tests ask for exactly these
 * variables, so a case here is also a page a test can open. Same convention as `recordedCases.ts` (#83), in its own file.
 *
 * Three archives: `overview` is `archive-roles` with the name-only suppliers of `archive-roles-names` merged on (an authority,
 * suppliers, an entity with both roles, name-only suppliers); `signals` is `archive-signals` (an authority and a supplier whose
 * Records are in Signals); `moneymap` is the placement world (authorities placed in a county and UAT, a national one, an unplaced one);
 * `onrc` is `archive-onrc` (ONRC snapshots in both layouts beside a SEAP slice: a supplier with a status change, a rename, a strike-off, a CUI ANAF
 * does not know, an entity with both roles, organisations that exist only in ONRC; #175).
 */
import type { FixtureKind } from "@grivei/contract/fixtures";

export type RecordedEntityArchive = "overview" | "signals" | "moneymap" | "onrc";

export interface RecordedEntityCase {
  operation: "EntityOverview";
  /** Unique within its operation. */
  name: string;
  archive: RecordedEntityArchive;
  kind: FixtureKind;
  description: string;
  variables: Record<string, unknown>;
}

/** The entities of the three archives (build_roles_archive.py, build_signals_archive.py and build_moneymap_archive.py), all invented. */
export const ENTITY_KEYS = {
  hospital: "1000017", // SPITALUL EXEMPLU: an authority only
  commune: "1000009", // COMUNA EXEMPLU: an authority only
  alfa: "2000007", // ALFA DEMO SRL: a supplier only
  cnair: "2000031", // CNAIR DEMO SA: both roles
  localSupplier: "name-furnizor-local-srl", // no tax id published: name-only
  foreignSupplier: "vat-bg103029862", // a foreign VAT id: name-only
  nobody: "name-nobody-has-this-key",
  sanpetru: "51000005", // a commune placed in a county and UAT (archive-moneymap)
  ministry: "51001000", // a national authority
  unplaced: "51000900", // an authority neither ANAF nor SEAP places
  onrcAuthority: "3100012", // PRIMARIA EXEMPLU ONRC: an authority ANAF and ONRC know (archive-onrc)
  onrcAlfa: "3100020", // ALFA ONRC SRL: insolvency first seen after the earliest snapshot, CAEN codes
  onrcBeta: "3100039", // BETA ONRC SRL: ONRC renamed it (BETA VECHI SRL -> BETA NOU SRL); ANAF's name stays the display name
  onrcGamma: "3100047", // GAMMA ONRC SRL: struck off in the newest snapshot
  onrcDelta: "3100055", // DELTA ONRC SRL: a CUI ANAF does not know, ONRC lists
  onrcDubla: "3100063", // DUBLA ONRC SA: both roles
  onrcOnly: "3100071", // OMEGA ONLY SRL: in ONRC only, seat in Cluj
  onrcUnplaced: "3100080", // ZETA FARA JUDET SRL: in ONRC only, no county
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
    operation: "EntityOverview", name: "authority-from-date", archive: "overview", kind: "typical",
    description: "the authority page with the URL's date filter (from=2023-02-01): every number follows the filter",
    variables: page(ENTITY_KEYS.hospital, "AUTHORITY", { filter: { from: "2023-02-01" } }),
  },
  {
    operation: "EntityOverview", name: "authority-nothing-in-filter", archive: "overview", kind: "empty",
    description: "an authority whose filter matches none of its Records (2019): zero totals, no counterparties, procedures or largest Records",
    variables: page(ENTITY_KEYS.hospital, "AUTHORITY", { filter: { from: "2019-01-01", to: "2019-12-31" } }),
  },
  {
    operation: "EntityOverview", name: "authority-placed-in-uat", archive: "moneymap", kind: "typical",
    description: "a commune placed in a county and a UAT, with a consortium Record won with a firm of another county",
    variables: page(ENTITY_KEYS.sanpetru, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "national-authority", archive: "moneymap", kind: "typical",
    description: "a national authority: no county, placement is national",
    variables: page(ENTITY_KEYS.ministry, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "unplaced-authority", archive: "moneymap", kind: "typical",
    description: "an authority no Source places: the header says Unplaced; a natural person among its counterparties",
    variables: page(ENTITY_KEYS.unplaced, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "authority-with-signals", archive: "signals", kind: "typical",
    description: "an authority with over-cap and no-publication Signals, newest first (?signalOrder=date-desc; the API's default order is the same, but asked with no argument this would collide with the roles archive's page of the same key)",
    variables: page(ENTITY_KEYS.hospital, "AUTHORITY", { signalOrder: "DATE_DESC" }),
  },
  {
    operation: "EntityOverview", name: "authority-with-signals-by-value", archive: "signals", kind: "typical",
    description: "the same authority with its Signals ordered by value (?signalOrder=value-desc)",
    variables: page(ENTITY_KEYS.hospital, "AUTHORITY", { signalOrder: "VALUE_DESC" }),
  },
  {
    operation: "EntityOverview", name: "supplier-with-signals", archive: "signals", kind: "typical",
    description: "a supplier whose Records are in Signals: the Signals count on the supplier's page (?signalOrder=date-desc)",
    variables: page(ENTITY_KEYS.alfa, "SUPPLIER", { signalOrder: "DATE_DESC" }),
  },
  {
    operation: "EntityOverview", name: "onrc-supplier", archive: "onrc", kind: "typical",
    description: "a SEAP supplier with an ONRC section: registration date, a status already in the earliest snapshot (since at least) and an insolvency first seen later, authorised CAEN codes, the registered seat",
    variables: page(ENTITY_KEYS.onrcAlfa, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "onrc-authority", archive: "onrc", kind: "typical",
    description: "a contracting authority with an ONRC section on its authority page",
    variables: page(ENTITY_KEYS.onrcAuthority, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "onrc-renamed-supplier", archive: "onrc", kind: "typical",
    description: "ONRC renamed the company: both names are dated ONRC aliases, the display name stays ANAF's",
    variables: page(ENTITY_KEYS.onrcBeta, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "onrc-struck-off-supplier", archive: "onrc", kind: "typical",
    description: "a supplier struck off in the newest snapshot: the strike-off is first seen there, the earlier status is gone",
    variables: page(ENTITY_KEYS.onrcGamma, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "onrc-cui-unknown-to-anaf", archive: "onrc", kind: "typical",
    description: "a supplier whose CUI ANAF does not know but ONRC lists: provenance ONRC (the page badges it), ONRC's name as the display name, its SEAP Records attached",
    variables: page(ENTITY_KEYS.onrcDelta, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "onrc-both-roles-authority-page", archive: "onrc", kind: "typical",
    description: "an entity that is an authority and a supplier, on its authority page: the same ONRC section",
    variables: page(ENTITY_KEYS.onrcDubla, "AUTHORITY"),
  },
  {
    operation: "EntityOverview", name: "onrc-both-roles-supplier-page", archive: "onrc", kind: "typical",
    description: "the same entity on its supplier page: the ONRC section is the same on both role pages",
    variables: page(ENTITY_KEYS.onrcDubla, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "onrc-only-organisation", archive: "onrc", kind: "empty",
    description: "an organisation that exists only in ONRC (never a SEAP counterparty): an entity page with its ONRC section, no SEAP role, placed by its seat's county",
    variables: page(ENTITY_KEYS.onrcOnly, "SUPPLIER"),
  },
  {
    operation: "EntityOverview", name: "onrc-only-unplaced", archive: "onrc", kind: "empty",
    description: "an organisation only in ONRC whose registration names no county: no placement (the Unplaced tile)",
    variables: page(ENTITY_KEYS.onrcUnplaced, "AUTHORITY"),
  },
];
