import { onPanel } from "../../../workbench/onPanel.tsx";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { nothingHarvestedCoverage, openWindowCoverage, typicalCoverage } from "../../samples/coverageLenses.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import type { CoverageLens } from "../../types.ts";
import type { MapArea } from "../MoneyLensMap/index.ts";
import { CoverageLensMap } from "./index.ts";

const meta = { title: "Domain/CoverageLensMap", decorators: [onPanel] } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The selection lives in the URL in the app; the stories hold it in state so clicking works. */
function Lens({ locale, lens, selected: initial }: { locale: "en" | "ro"; lens: CoverageLens; selected?: MapArea }) {
  const [selected, setSelected] = useState<MapArea | undefined>(initial);
  return (
    <Box sx={{ maxWidth: 820 }}>
      <CoverageLensMap lens={lens} topology={countiesTopology} selected={selected} onSelect={setSelected} locale={locale} copy={sampleCopy.coverageLensMap(locale)} />
    </Box>
  );
}

const story = (lens: CoverageLens, selected?: MapArea): Story => ({
  render: (_args, { globals }) => <Lens locale={localeOf(globals["locale"])} lens={lens} selected={selected} />,
});

/** Every status, planned Sources' greyed marks, National and Unplaced tiles; Galați has no status. */
export const EveryStatus: Story = story(typicalCoverage);
export const NothingHarvested: Story = story(nothingHarvestedCoverage);
export const SelectedCounty: Story = story(typicalCoverage, "RO-CJ");
export const SelectedTile: Story = story(typicalCoverage, "UNPLACED");
export const OpenWindow: Story = story(openWindowCoverage);
