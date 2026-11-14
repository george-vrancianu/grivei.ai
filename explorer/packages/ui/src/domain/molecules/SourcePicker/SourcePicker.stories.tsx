import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { SourcePicker } from "./index.ts";

const meta = { title: "Domain/SourcePicker", component: SourcePicker } satisfies Meta<typeof SourcePicker>;
export default meta;
type Story = StoryObj;

const label = (globals: Record<string, unknown>) => pick(globals["locale"], { en: "Source", ro: "Sursă" });

/** Both Sources with their match counts for one query, side by side: never summed. */
export const WithCounts: Story = {
  render: (_args, { globals }) => (
    <SourcePicker
      selected="SEAP"
      onSelect={() => {}}
      options={[
        { id: "SEAP", label: "SEAP", count: pick(globals["locale"], { en: "1,204 Records", ro: "1.204 înregistrări" }) },
        { id: "ONRC", label: "ONRC", count: pick(globals["locale"], { en: "40 registrations", ro: "40 de înmatriculări" }) },
      ]}
      copy={{ label: label(globals) }}
    />
  ),
};
/** No query yet, or the counts are loading: names only. */
export const NoCounts: Story = {
  render: (_args, { globals }) => <SourcePicker selected="ONRC" onSelect={() => {}} options={[{ id: "SEAP", label: "SEAP" }, { id: "ONRC", label: "ONRC" }]} copy={{ label: label(globals) }} />,
};
