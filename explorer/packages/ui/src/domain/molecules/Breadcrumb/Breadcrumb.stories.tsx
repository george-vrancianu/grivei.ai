import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { Breadcrumb } from "./index.ts";

const meta = { title: "Domain/Breadcrumb", component: Breadcrumb } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const Authority: Story = {
  render: (_args, { globals }) => {
    const { breadcrumb } = sampleCopy.entityHeader(localeOf(globals["locale"]));
    return <Breadcrumb current={breadcrumb.roles.AUTHORITY} homeHref="/explore/" copy={breadcrumb} />;
  },
};

export const Person: Story = {
  render: (_args, { globals }) => {
    const { breadcrumb } = sampleCopy.personDetail(localeOf(globals["locale"]));
    return <Breadcrumb current={breadcrumb.current} homeHref="/explore/" copy={breadcrumb} />;
  },
};
