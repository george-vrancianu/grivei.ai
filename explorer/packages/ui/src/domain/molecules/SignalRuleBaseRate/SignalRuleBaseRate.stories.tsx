import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { methodologyRates, sampleBaseRateCopy } from "../../samples/methodology.ts";
import type { SignalRuleBaseRateData } from "../../types.ts";
import { SignalRuleBaseRate } from "./index.ts";

const meta = { title: "Domain/SignalRuleBaseRate", component: SignalRuleBaseRate } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const typical = methodologyRates("typical-after-backfill");
const beforeBackfill = methodologyRates("before-backfill");
const slug = (rules: SignalRuleBaseRateData[], rule: SignalRuleBaseRateData["slug"]) => rules.find((r) => r.slug === rule) ?? null;

const slot =
  (rule: SignalRuleBaseRateData | null): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <SignalRuleBaseRate status="ready" rule={rule} locale={locale} copy={sampleBaseRateCopy(locale)} />;
  };
const waiting =
  (status: "loading" | "error"): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <SignalRuleBaseRate status={status} locale={locale} copy={sampleBaseRateCopy(locale)} />;
  };

/** A rule with its window and a base rate of a few percent. */
export const Typical: Story = { render: slot(slug(typical, "OVER_CAP")) };
/** A small rate keeps its decimals ("0.4%"), never rounds to zero. */
export const SmallRate: Story = { render: slot(slug(typical, "FRAMEWORK_OVERRUN")) };
/** No authority had one in the base-rate year: said in words, not "0%". */
export const RateZeroOpenStart: Story = { render: slot(slug(beforeBackfill, "FRAMEWORK_OVERRUN")) };
/** The window starts in 2023 until the 2021-22 backfill is loaded. */
export const WindowFrom2023: Story = { render: slot(slug(beforeBackfill, "NO_PUBLICATION")) };
export const Loading: Story = { render: waiting("loading") };
export const Failed: Story = { render: waiting("error") };
/** The answer holds no entry for this rule. */
export const Missing: Story = { render: slot(null) };
