import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { totalExtreme, totalNational, totalTypical, totalWithLeftOut } from "../../samples/fixtureData.ts";
import { TotalFigure } from "./index.ts";

const meta = {
  title: "Domain/TotalFigure",
  component: TotalFigure,
  args: { total: totalTypical, locale: "en", methodologyHref: "/methodology/", suspectHref: "/explore/?badge=SUSPECT_VALUE", copy: sampleCopy.total("en") },
} satisfies Meta<typeof TotalFigure>;
export default meta;
type Story = StoryObj<typeof meta>;

const render: Story["render"] = (args, { globals }) => {
  const locale = localeOf(globals["locale"]);
  return <TotalFigure {...args} locale={locale} copy={sampleCopy.total(locale)} />;
};

/** Nothing left out: only the figure. */
export const Typical: Story = { render };
export const LeftOutEverything: Story = { args: { total: totalWithLeftOut }, render };
export const NationalScale: Story = { args: { total: totalNational }, render };
/** More bani than Number.MAX_SAFE_INTEGER, an estimated Record count. */
export const Extreme: Story = { args: { total: totalExtreme, suspectHref: undefined }, render };
export const Empty: Story = {
  args: { total: { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false } },
  render,
};
