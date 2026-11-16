import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { ProcedureMenu } from "./index.ts";

const meta = { title: "Domain/FilterChips/ProcedureMenu" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

// Procedure names are source data: Romanian in both languages.
const procedures = ["Achiziție directă", "Licitație deschisă", "Negociere fără publicare prealabilă"];

const menu = (props: { procedures: string[]; selected?: string[]; defaultOpen?: boolean }): Story["render"] => (_args, { globals }) => {
  const copy = sampleCopy.filterChips(localeOf(globals["locale"]));
  return <ProcedureMenu {...props} selected={props.selected} onToggle={() => {}} copy={copy.procedure} unsetLabel={copy.menuAny} picked={copy.picked} />;
};

export const Unset: Story = { render: menu({ procedures }) };
export const OnePick: Story = { render: menu({ procedures, selected: ["Licitație deschisă"] }) };
export const SeveralPicked: Story = { render: menu({ procedures, selected: ["Licitație deschisă", "Achiziție directă"] }) };
export const OpenSeveralPicked: Story = { render: menu({ procedures, selected: ["Licitație deschisă", "Achiziție directă"], defaultOpen: true }) };
/** No values: the sentence is the menu's only line, disabled. */
export const OpenNoOptions: Story = { render: menu({ procedures: [], defaultOpen: true }) };
