import type { Meta, StoryObj } from "@storybook/react-vite";
import { Typography } from "../../../atoms/Typography/index.ts";
import { EntityHeader } from "../../organisms/EntityHeader/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { authorityHeader, bothRolesHeader, nameOnlySupplierHeader, supplierHeader } from "../../samples/fixtureData.ts";
import type { EntityHeaderData, EntityPageView, EntityPageRole } from "../../types.ts";
import { EntityPageLayout } from "./index.ts";

const meta = {
  title: "Domain/EntityPageLayout",
  component: EntityPageLayout,
  parameters: { layout: "fullscreen" },
} satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const hrefs = (entity: EntityHeaderData, role: EntityPageRole): Record<EntityPageView, string> => {
  const root = `/explore/${role.toLowerCase()}/${encodeURIComponent(entity.key)}`;
  return {
    overview: root,
    records: `${root}/records`,
    relationships: `${root}/relationships`,
  };
};

function page(entity: EntityHeaderData, role: EntityPageRole, view: EntityPageView): Story {
  return {
    render: (_args, { globals }) => {
      const locale = localeOf(globals["locale"]);
      const roleHref = (r: EntityPageRole) => hrefs(entity, r).overview;
      return (
        <EntityPageLayout
          header={<EntityHeader entity={entity} role={role} roleHref={roleHref} locale={locale} copy={sampleCopy.entityHeader(locale)} />}
          view={view}
          tabHrefs={hrefs(entity, role)}
          copy={sampleCopy.entityPageLayout(locale)}
        >
          <Typography>{sampleCopy.entityPageLayout(locale).tabs[view]}</Typography>
        </EntityPageLayout>
      );
    },
  };
}

/** An authority on its Overview tab, the default. */
export const AuthorityOverview = page(authorityHeader, "AUTHORITY", "overview");
/** A supplier on its Records tab. */
export const SupplierRecords = page(supplierHeader, "SUPPLIER", "records");
/** An entity that buys and sells, on its Relationships tab, with the role switch. */
export const BothRolesRelationships = page(bothRolesHeader, "AUTHORITY", "relationships");
/** A name-only supplier. */
export const NameOnlySupplierOverview = page(nameOnlySupplierHeader, "SUPPLIER", "overview");

/** The first load: no header yet, the tabs are already there and the body says it is loading. */
export const Loading: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <EntityPageLayout header={null} view="overview" tabHrefs={hrefs(authorityHeader, "AUTHORITY")} copy={sampleCopy.entityPageLayout(locale)}>
        <Typography role="status">{locale === "ro" ? "Se încarcă..." : "Loading..."}</Typography>
      </EntityPageLayout>
    );
  },
};
