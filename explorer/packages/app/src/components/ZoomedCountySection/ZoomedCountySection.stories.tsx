import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { catalogue } from "../../copy/index.ts";
import { testUatTopologies } from "../../testing/uatTopology.ts";
import { ZoomedCountySection, type ZoomedCountySectionProps } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/ZoomedCountySection" };
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The answer of a recorded ZoomedCounty request (seam 1, `fixtures/recorded`): real API output for the invented archive-moneymap. */
const dataOf = (name: string) => fixtures.ZoomedCounty.find((f) => f.name === name)!.data;
const ready = (county: string) => ({ status: "ready" as const, topology: testUatTopologies[county]! });

function render(props: Partial<ZoomedCountySectionProps>): NonNullable<Story["render"]> {
  return (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const t = catalogue[locale];
    return (
      <ZoomedCountySection
        county="RO-BV"
        data={dataOf("county-with-unknown-uat-row")}
        loading={false}
        failed={false}
        topology={ready("RO-BV")}
        uat={undefined}
        onSelectUat={() => undefined}
        onClearUat={() => undefined}
        onBack={() => undefined}
        locale={locale}
        copy={t.zoomedCounty}
        status={{ loading: t.status.loading, unavailable: t.main.mapUnavailable, failed: t.status.failed }}
        {...props}
      />
    );
  };
}

/** A county: UATs on a log scale, Bran (in the outlines, no purchases) grey, circles for the authorities, and the "county known, UAT unknown" row. */
export const TypicalCounty: Story = { render: render({}) };
/** A UAT clicked: it is marked on the map and named above it, with the way to take it back. */
export const UatChosen: Story = { render: render({ uat: "880010" }) };
/** No authority has a UAT unknown to SIRUTA: no extra row. */
export const WithoutUnknownUatRow: Story = { render: render({ county: "RO-CJ", data: dataOf("county-without-unknown-uat-row"), topology: ready("RO-CJ") }) };
/** Bucharest by its six sectors; only Sector 3 has purchases in the recorded archive. */
export const BucharestBySector: Story = { render: render({ county: "RO-B", data: dataOf("bucharest-by-sector"), topology: ready("RO-B"), uat: "179169" }) };
/** Nothing matches the filter in the county: every UAT is grey. */
export const NothingMatches: Story = { render: render({ county: "RO-CJ", data: dataOf("county-no-match"), topology: ready("RO-CJ") }) };
/** The zoom request is in flight. */
export const Loading: Story = { render: render({ data: null, loading: true }) };
/** The county's outlines are still loading. */
export const OutlinesLoading: Story = { render: render({ topology: { status: "loading" } }) };
/** The county's outlines file is missing: the page says so, the way back and the results still work. */
export const OutlinesUnavailable: Story = { render: render({ topology: { status: "error" } }) };
/** The ZoomedCounty request failed. */
export const QueryFailed: Story = { render: render({ data: null, failed: true }) };
