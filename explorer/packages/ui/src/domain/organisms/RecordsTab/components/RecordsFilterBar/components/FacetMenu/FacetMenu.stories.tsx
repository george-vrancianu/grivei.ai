import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../../../samples/copy.ts";
import { FacetMenu } from "./index.ts";

const meta = { title: "Domain/RecordsTab/FacetMenu", component: FacetMenu } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const sample =
  (multiple: boolean, estimated = false): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const copy = sampleCopy.recordsFacets(locale);
    const group = {
      id: "channel",
      title: copy.groups.channel,
      options: [
        { id: "a", label: copy.channels.DIRECT_PURCHASE, count: { records: estimated ? 12_400 : 41, estimated }, pressed: true, onToggle: () => {} },
        { id: "b", label: copy.channels.CONTRACT, count: { records: 8, estimated }, pressed: false, onToggle: () => {} },
        { id: "c", label: "Licitație deschisă", pressed: false, onToggle: () => {} },
      ],
    };
    return <FacetMenu group={group} multiple={multiple} optionText={copy.option} unsetLabel={copy.any} picked={copy.picked} locale={locale} />;
  };

/** One value at a time, each with its count; the chosen one is checked. */
export const SingleChoice: Story = { render: sample(false) };
export const MultipleChoice: Story = { render: sample(true) };
/** Estimated counts lead with "≈". */
export const EstimatedCounts: Story = { render: sample(false, true) };
