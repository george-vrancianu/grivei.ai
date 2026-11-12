import { describe, expect, it } from "vitest";
import { pathFor, parsePath, switchLocalePath, type Route } from "./routes.ts";

const ROUTES: Route[] = [
  { name: "main" },
  { name: "search" },
  { name: "entity", entity: "authority", key: "4305857", view: "overview" },
  { name: "entity", entity: "authority", key: "4305857", view: "records" },
  { name: "entity", entity: "authority", key: "4305857", view: "relationships" },
  { name: "entity", entity: "supplier", key: "name-popescu-srl", view: "overview" },
  { name: "entity", entity: "supplier", key: "vat-DE123", view: "records" },
  { name: "entity", entity: "supplier", key: "name-ü ș/x", view: "relationships" },
  { name: "record", code: "CAN1170001" },
  { name: "coverage" },
  { name: "methodology" },
];

describe("routes", () => {
  it.each(["en", "ro"] as const)("every route survives path -> route -> path in %s", (locale) => {
    for (const route of ROUTES) expect(parsePath(pathFor(locale, route))).toEqual({ locale, route });
  });

  it("puts English at /explore/ and Romanian at /ro/explore/", () => {
    expect(pathFor("en", { name: "coverage" })).toBe("/explore/coverage");
    expect(pathFor("ro", { name: "coverage" })).toBe("/ro/explore/coverage");
    expect(parsePath("/explore").locale).toBe("en");
    expect(parsePath("/ro/explore").locale).toBe("ro");
  });

  it.each(["/explore/nope", "/explore/authority", "/explore/authority/1/overview", "/explore/authority/1/records/x", "/explore/record", "/explore/coverage/x", "/explore/authority/%E0%A4%A"])(
    "treats %s as not found",
    (path) => expect(parsePath(path).route).toEqual({ name: "not-found" }),
  );

  it("switches language keeping the route and the query string", () => {
    expect(switchLocalePath("/explore/authority/42/records", "?q=pod&page=2", "ro")).toBe("/ro/explore/authority/42/records?q=pod&page=2");
    expect(switchLocalePath("/ro/explore/", "", "en")).toBe("/explore/");
    expect(switchLocalePath("/ro/explore/whatever", "?x=1", "en")).toBe("/explore/whatever?x=1");
  });
});
