import type { Meta, StoryObj } from "@storybook/react-vite";
import { SourceCaption } from "./index.ts";

const meta = { title: "Domain/SourceCaption", component: SourceCaption } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The source has an address: the caption links to it. */
export const Linked: Story = { render: () => <SourceCaption label="Source: ONRC, snapshot of 6 May 2026" url="https://data.gov.ro/dataset/firme-06-05-2026" /> };
/** The source has no address: plain text. */
export const Plain: Story = { render: () => <SourceCaption label="Source: ONRC, snapshot of 6 May 2026" url={null} /> };
