import { readFileSync } from "node:fs";
import { isObjectType, parse, print, validate, visit } from "graphql";
import { describe, expect, it } from "vitest";
import { allowlistPath, schemaPath } from "./paths.ts";
import { buildAllowlist, fragmentMap, loadDefinitions, operationDefinitions, persistedOperations } from "./operations.ts";
import { loadSchema } from "./schema.ts";

const schema = loadSchema();
const defs = loadDefinitions();

describe("schema", () => {
  it("has no open Q<n> decision markers", () => {
    expect(readFileSync(schemaPath, "utf8")).not.toMatch(/#\s*Q\d+\b|\bQ\d+\b.*\?/);
  });
});

describe("operations", () => {
  it("all validate against the schema", () => {
    expect(validate(schema, defs).map((e) => e.message)).toEqual([]);
  });
  it("are all named, once each", () => {
    const names = operationDefinitions(defs).map((o) => o.name?.value);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
  it("cover every screen", () => {
    const names = operationDefinitions(defs).map((o) => o.name!.value).sort();
    expect(names).toEqual([
      "CoverageLens", "CoveragePage", "EntityOverview", "EntityRecords", "EntityRelationships",
      "FullResultsAuthorities", "FullResultsRecords", "FullResultsSuppliers", "MainScreen",
      "MethodologyBaseRates", "MethodologyReferenceSources", "RecordPage", "ZoomedCounty",
    ]);
  });
  it("are queries only", () => {
    expect(operationDefinitions(defs).every((o) => o.operation === "query")).toBe(true);
  });
  it("leave no fragment unused", () => {
    const used = new Set<string>();
    visit(defs, { FragmentSpread: (s) => void used.add(s.name.value) });
    expect([...fragmentMap(defs).keys()].filter((f) => !used.has(f))).toEqual([]);
  });
  it("select no copy: every free-text String field in the schema is one of the known source-data or identifier fields", () => {
    // A new String field is a decision: is it Romanian source data or an identifier (add it here),
    // or prose (it belongs in the frontend's bilingual catalogue, as a slug, enum or number)?
    const allowed = new Set([
      "RecordFilterEcho.qFolded", "RecordFilterValue.cpv",
      "Provenance.url", "Provenance.via",
      "Source.name", "DataThrough.kind", "GapCell.kind", "GapCell.quarter", "GapCell.note",
      "Entity.displayName", "Entity.cui", "Entity.foreignVatId", "Entity.anafStatus",
      "Placement.locality", "Alias.name",
      "Party.publishedName", "Cpv.code", "Cpv.description",
      "SeapRecord.title", "SeapRecord.procedure", "SeapRecord.contractType",
      "FacetCount.value", "MonthTotal.month", "Uat.name", "County.name", "AreaTotal.name",
      // ONRC's registration as published (#175): identifiers, ONRC's own nomenclature words and the seat; none is prose of ours
      "OnrcRegistration.registrationNumber", "OnrcRegistration.legalForm", "OnrcStatus.name", "OnrcCaen.code", "OnrcSeat.county", "OnrcSeat.locality", "OnrcSeat.address", "OnrcSeat.postalCode", "OnrcAlias.name",
      "SplittingNumbers.cpvGroup", "NoPublicationNumbers.procedure", "MatchedField.text",
      // AMEPIP's list row (#183): source data as published, and the Reference source's identifier, name and page
      "PublicEnterprise.listedAs", "PublicEnterprise.registrationNumber", "PublicEnterprise.status", "PublicEnterprise.url", "PublicEnterprise.via", "PublicEnterprise.license",
      "ReferenceSource.id", "ReferenceSource.name", "ReferenceSource.url",
      // MF's statements (#179): the file's name, its links, the dataset's title and the licence, as the portal publishes them
      // BaniPartide's donations (#182): the party and the date cell as published, and the publisher's own links, name and licence
      "FirmDonation.party", "FirmDonation.dateText", "DonationSource.datasetUrl", "DonationSource.license", "DonationSource.licenseUrl", "DonationSource.publisher", "DonationSource.publisherUrl", "DonationSource.underlyingUrl",
      "FinancialSource.file", "FinancialSource.datasetUrl", "FinancialSource.fileUrl", "FinancialSource.via", "FinancialSource.license",
    ]);
    const found: string[] = [];
    for (const type of Object.values(schema.getTypeMap())) {
      if (type.name.startsWith("__") || !isObjectType(type)) continue;
      for (const field of Object.values(type.getFields())) {
        if (String(field.type).replace(/[[\]!]/g, "") === "String") found.push(`${type.name}.${field.name}`);
      }
    }
    expect(found.filter((f) => !allowed.has(f))).toEqual([]);
  });
  it("has no field whose job is prose", () => {
    expect(readFileSync(schemaPath, "utf8")).not.toMatch(/^\s*(label|sentence|explanation|reason|caveat\w*)\s*:/im);
  });
});

describe("persisted-query allowlist", () => {
  it("is what the operations produce (run `npm run codegen` when this fails)", () => {
    expect(readFileSync(allowlistPath, "utf8")).toBe(JSON.stringify(buildAllowlist(), null, 2) + "\n");
  });
  it("hashes each self-contained document", () => {
    for (const o of persistedOperations()) {
      expect(o.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(print(parse(o.document))).toBe(o.document.trimEnd());
      expect(operationDefinitions(parse(o.document))).toHaveLength(1);
    }
  });
  it("validates every document on its own against the schema", () => {
    for (const o of persistedOperations()) expect(validate(schema, parse(o.document)).map((e) => e.message), o.name).toEqual([]);
  });
});
