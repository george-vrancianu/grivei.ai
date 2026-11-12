import { parse } from "graphql";
import { describe, expect, it } from "vitest";
import { loadSchema } from "./schema.ts";
import { validateResponse } from "./validate-response.ts";

const schema = loadSchema();
const check = (query: string, data: unknown, variables: Record<string, unknown> = {}) =>
  validateResponse(schema, parse(query), data, variables);

const Q = `query Q { seap { record(code: "X") { code value winners { naturalPerson entity { key } } } } }`;
const ok = { seap: { record: { code: "X", value: "100", winners: [{ naturalPerson: true, entity: null }] } } };

describe("validateResponse", () => {
  it("accepts a response that matches the selection exactly", () => {
    expect(check(Q, ok)).toEqual([]);
  });
  it("accepts a nullable object as null", () => {
    expect(check(Q, { seap: { record: null } })).toEqual([]);
  });
  it("rejects a missing field", () => {
    const bad = { seap: { record: { code: "X", winners: [] } } };
    expect(check(Q, bad).join("\n")).toMatch(/seap\.record\.value: missing/);
  });
  it("rejects a field the operation did not select", () => {
    const bad = { seap: { record: { ...ok.seap.record, title: "t" } } };
    expect(check(Q, bad).join("\n")).toMatch(/seap\.record\.title: not selected/);
  });
  it("rejects null in a non-null field", () => {
    const bad = { seap: { record: { ...ok.seap.record, code: null } } };
    expect(check(Q, bad).join("\n")).toMatch(/seap\.record\.code: null in a non-null field/);
  });
  it("rejects malformed custom scalars and unknown enum values", () => {
    const bad = { seap: { record: { ...ok.seap.record, value: "12.50" } } };
    expect(check(Q, bad).join("\n")).toMatch(/Bani/);
    const E = `query E { seap { record(code: "X") { channel } } }`;
    expect(check(E, { seap: { record: { channel: "CASH" } } }).join("\n")).toMatch(/channel/);
  });
  it("picks union members by __typename and follows fragments", () => {
    const U = `query U { signalRules { slug } s: seap { record(code: "X") { signals { numbers { __typename ...N } } } } }
      fragment N on SignalNumbers { ... on OverCapNumbers { value cap multiple } ... on NoPublicationNumbers { procedure } }`;
    const good = { signalRules: [], s: { record: { signals: [{ numbers: { __typename: "NoPublicationNumbers", procedure: "p" } }] } } };
    expect(check(U, good)).toEqual([]);
    const bad = { ...good, s: { record: { signals: [{ numbers: { __typename: "NoPublicationNumbers", value: "1" } }] } } };
    expect(check(U, bad)).not.toEqual([]);
  });
  it("checks variables against the operation's declarations", () => {
    const V = `query V($f: RecordFilter!) { seap { search(filter: $f) { total { records } } } }`;
    const data = { seap: { search: { total: { records: 1 } } } };
    expect(check(V, data, { f: { county: "RO-BV" } })).toEqual([]);
    expect(check(V, data, { f: { county: "RO-XX" } }).join("\n")).toMatch(/variables/);
    expect(check(V, data, {}).join("\n")).toMatch(/variables/);
  });
});
