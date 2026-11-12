import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { TableCell } from "../TableCell/index.ts";
import { TableRow } from "../TableRow/index.ts";
import { Table } from "../Table/index.ts";
import { TableBody } from "../TableBody/index.ts";
import { TableContainer } from "./index.ts";

const meta = { title: "Atoms/TableContainer", component: TableContainer } satisfies Meta<typeof TableContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Scrolling: Story = {
  render: (_args, { globals }) => (
    <TableContainer sx={{ maxWidth: 240 }} tabIndex={0} role="region" aria-label={pick(globals["locale"], { en: "Scrollable table", ro: "Tabel derulant" })}>
      <Table sx={{ minWidth: 480 }}>
        <TableBody><TableRow><TableCell>{pick(globals["locale"], { en: "A wide row that scrolls sideways", ro: "Un rând lat care se derulează lateral" })}</TableCell></TableRow></TableBody>
      </Table>
    </TableContainer>
  ),
};
