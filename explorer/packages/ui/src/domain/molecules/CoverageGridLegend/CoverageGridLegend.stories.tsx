import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { CoverageGridLegend } from "./index.ts";

const meta = { title: "Domain/CoverageGridLegend" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const legend = (props: { condensed?: boolean; showRange?: boolean }): Story["render"] =>
  (_args, { globals }) => <CoverageGridLegend copy={sampleCopy.coverageGrid(localeOf(globals["locale"]))} {...props} />;

export const Default: Story = { render: legend({}) };
/** With the date-range swatch. */
export const WithRange: Story = { render: legend({ showRange: true }) };
/** The compact grid's one-line legend. */
export const Condensed: Story = { render: legend({ condensed: true, showRange: true }) };
