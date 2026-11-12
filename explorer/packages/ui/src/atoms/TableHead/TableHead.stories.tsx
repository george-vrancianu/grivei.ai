import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { TableCell } from "../TableCell/index.ts";
import { TableRow } from "../TableRow/index.ts";
import { Table } from "../Table/index.ts";
import { TableHead } from "./index.ts";

const meta = { title: "Atoms/TableHead", component: TableHead } satisfies Meta<typeof TableHead>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (_args, { globals }) => (
    <Table><TableHead><TableRow><TableCell>{pick(globals["locale"], { en: "Authority", ro: "Autoritate" })}</TableCell><TableCell align="right">{pick(globals["locale"], { en: "Value", ro: "Valoare" })}</TableCell></TableRow></TableHead></Table>
  ),
};
