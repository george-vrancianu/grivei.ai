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
import type { EntityHeaderData, EntityPageRole } from "../../types.ts";
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
        <EntityHeader entity={entity} role={role} roleHref={roleHref(entity)} locale={locale} copy={sampleCopy.entityHeader(locale)} />
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
        <EntityHeader entity={entity} role="SUPPLIER" roleHref={roleHref(entity)} locale={locale} copy={sampleCopy.entityHeader(locale)} />
      </div>
    );
  },
};
