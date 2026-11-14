import type { PersonPageQuery, PersonPageQueryVariables } from "../generated/operations.ts";
import type { FixtureSet } from "./types.ts";

const ID = "0123456789abcdef0123456789abcdef";
const provenance = {
  source: "ONRC" as const, url: "https://data.gov.ro/dataset/firme-06-05-2026", via: "Firme înregistrate la Registrul Comerțului până la data de 06.05.2026", kind: "BULK" as const,
  fetchedAt: "2026-11-13T04:00:00Z",
};

/**
 * The person page (Restricted, #177). A Private view gets the person; every other host gets `null`, whatever the id: the resolver answers nothing, not even a count.
 * The recorded EntityOverview cases carry the organisation side (`people`).
 */
export const personPage: FixtureSet<PersonPageQuery, PersonPageQueryVariables> = [
  {
    name: "private-view-three-roles", kind: "typical",
    description: "a Private view (the host's switch is `show`): a person with roles in three organisations, one of them with no entity page (its registration has no valid CUI)",
    variables: { id: ID },
    data: { person: {
      id: ID, name: "POPESCU ION", birthYear: 1975, roleCount: 3,
      roles: [
        { organisationName: "ALFA SRL", entityKey: "30000002", entityRole: "SUPPLIER", role: "administrator" },
        { organisationName: "BETA SRL", entityKey: "30000003", entityRole: "AUTHORITY", role: "reprezentant legal" },
        { organisationName: "FARA CUI SRL", entityKey: null, entityRole: null, role: "administrator" },
      ],
      snapshot: "2026-05-06", provenance,
    } },
  },
  {
    name: "restricted-off-or-unknown-id", kind: "empty",
    description: "the host's switch is not `show`, or no confirmed person has the id: null, and no count either",
    variables: { id: "ffffffffffffffffffffffffffffffff" },
    data: { person: null },
  },
  {
    name: "one-role-and-a-long-name", kind: "extreme",
    description: "a person with one role and a long compound name with diacritics (comma-below letters), shown as ONRC writes it",
    variables: { id: "fedcba9876543210fedcba9876543210" },
    data: { person: {
      id: "fedcba9876543210fedcba9876543210", name: "DUMITRESCU ȘTEFAN-VLAD CONSTANTIN-ALEXANDRU", birthYear: 1970, roleCount: 1,
      roles: [{ organisationName: "DUBLA ONRC SA", entityKey: "30000006", entityRole: "SUPPLIER", role: "administrator" }],
      snapshot: "2026-05-06", provenance,
    } },
  },
];
