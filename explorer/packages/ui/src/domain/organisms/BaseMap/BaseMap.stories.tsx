import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { pick, onPanel } from "../../../workbench/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { sampleCopy, localeOf } from "../../samples/copy.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { uatsTopology } from "../../samples/geo/uats.topo.ts";
import { BaseMap, type BaseMapProps } from "./index.ts";

const meta = { title: "Domain/BaseMap", decorators: [onPanel] } satisfies Meta<Record<string, unknown>>;
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
        <Typography variant="caption">{pick(locale, { en: "Off the map", ro: "În afara hărții" })}</Typography>
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}>{pick(locale, { en: "National", ro: "Național" })}</Box>
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}>{pick(locale, { en: "Unplaced", ro: "Neplasat" })}</Box>
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

const statusColors = { harvested: "#2e7d32", gaps: "#f9a825", partial: "#ef6c00" } as const;
const statusByCounty: Record<string, keyof typeof statusColors> = { "RO-CJ": "harvested", "RO-BV": "harvested", "RO-IS": "gaps", "RO-SV": "partial" };

/** A lens colouring by category instead of by number (the Coverage lens): its own fill and its own legend. */
export const CategoricalFill: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const names = pick(locale, {
      en: { harvested: "Harvested", gaps: "Harvested with known gaps", partial: "Partial" },
      ro: { harvested: "Colectat", gaps: "Colectat cu lacune cunoscute", partial: "Parțial" },
    });
    const legend = (
      <Box component="ul" aria-label={pick(locale, { en: "Coverage", ro: "Acoperire" })} sx={{ listStyle: "none", p: 0, mt: 1 }}>
        {(Object.keys(statusColors) as (keyof typeof statusColors)[]).map((status) => (
          <Box component="li" key={status} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box aria-hidden sx={{ width: 14, height: 14, borderRadius: 0.5, backgroundColor: statusColors[status] }} />
            <Typography variant="caption">{names[status]}</Typography>
          </Box>
        ))}
      </Box>
    );
    return (
      <Frame locale={locale}>
        {(base) => (
          <BaseMap
            topology={countiesTopology}
            values={{}}
            colorOf={(code) => (statusByCounty[code] ? statusColors[statusByCounty[code]] : null)}
            describeArea={({ code }) => (statusByCounty[code] ? names[statusByCounty[code]] : null)}
            legend={legend}
            {...base}
          />
        )}
      </Frame>
    );
  },
};

const authorities: Record<string, number> = { "990101": 4, "990102": 31, "990103": 9, "990104": 2 };

/** A lens drawing marks over the areas (the zoomed county's circle per UAT for its number of authorities). */
export const OverlayCircles: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <Frame locale={locale}>
        {(base) => (
          <BaseMap
            topology={uatsTopology}
            values={uatValues}
            renderOverlay={({ centroids }) =>
              Object.entries(authorities).map(([code, n]) => {
                const at = centroids.get(code);
                return at && <circle key={code} cx={at[0]} cy={at[1]} r={3 + 2 * Math.sqrt(n)} fill="none" stroke="#1b2a41" strokeWidth={1.5} />;
              })
            }
            {...base}
          />
        )}
      </Frame>
    );
  },
};

export const ReadOnly: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <Frame locale={locale}>{(base) => <BaseMap topology={countiesTopology} values={countyValues} {...base} />}</Frame>;
  },
};
