import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { OrderSelect, type RecordOrder } from "./index.ts";

const meta = { title: "Domain/OrderSelect", component: OrderSelect } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const withOrder =
  (value: RecordOrder): Story["render"] =>
  (_args, { globals }) => <OrderSelect value={value} onChange={() => {}} copy={sampleCopy.orderSelect(localeOf(globals["locale"]))} />;

export const ByValue: Story = { render: withOrder("VALUE_DESC") };
export const NewestFirst: Story = { render: withOrder("DATE_DESC") };
export const OldestFirst: Story = { render: withOrder("DATE_ASC") };
