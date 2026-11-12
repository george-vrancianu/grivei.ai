import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { TableRow } from "../TableRow/index.ts";
import { Table } from "../Table/index.ts";
import { TableBody } from "../TableBody/index.ts";
import { TableCell } from "./index.ts";

const meta = { title: "Atoms/TableCell", component: TableCell } satisfies Meta<typeof TableCell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Alignments: Story = {
  render: (_args, { globals }) => (
    <Table><TableBody><TableRow>
      <TableCell align="left">{pick(globals["locale"], { en: "Left", ro: "Stânga" })}</TableCell>
      <TableCell align="center">{pick(globals["locale"], { en: "Center", ro: "Centru" })}</TableCell>
      <TableCell align="right">{pick(globals["locale"], { en: "Right", ro: "Dreapta" })}</TableCell>
    </TableRow></TableBody></Table>
  ),
};
export const LongText: Story = {
  render: (_args, { globals }) => (
    <Table sx={{ maxWidth: 300 }}><TableBody><TableRow><TableCell sx={{ wordBreak: "break-word" }}>{pick(globals["locale"], { en: "$LONG_EN", ro: "$LONG_RO" })}</TableCell></TableRow></TableBody></Table>
  ),
};
