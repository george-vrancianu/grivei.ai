import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import type { PartyCoverageData } from "../../types.ts";
import { PartyCoverage } from "./index.ts";

const meta = { title: "Domain/PartyCoverage", component: PartyCoverage } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const RON = (n: number) => String(n * 100);
const typical: PartyCoverageData = {
  party: "PARTIDUL SOCIAL DEMOCRAT",
  direct: { records: 3, awarded: RON(22_000_000) },
  subordinate: { records: 2, awarded: RON(8_000_000) },
  otherParties: { records: 2, awarded: RON(14_000_000) },
  independent: { records: 1, awarded: RON(1_000_000) },
  unattributed: { records: 3, awarded: RON(15_000_000) },
};
const zero = { records: 0, awarded: "0" };

const story = (coverage: PartyCoverageData): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <PartyCoverage coverage={coverage} locale={locale} copy={sampleCopy.partyCoverage(locale)} methodologyHref="/explore/methodology#party-and-leadership" />;
  },
});

export const Typical = story(typical);
/** An alliance under its registered name; nothing reached it through a subordinate body. */
export const AllianceDirectOnly = story({ ...typical, party: "ALIANȚA USR PLUS", subordinate: zero });
/** A list that led nothing in the set: the Total is empty, the rest is still said. */
export const NothingMatched = story({ ...typical, direct: zero, subordinate: zero });
/** Sums beyond 2^53 bani stay exact. */
export const Extreme = story({ ...typical, direct: { records: 2_400_000, awarded: "9007199254740993000" }, unattributed: { records: 900_000, awarded: "9007199254740993000" } });
/** A set with no value at all: no share to state. */
export const NoValue = story({ ...typical, direct: zero, subordinate: zero, otherParties: zero, independent: zero, unattributed: { records: 4, awarded: "0" } });
