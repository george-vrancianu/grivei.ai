import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { curatedHeader, nameOnlySupplierHeader, supplierHeader } from "../../../../samples/fixtureData.ts";
import { IdentityMarkers } from "./index.ts";

const meta = { title: "Domain/EntityHeader/IdentityMarkers", component: IdentityMarkers } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const markers = (entity: typeof supplierHeader): Story => ({
  render: (_args, { globals }) => <IdentityMarkers entity={entity} copy={sampleCopy.entityHeader(localeOf(globals["locale"])).identity} />,
});

export const Cui = markers(supplierHeader);
export const Curated = markers(curatedHeader);
export const NameOnlyWithForeignVatId = markers(nameOnlySupplierHeader);
