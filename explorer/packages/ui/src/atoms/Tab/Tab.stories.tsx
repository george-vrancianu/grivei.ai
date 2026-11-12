import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Tabs } from "../Tabs/index.ts";
import { Tab } from "./index.ts";

const meta = { title: "Atoms/Tab", component: Tab } satisfies Meta<typeof Tab>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = {
  render: (_args, { globals }) => (
    <Tabs value="a"><Tab value="a" label={pick(globals["locale"], { en: "Contracts", ro: "Contracte" })} /></Tabs>
  ),
};

export const Disabled: Story = {
  render: (_args, { globals }) => (
    <Tabs value="a"><Tab value="a" label="." sx={{ display: "none" }} /><Tab value="b" disabled label={pick(globals["locale"], { en: "Coverage", ro: "Acoperire" })} /></Tabs>
  ),
};

export const LongLabel: Story = {
  render: (_args, { globals }) => (
    <Tabs value="a"><Tab value="a" sx={{ maxWidth: 200 }} label={pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })} /></Tabs>
  ),
};
