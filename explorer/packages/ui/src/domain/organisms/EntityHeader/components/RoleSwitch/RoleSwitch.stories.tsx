import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import type { EntityPageRole } from "../../../../types.ts";
import { RoleSwitch } from "./index.ts";

const meta = { title: "Domain/EntityHeader/RoleSwitch", component: RoleSwitch } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const hrefFor = (role: EntityPageRole) => `/explore/${role.toLowerCase()}/4000002`;
const sw = (role: EntityPageRole): Story => ({
  render: (_args, { globals }) => <RoleSwitch role={role} hrefFor={hrefFor} copy={sampleCopy.entityHeader(localeOf(globals["locale"])).roles} />,
});

export const AuthorityCurrent = sw("AUTHORITY");
export const SupplierCurrent = sw("SUPPLIER");
