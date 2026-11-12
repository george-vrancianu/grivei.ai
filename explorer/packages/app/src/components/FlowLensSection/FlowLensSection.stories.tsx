import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { catalogue } from "../../copy/index.ts";
import { testCountyTopology } from "../../testing/countyTopology.ts";
import { flowLensCopy, FlowLensSection, type FlowLensSectionProps } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/FlowLensSection" };
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The entity and its Flow lens as the API answered (seam 1, `fixtures/recorded`): real output for the invented archives. */
const answer = (name: string) => {
  const entity = fixtures.EntityRelationships.find((f) => f.name === name)!.data.entity!;
  return { flow: entity.seap.role!.flow, home: entity.placement?.county?.code ?? null };
};

function render(name: string, role: FlowLensSectionProps["role"], props: Partial<FlowLensSectionProps> = {}): NonNullable<Story["render"]> {
  return (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const t = catalogue[locale];
    return (
      <FlowLensSection
        {...answer(name)}
        role={role}
        topology={{ status: "ready", topology: testCountyTopology }}
        locale={locale}
        copy={flowLensCopy(t)}
        status={{ unavailable: t.main.mapUnavailable, loading: t.status.loading }}
        {...props}
      />
    );
  };
}

/** A commune placed in Brașov: its suppliers' counties flow out of the home county. */
export const AuthorityPlaced: Story = { render: render("authority-placed-in-uat", "authority") };
/** An authority no Source places: no home county, so bubbles only, and the unknown-supplier-county tile. */
export const AuthorityWithNoCounty: Story = { render: render("authority", "authority") };
/** A supplier placed in Cluj: every placed authority is in its own county, so one bubble; two authorities are Unplaced. */
export const Supplier: Story = { render: render("supplier", "supplier") };
/** Nothing in the filter: an empty map. */
export const Empty: Story = { render: render("authority-nothing-in-filter", "authority") };
/** The outlines are still loading. */
export const OutlinesLoading: Story = { render: render("supplier", "supplier", { topology: { status: "loading" } }) };
/** The outlines could not be fetched: the page says so and the rest of the tab still works. */
export const TopologyError: Story = { render: render("supplier", "supplier", { topology: { status: "error" } }) };
