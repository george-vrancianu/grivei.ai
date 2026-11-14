import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../atoms/Box/index.ts";
import { onPanel } from "../../../workbench/index.ts";
import { localeOf } from "../../samples/copy.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import { OnrcCountMap } from "./index.ts";

const meta = { title: "Domain/OnrcCountMap", decorators: [onPanel] } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const lens = (map: React.ComponentProps<typeof OnrcCountMap>["map"], selected?: string): Story["render"] => (_args, { globals }) => {
  const locale = localeOf(globals["locale"]);
  return (
    <Box sx={{ maxWidth: 820 }}>
      <OnrcCountMap map={map} topology={countiesTopology} selected={selected} onSelect={() => {}} locale={locale} copy={sampleOnrcCopy.countMap(locale)} />
    </Box>
  );
};

/** Counties coloured by how many registrations match the search, with the Unplaced tile. */
export const Typical: Story = { render: lens({ counties: [{ area: "RO-CJ", name: "Cluj", registrations: 1200 }, { area: "RO-BV", name: "Brașov", registrations: 310 }, { area: "RO-B", name: "București", registrations: 5400 }], unplacedRegistrations: 17 }) };
/** The Unplaced tile chosen: it is a chip of the filter. */
export const UnplacedSelected: Story = { render: lens({ counties: [{ area: "RO-CJ", name: "Cluj", registrations: 2 }], unplacedRegistrations: 2 }, "UNPLACED") };
/** A search nothing matches: an empty map and an Unplaced tile at zero. */
export const Empty: Story = { render: lens({ counties: [], unplacedRegistrations: 0 }) };
