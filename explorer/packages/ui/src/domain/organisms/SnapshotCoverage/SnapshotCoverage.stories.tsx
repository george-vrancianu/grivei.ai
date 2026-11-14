import { fixtures } from "@grivei/contract/fixtures";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import type { SnapshotCellData } from "../../types.ts";
import { SnapshotCoverage } from "./index.ts";

const meta = { title: "Domain/SnapshotCoverage", component: SnapshotCoverage } satisfies Meta<typeof SnapshotCoverage>;
export default meta;
type Story = StoryObj;

const recorded = fixtures.OnrcCoverage[0]!.data;
const cells = recorded.coverage.grid as SnapshotCellData[];
const dataThrough = recorded.sources.find((s) => s.id === "ONRC")!.dataThrough[0];

/** Two snapshots and a known gap for the month with none (a cell with no rule). */
export const SnapshotsAndAGap: Story = {
  render: (_args, { globals }) => <SnapshotCoverage cells={cells} dataThrough={dataThrough} locale={localeOf(globals["locale"])} copy={sampleOnrcCopy.snapshots(localeOf(globals["locale"]))} />,
};
/** No ONRC snapshot is held. */
export const NoSnapshot: Story = {
  render: (_args, { globals }) => <SnapshotCoverage cells={[]} dataThrough={undefined} locale={localeOf(globals["locale"])} copy={sampleOnrcCopy.snapshots(localeOf(globals["locale"]))} />,
};
