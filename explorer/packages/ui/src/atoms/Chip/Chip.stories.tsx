import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Chip } from "./index.ts";

const meta = { title: "Atoms/Chip", component: Chip } satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

const label = (locale: unknown) => pick(locale, { en: "Verified", ro: "Verificat" });

export const Default: Story = { render: (args, { globals }) => <Chip {...args} label={label(globals["locale"])} /> };

export const Variants: Story = {
  render: (_args, { globals }) => (
    <>
      {(["filled", "outlined"] as const).map((variant) => (
        <Chip key={variant} variant={variant} label={label(globals["locale"])} sx={{ mr: 1 }} />
      ))}
      <Chip color="primary" label={label(globals["locale"])} sx={{ mr: 1 }} />
      <Chip color="warning" label={pick(globals["locale"], { en: "Estimated", ro: "Estimat" })} />
    </>
  ),
};

export const Deletable: Story = {
  render: (args, { globals }) => (
    <Chip {...args} onDelete={() => {}} label={pick(globals["locale"], { en: "County: Cluj", ro: "Județ: Cluj" })} />
  ),
};

export const Disabled: Story = { render: (args, { globals }) => <Chip {...args} disabled label={label(globals["locale"])} /> };

export const LongLabel: Story = {
  render: (args, { globals }) => (
    <Chip {...args} sx={{ maxWidth: 220 }} label={pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })} />
  ),
};
