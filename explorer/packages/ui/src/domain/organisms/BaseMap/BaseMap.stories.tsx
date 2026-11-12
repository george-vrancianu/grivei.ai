import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { sampleCopy, localeOf } from "../../samples/copy.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { uatsTopology } from "../../samples/geo/uats.topo.ts";
import { BaseMap, type BaseMapProps } from "./index.ts";

const meta = { title: "Domain/BaseMap" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const countyValues = { "RO-MM": 120_000, "RO-SV": 8_500_000, "RO-IS": 41_000_000, "RO-CJ": 310_000_000, "RO-BV": 95_000_000, "RO-TM": 0, "RO-AG": 2_400_000 };
const uatValues = { "990101": 1_200_000, "990102": 64_000_000, "990103": 9_800_000, "990104": 450_000, "990105": 0 };
const formatter = (locale: "en" | "ro") => (value: number) => new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", { notation: "compact" }).format(value) + " RON";

function Frame({ locale, children }: { locale: "en" | "ro"; children: (props: Pick<BaseMapProps, "copy" | "formatValue">) => React.ReactNode }) {
  return <Box sx={{ maxWidth: 760 }}>{children({ copy: sampleCopy.baseMap(locale), formatValue: formatter(locale) })}</Box>;
}

export const Counties: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <Frame locale={locale}>{(base) => <BaseMap topology={countiesTopology} values={countyValues} {...base} />}</Frame>;
  },
};

export const CountiesLogScale: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <Frame locale={locale}>{(base) => <BaseMap topology={countiesTopology} values={countyValues} scale="log" {...base} />}</Frame>;
  },
};

export const CountyUats: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <Frame locale={locale}>{(base) => <BaseMap topology={uatsTopology} values={uatValues} {...base} />}</Frame>;
  },
};

export const SelectableWithTiles: Story = {
  render: function Render(_args, { globals }) {
    const locale = localeOf(globals["locale"]);
    const [selected, setSelected] = useState<string | undefined>("RO-CJ");
    const tiles = (
      <>
        <Typography variant="caption">{locale === "ro" ? "În afara hărții" : "Off the map"}</Typography>
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}>{locale === "ro" ? "Național" : "National"}</Box>
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}>{locale === "ro" ? "Neplasat" : "Unplaced"}</Box>
      </>
    );
    return (
      <Frame locale={locale}>
        {(base) => <BaseMap topology={countiesTopology} values={countyValues} selected={selected} onSelect={setSelected} tiles={tiles} {...base} />}
      </Frame>
    );
  },
};

export const NoData: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <Frame locale={locale}>{(base) => <BaseMap topology={countiesTopology} values={{}} {...base} />}</Frame>;
  },
};
