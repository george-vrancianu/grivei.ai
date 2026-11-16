import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { ColumnHead } from "./index.ts";

const meta = { title: "Domain/EntityResultList/ColumnHead", component: ColumnHead } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** Shown from 600 px up; narrower, the story is empty (the head is hidden and the rows carry their own caption). */
export const Suppliers: Story = { render: (_a, { globals }) => <ColumnHead role="supplier" copy={sampleCopy.entityRow(localeOf(globals["locale"])).head} /> };
export const Authorities: Story = { render: (_a, { globals }) => <ColumnHead role="authority" copy={sampleCopy.entityRow(localeOf(globals["locale"])).head} /> };
