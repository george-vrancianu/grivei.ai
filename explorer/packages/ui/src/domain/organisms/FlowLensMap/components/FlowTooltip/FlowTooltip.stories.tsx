import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { supplierNationwideFlow } from "../../../../samples/flowMaps.ts";
import { FlowTooltip } from "./index.ts";

const meta = { title: "Domain/FlowLensMap/FlowTooltip" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const brasov = supplierNationwideFlow.counties[0]!.total;
const cluj = supplierNationwideFlow.counties[4]!.total;

export const OtherCounty: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <FlowTooltip name="Brașov" total={brasov} role="supplier" isHome={false} homeName="Cluj" locale={locale} copy={sampleCopy.flowLensMap(locale)} />;
  },
};
export const HomeCounty: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <FlowTooltip name="Cluj" total={cluj} role="supplier" isHome homeName="Cluj" locale={locale} copy={sampleCopy.flowLensMap(locale)} />;
  },
};
export const NoMoney: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <FlowTooltip name="Galați" total={undefined} role="authority" isHome={false} homeName="Brașov" locale={locale} copy={sampleCopy.flowLensMap(locale)} />;
  },
};
