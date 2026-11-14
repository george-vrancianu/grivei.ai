import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { catalogue } from "../../copy/index.ts";
import { OnrcCoverageSection, type OnrcCoverageSectionProps } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/OnrcCoverageSection" };
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const answer = (name: string) => fixtures.OnrcCoverage.find((f) => f.name === name)!.data;

function render(props: Partial<OnrcCoverageSectionProps>): NonNullable<Story["render"]> {
  return (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const t = catalogue[locale];
    return (
      <OnrcCoverageSection
        coverage={answer("typical-snapshots-and-a-known-gap")}
        loading={false}
        failed={false}
        locale={locale}
        copy={{ ...t.sources.onrc.coverage.snapshots, states: t.coverage.grid.states }}
        status={{ loading: t.status.loading, failed: t.status.failed }}
        {...props}
      />
    );
  };
}

/** Two snapshots and a known gap for the month with none: the gap says no snapshot of the month is held. */
export const SnapshotsAndAGap: Story = { render: render({}) };
/** No ONRC snapshot is held. */
export const NoSnapshot: Story = { render: render({ coverage: answer("empty-no-snapshot") }) };
export const Loading: Story = { render: render({ coverage: null, loading: true }) };
export const Failed: Story = { render: render({ coverage: null, failed: true }) };
