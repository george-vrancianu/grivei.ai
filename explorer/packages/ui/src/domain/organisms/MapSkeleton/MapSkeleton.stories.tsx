import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../atoms/Box/index.ts";
import { pick } from "../../../workbench/index.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { MapSkeleton } from "./index.ts";

const meta = { title: "Domain/MapSkeleton", component: MapSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const label = (globals: Record<string, unknown>) => pick(globals["locale"], { en: "Loading…", ro: "Se încarcă…" });

/** The outlines are loaded, the figures are not: the areas in a neutral pulsing fill, a status chip over them. */
export const OutlinesLoaded: Story = {
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 760 }}>
      <MapSkeleton topology={countiesTopology} label={label(globals)} />
    </Box>
  ),
};

/** No outlines yet: a block the size of the map. */
export const OutlinesPending: Story = {
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 760 }}>
      <MapSkeleton label={label(globals)} />
    </Box>
  ),
};

export const Phone: Story = { ...OutlinesLoaded, globals: { viewport: { value: "mobile2", isRotated: false } } };
