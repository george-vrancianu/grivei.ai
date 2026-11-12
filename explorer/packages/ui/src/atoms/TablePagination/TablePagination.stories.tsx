import type { Meta, StoryObj } from "@storybook/react-vite";
import { TableRow } from "../TableRow/index.ts";
import { Table } from "../Table/index.ts";
import { TablePagination } from "./index.ts";

const meta = { title: "Atoms/TablePagination", component: TablePagination } satisfies Meta<typeof TablePagination>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { count: 95, page: 0, rowsPerPage: 25, rowsPerPageOptions: [25, 50], onPageChange: () => {} },
  render: (args) => (
    <Table><tfoot><TableRow><TablePagination {...args} /></TableRow></tfoot></Table>
  ),
};
export const LastPage: Story = {
  args: { count: 95, page: 3, rowsPerPage: 25, rowsPerPageOptions: [25, 50], onPageChange: () => {} },
  render: (args) => (
    <Table><tfoot><TableRow><TablePagination {...args} /></TableRow></tfoot></Table>
  ),
};
export const HugeCount: Story = {
  args: { count: 4_100_000, page: 100, rowsPerPage: 50, rowsPerPageOptions: [25, 50], onPageChange: () => {} },
  render: (args) => (
    <Table><tfoot><TableRow><TablePagination {...args} /></TableRow></tfoot></Table>
  ),
};
