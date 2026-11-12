import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const eslint = new ESLint({ cwd: root });

async function lint(code: string, file: string) {
  const [result] = await eslint.lintText(code, { filePath: resolve(root, file) });
  return result!.messages.filter((m) => m.severity === 2);
}

const appFile = "packages/app/src/Example/Example.tsx";
const uiFile = "packages/ui/src/atoms/Example/Example.tsx";

describe("the UI library is the only door to MUI", () => {
  it("rejects @mui/material imported by app code", async () => {
    const problems = await lint(`import { Button } from "@mui/material";\nexport const X = Button;\n`, appFile);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toMatch(/@grivei\/ui/);
  });

  it.each([
    ["a deep import", `import Button from "@mui/material/Button";`],
    ["a third-level import", `import x from "@mui/material/styles/createTheme";`],
    ["an icons import", `import Icon from "@mui/icons-material/Close";`],
    ["an @emotion import", `import { css } from "@emotion/react";`],
    ["a re-export", `export { Button } from "@mui/material";`],
    ["a dynamic import", `export const load = () => import("@mui/material");`],
    ["a require call", `const mui = require("@mui/material");\nexport { mui };`],
  ])("rejects %s in app code", async (_name, code) => {
    expect((await lint(code + "\n", appFile)).length).toBeGreaterThan(0);
  });

  it.each(["js", "jsx", "mjs", "cjs", "mts", "cts"])("rejects @mui/material in a .%s file in app code", async (ext) => {
    const problems = await lint(`import { Button } from "@mui/material";\nexport const X = Button;\n`, `packages/app/src/Example/x.${ext}`);
    expect(problems.some((m) => /@grivei\/ui/.test(m.message))).toBe(true);
  });

  it("rejects MUI imports in the contract package and in storybook config too", async () => {
    expect(await lint(`import { Box } from "@mui/material";\nexport const X = Box;\n`, "packages/contract/src/x.ts")).not.toHaveLength(0);
    expect(await lint(`import { Box } from "@mui/material";\nexport const X = Box;\n`, ".storybook/preview.tsx")).not.toHaveLength(0);
  });

  it("accepts the same import from @grivei/ui in app code", async () => {
    expect(await lint(`import { Button } from "@grivei/ui";\nexport const X = Button;\n`, appFile)).toEqual([]);
  });

  it("lets packages/ui import @mui/* and @emotion/*", async () => {
    const code = `import MuiButton from "@mui/material/Button";\nimport { css } from "@emotion/react";\nexport const X = [MuiButton, css];\nexport const load = () => import("@mui/material");\n`;
    expect(await lint(code, uiFile)).toEqual([]);
  });
});
