import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { TableCell } from "../TableCell/index.ts";
import { Table } from "../Table/index.ts";
import { TableBody } from "../TableBody/index.ts";
import { TableRow } from "./index.ts";

const meta = { title: "Atoms/TableRow", component: TableRow } satisfies Meta<typeof TableRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (_args, { globals }) => (
    <Table><TableBody><TableRow><TableCell>{pick(globals["locale"], { en: "Plain row", ro: "Rând simplu" })}</TableCell></TableRow></TableBody></Table>
  ),
};
export const HoverAndSelected: Story = {
  render: (_args, { globals }) => (
    <Table><TableBody><TableRow hover selected><TableCell>{pick(globals["locale"], { en: "Selected row", ro: "Rând selectat" })}</TableCell></TableRow></TableBody></Table>
  ),
};
