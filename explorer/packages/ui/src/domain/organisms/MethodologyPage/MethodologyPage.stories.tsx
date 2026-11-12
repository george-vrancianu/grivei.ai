import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { methodologyRates, sampleMethodologyCopy } from "../../samples/methodology.ts";
import { MethodologyPage, type MethodologyBaseRates } from "./index.ts";

const meta = { title: "Domain/MethodologyPage", component: MethodologyPage } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const page =
  (baseRates: MethodologyBaseRates): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <MethodologyPage baseRates={baseRates} sectionHref={(anchor) => `/explore/methodology#${anchor}`} locale={locale} copy={sampleMethodologyCopy(locale)} />;
  };

/** After the 2021-22 backfill: every rule sees 2021 onwards, with its national base rate. */
export const Typical: Story = { render: page({ status: "ready", rules: methodologyRates("typical-after-backfill") }) };
/** Before the backfill: no-publication sees 2023 onwards, a rule that fired for no authority reads "No contracting authority had one", and one window has no start. */
export const BeforeBackfill: Story = { render: page({ status: "ready", rules: methodologyRates("before-backfill") }) };
/** The figures are on their way; the prose is already readable. */
export const Loading: Story = { render: page({ status: "loading" }) };
/** The figures could not be loaded; every rule's prose stays and says so beside the slot. */
export const Failed: Story = { render: page({ status: "error" }) };
/** The answer holds only some rules: the others say there is no figure yet. */
export const OneRuleMissing: Story = { render: page({ status: "ready", rules: methodologyRates("typical-after-backfill").slice(0, 3) }) };
