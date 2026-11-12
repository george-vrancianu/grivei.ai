import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { consortiumRecord, naturalPersonRecord } from "../../../../samples/fixtureData.ts";
import { RecordParties } from "./index.ts";

const meta = { title: "Domain/RecordResultRow/RecordParties", component: RecordParties } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const parties = (row: typeof consortiumRecord): Story["render"] => (_a, { globals }) => (
  <RecordParties record={row.record} entityHref={(entity, role) => `/explore/${role}/${entity.key}`} copy={sampleCopy.recordRow(localeOf(globals["locale"]))} />
);
export const Consortium: Story = { render: parties(consortiumRecord) };
export const NaturalPerson: Story = { render: parties(naturalPersonRecord) };
