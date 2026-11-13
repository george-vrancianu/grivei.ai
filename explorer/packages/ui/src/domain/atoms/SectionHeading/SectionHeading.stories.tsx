import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { SectionHeading } from "./index.ts";

const meta = { title: "Domain/SectionHeading", component: SectionHeading } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_args, { globals }) => <SectionHeading>{pick(globals["locale"], { en: "counterparties · share of the total awarded", ro: "parteneri · ponderea din total" })}</SectionHeading>,
};
