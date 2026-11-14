// Hand-written fixture of the Party options (#181). The lists are invented-but-realistic AEP list names as registered (source data, shown as published);
// a recorded run holds no AEP archive, so the real operation answers an empty list there (Seam 1 asserts that).
import type { PartyOptionsQuery, PartyOptionsQueryVariables } from "../generated/operations.ts";
import type { FixtureSet } from "./types.ts";

export const partyOptionsHand: FixtureSet<PartyOptionsQuery, PartyOptionsQueryVariables> = [
  {
    name: "lists-as-registered",
    kind: "typical",
    description: "the lists the Party chip offers, largest first: parties and an alliance under its registered name (never Independent)",
    variables: {},
    data: { seap: { partyOptions: [
      { party: "PARTIDUL SOCIAL DEMOCRAT", records: 4200 },
      { party: "PARTIDUL NAȚIONAL LIBERAL", records: 3900 },
      { party: "ALIANȚA USR PLUS", records: 800 },
      { party: "UNIUNEA DEMOCRATĂ MAGHIARĂ DIN ROMÂNIA", records: 640 },
    ] } },
  },
  {
    name: "no-lists-without-aep",
    kind: "empty",
    description: "a graph built without AEP's mandates (or before them): no list to offer, so the Party chip is absent and everything else works",
    variables: {},
    data: { seap: { partyOptions: [] } },
  },
];
