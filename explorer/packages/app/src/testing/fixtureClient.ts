import { fixtures, type OperationName } from "@grivei/contract/fixtures";
import allowlist from "@grivei/contract/persisted-queries.json";
import { createClient, type GraphqlClient } from "../graphql/client.ts";

export interface SentRequest {
  id: string;
  operation: string;
  variables: unknown;
}

/**
 * A client whose network answers from the contract's mock fixtures (Seam 3): it looks the persisted id up on the allowlist,
 * then returns the fixture of that operation whose variables equal the ones sent. No fixture for them is a loud failure.
 */
export function fixtureClient(): { client: GraphqlClient; sent: SentRequest[] } {
  const sent: SentRequest[] = [];
  const client = createClient({
    fetch: async (_url, init) => {
      const { id, variables } = JSON.parse(String(init?.body)) as { id: string; variables: unknown };
      const op = allowlist.operations.find((o) => o.sha256 === id);
      sent.push({ id, operation: op?.name ?? "?", variables });
      const set = op ? (fixtures[op.name as OperationName] as readonly { variables: unknown; data: unknown }[] | undefined) : undefined;
      const hit = set?.find((f) => JSON.stringify(f.variables) === JSON.stringify(variables));
      if (!hit) return Response.json({ errors: [{ message: `no fixture for ${op?.name} with ${JSON.stringify(variables)}` }] }, { status: 400 });
      return Response.json({ data: hit.data });
    },
  });
  return { client, sent };
}
