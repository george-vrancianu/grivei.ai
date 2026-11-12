import type { AddressInfo } from "node:net";
import { afterAll, describe, expect, it } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
import { loadSchema, validateResponse } from "@grivei/contract/node";
import { parse } from "graphql";
import type { MainScreenQuery } from "@grivei/contract";
import { createApi } from "./server.ts";
import type { RecordRow, Store } from "./store.ts";

const row = (over: Partial<RecordRow>): RecordRow => ({
  code: "DA1", title: "Hârtie", date: "2022-03-30", kind: "DA", channel: "DIRECT_PURCHASE", procedure: null, value: "120050", counted: "120050",
  authority: { cui: "1000001", name: "COMUNA EXEMPLU" }, winners: [{ cui: "2000001", name: "CURAT SRL" }], ...over,
});
const store: Store = {
  total: async () => ({ awarded: "420050", records: 2, noValue: 1 }),
  records: async ({ limit }) => [row({}), row({ code: "DA2", value: null, counted: null, winners: [] })].slice(0, limit),
  record: async () => null,
  dataThrough: async () => [{ kind: "DA", date: "2022-03-31" }],
};

const mainScreen = allowlist.operations.find((o) => o.name === "MainScreen")!;
const schema = loadSchema();
const api = createApi(store, schema);
const EMPTY = { filter: {} };

describe("the API answers persisted queries only", () => {
  it("refuses query text, even text identical to a persisted document", async () => {
    const r = await api.respond({ query: mainScreen.document, variables: EMPTY });
    expect(r.status).toBe(400);
    expect(r.body.errors?.[0]?.extensions?.code).toBe("PERSISTED_QUERY_ONLY");
    expect(r.body.data).toBeUndefined();
  });

  it("refuses a query text even when it comes with a valid id", async () => {
    expect((await api.respond({ id: mainScreen.sha256, query: "{ sources { id } }" })).status).toBe(400);
  });

  it("refuses an id that is not on the allowlist", async () => {
    const r = await api.respond({ id: "0".repeat(64), variables: EMPTY });
    expect(r.status).toBe(400);
    expect(r.body.errors?.[0]?.extensions?.code).toBe("PERSISTED_QUERY_NOT_FOUND");
  });

  it("refuses a body without an id", async () => {
    expect((await api.respond({ variables: EMPTY })).body.errors?.[0]?.extensions?.code).toBe("PERSISTED_QUERY_REQUIRED");
    expect((await api.respond([])).status).toBe(400);
  });
});

describe("MainScreen for the empty filter", () => {
  it("returns the Total and the Records list, and the response is valid for the contract", async () => {
    const r = await api.respond({ id: mainScreen.sha256, variables: EMPTY });
    expect(r.status).toBe(200);
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(mainScreen.document), r.body.data, EMPTY)).toEqual([]);
    const data = r.body.data as MainScreenQuery;
    const search = data.seap.search;
    expect(search.total).toEqual({ awarded: "420050", records: 2, suspectLeftOut: 0, noValue: 1, frameworkCeilings: "0", estimated: false });
    expect(search.records.count).toBe(2);
    expect(search.records.rows.map((x) => [x.record.code, x.record.value, x.record.badges, x.record.winners.length])).toEqual([
      ["DA1", "120050", [], 1],
      ["DA2", null, ["NO_VALUE"], 0],
    ]);
    expect(data.sources).toEqual([{ id: "SEAP", name: "SEAP", harvested: true, dataThrough: [{ kind: "DA", date: "2022-03-31" }] }]);
  });

  it("says plainly that a filter is not served yet, instead of ignoring it", async () => {
    const r = await api.respond({ id: mainScreen.sha256, variables: { filter: { q: "hartie" } } });
    expect(r.status).toBe(200);
    expect(r.body.errors?.[0]).toMatchObject({ message: expect.stringContaining("not served yet"), extensions: { code: "NOT_IMPLEMENTED" } });
  });

  it("does not leak a database failure to the client", async () => {
    const broken = createApi({ ...store, total: async () => { throw new Error("password authentication failed for user x"); } }, schema);
    const r = await broken.respond({ id: mainScreen.sha256, variables: EMPTY });
    expect(JSON.stringify(r.body)).not.toContain("password");
    expect(r.body.errors?.[0]?.extensions?.code).toBe("INTERNAL");
  });
});

describe("over HTTP", () => {
  const started = api.listen(0, "127.0.0.1");
  afterAll(async () => (await started).close());
  const url = async () => `http://127.0.0.1:${((await started).address() as AddressInfo).port}`;

  it("answers a persisted query on POST /graphql, refuses text with 400, and has a health check", async () => {
    const post = async (body: string) => fetch(`${await url()}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body });
    const ok = await post(JSON.stringify({ id: mainScreen.sha256, variables: EMPTY }));
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { data: MainScreenQuery }).data.seap.search.total.records).toBe(2);
    expect((await post(JSON.stringify({ query: "{ sources { id } }" }))).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect((await fetch(`${await url()}/graphql`)).status).toBe(404);
    expect((await fetch(`${await url()}/healthz`)).status).toBe(200);
  });
});
