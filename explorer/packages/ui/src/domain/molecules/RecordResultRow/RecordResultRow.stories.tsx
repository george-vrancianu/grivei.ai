import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { consortiumRecord, highlightedRecord, naturalPersonRecord, noValueRecord, overCapSignalRecords, resultSamples, splittingSignalRecords } from "../../samples/fixtureData.ts";
import { ruleSlug } from "../../samples/signals.ts";
import type { RecordResult } from "../../types.ts";
import { RecordResultRow } from "./index.ts";

const meta = { title: "Domain/RecordResultRow", component: RecordResultRow } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const list = (rows: RecordResult[], locale: "en" | "ro", withSignals = false) => (
  <Stack component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
    {rows.map((row) => (
      <RecordResultRow
        key={row.record.code}
        row={row}
        recordHref={`/explore/record/${row.record.code}`}
        entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
        locale={locale}
        copy={sampleCopy.recordRow(locale)}
        signalBadges={withSignals ? { href: (s) => `/explore/authority/${s.reproduce.authority}/records?signal=${ruleSlug(s.rule)}`, copy: sampleCopy.signalBadge(locale) } : undefined}
      />
    ))}
  </Stack>
);

/** After a supplier-county click, a consortium Record's share in that county sits under the full value, labelled as the equal-share convention. */
export const ConsortiumWithAreaShare: Story = {
  render: (_a, { globals }) => list([{ ...consortiumRecord, areaShare: consortiumRecord.record.winners[0]?.share ?? null }], localeOf(globals["locale"])),
};
/** The same Record without the share line (no county click, or the authority side). */
export const ConsortiumWithoutAreaShare: Story = { render: (_a, { globals }) => list([{ ...consortiumRecord, areaShare: null }], localeOf(globals["locale"])) };
export const WithMatchedText: Story = { render: (_a, { globals }) => list([highlightedRecord], localeOf(globals["locale"])) };
/** Two winners: the full value, with the consortium marker. */
export const Consortium: Story = { render: (_a, { globals }) => list([consortiumRecord], localeOf(globals["locale"])) };
/** The two Records of one over-cap Signal: each row carries a compact badge that links to the Signal's Records (recorded). */
export const WithSignalBadge: Story = { render: (_a, { globals }) => list(overCapSignalRecords.records.rows, localeOf(globals["locale"]), true) };
/** Three Records of one splitting Signal. */
export const InSplittingSignal: Story = { render: (_a, { globals }) => list(splittingSignalRecords.records.rows, localeOf(globals["locale"]), true) };
export const NoValue: Story = { render: (_a, { globals }) => list([noValueRecord], localeOf(globals["locale"])) };
export const NaturalPersonWinner: Story = { render: (_a, { globals }) => list([naturalPersonRecord], localeOf(globals["locale"])) };
/** Every Record state of the variety fixture; an empty query has no matched field. */
export const EveryState: Story = { render: (_a, { globals }) => list(resultSamples.variety.records.rows, localeOf(globals["locale"])) };
