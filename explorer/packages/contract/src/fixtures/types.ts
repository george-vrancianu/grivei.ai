import type { DocumentNode } from "graphql";

/** What a fixture is for. Beyond this, `observedStates` derives what the data actually shows. */
export type FixtureKind = "typical" | "empty" | "extreme";

export interface Fixture<Data, Variables> {
  /** Unique within its operation. */
  name: string;
  kind: FixtureKind;
  description: string;
  /** The variables the page would send. */
  variables: Variables;
  /** The response `data`, exactly as the operation selects it. */
  data: Data;
}

export type FixtureSet<Data, Variables> = readonly Fixture<Data, Variables>[];

export type { DocumentNode };
