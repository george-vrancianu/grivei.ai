import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { authorityRecords, supplierRecords } from "../../../../samples/fixtureData.ts";
import type { EntityRole, RecordsTabData } from "../../../../types.ts";
import { RecordsTable } from "./index.ts";

const meta = { title: "Domain/RecordsTab/RecordsTable", component: RecordsTable } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const table =
  (records: RecordsTabData, role: EntityRole, width?: number): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const copy = sampleCopy.recordsTab(locale);
    return (
      <div style={width ? { maxWidth: width } : undefined}>
        <RecordsTable
          rows={records.records.rows}
          role={role}
          entityHref={(entity, r) => `/explore/${r}/${entity.key}`}
          recordHref={(record) => `/explore/record/${record.code}`}
          locale={locale}
          copy={{ ...copy.table, recordRow: copy.recordRow }}
        />
      </div>
    );
  };

/** A supplier's Records: the counterparty column holds the authority. */
export const OfASupplier: Story = { render: table(supplierRecords, "supplier") };
/** An authority's Records: the counterparty column holds the winners. */
export const OfAnAuthority: Story = { render: table(authorityRecords, "authority") };
/** At 390 px the table scrolls inside its own box; the page does not. */
export const Narrow: Story = { render: table(authorityRecords, "authority", 390) };
