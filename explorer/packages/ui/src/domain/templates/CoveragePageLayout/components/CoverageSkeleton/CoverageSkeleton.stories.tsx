import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../../../workbench/index.ts";
import { LoadingStatus } from "../../../../molecules/LoadingStatus/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { SourcePicker } from "../../../../molecules/SourcePicker/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { GapRules } from "../GapRules/index.ts";
import { CoverageSkeleton } from "./index.ts";

const meta = { title: "Domain/CoveragePageLayout/CoverageSkeleton" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const skeleton = (withSelector: boolean): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const copy = sampleCopy.coveragePageLayout(locale);
    const gridAside = (
      <>
        {withSelector && <SourcePicker options={[{ id: "SEAP", label: "SEAP" }, { id: "ONRC", label: "ONRC" }]} selected="SEAP" onSelect={() => {}} copy={{ label: pick(locale, { en: "Coverage of", ro: "Acoperirea pentru" }) }} />}
        <LoadingStatus label={copy.loading} />
      </>
    );
    const rules = (
      <Panel heading={copy.rules.heading} level="h2" flush>
        <GapRules methodologyHref="/explore/methodology" copy={copy} />
      </Panel>
    );
    return (
      <div style={{ display: "grid", gap: 24, padding: 24 }}>
        <CoverageSkeleton copy={copy} gridAside={gridAside} rules={rules} />
      </div>
    );
  };

/** First load with the Source selector and the loading status in the grid panel's header; the rules panel is real. */
export const WithSelector: Story = { render: skeleton(true) };

/** First load with one Source: the loading status alone in the header. */
export const WithoutSelector: Story = { render: skeleton(false) };
