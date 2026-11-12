import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Button } from "./index.ts";

const meta = { title: "Atoms/Button", component: Button } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

const label = (locale: unknown) => pick(locale, { en: "Export results", ro: "Exportă rezultatele" });

export const Default: Story = { render: (args, { globals }) => <Button {...args}>{label(globals["locale"])}</Button> };

export const Variants: Story = {
  render: (_args, { globals }) => (
    <>
      {(["text", "outlined", "contained"] as const).map((variant) => (
        <Button key={variant} variant={variant} sx={{ mr: 1 }}>{label(globals["locale"])}</Button>
      ))}
    </>
  ),
};

export const Disabled: Story = {
  args: { variant: "contained", disabled: true },
  render: (args, { globals }) => <Button {...args}>{label(globals["locale"])}</Button>,
};

export const AsLink: Story = {
  args: { variant: "outlined", href: "https://example.org" },
  render: (args, { globals }) => <Button {...args}>{pick(globals["locale"], { en: "Open the source", ro: "Deschide sursa" })}</Button>,
};

export const LongText: Story = {
  args: { variant: "contained" },
  render: (args, { globals }) => (
    <Button {...args} sx={{ maxWidth: 220 }}>
      {pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}
    </Button>
  ),
};
