import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Card } from "../Card/index.ts";
import { CardContent } from "./index.ts";

const meta = { title: "Atoms/CardContent", component: CardContent } satisfies Meta<typeof CardContent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <Card><CardContent {...args}>{pick(globals["locale"], { en: "Card body text", ro: "Textul cardului" })}</CardContent></Card>
  ),
};

export const LongText: Story = {
  render: (args, { globals }) => (
    <Card sx={{ maxWidth: 240 }}><CardContent {...args}>{pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}</CardContent></Card>
  ),
};
