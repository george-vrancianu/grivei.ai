import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Card } from "../Card/index.ts";
import { CardHeader } from "./index.ts";

const meta = { title: "Atoms/CardHeader", component: CardHeader } satisfies Meta<typeof CardHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <Card><CardHeader {...args} title={pick(globals["locale"], { en: "Cluj County", ro: "Județul Cluj" })} subheader={pick(globals["locale"], { en: "County", ro: "Județ" })} /></Card>
  ),
};

export const LongTitle: Story = {
  render: (args, { globals }) => (
    <Card sx={{ maxWidth: 240 }}><CardHeader {...args} title={pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })} /></Card>
  ),
};
