import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import {
  blankCeilingPage, consortiumNameOnlyPage, consortiumPage, contractRecord, directPurchaseRecord, everyBadgePage, frameworkPage, naturalPersonPage,
  noValuePage, provisionalPage, crawlOnlyPage, cuiMismatchPage, curatedPage, frameworkOverrunPage, nameDiffersPage, noPublicPage, splittingPage, subsequentPage, suspectDirectPage, suspectNoEstimatePage, suspectOverEstimatePage,
} from "../../samples/fixtureData.ts";
import type { RecordPageData } from "../../types.ts";
import { SignalCard } from "../SignalCard/index.ts";
import { ruleSlug } from "../../samples/signals.ts";
import { RecordDetail } from "./index.ts";

const meta = { title: "Domain/RecordDetail", component: RecordDetail } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const detail =
  (record: RecordPageData, withCards = false): Story["render"] =>
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
        renderSignalCard={
          withCards
            ? (signal) => (
                <SignalCard
                  signal={signal}
                  reproduceHref={`/explore/authority/${signal.reproduce.authority}/records?signal=${ruleSlug(signal.rule)}`}
                  methodologyHref={`/explore/methodology#signal-${ruleSlug(signal.rule)}`}
                  seapHref={signal.recordCount === 1 ? `/source/seap/${record.code}` : null}
                  entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
                  locale={locale}
                  copy={sampleCopy.signalCard(locale)}
                />
              )
            : undefined
        }
      />
    );
  };

/** A direct purchase (DA) just under ten times the cap: counted, and listed by an over-cap Signal. */
export const DirectPurchase: Story = { render: detail(directPurchaseRecord) };
/** A contract (a subsequent one, under a code with a slash) with its procedure, type and CPV, and the framework line. */
export const Contract: Story = { render: detail(contractRecord) };
/** A consortium (an award notice): the full value, each member's equal share and the note that shares are a convention. */
export const Consortium: Story = { render: detail(consortiumPage) };
/** A consortium of a CUI firm, a natural person and a foreign firm known by its VAT id. */
export const ConsortiumNameOnly: Story = { render: detail(consortiumNameOnlyPage) };
/** A framework agreement: ceiling not counted, what the subsequent contracts reported so far (a ratio), two listed. */
export const Framework: Story = { render: detail(frameworkPage) };
/** A subsequent contract: counted, with the link back to its framework. */
export const SubsequentContract: Story = { render: detail(subsequentPage) };
/** A subsequent contract of a framework whose ceiling is blank: the line has no percentage. */
export const FrameworkBlankCeiling: Story = { render: detail(blankCeilingPage) };
/** A suspect value (direct purchase at ten times its cap): shown, its rule and threshold stated, counted value empty. */
export const SuspectValue: Story = { render: detail(suspectDirectPage) };
/** A suspect contract at a hundred times its estimate. */
export const SuspectOverEstimate: Story = { render: detail(suspectOverEstimatePage) };
/** A suspect contract above 50 bn RON with no estimate (the rule has no threshold). */
export const SuspectNoEstimate: Story = { render: detail(suspectNoEstimatePage) };
/** No value in SEAP: counted as a Record, adds nothing. */
export const NoValue: Story = { render: detail(noValuePage) };
/** A natural-person winner: labelled, never named, never linked. */
export const NaturalPersonWinner: Story = { render: detail(naturalPersonPage) };
/** A Record inside a splitting Signal that lists its Records. */
export const InSplittingSignal: Story = { render: detail(splittingPage) };
/** A framework whose subsequent contracts exceed its ceiling (125%), with the framework-overrun Signal. */
export const FrameworkOverrun: Story = { render: detail(frameworkOverrunPage) };
/** The same Record with the Signal as a card (the app's wiring): the four-part wording, the links, then the Signal's Records. */
export const FrameworkOverrunWithSignalCard: Story = { render: detail(frameworkOverrunPage, true) };
/** Crawled, in a quarter the bulk has not reached: provisional, linked to its e-licitatie page. */
export const Provisional: Story = { render: detail(provisionalPage) };
/** Crawled and not in the bulk: crawl-only. */
export const CrawlOnly: Story = { render: detail(crawlOnlyPage) };
/** No stable public URL (a code the redirect cannot resolve): no link, and it says so. */
export const ProvisionalNoUrl: Story = { render: detail(noPublicPage) };
/** The supplier CUI is the authority's: unresolved, with the CUI-mismatch badge. */
export const CuiMismatch: Story = { render: detail(cuiMismatchPage) };
/** The supplier is spelled as ANAF's old name: the name-differs badge. */
export const NameDiffersFromAnaf: Story = { render: detail(nameDiffersPage) };
/** A wrong CUI mapped by the override file: curated and name-differs badges. */
export const IdentityCurated: Story = { render: detail(curatedPage) };
/** Every badge, each with its explanation. */
export const EveryBadge: Story = { render: detail(everyBadgePage) };
