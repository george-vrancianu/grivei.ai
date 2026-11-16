import type { Meta, StoryObj } from "@storybook/react-vite";
import type { RecordBadge } from "../../../../types.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { BadgeMenu } from "./index.ts";

const meta = { title: "Domain/FilterChips/BadgeMenu" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const menu = (selected?: RecordBadge[], defaultOpen = false): Story["render"] => (_args, { globals }) => {
  const copy = sampleCopy.filterChips(localeOf(globals["locale"]));
  return <BadgeMenu label={copy.badges.menu} selected={selected} onToggle={() => {}} copy={copy.badges.badges} unsetLabel={copy.menuAny} picked={copy.picked} defaultOpen={defaultOpen} />;
};

export const AllBadges: Story = { render: menu() };
export const OnePick: Story = { render: menu(["SUSPECT_VALUE"]) };
export const SomeOn: Story = { render: menu(["SUSPECT_VALUE", "NO_VALUE"]) };
/** The ten Record badges, multi-select; the menu stays open on a pick. */
export const OpenSomeOn: Story = { render: menu(["SUSPECT_VALUE", "NO_VALUE"], true) };
