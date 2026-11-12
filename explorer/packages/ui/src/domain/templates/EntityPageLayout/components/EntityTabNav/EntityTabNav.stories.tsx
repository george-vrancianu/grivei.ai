import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import type { EntityPageView } from "../../../../types.ts";
import { EntityTabNav } from "./index.ts";

const meta = { title: "Domain/EntityPageLayout/EntityTabNav", component: EntityTabNav } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const hrefs = { overview: "/explore/supplier/30000001", records: "/explore/supplier/30000001/records", relationships: "/explore/supplier/30000001/relationships" };
const nav = (view: EntityPageView): Story => ({
  render: (_args, { globals }) => <EntityTabNav view={view} hrefs={hrefs} copy={sampleCopy.entityPageLayout(localeOf(globals["locale"]))} />,
});

export const Overview = nav("overview");
export const Records = nav("records");
export const Relationships = nav("relationships");
