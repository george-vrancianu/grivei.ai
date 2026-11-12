/**
 * The cases whose answers are recorded as the contract's EntityRelationships fixtures and the side panel's EntityRecords fixtures
 * (ticket #88): each is one persisted-query request, asked of the API after a real rebuild (seam 1). The block "recorded fixtures (#88)"
 * in `seam1.test.ts` compares each answer with the committed JSON and, with `RECORD_FIXTURES=1`, rewrites it. The app's seam 3 tests ask for
 * exactly these variables, as the Relationships tab sends them: `{key, role, filter}` (+ `counterparty` once one is picked), and for the side
 * panel `{key, role, filter: {<other side>: counterparty}, limit: 100, offset: 0}`. Same convention as `recordedEntityCases.ts` (#86); the
 * entities are its `ENTITY_KEYS`, on the same archives (`overview` = `archive-roles` + `archive-roles-names`, `moneymap` = the placement world).
 */
import type { FixtureKind } from "@grivei/contract/fixtures";
import { ENTITY_KEYS } from "./recordedEntityCases.ts";

export type RecordedRelationshipsArchive = "overview" | "moneymap";

export interface RecordedRelationshipsCase {
  operation: "EntityRelationships" | "EntityRecords";
  /** Unique within its operation. */
  name: string;
  archive: RecordedRelationshipsArchive;
  kind: FixtureKind;
  description: string;
  variables: Record<string, unknown>;
}

const graph = (key: string, role: "AUTHORITY" | "SUPPLIER", extra: Record<string, unknown> = {}) => ({ key, role, filter: {}, ...extra });
const panel = (key: string, role: "AUTHORITY" | "SUPPLIER", filter: Record<string, unknown>) => ({ key, role, filter, limit: 100, offset: 0 });

export const RECORDED_RELATIONSHIPS_CASES: readonly RecordedRelationshipsCase[] = [
  {
    operation: "EntityRelationships", name: "authority", archive: "overview", kind: "typical",
    description: "an authority's graph: counterparties with a natural person (no entity), a consortium partner and its monthly timeline; the Flow lens on the supplier side",
    variables: graph(ENTITY_KEYS.hospital, "AUTHORITY"),
  },
  {
    operation: "EntityRelationships", name: "authority-supplier-picked", archive: "overview", kind: "typical",
    description: "the same authority with its biggest supplier picked: that supplier's own months (the graph and the Flow lens are as above)",
    variables: graph(ENTITY_KEYS.hospital, "AUTHORITY", { counterparty: ENTITY_KEYS.alfa }),
  },
  {
    operation: "EntityRelationships", name: "supplier", archive: "overview", kind: "typical",
    description: "a supplier's graph: its authorities and its monthly timeline; the Flow lens on the authority side",
    variables: graph(ENTITY_KEYS.alfa, "SUPPLIER"),
  },
  {
    operation: "EntityRelationships", name: "supplier-authority-picked", archive: "overview", kind: "typical",
    description: "the same supplier with an authority picked: that authority's months",
    variables: graph(ENTITY_KEYS.alfa, "SUPPLIER", { counterparty: ENTITY_KEYS.hospital }),
  },
  {
    operation: "EntityRelationships", name: "authority-nothing-in-filter", archive: "overview", kind: "empty",
    description: "an authority whose filter matches none of its Records (2019): no counterparties, an empty timeline",
    variables: graph(ENTITY_KEYS.hospital, "AUTHORITY", { filter: { from: "2019-01-01", to: "2019-12-31" } }),
  },
  {
    operation: "EntityRelationships", name: "authority-placed-in-uat", archive: "moneymap", kind: "typical",
    description: "a commune placed in a county: its Flow lens shows the supplier counties around its home county",
    variables: graph(ENTITY_KEYS.sanpetru, "AUTHORITY"),
  },
  {
    operation: "EntityRelationships", name: "national-authority", archive: "moneymap", kind: "typical",
    description: "a national authority, with no county of its own: the Flow lens has bubbles only",
    variables: graph(ENTITY_KEYS.ministry, "AUTHORITY"),
  },
  {
    operation: "EntityRecords", name: "authority-with-supplier", archive: "overview", kind: "typical",
    description: "the side panel of an authority's page with a supplier picked: the Records the two share",
    variables: panel(ENTITY_KEYS.hospital, "AUTHORITY", { supplier: ENTITY_KEYS.alfa }),
  },
  {
    operation: "EntityRecords", name: "supplier-with-authority", archive: "overview", kind: "typical",
    description: "the side panel of a supplier's page with an authority picked: the Records the two share",
    variables: panel(ENTITY_KEYS.alfa, "SUPPLIER", { authority: ENTITY_KEYS.hospital }),
  },
];
