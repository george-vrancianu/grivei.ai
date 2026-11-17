import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../../../atoms/Box/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { authorityNationwideFlow, supplierNationwideFlow } from "../../../../samples/flowMaps.ts";
import { countyListRows } from "../../flowLensMap.utils.ts";
import { CountyList } from "./index.ts";

const meta = { title: "Domain/FlowLensMap/CountyList" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const story = (flow: Parameters<typeof countyListRows>[0]): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const copy = sampleCopy.flowLensMap(locale);
    const { rows, total } = countyListRows(flow, copy.tiles);
    return (
      <Box sx={{ maxWidth: 420 }}>
        <CountyList rows={rows} total={total} locale={locale} label={copy.counties.label} />
      </Box>
    );
  },
});

/** An authority's suppliers by county; the unknown-supplier-county money last. */
export const AuthoritySuppliers: Story = story(authorityNationwideFlow);
/** A supplier's authorities by county; the unplaced authorities last. */
export const SupplierAuthorities: Story = story(supplierNationwideFlow);
