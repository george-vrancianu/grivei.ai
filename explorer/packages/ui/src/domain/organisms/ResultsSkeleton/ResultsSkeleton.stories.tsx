import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { ResultsSkeleton } from "./index.ts";

const meta = { title: "Domain/ResultsSkeleton", component: ResultsSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The results panel on first load: real tab names with a pill block for each count, eight rows fading down. */
export const FirstLoad: Story = {
  render: (_args, { globals }) => {
    const { label, tabs } = sampleCopy.resultTabs(localeOf(globals["locale"]));
    return <ResultsSkeleton copy={{ label, tabs }} status={<LoadingStatus label={pick(globals["locale"], { en: "Loading…", ro: "Se încarcă…" })} />} />;
  },
};

/** Below 600 px the Signals chip and the amount wrap under the name. */
export const Phone: Story = { ...FirstLoad, globals: { viewport: { value: "mobile2", isRotated: false } } };
