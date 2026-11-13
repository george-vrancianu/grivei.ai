import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import type { EntityPageView } from "../../../../types.ts";
import { EntityTabNav } from "./index.ts";

const meta = { title: "Domain/EntityPageLayout/EntityTabNav", component: EntityTabNav } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const hrefs = { overview: "/explore/supplier/30000001", records: "/explore/supplier/30000001/records", relationships: "/explore/supplier/30000001/relationships" };
const nav = (view: EntityPageView, counts?: Partial<Record<EntityPageView, string>>): Story => ({
  render: (_args, { globals }) => <EntityTabNav view={view} hrefs={hrefs} counts={counts} copy={sampleCopy.entityPageLayout(localeOf(globals["locale"]))} />,
});

export const Overview = nav("overview");
export const Records = nav("records");
export const Relationships = nav("relationships");

/** The Records tab with its count. */
export const WithCount = nav("records", { records: "1,817" });
/** An estimated count leads with ≈. */
export const WithEstimatedCount = nav("overview", { records: "≈ 2.4M" });
