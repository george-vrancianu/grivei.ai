import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { BadgeChips } from "./index.ts";

const meta = { title: "Domain/FilterChips/BadgeChips" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const copyOf = (globals: Record<string, unknown>) => sampleCopy.filterChips(localeOf(globals["locale"])).badges;

/** Every badge chip, none on. */
export const AllBadges: Story = {
  render: (_args, { globals }) => <BadgeChips label={copyOf(globals).group} selected={undefined} onToggle={() => {}} copy={copyOf(globals).badges} />,
};
export const SomeOn: Story = {
  render: (_args, { globals }) => (
    <BadgeChips label={copyOf(globals).group} selected={["SUSPECT_VALUE", "NO_VALUE"]} onToggle={() => {}} copy={copyOf(globals).badges} />
  ),
};
