import allowlist from "@grivei/contract/persisted-queries.json";
import type { MainScreenQuery, MainScreenQueryVariables } from "@grivei/contract";

/** Typed registry of the persisted operations the app sends: the name, its id on the allowlist, its result and variables. */
export interface Operation<Data, Variables> {
  readonly name: string;
  readonly id: string;
  /** Phantom fields carrying the types; never read. */
  readonly types?: { data: Data; variables: Variables };
}

function operation<Data, Variables>(name: string): Operation<Data, Variables> {
  const found = allowlist.operations.find((o) => o.name === name);
  if (!found) throw new Error(`${name} is not on the persisted-query allowlist (run codegen in packages/contract)`);
  return { name, id: found.sha256 };
}

export const MainScreen = operation<MainScreenQuery, MainScreenQueryVariables>("MainScreen");
