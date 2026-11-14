import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { PartyChips } from "./index.ts";

const meta = { title: "Domain/FilterChips/PartyChips" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

// The lists are source data as AEP registers them: Romanian in both languages.
const parties = ["PARTIDUL SOCIAL DEMOCRAT", "PARTIDUL NAȚIONAL LIBERAL", "ALIANȚA USR PLUS", "UNIUNEA DEMOCRATĂ MAGHIARĂ DIN ROMÂNIA"];
const copyOf = (globals: Record<string, unknown>) => sampleCopy.filterChips(localeOf(globals["locale"])).party;

export const Typical: Story = {
  render: (_args, { globals }) => <PartyChips parties={parties} selected={undefined} onChoose={() => {}} copy={copyOf(globals)} />,
};
export const Chosen: Story = {
  render: (_args, { globals }) => <PartyChips parties={parties} selected="ALIANȚA USR PLUS" onChoose={() => {}} copy={copyOf(globals)} />,
};
