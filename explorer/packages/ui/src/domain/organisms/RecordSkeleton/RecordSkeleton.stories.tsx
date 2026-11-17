import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { RecordSkeleton } from "./index.ts";

const meta = { title: "Domain/RecordSkeleton", component: RecordSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The Record page on first load: real panel titles and figure labels, blocks where the Record's own text goes. */
export const FirstLoad: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const { value, parties, heading } = sampleCopy.recordDetail(locale);
    return <RecordSkeleton copy={{ value, winners: parties.winners, facts: heading.panel }} status={<LoadingStatus label={pick(globals["locale"], { en: "Loading…", ro: "Se încarcă…" })} />} />;
  },
};

/** At 390 px the panels stack and the figures wrap. */
export const Phone: Story = { ...FirstLoad, globals: { viewport: { value: "mobile2", isRotated: false } } };
