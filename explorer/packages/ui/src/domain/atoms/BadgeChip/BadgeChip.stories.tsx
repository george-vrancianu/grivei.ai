import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { allBadges } from "../../samples/fixtureData.ts";
import { BadgeChip, RECORD_BADGES } from "./index.ts";

const meta = { title: "Domain/BadgeChip", component: BadgeChip } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const Suspect: Story = {
  render: (_args, { globals }) => <BadgeChip badge="SUSPECT_VALUE" copy={sampleCopy.badges(localeOf(globals["locale"]))} />,
};
export const Neutral: Story = {
  render: (_args, { globals }) => <BadgeChip badge="NO_VALUE" copy={sampleCopy.badges(localeOf(globals["locale"]))} />,
};
/** Every value of the RecordBadge enum, so a new badge shows up here (and fails to compile without copy). */
export const EveryBadge: Story = {
  render: (_args, { globals }) => (
    <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
      {RECORD_BADGES.map((badge) => (
        <BadgeChip key={badge} badge={badge} copy={sampleCopy.badges(localeOf(globals["locale"]))} />
      ))}
    </Stack>
  ),
};
/** The badges the fixtures' Records carry. */
export const OnFixtureRecords: Story = {
  render: (_args, { globals }) => (
    <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
      {allBadges.map((badge) => (
        <BadgeChip key={badge} badge={badge} copy={sampleCopy.badges(localeOf(globals["locale"]))} />
      ))}
    </Stack>
  ),
};
