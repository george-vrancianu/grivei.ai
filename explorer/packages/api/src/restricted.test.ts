import { afterEach, describe, expect, it, vi } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
import { loadSchema } from "@grivei/contract/node";
import { graphql } from "graphql";
import { createApi } from "./server.ts";
import { rootValue } from "./resolvers.ts";
import { restrictedShown } from "./restricted.ts";
import type { EntityRow, OrganisationPeopleRow, PersonRow, Store } from "./store.ts";

const schema = loadSchema();
const provenance = { url: "https://data.gov.ro/dataset/firme-06-05-2026", via: "Firme", fetchedAt: "2026-11-13T04:00:00Z" };
const entity: EntityRow = { key: "100", displayName: "ALFA SRL", identity: "CUI", cui: "100", foreignVatId: null, anafStatus: null, identityCurated: false, provenance: { source: "SEAP", via: null, fetchedAt: "2026-11-12T10:00:00Z" } };
const person: PersonRow = { id: "a".repeat(32), name: "POPESCU ION", birthYear: 1975, roles: [{ organisationName: "ALFA SRL", entityKey: "100", role: "administrator" }, { organisationName: "BETA SRL", entityKey: null, role: "administrator" }], snapshot: "2026-05-06", provenance };
const holders = (personIds: boolean): OrganisationPeopleRow => ({
  holders: [{ name: "POPESCU ION", role: "administrator", birthYear: 1975, personId: personIds ? person.id : null }, { name: "NEGRU TUDOR", role: "administrator", birthYear: null, personId: null }], snapshot: "2026-05-06", provenance });

function mock(roles: ("AUTHORITY" | "SUPPLIER")[] = ["SUPPLIER"]) {
  const calls = { people: vi.fn(async (_cui: string, o: { personIds: boolean }) => holders(o.personIds)), person: vi.fn(async (id: string) => (id === person.id ? person : null)) };
  const store = { entity: async () => entity, roles: async () => roles, ...calls } as unknown as Store;
  return { store, calls };
}

const ORGANISATION = `{ entity(key: "100") { people { snapshot holders { name role birthYear person { id } } } } }`;
const PERSON = `{ person(id: "${"a".repeat(32)}") { id name birthYear roleCount roles { organisationName entityKey role } } }`;
const run = async (store: Store, restricted: boolean | undefined, source: string) => {
  const r = await graphql({ schema, source, rootValue: rootValue(store, restricted === undefined ? {} : { restricted }) });
  expect(r.errors).toBeUndefined();
  return r.data as Record<string, any>;
};

describe("the Restricted switch value", () => {
  it("is on only for the exact value `show`", () => {
    expect(restrictedShown({ GRIVEI_RESTRICTED: "show" })).toBe(true);
    for (const v of [undefined, "", "SHOW", "Show", " show", "show ", "true", "1", "yes", "on", "hide", "shown"]) expect(restrictedShown({ GRIVEI_RESTRICTED: v }), String(v)).toBe(false);
    expect(restrictedShown({})).toBe(false);
  });
});

describe("the resolvers enforce the switch", () => {
  it("with it off: no person page, no count, no person link, and the store is not asked for ids or for the person", async () => {
    for (const restricted of [undefined, false]) {
      const { store, calls } = mock();
      const data = { ...(await run(store, restricted, ORGANISATION)), ...(await run(store, restricted, PERSON)) };
      expect(data.person).toBeNull();
      expect(JSON.stringify(data)).not.toContain(person.id);
      expect(data.entity.people.holders).toEqual([
        { name: "POPESCU ION", role: "administrator", birthYear: 1975, person: null }, { name: "NEGRU TUDOR", role: "administrator", birthYear: null, person: null }]);
      expect(calls.person).not.toHaveBeenCalled();
      expect(calls.people).toHaveBeenCalledWith("100", { personIds: false });
    }
  });

  it("with it on: the person page, its roles and their count, and the link of a linked holder only", async () => {
    const { store } = mock();
    const org = await run(store, true, ORGANISATION);
    expect(org.entity.people.holders.map((h: any) => h.person)).toEqual([{ id: person.id }, null]);  // the unlinked role holder never links
    const page = await run(store, true, PERSON);
    expect(page.person).toEqual({ id: person.id, name: "POPESCU ION", birthYear: 1975, roleCount: 2, roles: person.roles });
    expect((await run(store, true, `{ person(id: "nobody") { id } }`)).person).toBeNull();
  });

  it("names the administrators of a SEAP counterparty only, in either mode", async () => {
    for (const restricted of [false, true]) {
      const { store, calls } = mock([]);  // never a SEAP counterparty: an organisation that exists only in ONRC
      expect((await run(store, restricted, ORGANISATION)).entity.people).toBeNull();
      expect(calls.people).not.toHaveBeenCalled();
    }
    const { store } = mock(["AUTHORITY"]);
    expect((await run(store, false, ORGANISATION)).entity.people.holders).toHaveLength(2);
  });
});

describe("the API reads the switch once", () => {
  afterEach(() => vi.unstubAllEnvs());
  const personPage = allowlist.operations.find((o) => o.name === "PersonPage")!;
  const ask = (api: ReturnType<typeof createApi>) => api.respond({ id: personPage.sha256, variables: { id: person.id } });

  it("hides it by default and for any other value, shows it for `show`, and does not look again", async () => {
    vi.stubEnv("GRIVEI_RESTRICTED", "");
    expect(((await ask(createApi(mock().store))).body.data as any).person).toBeNull();
    vi.stubEnv("GRIVEI_RESTRICTED", "true");
    expect(((await ask(createApi(mock().store))).body.data as any).person).toBeNull();
    vi.stubEnv("GRIVEI_RESTRICTED", "show");
    const shown = createApi(mock().store);
    expect(((await ask(shown)).body.data as any).person.roleCount).toBe(2);
    vi.stubEnv("GRIVEI_RESTRICTED", "hide");
    expect(((await ask(shown)).body.data as any).person.roleCount).toBe(2);  // read when the API was created
    expect(((await ask(createApi(mock().store))).body.data as any).person).toBeNull();
  });

  it("an explicit option beats the environment (tests pin it)", async () => {
    vi.stubEnv("GRIVEI_RESTRICTED", "show");
    expect(((await ask(createApi(mock().store, schema, { restricted: false }))).body.data as any).person).toBeNull();
  });
});
