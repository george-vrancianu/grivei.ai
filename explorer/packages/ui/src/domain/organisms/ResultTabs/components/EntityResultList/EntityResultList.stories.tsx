import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { resultSamples } from "../../../../samples/fixtureData.ts";
import { EntityResultList } from "./index.ts";

const meta = { title: "Domain/ResultTabs/EntityResultList", component: EntityResultList } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const Suppliers: Story = {
  render: (_a, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <EntityResultList rows={resultSamples.variety.suppliers.rows} role="supplier" entityHref={(e, role) => `/explore/${role}/${e.key}`} locale={locale} copy={sampleCopy.entityRow(locale)} />;
  },
};
