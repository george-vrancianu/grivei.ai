import type { OrganisationPeopleData, PersonPageData } from "../types.ts";

const provenance = { source: "ONRC" as const, url: "https://data.gov.ro/dataset/firme-06-05-2026", via: "Firme înregistrate la Registrul Comerțului până la data de 06.05.2026", kind: "BULK" as const, fetchedAt: "2026-11-13T04:00:00Z" };

/** The public view of a SEAP counterparty's administrators: birth year each, one unlinked role holder, no person link. Invented. */
export const peoplePublic: OrganisationPeopleData = {
  holders: [
    { name: "IONESCU MARIA", role: "administrator", birthYear: 1980, person: null },
    { name: "POPESCU ION", role: "administrator", birthYear: 1975, person: null },
    { name: "SC SERVICII EXEMPLU SRL", role: "reprezentant al persoanei juridice", birthYear: null, person: null },
  ],
  snapshot: "2026-05-06",
  provenance,
};

/** The same in a Private view: each linked holder carries a person page, the unlinked one never. */
export const peoplePrivate: OrganisationPeopleData = {
  ...peoplePublic,
  holders: peoplePublic.holders.map((h, i) => (h.birthYear === null ? h : { ...h, person: { id: `0123456789abcdef0123456789abcde${i}` } })),
};

/** An organisation tied to public money for which ONRC lists no holder (a sole trader's, an IF's, or none). */
export const peopleNone: OrganisationPeopleData = { holders: [], snapshot: "2026-05-06", provenance: { ...provenance, url: null } };

/** A person with roles in three organisations, one with no entity page. */
export const personPage: PersonPageData = {
  id: "0123456789abcdef0123456789abcdef",
  name: "POPESCU ION",
  birthYear: 1975,
  roleCount: 3,
  roles: [
    { organisationName: "ALFA ONRC SRL", entityKey: "3100020", entityRole: "SUPPLIER", role: "administrator" },
    { organisationName: "BETA ONRC SRL", entityKey: "3100039", entityRole: "AUTHORITY", role: "reprezentant legal" },
    { organisationName: "FARA CUI SRL", entityKey: null, entityRole: null, role: "administrator" },
  ],
  snapshot: "2026-05-06",
  provenance,
};

/** One role, a long compound name with comma-below letters. */
export const personSingleRole: PersonPageData = {
  ...personPage,
  id: "fedcba9876543210fedcba9876543210",
  name: "DUMITRESCU ȘTEFAN-VLAD CONSTANTIN-ALEXANDRU",
  birthYear: 1970,
  roleCount: 1,
  roles: [{ organisationName: "DUBLA ONRC SA", entityKey: "3100063", entityRole: "SUPPLIER", role: "administrator" }],
  provenance: { ...provenance, url: null },
};
