import type { Meta, StoryObj } from "@storybook/react-vite";
import { Table } from "../../../atoms/Table/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { pick } from "../../../workbench/index.ts";
import { NumericCell } from "./index.ts";

const meta = { title: "Domain/NumericCell", component: NumericCell } satisfies Meta<typeof NumericCell>;
export default meta;
type Story = StoryObj<typeof meta>;

const amounts = ["1.234,50", "98.765,00", "7,25", "0,00"];

/** Head and body numeric cells: right-aligned, mono, tabular figures, so the digits line up. */
export const HeadAndBody: Story = {
  render: (_args, { globals }) => (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>{pick(globals["locale"], { en: "Year", ro: "An" })}</TableCell>
          <NumericCell>{pick(globals["locale"], { en: "Amount (RON)", ro: "Sumă (RON)" })}</NumericCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {amounts.map((amount, i) => (
          <TableRow key={amount}>
            <TableCell>{2020 + i}</TableCell>
            <NumericCell>{amount}</NumericCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/** One cell on its own, for the Controls panel. */
export const Single: Story = {
  args: { children: "1.234,50" },
  render: (args) => (
    <Table>
      <TableBody>
        <TableRow>
          <NumericCell {...args} />
        </TableRow>
      </TableBody>
    </Table>
  ),
};
