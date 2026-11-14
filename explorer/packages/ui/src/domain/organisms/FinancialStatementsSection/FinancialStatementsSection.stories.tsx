import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { financials, financialsBlankTurnover, financialsCopy } from "../../samples/financials.ts";
import type { FinancialStatementsData } from "../../types.ts";
import { FinancialStatementsSection } from "./index.ts";

const meta = { title: "Domain/FinancialStatementsSection", component: FinancialStatementsSection } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const section = (data: FinancialStatementsData): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <FinancialStatementsSection financials={data} locale={locale} copy={financialsCopy[locale]} />;
  },
});

/** Four years: the newest a first release that may be revised, a revised year with a loss, blank employees and debts, a reported zero. */
export const FourYears = section(financials);
/** A blank turnover (no share) and a share above 100%. */
export const BlankTurnoverAndShareAboveAHundred = section(financialsBlankTurnover);
export const OneRevisedYear = section({ years: [financials.years[2]!] });
