import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Typography } from "./index.ts";

const meta = { title: "Atoms/Typography", component: Typography } satisfies Meta<typeof Typography>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (_args, { globals }) => (
    <Typography>{pick(globals["locale"], { en: "Public contracts, county by county.", ro: "Contracte publice, județ cu județ." })}</Typography>
  ),
};

export const Variants: Story = {
  render: (_args, { globals }) => (
    <>
      {(["h1", "h2", "h3", "h4", "subtitle1", "body1", "body2", "caption", "overline"] as const).map((variant) => (
        <Typography key={variant} variant={variant} gutterBottom>
          {variant}: {pick(globals["locale"], { en: "Awarded value", ro: "Valoare atribuită" })}
        </Typography>
      ))}
    </>
  ),
};

export const LongText: Story = {
  render: (_args, { globals }) => (
    <Typography sx={{ maxWidth: 320 }}>
      {pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}
    </Typography>
  ),
};

export const NoWrapEllipsis: Story = {
  render: (_args, { globals }) => (
    <Typography noWrap sx={{ maxWidth: 240 }}>
      {pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}
    </Typography>
  ),
};

export const AsHeading: Story = {
  render: (_args, { globals }) => (
    <Typography variant="h3" component="h1">{pick(globals["locale"], { en: "Explorer", ro: "Explorator" })}</Typography>
  ),
};
