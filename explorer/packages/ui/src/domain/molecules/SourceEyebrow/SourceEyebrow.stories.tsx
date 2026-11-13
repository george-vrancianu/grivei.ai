import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { SourceEyebrow } from "./index.ts";

const sources = [{ id: "SEAP", name: "SEAP" }, { id: "ONRC", name: "ONRC" }];

const meta = { title: "Domain/SourceEyebrow", component: SourceEyebrow } satisfies Meta<typeof SourceEyebrow>;
export default meta;
type Story = StoryObj;

const eyebrow = (list: { id: string; name: string }[]): Story["render"] => (_args, { globals }) => (
  <SourceEyebrow sources={list} selected="SEAP" copy={sampleCopy.sourceEyebrow(localeOf(globals["locale"]))} />
);

/** The Release 1 state: SEAP is the one Source, shown read-only. */
export const ReadOnly: Story = { render: eyebrow(sources) };
/** The list has not arrived yet: the id stands in for the name. */
export const BeforeSourcesLoad: Story = { render: eyebrow([]) };
/** A long Source name from the API wraps rather than overflowing. */
export const LongName: Story = { render: eyebrow([{ id: "SEAP", name: "Sistemul Electronic de Achiziții Publice (SEAP), national harvest" }]) };
