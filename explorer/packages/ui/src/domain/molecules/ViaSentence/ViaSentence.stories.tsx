import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { leadershipCopy, leadershipVia } from "../../samples/leadership.ts";
import { ViaSentence } from "./index.ts";

const meta = { title: "Domain/ViaSentence", component: ViaSentence } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const SubordinateBodyThroughItsAuthority: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <ViaSentence via={leadershipVia.via!} sentence={leadershipCopy[locale].via} href="/explore/authority/51000501" locale={locale} />;
  },
};
