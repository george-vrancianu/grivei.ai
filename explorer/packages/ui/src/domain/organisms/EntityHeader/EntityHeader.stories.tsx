import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import {
  authorityHeader,
  bothRolesHeader,
  curatedHeader,
  deregisteredHeader,
  nameOnlySupplierHeader,
  nationalAuthorityHeader,
  supplierHeader,
  unplacedAuthorityHeader,
} from "../../samples/fixtureData.ts";
import { manyAliasesOverview } from "../../samples/fixtureData.ts";
import type { EntityHeaderData, EntityPageRole, EntityPageView } from "../../types.ts";
import { CiteLine } from "../../molecules/CiteLine/index.ts";
import { EntityTabNav } from "../../templates/EntityPageLayout/components/EntityTabNav/index.ts";
import { EntityHeader } from "./index.ts";

const meta = {
  title: "Domain/EntityHeader",
  component: EntityHeader,
} satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const roleHref = (entity: EntityHeaderData) => (role: EntityPageRole) => `/explore/${role.toLowerCase()}/${encodeURIComponent(entity.key)}`;

function header(entity: EntityHeaderData, role: EntityPageRole): Story {
  return {
    render: (_args, { globals }) => {
      const locale = localeOf(globals["locale"]);
      return (
        <EntityHeader entity={entity} role={role} homeHref="/explore/" roleHref={roleHref(entity)} locale={locale} copy={sampleCopy.entityHeader(locale)} />
      );
    },
  };
}

/** An authority placed in a county and UAT. It only buys: the supplier chip is muted. */
export const Authority = header(authorityHeader, "AUTHORITY");
/** A supplier with a CUI, placed by ANAF. */
export const Supplier = header(supplierHeader, "SUPPLIER");
/** Buys and sells: the other role's chip links, with the authority side filled. */
export const BothRolesAsAuthority = header(bothRolesHeader, "AUTHORITY");
/** The same entity read as a supplier. */
export const BothRolesAsSupplier = header(bothRolesHeader, "SUPPLIER");
/** Identity curated: the marker shows, and the placement is national. */
export const CuratedIdentity = header(curatedHeader, "SUPPLIER");
/** An authority placed nationally, not in a county. */
export const NationalAuthority = header(nationalAuthorityHeader, "AUTHORITY");
/** No CUI: says it is identified by name only, and shows its foreign VAT id. */
export const NameOnlySupplier = header(nameOnlySupplierHeader, "SUPPLIER");
/** ANAF status RADIERE: a badge. */
export const InactiveAnafStatus = header(deregisteredHeader, "SUPPLIER");
/** Neither ANAF nor SEAP places it in a county. */
export const UnplacedAuthority = header(unplacedAuthorityHeader, "AUTHORITY");
/** A supplier SEAP spells eight ways: the line names the first three and counts the rest. */
export const ManySpellings = header({ ...supplierHeader, aliases: manyAliasesOverview.aliases }, "SUPPLIER");
/** A very long name and several markers wrap on a narrow screen instead of widening the page. */
export const LongNameNarrow: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const entity = { ...nameOnlySupplierHeader, displayName: "ASOCIEREA CONSTRUCȚII DRUMURI ȘI PODURI TRANSILVANIA NORD-VEST PENTRU INFRASTRUCTURĂ RUTIERĂ" };
    return (
      <div style={{ maxWidth: 390 }}>
        <EntityHeader entity={entity} role="SUPPLIER" homeHref="/explore/" roleHref={roleHref(entity)} locale={locale} copy={sampleCopy.entityHeader(locale)} />
      </div>
    );
  },
};

const tabHrefs = (entity: EntityHeaderData, role: EntityPageRole) => {
  const base = `/explore/${role.toLowerCase()}/${encodeURIComponent(entity.key)}`;
  return { overview: base, records: `${base}/records`, relationships: `${base}/relationships` };
};

function withFoot(entity: EntityHeaderData, role: EntityPageRole, view: EntityPageView, counts?: Partial<Record<EntityPageView, Record<"en" | "ro", string>>>, maxWidth?: number): Story {
  return {
    render: (_args, { globals }) => {
      const locale = localeOf(globals["locale"]);
      const hrefs = tabHrefs(entity, role);
      return (
        <div style={maxWidth ? { maxWidth } : undefined}>
          <EntityHeader
            entity={entity}
            role={role}
            homeHref="/explore/"
            roleHref={roleHref(entity)}
            locale={locale}
            copy={sampleCopy.entityHeader(locale)}
            tabs={<EntityTabNav view={view} hrefs={hrefs} counts={counts && { records: counts.records?.[locale] }} copy={sampleCopy.entityPageLayout(locale)} />}
            address={<CiteLine url={`https://grivei.ai${hrefs[view]}`} copy={sampleCopy.entityPageLayout(locale).cite} />}
          />
        </div>
      );
    },
  };
}

/** The panel with its foot strip: the tabs (the open one selected, Records with its count as a pill) and the page address at the strip's right end. */
export const WithTabsAndAddress = withFoot(bothRolesHeader, "AUTHORITY", "records", { records: { en: "1,817", ro: "1.817" } });
/** The supplier side with an inactive ANAF status, the tabs and the address. */
export const SupplierWithTabsAndAddress = withFoot(deregisteredHeader, "SUPPLIER", "overview");
/** On a narrow screen the facts wrap, the tabs wrap and the address sits under them. */
export const WithTabsAndAddressNarrow = withFoot(bothRolesHeader, "SUPPLIER", "relationships", { records: { en: "1,817", ro: "1.817" } }, 390);
/** Only the tabs: no address, so the strip holds the tabs alone. */
export const WithTabsOnly: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <EntityHeader
        entity={supplierHeader}
        role="SUPPLIER"
        homeHref="/explore/"
        roleHref={roleHref(supplierHeader)}
        locale={locale}
        copy={sampleCopy.entityHeader(locale)}
        tabs={<EntityTabNav view="overview" hrefs={tabHrefs(supplierHeader, "SUPPLIER")} copy={sampleCopy.entityPageLayout(locale)} />}
      />
    );
  },
};
