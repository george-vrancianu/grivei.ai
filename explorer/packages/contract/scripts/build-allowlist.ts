// Writes generated/persisted-queries.json from operations/*.graphql.
// `--check` fails (exit 1) when the committed file is stale instead of writing it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { allowlistPath } from "../src/paths.ts";
import { buildAllowlist } from "../src/operations.ts";

const next = JSON.stringify(buildAllowlist(), null, 2) + "\n";

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(allowlistPath, "utf8");
  } catch {
    // no allowlist yet: treated as stale below
  }
  if (current !== next) {
    console.error("generated/persisted-queries.json is stale: run `npm run codegen` in explorer/packages/contract");
    process.exit(1);
  }
  console.log("persisted-queries.json is up to date");
} else {
  mkdirSync(dirname(allowlistPath), { recursive: true });
  writeFileSync(allowlistPath, next);
  console.log("wrote generated/persisted-queries.json");
}
