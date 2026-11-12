import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Card } from "../Card/index.ts";
import { CardContent } from "../CardContent/index.ts";
import { Grid } from "./index.ts";

const meta = { title: "Atoms/Grid", component: Grid } satisfies Meta<typeof Grid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Responsive: Story = {
  render: (_args, { globals }) => (
    <Grid container spacing={2}>
      {[1, 2, 3, 4].map((n) => (
        <Grid key={n} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card><CardContent>{pick(globals["locale"], { en: "Panel " + n, ro: "Panoul " + n })}</CardContent></Card>
        </Grid>
      ))}
    </Grid>
  ),
};

export const LongContent: Story = {
  render: (_args, { globals }) => (
    <Grid container spacing={2}>
      <Grid size={4}><Card><CardContent sx={{ wordBreak: "break-word" }}>{pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}</CardContent></Card></Grid>
      <Grid size={8}><Card><CardContent>{pick(globals["locale"], { en: "Short", ro: "Scurt" })}</CardContent></Card></Grid>
    </Grid>
  ),
};
