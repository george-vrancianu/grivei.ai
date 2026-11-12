import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { TableCell } from "../TableCell/index.ts";
import { TableRow } from "../TableRow/index.ts";
import { Table } from "../Table/index.ts";
import { TableBody } from "./index.ts";

const meta = { title: "Atoms/TableBody", component: TableBody } satisfies Meta<typeof TableBody>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (_args, { globals }) => (
    <Table><TableBody><TableRow><TableCell>{pick(globals["locale"], { en: "Municipality of Iași", ro: "Municipiul Iași" })}</TableCell></TableRow></TableBody></Table>
  ),
};
