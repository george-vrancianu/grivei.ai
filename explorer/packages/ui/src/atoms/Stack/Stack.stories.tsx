import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Chip } from "../Chip/index.ts";
import { Stack } from "./index.ts";

const meta = { title: "Atoms/Stack", component: Stack } satisfies Meta<typeof Stack>;
export default meta;
type Story = StoryObj<typeof meta>;

const items = (locale: unknown) => [pick(locale, { en: "Contracts", ro: "Contracte" }), pick(locale, { en: "Tenders", ro: "Licitații" }), pick(locale, { en: "Suppliers", ro: "Furnizori" })];

export const Column: Story = {
  render: (args, { globals }) => <Stack {...args} spacing={1} sx={{ alignItems: "flex-start" }}>{items(globals["locale"]).map((l) => <Chip key={l} label={l} />)}</Stack>,
};

export const Row: Story = {
  render: (args, { globals }) => <Stack {...args} direction="row" spacing={1}>{items(globals["locale"]).map((l) => <Chip key={l} label={l} />)}</Stack>,
};

export const WrappingRow: Story = {
  render: (args, { globals }) => (
    <Stack {...args} direction="row" useFlexGap spacing={1} sx={{ maxWidth: 200, flexWrap: "wrap" }}>
      {items(globals["locale"]).map((l) => <Chip key={l} label={l + " " + l} />)}
    </Stack>
  ),
};
