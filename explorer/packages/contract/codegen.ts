import type { CodegenConfig } from "@graphql-codegen/cli";

// Two outputs, both committed (`npm run codegen:check` fails when stale):
//  - src/generated/schema.ts      schema types + resolver types, for the API
//  - src/generated/operations.ts  schema types + operation result/variable types, for the app and fixtures
const scalars = {
  Bani: "string",
  SignedBani: "string",
  Date: "string",
  DateTime: "string",
  MapArea: "string",
  AreaKey: "string",
  CountyCode: "string",
  Siruta: "string",
};

const config: CodegenConfig = {
  schema: "schema/schema.graphql",
  documents: "operations/*.graphql",
  generates: {
    "src/generated/schema.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: { scalars, enumsAsTypes: true, useTypeImports: true, avoidOptionals: { field: true, inputValue: false } },
    },
    "src/generated/operations.ts": {
      plugins: ["typescript-operations"],
      config: { scalars, enumsAsTypes: true, useTypeImports: true, avoidOptionals: { field: true, inputValue: false }, skipTypename: true },
    },
  },
};
export default config;
