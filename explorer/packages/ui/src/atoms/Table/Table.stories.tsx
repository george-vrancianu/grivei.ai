import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { fixtures } from "@grivei/contract/fixtures";
import { TableBody } from "../TableBody/index.ts";
import { TableCell } from "../TableCell/index.ts";
import { TableContainer } from "../TableContainer/index.ts";
import { TableHead } from "../TableHead/index.ts";
import { TablePagination } from "../TablePagination/index.ts";
import { TableRow } from "../TableRow/index.ts";
import { Table } from "./index.ts";

const meta = { title: "Atoms/Table", component: Table } satisfies Meta<typeof Table>;
export default meta;
type Story = StoryObj<typeof meta>;

const money = (bani: string, locale: unknown) =>
  new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", { style: "currency", currency: "RON" }).format(Number(bani) / 100);

/** Fixture pattern: rows come straight from the contract's mock fixtures, so the story shows realistic shapes. */
const typical = fixtures.FullResultsSuppliers.find((f) => f.name === "typical")!;
const supplierRows = typical.data.seap!.search.suppliers.rows;

export const FromContractFixture: Story = {
  render: (_args, { globals }) => {
    const locale = globals["locale"];
    return (
      <TableContainer>
        <Table aria-label={pick(locale, { en: "Suppliers", ro: "Furnizori" })}>
          <TableHead>
            <TableRow>
              <TableCell>{pick(locale, { en: "Supplier", ro: "Furnizor" })}</TableCell>
              <TableCell align="right">{pick(locale, { en: "Contracts", ro: "Contracte" })}</TableCell>
              <TableCell align="right">{pick(locale, { en: "Awarded", ro: "Atribuit" })}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {supplierRows.map(({ entity, matched }) => (
              <TableRow key={entity.key} hover>
                <TableCell>{entity.displayName}</TableCell>
                <TableCell align="right">{matched.records}</TableCell>
                <TableCell align="right">{money(matched.awarded, locale)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  },
};

export const Empty: Story = {
  render: (_args, { globals }) => (
    <Table aria-label={pick(globals["locale"], { en: "Suppliers", ro: "Furnizori" })}>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} align="center">{pick(globals["locale"], { en: "No results", ro: "Niciun rezultat" })}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const LongCellText: Story = {
  render: (_args, { globals }) => (
    <TableContainer sx={{ maxWidth: 360 }}>
      <Table aria-label={pick(globals["locale"], { en: "Authorities", ro: "Autorități" })}>
        <TableBody>
          <TableRow>
            <TableCell sx={{ wordBreak: "break-word" }}>{pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  ),
};

export const WithPagination: Story = {
  render: (_args, { globals }) => (
    <TableContainer>
      <Table aria-label={pick(globals["locale"], { en: "Contracts", ro: "Contracte" })}>
        <TableBody>
          <TableRow><TableCell>{pick(globals["locale"], { en: "Row 26", ro: "Rândul 26" })}</TableCell></TableRow>
        </TableBody>
        <tfoot>
          <TableRow>
            <TablePagination count={410_000} page={1} rowsPerPage={25} rowsPerPageOptions={[25, 50]} onPageChange={() => {}} onRowsPerPageChange={() => {}} />
          </TableRow>
        </tfoot>
      </Table>
    </TableContainer>
  ),
};
