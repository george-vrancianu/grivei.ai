import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { nothingHarvestedCoverage, typicalCoverage } from "../../../../samples/coverageLenses.ts";
import type { CoverageLens } from "../../../../types.ts";
import type { MapArea } from "../../../MoneyLensMap/index.ts";
import { coverageByCounty } from "../../coverageLensMap.utils.ts";
import { CoverageTiles } from "./index.ts";

const meta = { title: "Domain/CoverageLensMap/CoverageTiles" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

function Tiles({ locale, lens, selected: initial }: { locale: "en" | "ro"; lens: CoverageLens; selected?: MapArea }) {
  const [selected, setSelected] = useState<MapArea | undefined>(initial);
  return (
    <Box sx={{ maxWidth: 300, display: "flex", flexDirection: "column", gap: 1 }}>
      <CoverageTiles lens={lens} coverage={coverageByCounty(lens.coverage)} selected={selected} onSelect={setSelected} locale={locale} copy={sampleCopy.coverageLensMap(locale)} />
    </Box>
  );
}

const story = (lens: CoverageLens, selected?: MapArea): Story => ({
  render: (_args, { globals }) => <Tiles locale={localeOf(globals["locale"])} lens={lens} selected={selected} />,
});

export const NationalAndUnplaced: Story = story(typicalCoverage);
/** Nothing unplaced: only National. */
export const NationalOnly: Story = story(nothingHarvestedCoverage);
export const SelectedTile: Story = story(typicalCoverage, "UNPLACED");
