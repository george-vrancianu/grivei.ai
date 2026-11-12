import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { catalogue } from "../../copy/index.ts";
import { testCountyTopology } from "../../testing/countyTopology.ts";
import { MoneyLensSection, type MoneyLensSectionProps } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/MoneyLensSection" };
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The map of a recorded MainScreen answer (seam 1, `fixtures/recorded`): real API output for the invented archive-moneymap. */
const mapOf = (name: string) => fixtures.MainScreen.find((f) => f.name === name)!.data.seap.search.map;

function render(props: Partial<MoneyLensSectionProps>): NonNullable<Story["render"]> {
  return (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    return (
      <MoneyLensSection
        map={mapOf("empty-filter-national")}
        loading={false}
        topology={{ status: "ready", topology: testCountyTopology }}
        county={undefined}
        side="AUTHORITY"
        onChange={() => undefined}
        locale={locale}
        copy={catalogue[locale].moneyLensMap}
        status={{ unavailable: catalogue[locale].main.mapUnavailable, loading: catalogue[locale].status.loading }}
        {...props}
      />
    );
  };
}

/** No filter: counties plus the National and Unplaced tiles. */
export const AuthoritySide: Story = { render: render({}) };
/** A county chosen: the map, the Total and the tabs are narrowed to it. */
export const CountySelected: Story = { render: render({ map: mapOf("county-authority-side"), county: "RO-BV" }) };
/** The supplier side: a consortium's shares land in each winner's county; the unknown-county tile appears. */
export const SupplierSide: Story = { render: render({ map: mapOf("supplier-side-unknown-county"), side: "SUPPLIER" }) };
/** The Unplaced tile chosen. */
export const UnplacedChosen: Story = { render: render({ map: mapOf("unplaced-tile"), county: "UNPLACED" }) };
/** Nothing matches the query: every county is grey and the tiles are zero. */
export const NothingMatches: Story = { render: render({ map: mapOf("empty-no-match") }) };
/** The search is in flight. */
export const Loading: Story = { render: render({ map: null, loading: true }) };
/** The outlines are still loading. */
export const OutlinesLoading: Story = { render: render({ topology: { status: "loading" } }) };
/** The outlines could not be fetched: the page says so and the rest of the screen still works. */
export const OutlinesUnavailable: Story = { render: render({ topology: { status: "error" } }) };
