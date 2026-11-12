import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { TextField } from "./index.ts";

const meta = { title: "Atoms/TextField", component: TextField } satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

const label = (locale: unknown) => pick(locale, { en: "Authority name", ro: "Denumirea autorității" });

export const Default: Story = { render: (args, { globals }) => <TextField {...args} label={label(globals["locale"])} /> };

export const WithValueAndHelp: Story = {
  render: (args, { globals }) => (
    <TextField {...args} label={label(globals["locale"])} defaultValue="Primăria Municipiului Târgu Mureș"
      helperText={pick(globals["locale"], { en: "As published in SEAP", ro: "Așa cum apare în SEAP" })} />
  ),
};

export const ErrorState: Story = {
  render: (args, { globals }) => (
    <TextField {...args} error label={label(globals["locale"])} defaultValue="??"
      helperText={pick(globals["locale"], { en: "Too short", ro: "Prea scurt" })} />
  ),
};

export const Disabled: Story = {
  render: (args, { globals }) => <TextField {...args} disabled label={label(globals["locale"])} defaultValue="Ministerul Dezvoltării" />,
};

export const LongText: Story = {
  render: (args, { globals }) => (
    <TextField {...args} label={label(globals["locale"])} sx={{ width: 280 }}
      defaultValue={pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })} />
  ),
};
