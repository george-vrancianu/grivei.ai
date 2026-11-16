import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { pick } from "../../../workbench/index.ts";
import { SignalOrderToggle } from "../../molecules/SignalOrderToggle/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import { Button } from "../../../atoms/Button/index.ts";
import { SignalCard } from "../SignalCard/index.ts";
import { SignalList } from "../SignalList/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import {
  authorityManyCounterpartiesOverview, authorityOverview, emptyOverview, manyAliasesOverview, nameOnlyOverview, recordRows, supplierOverview,
} from "../../samples/fixtureData.ts";
import type { EntityAliases, EntityOverviewData, EntityRole } from "../../types.ts";
import { EntityOverview, OverviewSkeleton } from "./index.ts";

const meta = { title: "Domain/EntityOverview", component: EntityOverview } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The Signal cards the app puts in the slot: a `SignalList` of `SignalCard`s. */
function SignalCards({ overview, locale }: { overview: EntityOverviewData; locale: "en" | "ro" }): ReactNode {
  return (
    <SignalList
      signals={overview.signals.rows}
      locale={locale}
      renderItem={(signal) => (
        <SignalCard
          signal={signal}
          reproduceHref={`/explore/authority/${signal.authority.key}/records`}
          methodologyHref="/explore/methodology"
          entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
          locale={locale}
          copy={sampleCopy.signalCard(locale)}
        />
      )}
    />
  );
}

/** The order toggle the app puts in the slot above the Signals list. */
function SignalOrderSample({ locale }: { locale: "en" | "ro" }) {
  return <SignalOrderToggle value="DATE_DESC" onChange={() => {}} copy={sampleCopy.signalOrder(locale)} />;
}

const overviewStory =
  (data: { overview: EntityOverviewData; aliases: EntityAliases }, role: EntityRole, withSignals = true, toolbar = false, busy = false): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <EntityOverview
        overview={data.overview}
        aliases={data.aliases}
        role={role}
        entityHref={(entity, r) => `/explore/${r}/${entity.key}`}
        recordHref={(record) => `/explore/record/${record.code}`}
        methodologyHref="/explore/methodology"
        suspectHref="?badges=suspect-value"
        locale={locale}
        copy={sampleCopy.entityOverview(locale)}
        signals={withSignals ? <SignalCards overview={data.overview} locale={locale} /> : undefined}
        signalsToolbar={toolbar ? <SignalOrderSample locale={locale} /> : undefined}
        signalsPaging={withSignals ? { page: 1, pageSize: 20, shown: data.overview.signals.rows.length, pageHref: (n) => `?page=${n}`, copy: sampleCopy.fullResults(locale).pagination } : undefined}
        graphHref="/explore/authority/1000017/relationships"
        busy={busy}
        status={busy ? <LoadingStatus label={pick(locale, words.loading)} /> : undefined}
      />
    );
  };

/** An authority with a single counterparty holding the whole total, and no Signals: the Signals section says so. */
export const Authority: Story = { render: overviewStory(authorityOverview, "authority") };
/** An authority with 220 counterparties (the first four shown, "and 216 more"), a natural person among them (labelled, never named or linked), a consortium and a framework line. */
export const AuthorityManyCounterparties: Story = { render: overviewStory(authorityManyCounterpartiesOverview, "authority") };
/** A supplier with Signals in the slot, a Total that left a suspect value and Records with no value out, a consortium and three aliases. */
export const Supplier: Story = { render: overviewStory(supplierOverview, "supplier") };
/** An entity with no Signals. */
export const NoSignals: Story = { render: overviewStory(nameOnlyOverview, "supplier") };
/** A supplier SEAP spells eight ways: most differ from ANAF's name and carry the badge. */
export const ManyAliases: Story = { render: overviewStory(manyAliasesOverview, "supplier") };
/** Nothing matches the filter: every section has its empty sentence. */
export const NothingInFilter: Story = { render: overviewStory(emptyOverview, "authority") };
/** The API sends a suspect Record and a Record with no counted value among the largest: only counted Records are listed. */
export const UncountedRecordsFilteredOut: Story = {
  render: overviewStory(
    { ...supplierOverview, overview: { ...supplierOverview.overview, largestRecords: [...recordRows.filter((r) => r.counted === null), ...supplierOverview.overview.largestRecords] } },
    "supplier",
  ),
};
/** The slot above the Signals list holds a control (here the order toggle). */
export const SignalsToolbarSlot: Story = { render: overviewStory(supplierOverview, "supplier", true, true) };

const words = {
  loading: { en: "Loading…", ro: "Se încarcă…" },
  error: { en: "The data could not be loaded.", ro: "Datele nu au putut fi încărcate." },
  retry: { en: "Try again", ro: "Încearcă din nou" },
};
/** A refetch (a new filter, order or page): the last answer stays, bodies dimmed and `aria-busy`, headings and strips at full strength, a loading status on the Signals line. */
export const Refetching: Story = { render: overviewStory(supplierOverview, "supplier", true, true, true) };
/** The first load: the Overview's shape with the real labels and headings, a block where each value goes and a loading status. */
export const Loading: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <OverviewSkeleton copy={sampleCopy.entityOverview(locale)} status={<LoadingStatus label={pick(locale, words.loading)} />} />;
  },
};
/** The Overview's data could not be loaded: an error note with its retry, never red. */
export const Failed: Story = {
  render: (_args, { globals }) => (
    <StateNote kind="error" action={<Button size="small">{pick(globals["locale"], words.retry)}</Button>}>
      {pick(globals["locale"], words.error)}
    </StateNote>
  ),
};
