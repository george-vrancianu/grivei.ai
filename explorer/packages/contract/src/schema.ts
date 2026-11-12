import { readFileSync } from "node:fs";
import { buildSchema, GraphQLScalarType, type GraphQLSchema } from "graphql";
import { schemaPath } from "./paths.ts";

/** ISO 3166-2:RO county codes, Bucharest included (the map's 42 areas). */
export const COUNTY_CODES = [
  "AB", "AR", "AG", "BC", "BH", "BN", "BT", "BV", "BR", "BZ", "CL", "CS", "CJ", "CT", "CV", "DB", "DJ", "GL", "GR", "GJ",
  "HR", "HD", "IL", "IS", "IF", "MM", "MH", "MS", "NT", "OT", "PH", "SM", "SJ", "SB", "SV", "TR", "TM", "TL", "VS",
  "VL", "VN", "B",
].map((c) => `RO-${c}`);

/** The off-map tiles a MapArea can name instead of a county. */
export const OFF_MAP_AREAS = ["NATIONAL", "UNPLACED", "UNKNOWN_SUPPLIER_COUNTY"] as const;

const isCalendarDate = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!;
};

const checks: Record<string, (v: string) => boolean> = {
  Bani: (v) => /^\d+$/.test(v),
  Date: isCalendarDate,
  DateTime: (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v) && isCalendarDate(v.slice(0, 10)),
  CountyCode: (v) => COUNTY_CODES.includes(v),
  MapArea: (v) => COUNTY_CODES.includes(v) || (OFF_MAP_AREAS as readonly string[]).includes(v),
  AreaKey: (v) => checks.MapArea!(v) || /^\d{1,7}$/.test(v),
  Siruta: (v) => /^\d{1,7}$/.test(v),
};

/** The SDL with its custom scalars made strict, so values and variables are checked, not passed through. */
export function loadSchema(): GraphQLSchema {
  const schema = buildSchema(readFileSync(schemaPath, "utf8"));
  for (const [name, ok] of Object.entries(checks)) {
    const scalar = schema.getType(name);
    if (!(scalar instanceof GraphQLScalarType)) throw new Error(`schema has no scalar ${name}`);
    const check = (v: unknown) => {
      if (typeof v !== "string" || !ok(v)) throw new TypeError(`${name} cannot represent ${JSON.stringify(v)}`);
      return v;
    };
    scalar.serialize = check;
    scalar.parseValue = check;
    scalar.parseLiteral = (ast) => check("value" in ast ? ast.value : undefined);
  }
  return schema;
}
