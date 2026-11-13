import type { Meta, StoryObj } from "@storybook/react-vite";
import { Typography } from "@grivei/ui";
import { catalogue } from "../../copy/index.ts";
import { AppShell } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/AppShell" };
export default meta;

export const Shell: StoryObj = {
  render: (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const base = locale === "ro" ? "/ro/explore" : "/explore";
    const other = locale === "ro" ? "en" : "ro";
    return (
      <AppShell
        copy={catalogue[locale]}
        switchTo={{ locale: other, href: other === "ro" ? "/ro/explore/" : "/explore/" }}
        current="explore"
        links={{ explore: `${base}/`, search: `${base}/search`, coverage: `${base}/coverage`, methodology: `${base}/methodology` }}
      >
        <Typography sx={{ p: 3 }}>{catalogue[locale].main.title}</Typography>
      </AppShell>
    );
  },
};
