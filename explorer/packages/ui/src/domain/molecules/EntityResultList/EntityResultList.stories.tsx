import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { resultSamples, signalRowSamples } from "../../samples/fixtureData.ts";
import { EntityResultList } from "./index.ts";

const meta = { title: "Domain/EntityResultList", component: EntityResultList } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const Suppliers: Story = {
  render: (_a, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <EntityResultList rows={resultSamples.variety.suppliers.rows} role="supplier" entityHref={(e, role) => `/explore/${role}/${e.key}`} locale={locale} copy={sampleCopy.entityRow(locale)} />;
  },
};

/** Authorities with and without Signals under the column head: the Signals column stays empty and the amounts stay aligned. */
export const AuthoritiesWithSignals: Story = {
  render: (_a, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <EntityResultList rows={signalRowSamples.authorities.rows} role="authority" entityHref={(e, role) => `/explore/${role}/${e.key}`} locale={locale} copy={sampleCopy.entityRow(locale)} />;
  },
};
/** Below 600 px the head is gone and each amount carries its caption. */
export const Phone: Story = { ...Suppliers, globals: { viewport: { value: "mobile2", isRotated: false } } };

/** Between 600 px and about 1200 px the main screen's results column is narrower than a row (558 px): the pair wraps under the name but stays right-aligned under the head's columns. */
export const NarrowColumn: Story = {
  render: (_a, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <div style={{ maxWidth: 460 }}>
        <EntityResultList rows={signalRowSamples.authorities.rows} role="authority" entityHref={(e, role) => `/explore/${role}/${e.key}`} locale={locale} copy={sampleCopy.entityRow(locale)} />
      </div>
    );
  },
};
