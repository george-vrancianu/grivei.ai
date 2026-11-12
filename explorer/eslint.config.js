import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * The UI library is the only door to MUI (ADR 0006): `@mui/*` and its styling engine
 * (`@emotion/*`) may be imported only inside `packages/ui`.
 */
const MUI_DOOR_PATTERNS = ["@mui/*", "@mui/*/*", "@mui/*/*/*", "@emotion/*"];
const MUI_DOOR_MESSAGE =
  "Import components from @grivei/ui. Only packages/ui may import @mui/* or @emotion/* (ADR 0006). Need a component it lacks? Add the wrapper to packages/ui first.";
const MUI_DOOR_REGEX = "^@(mui|emotion)";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/storybook-static/**", "**/generated/**", "**/coverage/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": ["error", { patterns: [{ group: MUI_DOOR_PATTERNS, message: MUI_DOOR_MESSAGE }] }],
      // no-restricted-imports does not see dynamic import() or require().
      "no-restricted-syntax": [
        "error",
        {
          selector: `ImportExpression[source.value=/${MUI_DOOR_REGEX}/]`,
          message: MUI_DOOR_MESSAGE,
        },
        {
          selector: `CallExpression[callee.name='require'][arguments.0.value=/${MUI_DOOR_REGEX}/]`,
          message: MUI_DOOR_MESSAGE,
        },
      ],
    },
  },
  {
    // The door itself.
    files: ["packages/ui/**"],
    rules: { "no-restricted-imports": "off", "no-restricted-syntax": "off" },
  },
);
