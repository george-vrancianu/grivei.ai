import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import {
  authorityHeader,
  bothRolesHeader,
  deregisteredHeader,
  nameOnlySupplierHeader,
  supplierHeader,
  unplacedAuthorityHeader,
} from "../../samples/fixtureData.ts";
import type { EntityHeaderData, EntityRole } from "../../types.ts";
import { EntityHeader } from "./index.ts";

const meta = {
  title: "Domain/EntityHeader",
  component: EntityHeader,
} satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const roleHref = (entity: EntityHeaderData) => (role: EntityRole) => `/explore/${role.toLowerCase()}/${encodeURIComponent(entity.key)}`;

function header(entity: EntityHeaderData, role: EntityRole): Story {
  return {
    render: (_args, { globals }) => {
      const locale = localeOf(globals["locale"]);
      return (
        <EntityHeader entity={entity} role={role} roleHref={roleHref(entity)} locale={locale} copy={sampleCopy.entityHeader(locale)} />
      );
    },
  };
}

/** An authority placed in a county and UAT. No role switch: it only buys. */
export const Authority = header(authorityHeader, "AUTHORITY");
/** A supplier with a CUI, placed by ANAF. */
export const Supplier = header(supplierHeader, "SUPPLIER");
/** Buys and sells: the role switch shows, with the authority side current. */
export const BothRolesAsAuthority = header(bothRolesHeader, "AUTHORITY");
/** The same entity read as a supplier. */
export const BothRolesAsSupplier = header(bothRolesHeader, "SUPPLIER");
/** No CUI: says it is identified by name only, and shows its foreign VAT id. */
export const NameOnlySupplier = header(nameOnlySupplierHeader, "SUPPLIER");
/** ANAF status RADIERE: a badge. */
export const InactiveAnafStatus = header(deregisteredHeader, "SUPPLIER");
/** Neither ANAF nor SEAP places it in a county. */
export const UnplacedAuthority = header(unplacedAuthorityHeader, "AUTHORITY");
