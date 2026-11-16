import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { PartyMenu } from "./index.ts";

const meta = { title: "Domain/FilterChips/PartyMenu" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

// The lists are source data as AEP registers them: Romanian in both languages.
const parties = ["PARTIDUL SOCIAL DEMOCRAT", "PARTIDUL NAȚIONAL LIBERAL", "ALIANȚA USR PLUS", "UNIUNEA DEMOCRATĂ MAGHIARĂ DIN ROMÂNIA"];

const menu = (selected?: string, defaultOpen = false): Story["render"] => (_args, { globals }) => {
  const copy = sampleCopy.filterChips(localeOf(globals["locale"]));
  return <PartyMenu parties={parties} selected={selected} onChoose={() => {}} copy={copy.party} unsetLabel={copy.menuAny} defaultOpen={defaultOpen} />;
};

export const Typical: Story = { render: menu() };
export const Chosen: Story = { render: menu("ALIANȚA USR PLUS") };
/** One list at a time (`menuitemradio`); clicking the chosen one again clears it. */
export const OpenChosen: Story = { render: menu("ALIANȚA USR PLUS", true) };
