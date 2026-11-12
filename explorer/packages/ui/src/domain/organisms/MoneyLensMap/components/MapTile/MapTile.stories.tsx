import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { pick } from "../../../../../workbench/index.ts";
import { localeOf } from "../../../../samples/copy.ts";
import { MapTile } from "./index.ts";

const meta = { title: "Domain/MoneyLensMap/MapTile" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const UnselectedAndSelected: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const title = pick(locale, { en: "National", ro: "Național" });
    return (
      <Stack spacing={1} sx={{ maxWidth: 260 }}>
        <MapTile title={title}><Typography component="span" variant="body2"><MoneyAmount bani="8600000000000" locale={locale} /></Typography></MapTile>
        <MapTile title={title} selected><Typography component="span" variant="body2"><MoneyAmount bani="8600000000000" locale={locale} /></Typography></MapTile>
      </Stack>
    );
  },
};
