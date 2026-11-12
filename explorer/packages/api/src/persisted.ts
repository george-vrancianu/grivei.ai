import { parse, validate, type DocumentNode, type GraphQLSchema } from "graphql";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };

export interface PersistedQuery {
  id: string;
  name: string;
  document: DocumentNode;
}

/**
 * The allowlist: the contract's persisted operations, keyed by their sha256 (the id the app sends).
 * Every document is validated against the schema at startup, so a stale or broken allowlist fails the boot, not a request.
 */
export function loadPersistedQueries(schema: GraphQLSchema): Map<string, PersistedQuery> {
  const byId = new Map<string, PersistedQuery>();
  for (const op of allowlist.operations) {
    const document = parse(op.document);
    const problems = validate(schema, document);
    if (problems.length) throw new Error(`persisted query ${op.name} does not validate: ${problems[0]?.message}`);
    byId.set(op.sha256, { id: op.sha256, name: op.name, document });
  }
  return byId;
}
