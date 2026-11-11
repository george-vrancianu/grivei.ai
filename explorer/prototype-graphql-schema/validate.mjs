// PROTOTYPE: run with `node validate.mjs` after `npm i graphql` (or via npx).
import { readFileSync } from "node:fs";
import { buildSchema, parse, validate } from "graphql";

const dir = new URL(".", import.meta.url);
const schema = buildSchema(readFileSync(new URL("schema.graphql", dir), "utf8"));
const errors = validate(schema, parse(readFileSync(new URL("screens.graphql", dir), "utf8")));
for (const e of errors) console.error(e.message);
console.log(errors.length ? `${errors.length} error(s)` : "schema builds; every screen query validates");
process.exit(errors.length ? 1 : 0);
