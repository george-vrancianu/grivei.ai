import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../../../samples/copy.ts";
import { partyCopy, recordParty, recordPartyIndependent, recordPartyVia } from "../../../../samples/leadership.ts";
import type { RecordPartyData } from "../../../../types.ts";
import { PartySection } from "./index.ts";

const meta = { title: "Domain/RecordDetail/PartySection", component: PartySection } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const section = (party: RecordPartyData): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <PartySection party={party} authorityHref={(key) => `/explore/authority/${key}`} locale={locale} copy={partyCopy[locale]} />;
  },
});

export const Direct = section(recordParty);
export const Independent = section(recordPartyIndependent);
export const InheritedBySubordinateBody = section(recordPartyVia);
