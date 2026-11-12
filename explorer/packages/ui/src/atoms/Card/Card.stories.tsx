import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Button } from "../Button/index.ts";
import { CardActions } from "../CardActions/index.ts";
import { CardContent } from "../CardContent/index.ts";
import { CardHeader } from "../CardHeader/index.ts";
import { Typography } from "../Typography/index.ts";
import { Card } from "./index.ts";

const meta = { title: "Atoms/Card", component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <Card {...args} sx={{ maxWidth: 360 }}>
      <CardHeader title={pick(globals["locale"], { en: "Municipality of Iași", ro: "Municipiul Iași" })} subheader={pick(globals["locale"], { en: "Authority", ro: "Autoritate" })} />
      <CardContent><Typography>{pick(globals["locale"], { en: "1,240 contracts awarded.", ro: "1.240 de contracte atribuite." })}</Typography></CardContent>
      <CardActions><Button size="small">{pick(globals["locale"], { en: "Open", ro: "Deschide" })}</Button></CardActions>
    </Card>
  ),
};

export const Elevated: Story = {
  render: (args, { globals }) => (
    <Card {...args} variant="elevation" sx={{ maxWidth: 360 }}>
      <CardContent>{pick(globals["locale"], { en: "An elevated card", ro: "Un card ridicat" })}</CardContent>
    </Card>
  ),
};

export const LongContent: Story = {
  render: (args, { globals }) => (
    <Card {...args} sx={{ maxWidth: 260 }}>
      <CardHeader title={pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })} />
      <CardContent><Typography>{pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}</Typography></CardContent>
    </Card>
  ),
};
