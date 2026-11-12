import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Button } from "../Button/index.ts";
import { Tooltip } from "./index.ts";

const meta = { title: "Atoms/Tooltip", component: Tooltip, args: { title: "", children: <span /> } } satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <Tooltip {...args} title={pick(globals["locale"], { en: "Estimated value, in RON", ro: "Valoare estimată, în RON" })}>
      <Button variant="outlined">{pick(globals["locale"], { en: "Hover me", ro: "Treci cu mouse-ul" })}</Button>
    </Tooltip>
  ),
};

export const OnDisabledButton: Story = {
  render: (args, { globals }) => (
    <Tooltip {...args} title={pick(globals["locale"], { en: "Not available for this source yet", ro: "Încă indisponibil pentru această sursă" })}>
      <Button variant="outlined" disabled>{pick(globals["locale"], { en: "Download", ro: "Descarcă" })}</Button>
    </Tooltip>
  ),
};

export const LongTitle: Story = {
  render: (args, { globals }) => (
    <Tooltip {...args} title={pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}>
      <Button variant="outlined">{pick(globals["locale"], { en: "Long explanation", ro: "Explicație lungă" })}</Button>
    </Tooltip>
  ),
};
