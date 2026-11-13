import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { manyAliasesOverview, supplierHeader } from "../../../../samples/fixtureData.ts";
import { SeapNamesLine } from "./index.ts";

const meta = { title: "Domain/EntityHeader/SeapNamesLine", component: SeapNamesLine } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const line = (aliases: typeof supplierHeader.aliases): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <SeapNamesLine aliases={aliases} locale={locale} copy={sampleCopy.entityHeader(locale).seapNames} />;
  },
});

export const OneSpelling = line(supplierHeader.aliases.slice(0, 1));
export const ManySpellings = line(manyAliasesOverview.aliases);
