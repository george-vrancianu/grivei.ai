import type { Meta, StoryObj } from "@storybook/react-vite";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { pick } from "../../../workbench/index.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
import { NumericCell } from "../../atoms/NumericCell/index.ts";
import { localeOf } from "../../samples/copy.ts";
import { recordRows } from "../../samples/fixtureData.ts";
import { Panel } from "../Panel/index.ts";
import { PanelTable } from "./index.ts";

const meta = { title: "Domain/PanelTable", component: PanelTable } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const heads = (locale: unknown) => ({
  code: pick(locale, { en: "Record", ro: "Înregistrare" }),
  title: pick(locale, { en: "Title", ro: "Titlu" }),
  value: pick(locale, { en: "Value", ro: "Valoare" }),
});

const records = (locale: unknown, count = recordRows.length) => {
  const head = heads(locale);
  return (
    <>
      <TableHead>
        <TableRow>
          <TableCell>{head.code}</TableCell>
          <TableCell>{head.title}</TableCell>
          <NumericCell>{head.value}</NumericCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {recordRows.slice(0, count).map((record) => (
          <TableRow key={record.code} hover>
            <TableCell>{record.code}</TableCell>
            <TableCell>{record.title}</TableCell>
            <NumericCell>{record.value === null ? "—" : <MoneyAmount bani={record.value} locale={localeOf(locale)} showBani />}</NumericCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

const label = (locale: unknown) => pick(locale, { en: "Records table", ro: "Tabelul înregistrărilor" });
const panel = (locale: unknown) => pick(locale, { en: "Records", ro: "Înregistrări" });

/** A table in a flush panel: strip-filled head row, numbers right-aligned in mono, `raised` hover on each row. */
export const InFlushPanel: Story = {
  render: (_args, { globals }) => (
    <Panel heading={panel(globals["locale"])} flush>
      <PanelTable label={label(globals["locale"])}>{records(globals["locale"])}</PanelTable>
    </Panel>
  ),
};

/** A table wider than the phone: it scrolls inside its own box and the page does not. */
export const WideAtPhoneWidth: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  render: (_args, { globals }) => (
    <Panel heading={panel(globals["locale"])} flush>
      <PanelTable label={label(globals["locale"])} minWidth={720}>{records(globals["locale"])}</PanelTable>
    </Panel>
  ),
};

/** A single row. */
export const OneRow: Story = {
  render: (_args, { globals }) => (
    <Panel heading={panel(globals["locale"])} flush>
      <PanelTable label={label(globals["locale"])}>{records(globals["locale"], 1)}</PanelTable>
    </Panel>
  ),
};

/** No rows: the head row alone, then a sentence in a full-width cell. */
export const Empty: Story = {
  render: (_args, { globals }) => (
    <Panel heading={panel(globals["locale"])} flush>
      <PanelTable label={label(globals["locale"])}>
        <TableHead>
          <TableRow>
            <TableCell>{heads(globals["locale"]).code}</TableCell>
            <TableCell>{heads(globals["locale"]).title}</TableCell>
            <NumericCell>{heads(globals["locale"]).value}</NumericCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3}>{pick(globals["locale"], { en: "No Records match.", ro: "Nicio înregistrare nu corespunde." })}</TableCell>
          </TableRow>
        </TableBody>
      </PanelTable>
    </Panel>
  ),
};

/** Outside a panel: the treatment is the theme's, so any table has it. */
export const Standalone: Story = {
  render: (_args, { globals }) => <PanelTable label={label(globals["locale"])}>{records(globals["locale"], 3)}</PanelTable>,
};
