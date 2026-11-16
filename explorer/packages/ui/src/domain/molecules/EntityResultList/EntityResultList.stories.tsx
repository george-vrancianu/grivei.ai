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
