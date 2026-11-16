import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../../../atoms/Card/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { pick } from "../../../workbench/index.ts";
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
export const Extreme: Story = { args: { total: totalExtreme }, render };
export const Empty: Story = {
  args: { total: { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false } },
  render,
};

/** The inset layout the main screen uses: the amount on the left, every part that is not zero as an inset figure beside it. */
const renderInset: Story["render"] = (args, { globals }) => {
  const locale = localeOf(globals["locale"]);
  const copy = sampleCopy.total(locale);
  return (
    <Card sx={{ px: 2.5, py: 2.25 }}>
      <TotalFigure {...args} locale={locale} copy={copy} inset={{ heading: <Typography variant="meta" component="h2">{pick(globals["locale"], { en: "Total awarded", ro: "Total atribuit" })}</Typography> }} />
    </Card>
  );
};

/** Every part non-zero: Records, the suspect link, no-value Records and framework ceilings. */
export const InsetEverythingLeftOut: Story = { args: { total: totalWithLeftOut }, render: renderInset };
/** Only what is not zero shows: a Total that left nothing out has its Records figure alone. */
export const InsetRecordsOnly: Story = { args: { total: totalTypical }, render: renderInset };
/** An estimated count and an amount past Number.MAX_SAFE_INTEGER stay inside their wells. */
export const InsetExtreme: Story = { args: { total: { ...totalExtreme, estimated: true } }, render: renderInset };
/** Nothing at all: the amount alone, no figure. */
export const InsetEmpty: Story = {
  args: { total: { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false } },
  render: renderInset,
};
/** A phone: the figures wrap under the amount, one per row. */
export const InsetNarrow: Story = {
  args: { total: totalWithLeftOut },
  render: (args, context) => <div style={{ maxWidth: 340 }}>{renderInset(args, context)}</div>,
};
