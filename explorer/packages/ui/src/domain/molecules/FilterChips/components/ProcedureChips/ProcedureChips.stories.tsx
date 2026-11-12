import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { ProcedureChips } from "./index.ts";

const meta = { title: "Domain/FilterChips/ProcedureChips" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

// Procedure names are source data: Romanian in both languages.
const procedures = ["Achiziție directă", "Licitație deschisă", "Negociere fără publicare prealabilă"];
const copyOf = (globals: Record<string, unknown>) => sampleCopy.filterChips(localeOf(globals["locale"])).procedure;

export const Typical: Story = {
  render: (_args, { globals }) => <ProcedureChips procedures={procedures} selected={["Licitație deschisă"]} onToggle={() => {}} copy={copyOf(globals)} />,
};
export const NoOptions: Story = {
  render: (_args, { globals }) => <ProcedureChips procedures={[]} selected={undefined} onToggle={() => {}} copy={copyOf(globals)} />,
};
