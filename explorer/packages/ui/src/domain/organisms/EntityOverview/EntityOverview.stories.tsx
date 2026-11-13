import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { pick } from "../../../workbench/index.ts";
import { OptionToggle } from "../../molecules/OptionToggle/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import { SignalCard } from "../SignalCard/index.ts";
import { SignalList } from "../SignalList/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import {
  authorityManyCounterpartiesOverview, authorityOverview, emptyOverview, manyAliasesOverview, nameOnlyOverview, recordRows, supplierOverview,
} from "../../samples/fixtureData.ts";
import type { EntityAliases, EntityOverviewData, EntityRole } from "../../types.ts";
import { EntityOverview } from "./index.ts";

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

/** Stands in for the order toggle (#107), to show where the slot sits. */
function SignalOrderSample({ locale }: { locale: "en" | "ro" }) {
  const labels = { DATE_DESC: pick(locale, { en: "by date", ro: "după dată" }), VALUE_DESC: pick(locale, { en: "by RON", ro: "după RON" }) };
  return <OptionToggle options={["DATE_DESC", "VALUE_DESC"] as const} value="DATE_DESC" onChange={() => {}} labels={labels} label={pick(locale, { en: "Order Signals", ro: "Ordinea Semnalelor" })} />;
}

const overviewStory =
  (data: { overview: EntityOverviewData; aliases: EntityAliases }, role: EntityRole, withSignals = true, toolbar = false): Story["render"] =>
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
/** The slot above the Signals list holds a control (here a stand-in for the order toggle). */
export const SignalsToolbarSlot: Story = { render: overviewStory(supplierOverview, "supplier", true, true) };

const words = {
  loading: { en: "Loading…", ro: "Se încarcă…" },
  error: { en: "The data could not be loaded.", ro: "Datele nu au putut fi încărcate." },
};
/** The Overview while its data loads: the page puts a loading note where the tab would be. */
export const Loading: Story = { render: (_args, { globals }) => <StateNote kind="loading">{pick(globals["locale"], words.loading)}</StateNote> };
/** The Overview's data could not be loaded: an error note, never red. */
export const Failed: Story = { render: (_args, { globals }) => <StateNote kind="error">{pick(globals["locale"], words.error)}</StateNote> };
