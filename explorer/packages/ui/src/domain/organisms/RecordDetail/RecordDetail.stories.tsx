import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import {
  blankCeilingPage, consortiumNameOnlyPage, consortiumPage, contractRecord, directPurchaseRecord, everyBadgePage, frameworkPage, naturalPersonPage,
  noValuePage, provisionalPage, splittingPage, subsequentPage, suspectDirectPage, suspectNoEstimatePage, suspectOverEstimatePage,
} from "../../samples/fixtureData.ts";
import type { RecordPageData } from "../../types.ts";
import { RecordDetail } from "./index.ts";

const meta = { title: "Domain/RecordDetail", component: RecordDetail } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const detail =
  (record: RecordPageData): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <RecordDetail
        record={record}
        entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
        recordHref={(code) => `/explore/record/${code}`}
        methodologyHref="/explore/methodology"
        locale={locale}
        copy={sampleCopy.recordDetail(locale)}
      />
    );
  };

/** A direct purchase (DA) above the cap, in its over-cap Signal. */
export const DirectPurchase: Story = { render: detail(directPurchaseRecord) };
/** A contract with one winner and no caveats. */
export const Contract: Story = { render: detail(contractRecord) };
/** A consortium: the full value, each member's equal share and the note that shares are a convention. */
export const Consortium: Story = { render: detail(consortiumPage) };
/** A consortium with a foreign firm and a name-only association: no CUI-keyed link for them. */
export const ConsortiumNameOnly: Story = { render: detail(consortiumNameOnlyPage) };
/** A framework agreement: ceiling not counted, subsequent contracts reported so far above the ceiling, one listed. */
export const Framework: Story = { render: detail(frameworkPage) };
/** A subsequent contract: counted, with the link back to its framework. */
export const SubsequentContract: Story = { render: detail(subsequentPage) };
/** A framework whose ceiling is blank: the line has no percentage. */
export const FrameworkBlankCeiling: Story = { render: detail(blankCeilingPage) };
/** A suspect value (direct purchase at ten times its cap): shown, its rule and threshold stated, counted value empty. */
export const SuspectValue: Story = { render: detail(suspectDirectPage) };
/** A suspect contract at a hundred times its estimate. */
export const SuspectOverEstimate: Story = { render: detail(suspectOverEstimatePage) };
/** A suspect contract above 50 bn RON with no estimate (the rule has no threshold). */
export const SuspectNoEstimate: Story = { render: detail(suspectNoEstimatePage) };
/** No value in SEAP: counted as a Record, adds nothing; a no-publication Signal. */
export const NoValue: Story = { render: detail(noValuePage) };
/** A natural-person winner: labelled, never named, never linked. */
export const NaturalPersonWinner: Story = { render: detail(naturalPersonPage) };
/** A Record inside a splitting Signal that lists its Records. */
export const InSplittingSignal: Story = { render: detail(splittingPage) };
/** Crawled provisional, no stable public URL: no link, and it says so. */
export const ProvisionalNoUrl: Story = { render: detail(provisionalPage) };
/** Every badge, each with its explanation. */
export const EveryBadge: Story = { render: detail(everyBadgePage) };
