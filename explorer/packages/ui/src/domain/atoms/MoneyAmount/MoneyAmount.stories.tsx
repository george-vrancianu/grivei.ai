import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf } from "../../samples/copy.ts";
import { totalExtreme, totalNational, totalTypical } from "../../samples/fixtureData.ts";
import { MoneyAmount } from "./index.ts";

const meta = { title: "Domain/MoneyAmount", component: MoneyAmount, args: { bani: totalTypical.awarded, locale: "en" } } satisfies Meta<typeof MoneyAmount>;
export default meta;
type Story = StoryObj<typeof meta>;

const render: Story["render"] = (args, { globals }) => <MoneyAmount {...args} locale={localeOf(globals["locale"])} />;

export const Typical: Story = { render };
export const Zero: Story = { args: { bani: "0" }, render };
export const OneBan: Story = { args: { bani: "1", showBani: true }, render };
export const WithBani: Story = { args: { bani: "123456789", showBani: true }, render };
export const Compact: Story = { args: { bani: totalNational.awarded, compact: true }, render };
/** More bani than Number.MAX_SAFE_INTEGER: every digit survives. */
export const BeyondSafeInteger: Story = { args: { bani: totalExtreme.awarded, showBani: true }, render };
export const Negative: Story = { args: { bani: "-250050", showBani: true }, render };
export const AllForms: Story = {
  render: (_args, { globals }) => (
    <Stack>
      {[totalTypical.awarded, totalNational.awarded, totalExtreme.awarded].map((bani) => (
        <MoneyAmount key={bani} bani={bani} locale={localeOf(globals["locale"])} />
      ))}
    </Stack>
  ),
};
