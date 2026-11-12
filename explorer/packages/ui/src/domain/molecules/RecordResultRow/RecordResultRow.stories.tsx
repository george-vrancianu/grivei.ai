import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { consortiumRecord, highlightedRecord, naturalPersonRecord, noValueRecord, resultSamples } from "../../samples/fixtureData.ts";
import type { RecordResult } from "../../types.ts";
import { RecordResultRow } from "./index.ts";

const meta = { title: "Domain/RecordResultRow", component: RecordResultRow } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const list = (rows: RecordResult[], locale: "en" | "ro") => (
  <Stack component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
    {rows.map((row) => (
      <RecordResultRow
        key={row.record.code}
        row={row}
        recordHref={`/explore/record/${row.record.code}`}
        entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
        locale={locale}
        copy={sampleCopy.recordRow(locale)}
      />
    ))}
  </Stack>
);

export const WithMatchedText: Story = { render: (_a, { globals }) => list([highlightedRecord], localeOf(globals["locale"])) };
/** Two winners: the full value, with the consortium marker. */
export const Consortium: Story = { render: (_a, { globals }) => list([consortiumRecord], localeOf(globals["locale"])) };
export const NoValue: Story = { render: (_a, { globals }) => list([noValueRecord], localeOf(globals["locale"])) };
export const NaturalPersonWinner: Story = { render: (_a, { globals }) => list([naturalPersonRecord], localeOf(globals["locale"])) };
/** Every Record state of the variety fixture; an empty query has no matched field. */
export const EveryState: Story = { render: (_a, { globals }) => list(resultSamples.variety.records.rows, localeOf(globals["locale"])) };
