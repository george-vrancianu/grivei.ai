import type { Meta, StoryObj } from "@storybook/react-vite";
import { Typography } from "../../../atoms/Typography/index.ts";
import { pick } from "../../../workbench/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import { EntityHeader, EntityHeaderSkeleton } from "../../organisms/EntityHeader/index.ts";
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
          header={(slots) => <EntityHeader entity={entity} role={role} homeHref="/explore/" roleHref={roleHref} locale={locale} copy={sampleCopy.entityHeader(locale)} {...slots} />}
          view={view}
          tabHrefs={hrefs(entity, role)}
          tabCounts={{ records: "1,817" }}
          citeUrl={`https://grivei.ai${hrefs(entity, role)[view]}`}
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

/** The first load: the header is its skeleton (real breadcrumb, tabs and address), and the body says it is loading. */
export const Loading: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <EntityPageLayout header={(slots) => <EntityHeaderSkeleton role="AUTHORITY" homeHref="/explore/" copy={sampleCopy.entityHeader(locale)} {...slots} />} view="overview" tabHrefs={hrefs(authorityHeader, "AUTHORITY")} citeUrl="https://grivei.ai/explore/authority/1000017" copy={sampleCopy.entityPageLayout(locale)}>
        <StateNote kind="loading">{pick(locale, { en: "Loading…", ro: "Se încarcă…" })}</StateNote>
      </EntityPageLayout>
    );
  },
};

/** The data could not be loaded: the header kept from before, an error note in the body, never red. */
export const Failed: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <EntityPageLayout header={(slots) => <EntityHeader entity={authorityHeader} role="AUTHORITY" homeHref="/explore/" roleHref={() => "/explore/"} locale={locale} copy={sampleCopy.entityHeader(locale)} {...slots} />} view="records" tabHrefs={hrefs(authorityHeader, "AUTHORITY")} copy={sampleCopy.entityPageLayout(locale)}>
        <StateNote kind="error">{pick(locale, { en: "The data could not be loaded.", ro: "Datele nu au putut fi încărcate." })}</StateNote>
      </EntityPageLayout>
    );
  },
};

/** The entity has nothing in this role: the header with its tabs, and the empty note. */
export const NothingInThisRole: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <EntityPageLayout header={(slots) => <EntityHeader entity={authorityHeader} role="AUTHORITY" homeHref="/explore/" roleHref={() => "/explore/"} locale={locale} copy={sampleCopy.entityHeader(locale)} {...slots} />} view="records" tabHrefs={hrefs(authorityHeader, "AUTHORITY")} copy={sampleCopy.entityPageLayout(locale)}>
        <StateNote kind="empty">{pick(locale, { en: "This entity has no Records as a supplier.", ro: "Această entitate nu are înregistrări ca furnizor." })}</StateNote>
      </EntityPageLayout>
    );
  },
};
