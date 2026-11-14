import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { leadership, leadershipCopy, leadershipVia, leadershipWithGaps } from "../../samples/leadership.ts";
import type { LeadershipData } from "../../types.ts";
import { LeadershipSection } from "./index.ts";

const meta = { title: "Domain/LeadershipSection", component: LeadershipSection } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const section = (data: LeadershipData): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <LeadershipSection leadership={data} authorityHref={(key) => `/explore/authority/${key}`} locale={locale} copy={leadershipCopy[locale]} />;
  },
});

export const TownHallWithAPartySwitch = section(leadership);
export const AllianceIndependentPartialElectionAndGaps = section(leadershipWithGaps);
export const SubordinateBodyThroughItsAuthority = section(leadershipVia);
