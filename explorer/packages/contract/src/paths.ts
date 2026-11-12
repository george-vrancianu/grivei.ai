import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
export const schemaPath = fileURLToPath(new URL("schema/schema.graphql", root));
export const operationsDir = fileURLToPath(new URL("operations/", root));
export const allowlistPath = fileURLToPath(new URL("generated/persisted-queries.json", root));
