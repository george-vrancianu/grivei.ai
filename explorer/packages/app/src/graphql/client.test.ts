import { describe, expect, it } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json";
import { createClient, GraphqlError } from "./client.ts";
import { MainScreen } from "./operations.ts";

describe("the GraphQL client", () => {
  it("sends the persisted id and the variables, never query text", async () => {
    let seen: { url: string; init?: RequestInit } | undefined;
    const client = createClient({
      endpoint: "/graphql",
      fetch: async (url, init) => {
        seen = { url: String(url), init };
        return Response.json({ data: { ok: true } });
      },
    });
    await client.query(MainScreen, { filter: {} });
    expect(seen?.url).toBe("/graphql");
    expect(seen?.init?.method).toBe("POST");
    const body = JSON.parse(String(seen?.init?.body));
    expect(body).toEqual({ id: allowlist.operations.find((o) => o.name === "MainScreen")!.sha256, variables: { filter: {} } });
    expect(body.query).toBeUndefined();
  });

  it("throws the API's error, with its code", async () => {
    const client = createClient({
      fetch: async () => Response.json({ errors: [{ message: "nope", extensions: { code: "PERSISTED_QUERY_NOT_FOUND" } }] }, { status: 400 }),
    });
    await expect(client.query(MainScreen, { filter: {} })).rejects.toMatchObject({ code: "PERSISTED_QUERY_NOT_FOUND", message: "nope" });
    await expect(client.query(MainScreen, { filter: {} })).rejects.toBeInstanceOf(GraphqlError);
  });
});
