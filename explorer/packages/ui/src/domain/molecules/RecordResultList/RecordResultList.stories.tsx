import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { resultSamples } from "../../samples/fixtureData.ts";
import { RecordResultList } from "./index.ts";

const meta = { title: "Domain/RecordResultList", component: RecordResultList } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const EveryState: Story = {
  render: (_a, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <RecordResultList
        rows={resultSamples.variety.records.rows}
        entityHref={(e, role) => `/explore/${role}/${e.key}`}
        recordHref={(r) => `/explore/record/${r.code}`}
        locale={locale}
        copy={sampleCopy.recordRow(locale)}
      />
    );
  },
};
