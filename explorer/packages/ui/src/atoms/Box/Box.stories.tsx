import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Box } from "./index.ts";

const meta = { title: "Atoms/Box", component: Box } satisfies Meta<typeof Box>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithSx: Story = {
  render: (args, { globals }) => (
    <Box {...args} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
      {pick(globals["locale"], { en: "A box styled through theme tokens", ro: "O casetă stilizată prin tokenii temei" })}
    </Box>
  ),
};

export const LongText: Story = {
  render: (args, { globals }) => (
    <Box {...args} sx={{ p: 1, maxWidth: 240, overflowWrap: "anywhere", border: 1, borderColor: "divider" }}>
      {pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}
    </Box>
  ),
};
