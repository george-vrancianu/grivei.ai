import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../../../atoms/Box/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { createColorScale } from "../../baseMap.utils.ts";
import { Legend } from "./index.ts";
import { onPanel } from "../../../../../workbench/index.ts";

const meta = { title: "Domain/BaseMap/Legend", decorators: [onPanel] } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const money = (locale: "en" | "ro") => (value: number) =>
  new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", { notation: "compact" }).format(value) + " RON";

function show(values: (number | null)[], kind: "linear" | "log"): Story["render"] {
  return (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const copy = sampleCopy.baseMap(locale);
    return (
      <Box sx={{ maxWidth: 320 }}>
        <Legend title={copy.legendTitle} noDataLabel={copy.noData} scale={createColorScale(kind, values)} formatValue={money(locale)} atMost={copy.atMost} />
      </Box>
    );
  };
}

export const Linear: Story = { render: show([120_000, 8_500_000, 310_000_000], "linear") };
export const Log: Story = { render: show([120_000, 8_500_000, 310_000_000], "log") };
/** A log scale with a zero: the low end reads "up to ...". */
export const LogWithZero: Story = { render: show([0, 120_000, 310_000_000], "log") };
/** No area has a value: only the grey swatch. */
export const NoDomain: Story = { render: show([null, null], "linear") };
export const SingleValue: Story = { render: show([8_500_000], "linear") };
