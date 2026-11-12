import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { authorityHeader, nameOnlySupplierHeader } from "../../../../samples/fixtureData.ts";
import { SourceLine } from "./index.ts";

const meta = { title: "Domain/EntityHeader/SourceLine", component: SourceLine } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const line = (entity: typeof authorityHeader): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <SourceLine entity={entity} locale={locale} copy={sampleCopy.entityHeader(locale).source} />;
  },
});

export const FromAnaf = line(authorityHeader);
export const FromSeapWhenAnafHasNoAnswer = line(nameOnlySupplierHeader);
