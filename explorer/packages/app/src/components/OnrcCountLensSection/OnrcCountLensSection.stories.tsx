import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { catalogue } from "../../copy/index.ts";
import { testCountyTopology } from "../../testing/countyTopology.ts";
import { OnrcCountLensSection, type OnrcCountLensSectionProps } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/OnrcCountLensSection" };
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The count lens of ONRC's hand-written fixtures (#176; seam 1 asserts the real API's answers beside them). */
const mapOf = (name: string) => fixtures.OnrcSearch.find((f) => f.name === name)!.data.onrc.search.map;

function render(props: Partial<OnrcCountLensSectionProps>): NonNullable<Story["render"]> {
  return (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    return (
      <OnrcCountLensSection
        map={mapOf("typical-name-and-alias-hits")}
        loading={false}
        topology={{ status: "ready", topology: testCountyTopology }}
        county={undefined}
        onSelect={() => undefined}
        locale={locale}
        copy={catalogue[locale].sources.onrc.countMap}
        status={{ unavailable: catalogue[locale].main.mapUnavailable, loading: catalogue[locale].status.loading }}
        {...props}
      />
    );
  };
}

/** A name query: a county with a registration each. */
export const Counties: Story = { render: render({}) };
/** Chips that leave registrations with no county: the Unplaced tile carries them, and is chosen. */
export const UnplacedChosen: Story = { render: render({ map: mapOf("typical-filters-unplaced-and-undated"), county: "UNPLACED" }) };
/** Nothing matches. */
export const Empty: Story = { render: render({ map: mapOf("empty-nothing-matches") }) };
/** The search is loading. */
export const Loading: Story = { render: render({ map: null, loading: true }) };
/** The outlines cannot be loaded. */
export const OutlinesFailed: Story = { render: render({ topology: { status: "error" } }) };
