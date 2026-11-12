import type { Meta, StoryObj } from "@storybook/react-vite";
import { Table } from "../../../atoms/Table/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { sampleGrid } from "../../samples/coverageGrid.ts";
import { GAP_STATES } from "../../utils/coverageGrid.ts";
import { CoverageCell } from "./index.ts";

const meta = { title: "Domain/CoverageCell" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const cells = sampleGrid();
/** One sample cell of each state. */
const oneOfEach = GAP_STATES.map((state) => cells.find((c) => c.state === state)!);

const row = (compact: boolean, inRange: boolean): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <Table size="small" sx={{ width: "auto" }}>
        <TableBody>
          <TableRow>
            {oneOfEach.map((cell) => (
              <CoverageCell key={cell.state} cell={cell} quarter={cell.quarter} kind={cell.kind} inRange={inRange} compact={compact} locale={locale} copy={sampleCopy.coverageGrid(locale)} />
            ))}
            <CoverageCell cell={null} quarter="2021-Q1" kind="DA" inRange={inRange} compact={compact} locale={locale} copy={sampleCopy.coverageGrid(locale)} />
          </TableRow>
        </TableBody>
      </Table>
    );
  };

/** Each state's colour, glyph, border and count, then a cell with no information. */
export const States: Story = { render: row(false, false) };
export const InRange: Story = { render: row(false, true) };
/** The squares of the compact grid: no visible text. */
export const Compact: Story = { render: row(true, false) };
