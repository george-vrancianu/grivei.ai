import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { AnafStatusBadge } from "./index.ts";

const meta = { title: "Domain/EntityHeader/AnafStatusBadge", component: AnafStatusBadge } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const badge = (status: string | null): Story => ({
  render: (_args, { globals }) => <AnafStatusBadge status={status} copy={sampleCopy.entityHeader(localeOf(globals["locale"])).anafStatus} />,
});

export const Deregistered = badge("RADIERE");
export const Merged = badge("FUZIUNE");
