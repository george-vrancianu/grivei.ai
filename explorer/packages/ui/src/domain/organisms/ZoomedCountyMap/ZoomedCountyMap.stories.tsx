import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { Topology } from "topojson-specification";
import { Box } from "../../../atoms/Box/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { bucharestTopology } from "../../samples/geo/bucharest.topo.ts";
import { countyUatsTopology } from "../../samples/geo/countyUats.topo.ts";
import { uatsTopology } from "../../samples/geo/uats.topo.ts";
import { bucharest, noPurchases, typicalCounty, withUnknownUat } from "../../samples/uatMaps.ts";
import type { Siruta, UatMap } from "../../types.ts";
import { ZoomedCountyMap } from "./index.ts";

const meta = { title: "Domain/ZoomedCountyMap" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The selected UAT lives in the URL in the app; the stories hold it in state so clicking works. */
function Zoomed({ locale, map, topology, selected: initial, circles = false }: { locale: "en" | "ro"; map: UatMap; topology: Topology; selected?: Siruta; circles?: boolean }) {
  const [selected, setSelected] = useState<Siruta | undefined>(initial);
  return (
    <Box sx={{ maxWidth: 820 }}>
      <ZoomedCountyMap map={map} topology={topology} selected={selected} onSelect={setSelected} showAuthorityCircles={circles} locale={locale} copy={sampleCopy.zoomedCountyMap(locale)} />
    </Box>
  );
}

const story = (map: UatMap, topology: Topology, options: { selected?: Siruta; circles?: boolean } = {}): Story => ({
  render: (_args, { globals }) => <Zoomed locale={localeOf(globals["locale"])} map={map} topology={topology} {...options} />,
});

/** Two UATs of the topology are absent from the map: grey, "no authority bought anything". */
export const TypicalCounty: Story = story(typicalCounty, countyUatsTopology);
export const Bucharest: Story = story(bucharest, bucharestTopology);
/** The row for authorities with a known county and no UAT, beside the map. */
export const WithUnknownUatRow: Story = story(withUnknownUat, uatsTopology);
export const AuthorityCircles: Story = story(typicalCounty, countyUatsTopology, { circles: true });
export const BucharestAuthorityCircles: Story = story(bucharest, bucharestTopology, { circles: true });
export const SelectedUat: Story = story(typicalCounty, countyUatsTopology, { selected: "990210" });
/** Every UAT is grey: a filter left no purchases in the county. */
export const NoPurchases: Story = story(noPurchases, countyUatsTopology);
