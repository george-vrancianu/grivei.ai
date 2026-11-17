import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import type { EntityPageRole } from "../../../../types.ts";
import { Breadcrumb } from "./index.ts";

const meta = { title: "Domain/EntityHeader/Breadcrumb", component: Breadcrumb } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const crumb = (role: EntityPageRole): Story => ({
  render: (_args, { globals }) => <Breadcrumb role={role} homeHref="/explore/" copy={sampleCopy.entityHeader(localeOf(globals["locale"])).breadcrumb} />,
});

export const Authority = crumb("AUTHORITY");
export const Supplier = crumb("SUPPLIER");
