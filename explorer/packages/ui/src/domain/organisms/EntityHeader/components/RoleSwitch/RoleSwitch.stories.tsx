import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import type { EntityPageRole } from "../../../../types.ts";
import { RoleSwitch } from "./index.ts";

const meta = { title: "Domain/EntityHeader/RoleSwitch", component: RoleSwitch } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const hrefFor = (role: EntityPageRole) => `/explore/${role.toLowerCase()}/4000002`;
const sw = (role: EntityPageRole, roles: readonly EntityPageRole[]): Story => ({
  render: (_args, { globals }) => <RoleSwitch role={role} roles={roles} hrefFor={hrefFor} copy={sampleCopy.entityHeader(localeOf(globals["locale"])).roles} />,
});

/** Both roles, the authority page: the supplier chip links. */
export const AuthorityCurrent = sw("AUTHORITY", ["AUTHORITY", "SUPPLIER"]);
export const SupplierCurrent = sw("SUPPLIER", ["AUTHORITY", "SUPPLIER"]);
/** Only buys: the supplier chip is muted and says there are no Records as supplier. */
export const OnlyAuthority = sw("AUTHORITY", ["AUTHORITY"]);
/** Only sells: the authority chip is muted. */
export const OnlySupplier = sw("SUPPLIER", ["SUPPLIER"]);
