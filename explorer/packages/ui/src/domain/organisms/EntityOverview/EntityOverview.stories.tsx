import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import {
  authorityManyCounterpartiesOverview, authorityOverview, emptyOverview, manyAliasesOverview, nameOnlyOverview, recordRows, supplierOverview,
} from "../../samples/fixtureData.ts";
import type { EntityAliases, EntityOverviewData, EntityRole } from "../../types.ts";
import { EntityOverview } from "./index.ts";

const meta = { title: "Domain/EntityOverview", component: EntityOverview } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** A minimal neutral stand-in for the Signal cards (their own organism fills the slot): the rule and the Records count. */
function SignalPlaceholder({ overview }: { overview: EntityOverviewData }): ReactNode {
  return (
    <Stack component="ul" sx={{ m: 0, pl: 2 }}>
      {overview.signals.rows.map((signal) => (
        <Typography key={`${signal.rule}-${signal.date}`} component="li">
          {signal.rule} · {signal.recordCount}
        </Typography>
      ))}
    </Stack>
  );
}

const overviewStory =
  (data: { overview: EntityOverviewData; aliases: EntityAliases }, role: EntityRole, withSignals = true): Story["render"] =>
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
        signals={withSignals ? <SignalPlaceholder overview={data.overview} /> : undefined}
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
