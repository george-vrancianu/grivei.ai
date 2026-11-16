import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { localeOf } from "../../samples/copy.ts";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import { OnrcResultsSkeleton } from "./index.ts";

const meta = { title: "Domain/OnrcResultsSkeleton", component: OnrcResultsSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** ONRC's results panel on first load: the real title, the status at the right of the header, three rows of blocks. */
export const FirstLoad: Story = {
  render: (_args, { globals }) => (
    <OnrcResultsSkeleton title={sampleOnrcCopy.results(localeOf(globals["locale"])).title} status={<LoadingStatus label={pick(globals["locale"], { en: "Loading…", ro: "Se încarcă…" })} />} />
  ),
};

export const Phone: Story = { ...FirstLoad, globals: { viewport: { value: "mobile2", isRotated: false } } };
