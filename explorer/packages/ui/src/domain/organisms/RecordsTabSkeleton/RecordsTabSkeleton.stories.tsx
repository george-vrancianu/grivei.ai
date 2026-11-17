import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { RecordsTabSkeleton } from "./index.ts";

const meta = { title: "Domain/RecordsTabSkeleton", component: RecordsTabSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const sample =
  (role: "authority" | "supplier"): Story["render"] =>
  (_args, { globals }) => (
    <RecordsTabSkeleton role={role} copy={sampleCopy.recordsTab(localeOf(globals["locale"]))} status={<LoadingStatus label={pick(globals["locale"], { en: "Loading…", ro: "Se încarcă…" })} />} />
  );

/** An authority's Records tab on first load: the bar's real menu names, the Total panel's real labels, the Records panel's real title, the status at the right of its header. */
export const AuthorityFirstLoad: Story = { render: sample("authority") };
export const SupplierFirstLoad: Story = { render: sample("supplier") };
export const Phone: Story = { ...AuthorityFirstLoad, globals: { viewport: { value: "mobile2", isRotated: false } } };
