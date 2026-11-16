import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { FullResultsSkeleton } from "./index.ts";
import type { ResultTab } from "../ResultTabs/index.ts";

const meta = { title: "Domain/FullResultsSkeleton", component: FullResultsSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const sample =
  (tab: ResultTab): Story["render"] =>
  (_args, { globals }) => {
    const copy = sampleCopy.fullResults(localeOf(globals["locale"]));
    return (
      <FullResultsSkeleton
        tab={tab}
        copy={{ heading: copy.heading[tab], head: copy.entityRow.head }}
        status={<LoadingStatus label={pick(globals["locale"], { en: "Loading…", ro: "Se încarcă…" })} />}
      />
    );
  };

/** The Suppliers panel on first load: the real kind, a block for the count, the column head, eight rows fading down. */
export const FirstLoad: Story = { render: sample("suppliers") };
export const Authorities: Story = { render: sample("authorities") };
/** Records have no column head. */
export const Records: Story = { render: sample("records") };
/** Below 600 px the Signals chip and the amount wrap under the name. */
export const Phone: Story = { ...FirstLoad, globals: { viewport: { value: "mobile2", isRotated: false } } };
